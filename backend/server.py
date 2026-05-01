"""Mwana Lingala backend - FastAPI + MongoDB.

Auth: Emergent Google OAuth + Email OTP via SMTP.
Content: words, themes, child profiles, progress, error reports.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import secrets
import string
import bcrypt
import httpx
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from seed_data import THEMES, WORDS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mwana-lingala")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@mwana-lingala.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "Mwana Lingala")
EMERGENT_AUTH_URL = os.environ.get(
    "EMERGENT_AUTH_URL",
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
)
MAMMOTH_API_KEY = os.environ.get("MAMMOTH_API_KEY", "")
MAMMOTH_API_URL = os.environ.get("MAMMOTH_API_URL", "https://api.mammouth.ai/v1")
MAMMOTH_MODEL = os.environ.get("MAMMOTH_MODEL", "claude-sonnet-4-5")
MOLLIE_API_KEY = os.environ.get("MOLLIE_API_KEY", "")
MOLLIE_API_URL = "https://api.mollie.com/v2"
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "https://kids-stories-16.preview.emergentagent.com")
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or "587")
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Mwana Lingala")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", SMTP_USER or "noreply@mwana-lingala.com")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Mwana Lingala API")
api = APIRouter(prefix="/api")


# ---------------- Models ----------------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    auth_method: str  # "google" | "otp"
    christian_mode: bool = False
    is_premium: bool = False
    credits: int = 0
    created_at: datetime


class RequestOTPIn(BaseModel):
    email: EmailStr


class VerifyOTPIn(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class GoogleSessionIn(BaseModel):
    session_id: str


class ChildProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    profile_id: str
    user_id: str
    name: str
    age: int
    themes: List[str] = []
    christian_mode: bool = False
    created_at: datetime


class ChildProfileIn(BaseModel):
    name: str
    age: int
    themes: List[str] = []
    christian_mode: bool = False


class ProgressIn(BaseModel):
    word_id: str
    profile_id: Optional[str] = None
    learned: bool = True


class ErrorReportIn(BaseModel):
    word_id: str
    suggested_translation: str
    comment: Optional[str] = ""


class WordSubmissionIn(BaseModel):
    french: str = Field(..., min_length=1, max_length=120)
    lingala: str = Field(..., min_length=1, max_length=120)
    theme: str
    example_ln: Optional[str] = ""
    example_fr: Optional[str] = ""


# Credits awarded on submission (pending approval)
CREDITS_WORD = 5
CREDITS_EXAMPLE = 3
LEVELS = [
    {"min": 0, "max": 20, "name": "Explorer Lingala"},
    {"min": 21, "max": 50, "name": "Aide-parent"},
    {"min": 51, "max": 100, "name": "Gardien des mots"},
    {"min": 101, "max": 200, "name": "Ambassadeur Lingala"},
    {"min": 201, "max": 10_000_000, "name": "Expert Lingala"},
]


def compute_level(credits: int) -> dict:
    for lvl in LEVELS:
        if lvl["min"] <= credits <= lvl["max"]:
            nxt = next((l for l in LEVELS if l["min"] > credits), None)
            return {
                "name": lvl["name"],
                "min": lvl["min"],
                "max": lvl["max"],
                "next": nxt["name"] if nxt else None,
                "next_at": nxt["min"] if nxt else None,
            }
    return {"name": "Explorer Lingala", "min": 0, "max": 20, "next": "Aide-parent", "next_at": 21}


class Word(BaseModel):
    model_config = ConfigDict(extra="ignore")
    word_id: str
    lingala: str
    french: str
    theme: str
    example_ln: str
    example_fr: str
    is_christian: bool = False
    image: Optional[str] = None
    audio: Optional[str] = None  # data URL audio (community-recorded)
    custom: bool = False
    tier: str = "free"  # "free" | "premium"
    locked: bool = False  # set true when user is not premium and word is premium


class AdminWordIn(BaseModel):
    lingala: str = Field(..., min_length=1, max_length=80)
    french: str = Field(..., min_length=1, max_length=120)
    theme: str
    example_ln: str = ""
    example_fr: str = ""
    is_christian: bool = False
    tier: str = "free"
    image: Optional[str] = ""


class AudioSubmissionIn(BaseModel):
    word_id: str
    audio_b64: str = Field(..., min_length=100)


class Theme(BaseModel):
    model_config = ConfigDict(extra="ignore")
    slug: str
    label_fr: str
    emoji: str
    order: int
    is_christian: bool


# ---------------- Helpers ----------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def hash_otp(code: str) -> str:
    return bcrypt.hashpw(code.encode(), bcrypt.gensalt(rounds=10)).decode()


def verify_otp_hash(code: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(code.encode(), hashed.encode())
    except (ValueError, TypeError):
        return False


async def send_otp_email(email: str, code: str) -> bool:
    """Send OTP via SMTP (Amen.fr / Gandi / generic)."""
    if not SMTP_HOST or not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD not set, skipping email send. OTP for %s: %s", email, code)
        return True  # dev mode: return True so flow continues
    html = f"""
    <div style="font-family:Nunito,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#F8F5F0;border-radius:24px;">
      <h1 style="color:#2E7D32;">Mwana Lingala</h1>
      <p style="color:#2A2A2A;font-size:16px;">Bonjour,</p>
      <p style="color:#2A2A2A;font-size:16px;">Voici votre code de connexion :</p>
      <div style="font-size:40px;font-weight:900;letter-spacing:10px;text-align:center;background:#FFFFFF;padding:24px;margin:20px 0;border-radius:20px;color:#C62828;">
        {code}
      </div>
      <p style="color:#5C5C5C;font-size:14px;">Ce code expire dans 10 minutes. Si vous n'avez pas demandé ce code, ignorez ce message.</p>
      <p style="color:#8A8A8A;font-size:12px;margin-top:24px;">© Mwana Lingala — transmettre le Lingala à son enfant.</p>
    </div>
    """
    text = f"Mwana Lingala\n\nVotre code de connexion : {code}\n\nCe code expire dans 10 minutes."
    msg = EmailMessage()
    msg["Subject"] = "Votre code Mwana Lingala"
    msg["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
    msg["To"] = email
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    try:
        import asyncio

        def _send():
            ctx = ssl.create_default_context()
            if SMTP_PORT == 465:
                with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=15) as s:
                    s.login(SMTP_USER, SMTP_PASSWORD)
                    s.send_message(msg)
            else:
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as s:
                    s.ehlo()
                    s.starttls(context=ctx)
                    s.ehlo()
                    s.login(SMTP_USER, SMTP_PASSWORD)
                    s.send_message(msg)
        await asyncio.to_thread(_send)
        logger.info("SMTP OTP sent to %s", email)
        return True
    except Exception as e:
        logger.error("SMTP send failed: %s", e)
        return False


async def get_current_user(request: Request) -> User:
    """Extract user from session_token cookie or Authorization header."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


async def upsert_user(email: str, name: str, picture: Optional[str], auth_method: str) -> dict:
    existing = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    role = "admin" if email.lower() in ADMIN_EMAILS else "user"
    if existing:
        updates = {}
        if picture and existing.get("picture") != picture:
            updates["picture"] = picture
        if existing.get("role") != role:
            updates["role"] = role
        if updates:
            await db.users.update_one({"email": email.lower()}, {"$set": updates})
            existing.update(updates)
        return existing
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email.lower(),
        "name": name,
        "picture": picture,
        "auth_method": auth_method,
        "role": role,
        "christian_mode": False,
        "is_premium": False,
        "credits": 0,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc.copy())
    return doc


async def require_admin(user: "User" = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "role": 1})
    if not doc or doc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def create_session(user_id: str, response: Response, provided_token: Optional[str] = None) -> str:
    token = provided_token or secrets.token_urlsafe(32)
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })
    response.set_cookie(
        key="session_token",
        value=token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return token


# ---------------- Auth Routes ----------------
@api.post("/auth/request-otp")
async def request_otp(data: RequestOTPIn):
    code = generate_otp(6)
    expires_at = now_utc() + timedelta(minutes=10)
    await db.otp_codes.delete_many({"email": data.email.lower()})
    await db.otp_codes.insert_one({
        "email": data.email.lower(),
        "code_hash": hash_otp(code),
        "created_at": now_utc().isoformat(),
        "expires_at": expires_at.isoformat(),
        "attempts": 0,
    })
    ok = await send_otp_email(data.email, code)
    if not ok:
        raise HTTPException(status_code=500, detail="Impossible d'envoyer l'email. Réessayez.")
    return {"success": True, "message": "Code envoyé", "expires_in_minutes": 10}


@api.post("/auth/verify-otp")
async def verify_otp(data: VerifyOTPIn, response: Response):
    doc = await db.otp_codes.find_one({"email": data.email.lower()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="Code expiré ou introuvable")
    attempts = doc.get("attempts", 0)
    if attempts >= 5:
        await db.otp_codes.delete_one({"email": data.email.lower()})
        raise HTTPException(status_code=400, detail="Trop de tentatives, redemandez un code")
    expires_at = doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        await db.otp_codes.delete_one({"email": data.email.lower()})
        raise HTTPException(status_code=400, detail="Code expiré")
    if not verify_otp_hash(data.code, doc["code_hash"]):
        await db.otp_codes.update_one({"email": data.email.lower()}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail=f"Code invalide. {4 - attempts} tentative(s) restante(s).")
    await db.otp_codes.delete_one({"email": data.email.lower()})
    user = await upsert_user(data.email, data.email.split("@")[0].capitalize(), None, "otp")
    await create_session(user["user_id"], response)
    return {"success": True, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"]}}


@api.post("/auth/google/session")
async def google_session(data: GoogleSessionIn, response: Response):
    """Exchange Emergent session_id for user data + local session_token."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            r = await http.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": data.session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google session")
        payload = r.json()
    except httpx.HTTPError as e:
        logger.error("Emergent auth fetch failed: %s", e)
        raise HTTPException(status_code=502, detail="Auth provider unreachable")

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not returned by provider")
    name = payload.get("name") or email.split("@")[0]
    picture = payload.get("picture")
    session_token = payload.get("session_token")

    user = await upsert_user(email, name, picture, "google")
    await create_session(user["user_id"], response, provided_token=session_token)
    return {"success": True, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture")}}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    # Re-check admin role lazily (handles ADMIN_EMAILS updates)
    if doc and user.email.lower() in ADMIN_EMAILS and doc.get("role") != "admin":
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"role": "admin"}})
        doc["role"] = "admin"
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "auth_method": user.auth_method,
        "christian_mode": user.christian_mode,
        "is_premium": doc.get("is_premium", False) if doc else False,
        "premium_until": doc.get("premium_until") if doc else None,
        "credits": doc.get("credits", 0) if doc else 0,
        "role": doc.get("role", "user") if doc else "user",
    }


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"success": True}


@api.patch("/auth/settings")
async def update_settings(body: dict, user: User = Depends(get_current_user)):
    update = {}
    if "christian_mode" in body:
        update["christian_mode"] = bool(body["christian_mode"])
    if update:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update})
    return {"success": True, **update}


# ---------------- Content Routes ----------------
@api.get("/themes", response_model=List[Theme])
async def get_themes(include_christian: bool = True):
    q = {} if include_christian else {"is_christian": False}
    items = await db.themes.find(q, {"_id": 0}).sort("order", 1).to_list(100)
    return [Theme(**t) for t in items]


@api.get("/words", response_model=List[Word])
async def get_words(
    theme: Optional[str] = None,
    include_christian: bool = True,
    request: Request = None,
):
    q: dict = {}
    if theme:
        q["theme"] = theme
    if not include_christian:
        q["is_christian"] = False
    items = await db.words.find(q, {"_id": 0}).to_list(1000)
    # Overlay per-user custom images (if authenticated) + premium status
    custom = {}
    is_premium = False
    role = "user"
    try:
        token = request.cookies.get("session_token") if request else None
        if token:
            session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0, "user_id": 1})
            if session:
                u = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "is_premium": 1, "role": 1})
                if u:
                    is_premium = bool(u.get("is_premium")) or u.get("role") == "admin"
                    role = u.get("role") or "user"
                cursor = db.user_word_images.find({"user_id": session["user_id"]}, {"_id": 0, "word_id": 1, "image_data": 1})
                async for doc in cursor:
                    custom[doc["word_id"]] = doc["image_data"]
    except Exception:
        pass
    for w in items:
        if w["word_id"] in custom:
            w["image"] = custom[w["word_id"]]
            w["custom"] = True
        # Mark premium-locked words for non-premium users
        if w.get("tier") == "premium" and not is_premium:
            w["locked"] = True
    return [Word(**w) for w in items]


class CustomImageIn(BaseModel):
    image_b64: str = Field(..., min_length=20)


@api.post("/words/{word_id}/custom-image")
async def set_custom_image(word_id: str, data: CustomImageIn, user: User = Depends(get_current_user)):
    w = await db.words.find_one({"word_id": word_id}, {"_id": 0, "word_id": 1})
    if not w:
        raise HTTPException(status_code=404, detail="Word not found")
    if not data.image_b64.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Image invalide")
    if len(data.image_b64) > 600_000:
        raise HTTPException(status_code=413, detail="Image trop lourde (max 400 Ko)")
    await db.user_word_images.update_one(
        {"user_id": user.user_id, "word_id": word_id},
        {"$set": {
            "user_id": user.user_id,
            "word_id": word_id,
            "image_data": data.image_b64,
            "updated_at": now_utc().isoformat(),
        }},
        upsert=True,
    )
    return {"success": True}


@api.delete("/words/{word_id}/custom-image")
async def delete_custom_image(word_id: str, user: User = Depends(get_current_user)):
    await db.user_word_images.delete_one({"user_id": user.user_id, "word_id": word_id})
    return {"success": True}


# ---------------- Community Audio ----------------
AUDIO_MAX_LEN = 450_000  # ~340KB binary — plenty for 10 sec opus/webm
AUDIO_SUBMIT_CREDITS = 10


@api.post("/words/{word_id}/audio-submission")
async def submit_audio(word_id: str, data: AudioSubmissionIn, user: User = Depends(get_current_user)):
    w = await db.words.find_one({"word_id": word_id}, {"_id": 0, "word_id": 1, "lingala": 1})
    if not w:
        raise HTTPException(status_code=404, detail="Word not found")
    if not data.audio_b64.startswith("data:audio/"):
        raise HTTPException(status_code=400, detail="Format audio invalide")
    if len(data.audio_b64) > AUDIO_MAX_LEN:
        raise HTTPException(status_code=413, detail="Audio trop long (10 s max)")
    # Anti-spam : 1 audio max / jour / mot / user
    one_day_ago = (now_utc() - timedelta(hours=24)).isoformat()
    recent = await db.audio_submissions.count_documents({
        "user_id": user.user_id,
        "word_id": word_id,
        "created_at": {"$gte": one_day_ago},
    })
    if recent > 0:
        raise HTTPException(status_code=429, detail="Vous avez déjà envoyé un audio pour ce mot dans les 24 dernières heures.")
    # Anti-spam global : max 20 audios / jour / user
    daily_total = await db.audio_submissions.count_documents({
        "user_id": user.user_id,
        "created_at": {"$gte": one_day_ago},
    })
    if daily_total >= 20:
        raise HTTPException(status_code=429, detail="Quota quotidien atteint (20 audios/jour). Réessayez demain.")
    sub_id = f"aud_{uuid.uuid4().hex[:12]}"
    await db.audio_submissions.insert_one({
        "submission_id": sub_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "word_id": word_id,
        "word_lingala": w["lingala"],
        "audio_data": data.audio_b64,
        "status": "pending",
        "credits_awarded": AUDIO_SUBMIT_CREDITS,
        "created_at": now_utc().isoformat(),
    })
    # Award credits immediately (revoked on rejection)
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": AUDIO_SUBMIT_CREDITS}})
    new_credits = (user.credits or 0) + AUDIO_SUBMIT_CREDITS
    return {"success": True, "submission_id": sub_id, "credits_earned": AUDIO_SUBMIT_CREDITS, "credits_total": new_credits}


@api.get("/admin/audio-submissions")
async def admin_list_audio(status_filter: str = "pending", user: User = Depends(require_admin)):
    items = await db.audio_submissions.find({"status": status_filter}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.post("/admin/audio-submissions/{submission_id}/approve")
async def admin_approve_audio(submission_id: str, user: User = Depends(require_admin)):
    sub = await db.audio_submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["status"] == "approved":
        return {"success": True, "already_approved": True}
    await db.words.update_one({"word_id": sub["word_id"]}, {"$set": {"audio": sub["audio_data"], "audio_contributor": sub["user_id"]}})
    await db.audio_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "approved", "approved_at": now_utc().isoformat(), "approved_by": user.user_id}},
    )
    # Any other pending submissions for the same word become rejected (one audio per word)
    await db.audio_submissions.update_many(
        {"word_id": sub["word_id"], "status": "pending", "submission_id": {"$ne": submission_id}},
        {"$set": {"status": "superseded", "superseded_at": now_utc().isoformat()}},
    )
    return {"success": True}


@api.post("/admin/audio-submissions/{submission_id}/reject")
async def admin_reject_audio(submission_id: str, user: User = Depends(require_admin)):
    sub = await db.audio_submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["status"] == "rejected":
        return {"success": True, "already_rejected": True}
    await db.audio_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "rejected", "rejected_at": now_utc().isoformat(), "rejected_by": user.user_id}},
    )
    # Deduct previously awarded credits
    if sub.get("credits_awarded"):
        await db.users.update_one({"user_id": sub["user_id"]}, {"$inc": {"credits": -sub["credits_awarded"]}})
    return {"success": True}


@api.get("/words/{word_id}", response_model=Word)
async def get_word(word_id: str):
    w = await db.words.find_one({"word_id": word_id}, {"_id": 0})
    if not w:
        raise HTTPException(status_code=404, detail="Word not found")
    return Word(**w)


@api.post("/report-error")
async def report_error(data: ErrorReportIn, user: User = Depends(get_current_user)):
    w = await db.words.find_one({"word_id": data.word_id}, {"_id": 0})
    if not w:
        raise HTTPException(status_code=404, detail="Word not found")
    await db.error_reports.insert_one({
        "report_id": f"rep_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "word_id": data.word_id,
        "suggested_translation": data.suggested_translation,
        "comment": data.comment or "",
        "status": "pending",
        "created_at": now_utc().isoformat(),
    })
    return {"success": True, "message": "Merci pour votre signalement, il sera examiné."}


# ---------------- Child profiles ----------------
@api.get("/child-profiles", response_model=List[ChildProfile])
async def list_child_profiles(user: User = Depends(get_current_user)):
    items = await db.child_profiles.find({"user_id": user.user_id}, {"_id": 0}).to_list(50)
    for it in items:
        if isinstance(it.get("created_at"), str):
            it["created_at"] = datetime.fromisoformat(it["created_at"])
    return [ChildProfile(**it) for it in items]


@api.post("/child-profiles", response_model=ChildProfile)
async def create_child_profile(data: ChildProfileIn, user: User = Depends(get_current_user)):
    profile_id = f"child_{uuid.uuid4().hex[:12]}"
    doc = {
        "profile_id": profile_id,
        "user_id": user.user_id,
        "name": data.name,
        "age": data.age,
        "themes": data.themes,
        "christian_mode": data.christian_mode,
        "created_at": now_utc().isoformat(),
    }
    await db.child_profiles.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return ChildProfile(**doc)


@api.patch("/child-profiles/{profile_id}")
async def update_child_profile(profile_id: str, body: dict, user: User = Depends(get_current_user)):
    allowed = {k: v for k, v in body.items() if k in {"name", "age", "themes", "christian_mode"}}
    res = await db.child_profiles.update_one({"profile_id": profile_id, "user_id": user.user_id}, {"$set": allowed})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True}


@api.delete("/child-profiles/{profile_id}")
async def delete_child_profile(profile_id: str, user: User = Depends(get_current_user)):
    res = await db.child_profiles.delete_one({"profile_id": profile_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.progress.delete_many({"profile_id": profile_id})
    return {"success": True}


# ---------------- Progress ----------------
@api.post("/progress")
async def add_progress(data: ProgressIn, user: User = Depends(get_current_user)):
    doc = {
        "user_id": user.user_id,
        "profile_id": data.profile_id,
        "word_id": data.word_id,
        "learned": data.learned,
        "created_at": now_utc().isoformat(),
    }
    await db.progress.update_one(
        {"user_id": user.user_id, "profile_id": data.profile_id, "word_id": data.word_id},
        {"$set": doc},
        upsert=True,
    )
    return {"success": True}


@api.get("/progress")
async def get_progress(profile_id: Optional[str] = None, user: User = Depends(get_current_user)):
    q: dict = {"user_id": user.user_id}
    if profile_id:
        q["profile_id"] = profile_id
    items = await db.progress.find(q, {"_id": 0}).to_list(2000)
    learned_ids = [p["word_id"] for p in items if p.get("learned")]
    total_words = await db.words.count_documents({})
    return {
        "learned_word_ids": learned_ids,
        "count": len(learned_ids),
        "total": total_words,
        "percent": round(100 * len(learned_ids) / total_words) if total_words else 0,
    }


# ---------------- Quiz ----------------
@api.get("/quiz")
async def get_quiz(theme: Optional[str] = None, include_christian: bool = True, count: int = 5):
    q: dict = {}
    if theme:
        q["theme"] = theme
    if not include_christian:
        q["is_christian"] = False
    pipeline = [{"$match": q}, {"$sample": {"size": max(1, min(count, 10))}}, {"$project": {"_id": 0}}]
    sample = await db.words.aggregate(pipeline).to_list(count)
    # for each question, add 3 distractors
    all_words = await db.words.find(q, {"_id": 0, "word_id": 1, "french": 1, "image": 1, "lingala": 1}).to_list(200)
    questions = []
    for w in sample:
        distractors = [x for x in all_words if x["word_id"] != w["word_id"]]
        secrets.SystemRandom().shuffle(distractors)
        options = distractors[:3] + [{"word_id": w["word_id"], "french": w["french"], "image": w.get("image"), "lingala": w["lingala"]}]
        secrets.SystemRandom().shuffle(options)
        questions.append({
            "word_id": w["word_id"],
            "lingala": w["lingala"],
            "correct_french": w["french"],
            "example_ln": w.get("example_ln"),
            "example_fr": w.get("example_fr"),
            "options": options,
        })
    return {"questions": questions}


# ---------------- Contributions / Mission Lingala ----------------
@api.post("/contributions/words")
async def submit_word(data: WordSubmissionIn, user: User = Depends(get_current_user)):
    credits_earned = CREDITS_WORD + (CREDITS_EXAMPLE if (data.example_ln and data.example_fr) else 0)
    sub_id = f"sub_{uuid.uuid4().hex[:12]}"
    doc = {
        "submission_id": sub_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "french": data.french.strip(),
        "lingala": data.lingala.strip(),
        "theme": data.theme,
        "example_ln": (data.example_ln or "").strip(),
        "example_fr": (data.example_fr or "").strip(),
        "status": "pending",
        "credits_awarded": credits_earned,
        "validated_by": [],
        "created_at": now_utc().isoformat(),
    }
    await db.word_submissions.insert_one(doc.copy())
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": credits_earned}})
    new_credits = (user.credits or 0) + credits_earned
    return {
        "success": True,
        "submission_id": sub_id,
        "credits_earned": credits_earned,
        "credits_total": new_credits,
        "level": compute_level(new_credits),
    }


@api.get("/contributions/words")
async def list_my_contributions(user: User = Depends(get_current_user)):
    items = await db.word_submissions.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


@api.get("/contributions/community")
async def list_community_contributions(limit: int = 30):
    items = await db.word_submissions.find(
        {"status": {"$in": ["pending", "approved"]}},
        {"_id": 0, "user_id": 0},
    ).sort("created_at", -1).to_list(limit)
    return items


@api.post("/contributions/validate/{submission_id}")
async def validate_submission(submission_id: str, user: User = Depends(get_current_user)):
    sub = await db.word_submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Contribution introuvable")
    if sub["user_id"] == user.user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas valider votre propre contribution")
    if user.user_id in sub.get("validated_by", []):
        raise HTTPException(status_code=400, detail="Vous avez déjà validé cette contribution")
    await db.word_submissions.update_one(
        {"submission_id": submission_id},
        {"$addToSet": {"validated_by": user.user_id}},
    )
    # Reward the validator with 2 credits
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": 2}})
    return {"success": True, "credits_earned": 2}


@api.get("/contributions/missions")
async def get_missions(user: User = Depends(get_current_user)):
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    # Mission 1: add 1 word today
    word_today = await db.word_submissions.count_documents(
        {"user_id": user.user_id, "created_at": {"$gte": start_of_day}}
    )
    # Mission 2: validate 3 words
    validated_today = await db.word_submissions.count_documents(
        {"validated_by": user.user_id, "created_at": {"$gte": start_of_day}}
    )
    return {
        "missions": [
            {"key": "add_word", "label": "Ajoute 1 mot aujourd'hui", "reward": 5, "progress": min(word_today, 1), "target": 1, "done": word_today >= 1},
            {"key": "validate_3", "label": "Valide 3 traductions de la communauté", "reward": 6, "progress": min(validated_today, 3), "target": 3, "done": validated_today >= 3},
        ]
    }


@api.get("/me/level")
async def my_level(user: User = Depends(get_current_user)):
    return {"credits": user.credits, "level": compute_level(user.credits or 0)}


# ---------------- Badges ----------------
BADGES_DEF = [
    {"key": "first_word", "label": "Premier mot appris", "icon": "sprout", "desc": "Vous avez marqué votre premier mot comme appris."},
    {"key": "ten_words", "label": "10 mots maîtrisés", "icon": "star", "desc": "Votre enfant connaît déjà 10 mots Lingala."},
    {"key": "twenty_words", "label": "Tout le dictionnaire de base", "icon": "trophy", "desc": "Vous avez parcouru les 20 mots du MVP."},
    {"key": "first_contribution", "label": "Premier contributeur", "icon": "plus", "desc": "Vous avez proposé votre premier mot à la communauté."},
    {"key": "five_contributions", "label": "Plume Lingala", "icon": "feather", "desc": "5 mots proposés à la communauté."},
    {"key": "first_audio", "label": "Voix de la communauté", "icon": "mic", "desc": "Vous avez enregistré votre première prononciation."},
    {"key": "first_photo", "label": "Album famille", "icon": "image", "desc": "Vous avez personnalisé votre première carte avec une photo."},
    {"key": "level_aide_parent", "label": "Aide-parent", "icon": "users", "desc": "Vous avez atteint le niveau Aide-parent (21+ crédits)."},
    {"key": "level_gardien", "label": "Gardien des mots", "icon": "shield", "desc": "Vous avez atteint le niveau Gardien des mots (51+ crédits)."},
    {"key": "level_ambassadeur", "label": "Ambassadeur Lingala", "icon": "flag", "desc": "Vous portez le Lingala (101+ crédits)."},
]


@api.get("/me/badges")
async def my_badges(user: User = Depends(get_current_user)):
    progress_count = await db.progress.count_documents({"user_id": user.user_id, "learned": True})
    contrib_count = await db.word_submissions.count_documents({"user_id": user.user_id})
    audio_count = await db.audio_submissions.count_documents({"user_id": user.user_id})
    photo_count = await db.user_word_images.count_documents({"user_id": user.user_id})
    credits = user.credits or 0

    earned = set()
    if progress_count >= 1: earned.add("first_word")
    if progress_count >= 10: earned.add("ten_words")
    if progress_count >= 20: earned.add("twenty_words")
    if contrib_count >= 1: earned.add("first_contribution")
    if contrib_count >= 5: earned.add("five_contributions")
    if audio_count >= 1: earned.add("first_audio")
    if photo_count >= 1: earned.add("first_photo")
    if credits >= 21: earned.add("level_aide_parent")
    if credits >= 51: earned.add("level_gardien")
    if credits >= 101: earned.add("level_ambassadeur")

    items = [{**b, "earned": b["key"] in earned} for b in BADGES_DEF]
    return {
        "badges": items,
        "earned_count": len(earned),
        "total": len(BADGES_DEF),
        "stats": {
            "words_learned": progress_count,
            "contributions": contrib_count,
            "audios": audio_count,
            "photos": photo_count,
            "credits": credits,
        },
    }


# ---------------- Photo gallery (Mode Parent) ----------------
@api.get("/me/photo-gallery")
async def my_photo_gallery(user: User = Depends(get_current_user)):
    items = await db.user_word_images.find(
        {"user_id": user.user_id}, {"_id": 0, "word_id": 1, "image_data": 1, "updated_at": 1}
    ).sort("updated_at", -1).to_list(200)
    if not items:
        return {"photos": []}
    word_ids = [it["word_id"] for it in items]
    words = await db.words.find({"word_id": {"$in": word_ids}}, {"_id": 0, "word_id": 1, "lingala": 1, "french": 1}).to_list(500)
    by_id = {w["word_id"]: w for w in words}
    out = []
    for it in items:
        w = by_id.get(it["word_id"])
        if not w:
            continue
        out.append({
            "word_id": it["word_id"],
            "lingala": w["lingala"],
            "french": w["french"],
            "image": it["image_data"],
            "updated_at": it.get("updated_at"),
        })
    return {"photos": out}


# ---------------- Weekly program (P2) ----------------
class WeeklyProgramIn(BaseModel):
    age: int = 5
    themes: List[str] = ["famille"]


@api.post("/weekly-program/generate")
async def generate_weekly_program(data: WeeklyProgramIn, user: User = Depends(get_current_user)):
    cost = AI_COSTS["weekly_program"]
    if (user.credits or 0) < cost:
        raise HTTPException(status_code=402, detail=f"Crédits insuffisants ({cost} requis).")
    res = await db.users.update_one(
        {"user_id": user.user_id, "credits": {"$gte": cost}}, {"$inc": {"credits": -cost}}
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=402, detail="Crédits insuffisants")
    try:
        themes = ", ".join(data.themes or ["famille"])
        prompt = AI_PROMPTS["weekly_program"].format(age=data.age, themes=themes)
        content = await call_mammouth([{"role": "user", "content": prompt}])
        program_id = f"prog_{uuid.uuid4().hex[:12]}"
        # Replace any existing active program for this user
        await db.weekly_programs.update_many({"user_id": user.user_id}, {"$set": {"active": False}})
        doc = {
            "program_id": program_id,
            "user_id": user.user_id,
            "age": data.age,
            "themes": data.themes,
            "content": content,
            "active": True,
            "created_at": now_utc().isoformat(),
        }
        await db.weekly_programs.insert_one(doc.copy())
        new_credits = (user.credits or 0) - cost
        return {"success": True, "program_id": program_id, "content": content, "credits_total": new_credits}
    except HTTPException:
        await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": cost}})
        raise


@api.get("/weekly-program")
async def get_active_weekly_program(user: User = Depends(get_current_user)):
    doc = await db.weekly_programs.find_one(
        {"user_id": user.user_id, "active": True}, {"_id": 0}, sort=[("created_at", -1)]
    )
    return doc or {"program_id": None}


# ---------------- Admin Moderation ----------------
@api.get("/admin/submissions")
async def admin_list_submissions(status_filter: str = "pending", user: User = Depends(require_admin)):
    items = await db.word_submissions.find({"status": status_filter}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/admin/submissions/{submission_id}/approve")
async def admin_approve_submission(submission_id: str, user: User = Depends(require_admin)):
    sub = await db.word_submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["status"] == "approved":
        return {"success": True, "already_approved": True}
    word_doc = {
        "word_id": f"word_{uuid.uuid4().hex[:12]}",
        "lingala": sub["lingala"],
        "french": sub["french"],
        "theme": sub["theme"] if sub["theme"] in {"famille", "nourriture", "emotions", "bible"} else "famille",
        "example_ln": sub.get("example_ln", ""),
        "example_fr": sub.get("example_fr", ""),
        "is_christian": sub["theme"] == "bible",
        "image": None,
        "source_submission_id": submission_id,
        "contributor_id": sub["user_id"],
    }
    await db.words.insert_one(word_doc.copy())
    await db.word_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "approved", "approved_at": now_utc().isoformat(), "approved_by": user.user_id, "published_word_id": word_doc["word_id"]}},
    )
    return {"success": True, "word_id": word_doc["word_id"]}


@api.post("/admin/submissions/{submission_id}/reject")
async def admin_reject_submission(submission_id: str, user: User = Depends(require_admin)):
    sub = await db.word_submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["status"] == "rejected":
        return {"success": True, "already_rejected": True}
    await db.word_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {"status": "rejected", "rejected_at": now_utc().isoformat(), "rejected_by": user.user_id}},
    )
    # Deduct the awarded credits back (if any)
    credits_to_remove = sub.get("credits_awarded", 0)
    if credits_to_remove:
        await db.users.update_one({"user_id": sub["user_id"]}, {"$inc": {"credits": -credits_to_remove}})
    return {"success": True}


# ---------------- AI Assistant (Mammouth / Claude Sonnet) ----------------
AI_COSTS = {"sentence": 1, "daily_sentences": 3, "translate": 2, "mini_story": 8, "prayer": 5, "activity": 4, "coach": 4, "weekly_program": 12}

AI_PROMPTS = {
    "sentence": "Tu es un assistant qui aide les parents à transmettre le Lingala. Génère UNE phrase simple en Lingala sur le thème '{theme}' pour un enfant de {age} ans. Format exact (français) :\nLingala : ...\nFrançais : ...\nConseil : ... (une phrase courte pour le parent)",
    "daily_sentences": "Génère 3 phrases du jour simples en Lingala pour un enfant de {age} ans, thème '{theme}'. Pour chaque phrase :\n1. Lingala : ...\n   Français : ...\n   Conseil : ...\n2. ...\n3. ...",
    "translate": "Traduis la phrase française suivante en Lingala correct, pour un enfant. Explique simplement ta traduction en 1 ligne.\nPhrase : {french}\nFormat :\nLingala : ...\nExplication : ...",
    "mini_story": "Crée une mini-histoire tendre et simple en Lingala pour un enfant de {age} ans (150-200 mots), en utilisant ces mots clés : {words}. Format :\nTitre : ...\nHistoire (Lingala) : ...\nTraduction française : ...\n3 questions à poser à l'enfant après l'histoire : ...",
    "prayer": "Compose une prière courte et rassurante en Lingala (3 à 5 lignes) pour un enfant de {age} ans, thème '{theme}'. Format :\nPrière (Lingala) : ...\nTraduction française : ...",
    "activity": "Propose une activité parent-enfant simple (5 minutes, sans écran) autour du mot Lingala '{word}' pour un enfant de {age} ans. Format :\nActivité : ...\nÉtapes :\n1. ...\n2. ...\n3. ...\nVariante plus facile : ...",
    "coach": "Tu es un coach bienveillant et expérimenté qui aide les parents congolais (ou de la diaspora) à transmettre le Lingala et les valeurs familiales à leurs enfants (0-10 ans). Réponds avec chaleur, sans jugement, en français, en 4-6 phrases maximum, et propose 1 ou 2 actions concrètes adaptées à l'âge {age} ans. Question du parent : {question}\n\nFormat :\nRéponse : ...\nActions concrètes :\n1. ...\n2. ...",
    "weekly_program": "Tu es un coach pédagogique Lingala. Crée un programme de transmission du Lingala sur 7 jours, pour un enfant de {age} ans, thèmes prioritaires : {themes}. Pour chaque jour (Lundi à Dimanche), donne EXACTEMENT ce format en français :\nJour X — [Titre court motivant]\n• Mot du jour : [lingala] = [français]\n• Phrase à dire : [lingala] — [français]\n• Activité (3-5 min, sans écran) : [description courte]\n• Conseil parent : [1 phrase]\n\nLe programme doit être progressif, doux et réaliste pour un quotidien occupé.",
}


class AIGenerateIn(BaseModel):
    action: str
    params: dict = {}


async def call_mammouth(messages: list) -> str:
    if not MAMMOTH_API_KEY:
        raise HTTPException(status_code=503, detail="Service IA indisponible (clé manquante)")
    payload = {"model": MAMMOTH_MODEL, "messages": messages, "temperature": 0.7, "max_tokens": 900}
    try:
        async with httpx.AsyncClient(timeout=60.0) as http:
            r = await http.post(
                f"{MAMMOTH_API_URL}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {MAMMOTH_API_KEY}", "Content-Type": "application/json"},
            )
            if r.status_code != 200:
                logger.error("Mammouth error %s: %s", r.status_code, r.text[:500])
                raise HTTPException(status_code=502, detail=f"Service IA : {r.status_code}")
            data = r.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPError as e:
        logger.error("Mammouth network error: %s", e)
        raise HTTPException(status_code=502, detail="Service IA injoignable")


@api.post("/ai/generate")
async def ai_generate(data: AIGenerateIn, user: User = Depends(get_current_user)):
    action = data.action
    if action not in AI_COSTS:
        raise HTTPException(status_code=400, detail="Action IA inconnue")
    if action == "translate" and not (data.params or {}).get("french", "").strip():
        raise HTTPException(status_code=400, detail="Phrase française requise pour traduire")
    if action == "mini_story" and not (data.params or {}).get("words", "").strip():
        raise HTTPException(status_code=400, detail="Mots clés requis pour l'histoire")
    if action == "coach" and not (data.params or {}).get("question", "").strip():
        raise HTTPException(status_code=400, detail="Posez votre question au coach")
    cost = AI_COSTS[action]
    if (user.credits or 0) < cost:
        raise HTTPException(status_code=402, detail=f"Crédits insuffisants ({cost} requis). Contribuez ou achetez un pack.")
    # Deduct credits first (atomic check-and-decrement)
    res = await db.users.update_one(
        {"user_id": user.user_id, "credits": {"$gte": cost}},
        {"$inc": {"credits": -cost}},
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=402, detail="Crédits insuffisants")
    try:
        params = {"theme": "famille", "age": 5, "french": "", "words": "", "word": "", "question": "", "themes": "famille"}
        params.update(data.params or {})
        prompt = AI_PROMPTS[action].format(**params)
        messages = [{"role": "user", "content": prompt}]
        content = await call_mammouth(messages)
        new_credits = (user.credits or 0) - cost
        # Store generation history
        await db.ai_generations.insert_one({
            "user_id": user.user_id,
            "action": action,
            "params": data.params or {},
            "cost": cost,
            "created_at": now_utc().isoformat(),
        })
        return {"success": True, "action": action, "content": content, "credits_spent": cost, "credits_total": new_credits}
    except HTTPException:
        # Refund on AI failure
        await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": cost}})
        raise


# ---------------- Billing (Mollie) ----------------
PACKS = {
    "pack_5": {"amount": "5.00", "credits": 500, "label": "Pack 500 crédits"},
    "pack_10": {"amount": "10.00", "credits": 1200, "label": "Pack 1200 crédits"},
    "pack_20": {"amount": "20.00", "credits": 3000, "label": "Pack 3000 crédits"},
}
SUBSCRIPTION_AMOUNT = "12.99"


class CheckoutIn(BaseModel):
    type: str  # "pack" or "subscription"
    pack_id: Optional[str] = None


async def mollie_request(method: str, path: str, json_body: Optional[dict] = None):
    if not MOLLIE_API_KEY:
        raise HTTPException(status_code=503, detail="Paiement indisponible (clé manquante)")
    headers = {"Authorization": f"Bearer {MOLLIE_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.request(method, f"{MOLLIE_API_URL}{path}", json=json_body, headers=headers)
        if r.status_code >= 400:
            logger.error("Mollie %s %s → %s: %s", method, path, r.status_code, r.text[:500])
            raise HTTPException(status_code=502, detail=f"Erreur paiement (Mollie {r.status_code})")
        return r.json()


@api.post("/billing/checkout")
async def billing_checkout(body: CheckoutIn, user: User = Depends(get_current_user)):
    if body.type == "pack":
        if not body.pack_id or body.pack_id not in PACKS:
            raise HTTPException(status_code=400, detail="Pack invalide")
        pack = PACKS[body.pack_id]
        description = f"Mwana Lingala — {pack['label']}"
        amount = pack["amount"]
        metadata = {"user_id": user.user_id, "type": "pack", "pack_id": body.pack_id, "credits": pack["credits"]}
    elif body.type == "subscription":
        description = "Mwana Lingala — Abonnement Premium (1 mois)"
        amount = SUBSCRIPTION_AMOUNT
        metadata = {"user_id": user.user_id, "type": "subscription"}
    else:
        raise HTTPException(status_code=400, detail="Type inconnu")

    payload = {
        "amount": {"currency": "EUR", "value": amount},
        "description": description,
        "redirectUrl": f"{PUBLIC_BASE_URL}/billing/return",
        "webhookUrl": f"{PUBLIC_BASE_URL}/api/billing/webhook",
        "metadata": metadata,
    }
    res = await mollie_request("POST", "/payments", payload)
    # Save local record
    await db.payments.insert_one({
        "payment_id": res["id"],
        "user_id": user.user_id,
        "type": body.type,
        "pack_id": body.pack_id,
        "amount": amount,
        "currency": "EUR",
        "status": res.get("status", "open"),
        "credits_granted": False,
        "metadata": metadata,
        "created_at": now_utc().isoformat(),
    })
    return {"payment_id": res["id"], "checkout_url": res["_links"]["checkout"]["href"]}


async def _apply_paid_payment(payment_id: str) -> dict:
    """Idempotent: fetch Mollie status, grant credits or activate subscription if paid."""
    local = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not local:
        raise HTTPException(status_code=404, detail="Paiement inconnu")
    remote = await mollie_request("GET", f"/payments/{payment_id}")
    status_now = remote.get("status")
    await db.payments.update_one({"payment_id": payment_id}, {"$set": {"status": status_now}})
    if status_now == "paid" and not local.get("credits_granted"):
        meta = local.get("metadata", {})
        if meta.get("type") == "pack":
            credits = meta.get("credits", 0)
            await db.users.update_one({"user_id": local["user_id"]}, {"$inc": {"credits": credits}})
        elif meta.get("type") == "subscription":
            expires = now_utc() + timedelta(days=30)
            await db.users.update_one(
                {"user_id": local["user_id"]},
                {"$set": {"is_premium": True, "premium_until": expires.isoformat()}, "$inc": {"credits": 200}},
            )
        await db.payments.update_one({"payment_id": payment_id}, {"$set": {"credits_granted": True, "granted_at": now_utc().isoformat()}})
    return {"payment_id": payment_id, "status": status_now, "type": local.get("type")}


@api.get("/billing/verify/{payment_id}")
async def billing_verify(payment_id: str, user: User = Depends(get_current_user)):
    return await _apply_paid_payment(payment_id)


@api.post("/billing/webhook")
async def billing_webhook(request: Request):
    # Mollie sends form-encoded id=tr_xxx
    try:
        form = await request.form()
        pid = form.get("id")
        if not pid:
            body = await request.body()
            logger.warning("Mollie webhook without id: %s", body[:200])
            return {"received": True}
        await _apply_paid_payment(pid)
    except Exception as e:
        logger.error("Webhook error: %s", e)
    return {"received": True}


# ---------------- Onboarding ----------------
@api.get("/onboarding/status")
async def onboarding_status(user: User = Depends(get_current_user)):
    count = await db.child_profiles.count_documents({"user_id": user.user_id})
    return {"needs_onboarding": count == 0}


# ---------------- Testimonials ----------------
DEFAULT_TESTIMONIALS = [
    {
        "testimonial_id": f"tst_{uuid.uuid4().hex[:8]}",
        "quote": "Mon fils de 4 ans répète Mama, Tata et Mayi tous les matins. Il est si fier de parler la langue de son papa.",
        "author_name": "Grace",
        "author_role": "Maman de Zayado",
        "image": "/images/temoignage-grace.png",
        "active": True,
        "order": 1,
    },
    {
        "testimonial_id": f"tst_{uuid.uuid4().hex[:8]}",
        "quote": "Enfin une app qui me guide sans remplacer nos moments ensemble. On apprend en famille, pas devant un écran.",
        "author_name": "Joseph",
        "author_role": "Papa de Milla",
        "image": "/images/temoignage-joseph.png",
        "active": True,
        "order": 2,
    },
    {
        "testimonial_id": f"tst_{uuid.uuid4().hex[:8]}",
        "quote": "Le mode chrétien nous aide à dire merci en Lingala chaque soir avec mes jumeaux. C'est devenu notre rituel préféré.",
        "author_name": "Clémentine",
        "author_role": "Maman de jumeaux",
        "image": "/images/temoignage-clementine.png",
        "active": True,
        "order": 3,
    },
]


class TestimonialIn(BaseModel):
    quote: str = Field(..., min_length=10, max_length=600)
    author_name: str = Field(..., min_length=2, max_length=100)
    author_role: Optional[str] = ""
    image: Optional[str] = ""
    active: bool = True
    order: int = 0


@api.get("/testimonials")
async def list_testimonials_public():
    items = await db.testimonials.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return items


@api.get("/admin/testimonials")
async def admin_list_testimonials(user: User = Depends(require_admin)):
    items = await db.testimonials.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return items


@api.post("/admin/testimonials")
async def admin_create_testimonial(data: TestimonialIn, user: User = Depends(require_admin)):
    doc = data.model_dump()
    doc["testimonial_id"] = f"tst_{uuid.uuid4().hex[:10]}"
    doc["created_at"] = now_utc().isoformat()
    await db.testimonials.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/testimonials/{testimonial_id}")
async def admin_update_testimonial(testimonial_id: str, data: TestimonialIn, user: User = Depends(require_admin)):
    upd = data.model_dump()
    res = await db.testimonials.update_one({"testimonial_id": testimonial_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Témoignage introuvable")
    return {"success": True}


@api.delete("/admin/testimonials/{testimonial_id}")
async def admin_delete_testimonial(testimonial_id: str, user: User = Depends(require_admin)):
    res = await db.testimonials.delete_one({"testimonial_id": testimonial_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Témoignage introuvable")
    return {"success": True}


# ---------------- Admin Users ----------------
@api.get("/admin/users")
async def admin_list_users(q: str = "", limit: int = 100, user: User = Depends(require_admin)):
    query = {}
    if q:
        query = {"$or": [{"email": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]}
    users = await db.users.find(query, {"_id": 0, "hashed_password": 0}).sort("created_at", -1).to_list(limit)
    # Add basic stats per user
    for u in users:
        u["progress_count"] = await db.progress.count_documents({"user_id": u["user_id"], "learned": True})
        u["contributions_count"] = await db.word_submissions.count_documents({"user_id": u["user_id"]})
    return users


class AdminUserUpdateIn(BaseModel):
    role: Optional[str] = None
    credits: Optional[int] = None
    is_premium: Optional[bool] = None
    banned: Optional[bool] = None


@api.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: AdminUserUpdateIn, admin_user: User = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    if not upd:
        return {"success": True}
    if "role" in upd and upd["role"] not in {"user", "admin"}:
        raise HTTPException(status_code=400, detail="role invalide")
    res = await db.users.update_one({"user_id": user_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"success": True}


@api.post("/admin/users/{user_id}/credits")
async def admin_grant_credits(user_id: str, body: dict, admin_user: User = Depends(require_admin)):
    delta = int(body.get("delta", 0))
    if delta == 0:
        return {"success": True}
    res = await db.users.update_one({"user_id": user_id}, {"$inc": {"credits": delta}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return {"success": True}


@api.get("/admin/stats")
async def admin_stats(user: User = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    premium_users = await db.users.count_documents({"is_premium": True})
    seven_days_ago = (now_utc() - timedelta(days=7)).isoformat()
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": seven_days_ago}})
    total_words = await db.words.count_documents({})
    total_audios = await db.audio_submissions.count_documents({"status": "approved"})
    pending_words = await db.word_submissions.count_documents({"status": "pending"})
    pending_audios = await db.audio_submissions.count_documents({"status": "pending"})
    total_contributions = await db.word_submissions.count_documents({})
    total_progress = await db.progress.count_documents({"learned": True})
    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "new_users_7d": new_users_7d,
        "total_words": total_words,
        "approved_audios": total_audios,
        "pending_words": pending_words,
        "pending_audios": pending_audios,
        "total_contributions": total_contributions,
        "total_progress": total_progress,
    }


# ---------------- Early Bird Launch (10 parents free 30 days) ----------------
EARLY_BIRD_LIMIT = 10
EARLY_BIRD_DAYS = 30


@api.get("/early-bird/status")
async def early_bird_status():
    claimed = await db.users.count_documents({"early_bird": True})
    remaining = max(0, EARLY_BIRD_LIMIT - claimed)
    return {
        "limit": EARLY_BIRD_LIMIT,
        "claimed": claimed,
        "remaining": remaining,
        "active": remaining > 0,
        "trial_days": EARLY_BIRD_DAYS,
    }


@api.post("/early-bird/claim")
async def early_bird_claim(user: User = Depends(get_current_user)):
    # Already early bird?
    me = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "early_bird": 1, "is_premium": 1})
    if me and me.get("early_bird"):
        raise HTTPException(status_code=409, detail="Vous bénéficiez déjà de l'offre de lancement.")
    # Atomic claim with a hard limit
    claimed = await db.users.count_documents({"early_bird": True})
    if claimed >= EARLY_BIRD_LIMIT:
        raise HTTPException(status_code=410, detail="Offre de lancement épuisée. Merci de votre intérêt !")
    until = (now_utc() + timedelta(days=EARLY_BIRD_DAYS)).isoformat()
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"early_bird": True, "early_bird_until": until, "is_premium": True, "premium_until": until, "credits": (user.credits or 0) + 100}},
    )
    return {"success": True, "premium_until": until, "credits_bonus": 100}


# ---------------- Feedback (beta) ----------------
class FeedbackIn(BaseModel):
    message: str = Field(..., min_length=4, max_length=2000)
    rating: Optional[int] = None  # 1-5
    page: Optional[str] = ""


@api.post("/feedback")
async def submit_feedback(data: FeedbackIn, user: User = Depends(get_current_user)):
    doc = {
        "feedback_id": f"fb_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id,
        "user_email": user.email,
        "user_name": user.name,
        "message": data.message.strip(),
        "rating": data.rating,
        "page": data.page or "",
        "early_bird": False,
        "created_at": now_utc().isoformat(),
    }
    me = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "early_bird": 1})
    if me and me.get("early_bird"):
        doc["early_bird"] = True
    await db.feedbacks.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"success": True}


@api.get("/admin/feedback")
async def admin_list_feedback(user: User = Depends(require_admin)):
    items = await db.feedbacks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


# ---------------- Admin Words CRUD ----------------
class AdminWordAssetIn(BaseModel):
    image_b64: Optional[str] = None  # data:image/...
    audio_b64: Optional[str] = None  # data:audio/...


@api.post("/admin/words/{word_id}/asset")
async def admin_set_word_asset(word_id: str, data: AdminWordAssetIn, user: User = Depends(require_admin)):
    upd = {}
    if data.image_b64 is not None:
        if data.image_b64 and not data.image_b64.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="Format image invalide")
        upd["image"] = data.image_b64 or None
    if data.audio_b64 is not None:
        if data.audio_b64 and not data.audio_b64.startswith("data:audio/"):
            raise HTTPException(status_code=400, detail="Format audio invalide")
        upd["audio"] = data.audio_b64 or None
    if not upd:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    res = await db.words.update_one({"word_id": word_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mot introuvable")
    return {"success": True}


@api.post("/admin/words")
async def admin_create_word(data: AdminWordIn, user: User = Depends(require_admin)):
    doc = data.model_dump()
    doc["word_id"] = f"word_{uuid.uuid4().hex[:12]}"
    doc["created_at"] = now_utc().isoformat()
    await db.words.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/words/{word_id}")
async def admin_update_word(word_id: str, data: AdminWordIn, user: User = Depends(require_admin)):
    upd = data.model_dump()
    res = await db.words.update_one({"word_id": word_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mot introuvable")
    return {"success": True}


@api.delete("/admin/words/{word_id}")
async def admin_delete_word(word_id: str, user: User = Depends(require_admin)):
    res = await db.words.delete_one({"word_id": word_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mot introuvable")
    return {"success": True}


@api.get("/admin/words")
async def admin_list_words(theme: Optional[str] = None, user: User = Depends(require_admin)):
    q = {"theme": theme} if theme else {}
    items = await db.words.find(q, {"_id": 0}).sort("theme", 1).to_list(2000)
    return items


# ---------------- Plans (forfaits) ----------------
DEFAULT_PLANS = [
    {
        "plan_id": f"plan_free_{uuid.uuid4().hex[:6]}",
        "slug": "free",
        "name": "Gratuit",
        "price_eur": 0,
        "period": "",
        "tagline": "Pour découvrir l'app.",
        "features": [
            "20 mots, 4 thèmes",
            "Audio des mots",
            "1 mini-quiz",
            "Mode parent basique",
        ],
        "cta_label": "Commencer gratuitement",
        "highlight": False,
        "active": True,
        "order": 1,
    },
    {
        "plan_id": f"plan_premium_{uuid.uuid4().hex[:6]}",
        "slug": "premium",
        "name": "Premium",
        "price_eur": 12.99,
        "period": "par mois — résiliable à tout moment.",
        "tagline": "★ Recommandé",
        "features": [
            "Tous les mots et thèmes (illimité)",
            "Cartes personnalisables (photos, voix)",
            "Playlists audio illimitées",
            "Mode parent avancé + progression",
            "Mode chrétien optionnel",
            "200 crédits IA / mois inclus",
        ],
        "cta_label": "Devenir Premium",
        "highlight": True,
        "active": True,
        "order": 2,
    },
]


class PlanIn(BaseModel):
    slug: str = Field(..., min_length=2, max_length=40)
    name: str = Field(..., min_length=2, max_length=100)
    price_eur: float = 0
    period: str = ""
    tagline: str = ""
    features: List[str] = []
    cta_label: str = "S'abonner"
    highlight: bool = False
    active: bool = True
    order: int = 0


@api.get("/plans")
async def list_plans_public():
    items = await db.plans.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(20)
    return items


@api.get("/admin/plans")
async def admin_list_plans(user: User = Depends(require_admin)):
    items = await db.plans.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return items


@api.post("/admin/plans")
async def admin_create_plan(data: PlanIn, user: User = Depends(require_admin)):
    doc = data.model_dump()
    doc["plan_id"] = f"plan_{uuid.uuid4().hex[:10]}"
    doc["created_at"] = now_utc().isoformat()
    await db.plans.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.patch("/admin/plans/{plan_id}")
async def admin_update_plan(plan_id: str, data: PlanIn, user: User = Depends(require_admin)):
    res = await db.plans.update_one({"plan_id": plan_id}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    return {"success": True}


@api.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, user: User = Depends(require_admin)):
    res = await db.plans.delete_one({"plan_id": plan_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    return {"success": True}


# ---------------- Seeding ----------------
async def seed_content():
    if await db.themes.count_documents({}) == 0:
        await db.themes.insert_many([t.copy() for t in THEMES])
        logger.info("Seeded %d themes", len(THEMES))
    else:
        # Add any new themes that aren't yet in DB
        existing_slugs = {t["slug"] for t in await db.themes.find({}, {"_id": 0, "slug": 1}).to_list(50)}
        new_themes = [t for t in THEMES if t["slug"] not in existing_slugs]
        if new_themes:
            await db.themes.insert_many([t.copy() for t in new_themes])
            logger.info("Added %d new themes", len(new_themes))

    # Words: insert any missing word (matched by lingala+theme)
    if await db.words.count_documents({}) == 0:
        docs = []
        for w in WORDS:
            d = w.copy()
            d["word_id"] = f"word_{uuid.uuid4().hex[:12]}"
            d.setdefault("tier", "free")
            docs.append(d)
        await db.words.insert_many(docs)
        logger.info("Seeded %d words", len(docs))
    else:
        # Backfill missing words from updated seed list
        existing = {(w["lingala"], w["theme"]) for w in await db.words.find({}, {"_id": 0, "lingala": 1, "theme": 1}).to_list(2000)}
        missing = [w for w in WORDS if (w["lingala"], w["theme"]) not in existing]
        if missing:
            docs = []
            for w in missing:
                d = w.copy()
                d["word_id"] = f"word_{uuid.uuid4().hex[:12]}"
                d.setdefault("tier", "free")
                docs.append(d)
            await db.words.insert_many(docs)
            logger.info("Added %d missing words", len(missing))
        # Backfill 'tier' field on legacy docs
        await db.words.update_many({"tier": {"$exists": False}}, {"$set": {"tier": "free"}})

    if await db.testimonials.count_documents({}) == 0:
        await db.testimonials.insert_many([t.copy() for t in DEFAULT_TESTIMONIALS])
        logger.info("Seeded %d testimonials", len(DEFAULT_TESTIMONIALS))

    if await db.plans.count_documents({}) == 0:
        await db.plans.insert_many([p.copy() for p in DEFAULT_PLANS])
        logger.info("Seeded %d plans", len(DEFAULT_PLANS))


@app.on_event("startup")
async def _startup():
    await seed_content()
    # Ensure Mongo indexes
    try:
        await db.user_word_images.create_index([("user_id", 1), ("word_id", 1)], unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("expires_at")
        await db.otp_codes.create_index("email", unique=True)
        await db.otp_codes.create_index("expires_at")
        await db.words.create_index("word_id", unique=True)
        await db.words.create_index("theme")
        await db.progress.create_index([("user_id", 1), ("profile_id", 1), ("word_id", 1)], unique=True)
        await db.child_profiles.create_index("user_id")
        await db.child_profiles.create_index("profile_id", unique=True)
        await db.word_submissions.create_index("status")
        await db.word_submissions.create_index([("user_id", 1), ("created_at", -1)])
        await db.audio_submissions.create_index("status")
        await db.audio_submissions.create_index([("user_id", 1), ("word_id", 1), ("created_at", -1)])
        await db.audio_submissions.create_index([("user_id", 1), ("created_at", -1)])
        await db.payments.create_index("payment_id", unique=True)
        await db.payments.create_index([("user_id", 1), ("created_at", -1)])
        await db.weekly_programs.create_index([("user_id", 1), ("active", 1)])
        await db.testimonials.create_index([("active", 1), ("order", 1)])
        await db.testimonials.create_index("testimonial_id", unique=True)
        await db.plans.create_index("plan_id", unique=True)
        await db.plans.create_index([("active", 1), ("order", 1)])
        await db.feedbacks.create_index([("created_at", -1)])
        await db.feedbacks.create_index("feedback_id", unique=True)
        await db.users.create_index("early_bird")
        await db.ai_generations.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("Mongo indexes ensured")
    except Exception as e:
        logger.warning("Index creation skipped: %s", e)


@app.on_event("shutdown")
async def _shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "Mwana Lingala", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

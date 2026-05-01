"""Mwana Lingala backend - FastAPI + MongoDB.

Auth: Emergent Google OAuth + Email OTP via Brevo.
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
    """Send OTP via Brevo transactional API."""
    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set, skipping email send. OTP for %s: %s", email, code)
        return True  # dev mode: return True so flow continues
    html = f"""
    <div style="font-family:Nunito,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#F5E6C8;border-radius:24px;">
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
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": email}],
        "subject": "Votre code Mwana Lingala",
        "htmlContent": html,
    }
    headers = {"accept": "application/json", "api-key": BREVO_API_KEY, "content-type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            r = await http.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers)
            if r.status_code in (200, 201):
                logger.info("Brevo OTP sent to %s", email)
                return True
            logger.error("Brevo error %s: %s", r.status_code, r.text)
            return False
    except Exception as e:
        logger.error("Brevo send failed: %s", e)
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
async def get_words(theme: Optional[str] = None, include_christian: bool = True):
    q: dict = {}
    if theme:
        q["theme"] = theme
    if not include_christian:
        q["is_christian"] = False
    items = await db.words.find(q, {"_id": 0}).to_list(1000)
    return [Word(**w) for w in items]


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
AI_COSTS = {"sentence": 1, "daily_sentences": 3, "translate": 2, "mini_story": 8, "prayer": 5, "activity": 4}

AI_PROMPTS = {
    "sentence": "Tu es un assistant qui aide les parents à transmettre le Lingala. Génère UNE phrase simple en Lingala sur le thème '{theme}' pour un enfant de {age} ans. Format exact (français) :\nLingala : ...\nFrançais : ...\nConseil : ... (une phrase courte pour le parent)",
    "daily_sentences": "Génère 3 phrases du jour simples en Lingala pour un enfant de {age} ans, thème '{theme}'. Pour chaque phrase :\n1. Lingala : ...\n   Français : ...\n   Conseil : ...\n2. ...\n3. ...",
    "translate": "Traduis la phrase française suivante en Lingala correct, pour un enfant. Explique simplement ta traduction en 1 ligne.\nPhrase : {french}\nFormat :\nLingala : ...\nExplication : ...",
    "mini_story": "Crée une mini-histoire tendre et simple en Lingala pour un enfant de {age} ans (150-200 mots), en utilisant ces mots clés : {words}. Format :\nTitre : ...\nHistoire (Lingala) : ...\nTraduction française : ...\n3 questions à poser à l'enfant après l'histoire : ...",
    "prayer": "Compose une prière courte et rassurante en Lingala (3 à 5 lignes) pour un enfant de {age} ans, thème '{theme}'. Format :\nPrière (Lingala) : ...\nTraduction française : ...",
    "activity": "Propose une activité parent-enfant simple (5 minutes, sans écran) autour du mot Lingala '{word}' pour un enfant de {age} ans. Format :\nActivité : ...\nÉtapes :\n1. ...\n2. ...\n3. ...\nVariante plus facile : ...",
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
        params = {"theme": "famille", "age": 5, "french": "", "words": "", "word": ""}
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


# ---------------- Seeding ----------------
async def seed_content():
    if await db.themes.count_documents({}) == 0:
        await db.themes.insert_many([t.copy() for t in THEMES])
        logger.info("Seeded %d themes", len(THEMES))
    if await db.words.count_documents({}) == 0:
        docs = []
        for w in WORDS:
            d = w.copy()
            d["word_id"] = f"word_{uuid.uuid4().hex[:12]}"
            docs.append(d)
        await db.words.insert_many(docs)
        logger.info("Seeded %d words", len(docs))


@app.on_event("startup")
async def _startup():
    await seed_content()


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

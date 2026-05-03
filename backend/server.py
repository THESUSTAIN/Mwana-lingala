"""Mwana Lingala backend - FastAPI + MongoDB.

Auth: Emergent Google OAuth + Email OTP via SMTP.
Content: words, themes, child profiles, progress, error reports.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import secrets
import string
import bcrypt
import httpx
import time
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from seed_data import THEMES, WORDS

# Google OAuth (login + Drive)
from google_auth_oauthlib.flow import Flow  # type: ignore
from google.oauth2.credentials import Credentials as GoogleCreds  # type: ignore
from google.auth.transport.requests import Request as GoogleAuthRequest  # type: ignore
from googleapiclient.discovery import build as build_google_service  # type: ignore
from googleapiclient.http import MediaIoBaseUpload  # type: ignore
from fastapi.responses import RedirectResponse
from cryptography.fernet import Fernet, InvalidToken  # type: ignore
import base64 as _b64
import io as _io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mwana-lingala")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@mwana-lingala.com")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "Mwana Lingala")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
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


class ParentMessageIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=4000)
    profile_id: Optional[str] = None
    voice_b64: Optional[str] = None  # data URL audio
    image_b64: Optional[str] = None  # data URL image
    kind: str = "message"  # message | prayer | story | phrases


class ReviewIn(BaseModel):
    word_id: str
    profile_id: Optional[str] = None
    quality: int = Field(..., ge=0, le=2)  # 0=encore, 1=bien, 2=facile (Fluent Forever / Anki simplifié)


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


async def _send_via_brevo(email: str, code: str, html: str, text: str) -> bool:
    """Send transactional email via Brevo HTTP API (more reliable than SMTP through clouds)."""
    if not BREVO_API_KEY:
        return False
    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER_EMAIL},
        "to": [{"email": email}],
        "subject": "Votre code Mwana Lingala",
        "htmlContent": html,
        "textContent": text,
    }
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": BREVO_API_KEY, "content-type": "application/json", "accept": "application/json"},
                json=payload,
            )
        if r.status_code in (200, 201, 202):
            logger.info("Brevo OTP sent to %s (status=%s)", email, r.status_code)
            return True
        logger.error("Brevo send failed: status=%s body=%s", r.status_code, r.text[:300])
        return False
    except Exception as e:
        logger.error("Brevo HTTP error: %s", e)
        return False


async def send_otp_email(email: str, code: str) -> bool:
    """Send OTP via Brevo (HTTP) → fallback SMTP → fallback dev-mode log."""
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

    # 1) Try Brevo HTTP API first (most reliable on Railway)
    if BREVO_API_KEY:
        if await _send_via_brevo(email, code, html, text):
            return True
        logger.warning("Brevo failed, falling back to SMTP for %s", email)

    # 2) Fallback to SMTP
    if not SMTP_HOST or not SMTP_PASSWORD:
        logger.warning("No working email provider, skipping send. OTP for %s: %s", email, code)
        return True  # dev mode: return True so flow continues
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


async def upsert_user(
    email: str,
    name: str,
    picture: Optional[str],
    auth_method: str,
    request: Optional[Request] = None,
) -> dict:
    existing = await db.users.find_one({"email": email.lower()}, {"_id": 0})
    is_admin_by_env = email.lower() in ADMIN_EMAILS
    now_iso = now_utc().isoformat()

    # --- Extract visitor context (country, device, referrer, anonymised IP) -------------
    country = None
    device_type = None
    user_agent = None
    referrer = None
    ip_masked = None
    if request is not None:
        headers = request.headers
        # Cloudflare-Railway edge: "cf-ipcountry" (ISO alpha-2) — no geo-IP lookup needed
        country = (headers.get("cf-ipcountry") or headers.get("x-vercel-ip-country") or "").upper() or None
        user_agent = headers.get("user-agent", "")[:300]
        referrer = headers.get("referer", "")[:300] or None
        ua_l = (user_agent or "").lower()
        if any(k in ua_l for k in ["iphone", "android", "mobile"]):
            device_type = "mobile"
        elif "ipad" in ua_l or "tablet" in ua_l:
            device_type = "tablet"
        else:
            device_type = "desktop"
        # Mask IP to /24 for RGPD compliance (we do NOT store full IP)
        raw_ip = (headers.get("cf-connecting-ip") or headers.get("x-forwarded-for") or "").split(",")[0].strip()
        if raw_ip:
            parts = raw_ip.split(".")
            ip_masked = ".".join(parts[:3] + ["0"]) if len(parts) == 4 else raw_ip.split(":")[0] + "::"

    context_update = {}
    if country: context_update["last_country"] = country
    if device_type: context_update["last_device"] = device_type
    if referrer: context_update["last_referrer"] = referrer
    if user_agent: context_update["last_user_agent"] = user_agent
    if ip_masked: context_update["last_ip_masked"] = ip_masked
    # ---------------------------------------------------------------------------------

    if existing:
        updates = {"last_login_at": now_iso, **context_update}
        # login counter
        if isinstance(existing.get("login_count"), int):
            updates["login_count"] = existing["login_count"] + 1
        else:
            updates["login_count"] = 2  # 1st was at creation; this is at least the 2nd
        if picture and existing.get("picture") != picture:
            updates["picture"] = picture
        # Never downgrade an existing admin (they were made admin either by env or manually in DB).
        if is_admin_by_env and existing.get("role") != "admin":
            updates["role"] = "admin"
        await db.users.update_one({"email": email.lower()}, {"$set": updates})
        existing.update(updates)
        return existing
    role = "admin" if is_admin_by_env else "user"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": email.lower(),
        "name": name,
        "picture": picture,
        "auth_method": auth_method,
        "role": role,
        "login_count": 1,
        "last_login_at": now_iso,
        "first_country": country,
        "first_device": device_type,
        "first_referrer": referrer,
        **context_update,
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
async def verify_otp(data: VerifyOTPIn, response: Response, request: Request):
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
    user = await upsert_user(data.email, data.email.split("@")[0].capitalize(), None, "otp", request=request)
    await create_session(user["user_id"], response)
    return {"success": True, "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"]}}


class GoogleExchangeIn(BaseModel):
    code: str = Field(..., min_length=10)
    redirect_uri: str = Field(..., min_length=5)
    state: Optional[str] = None


@api.get("/auth/google/start")
async def google_start(redirect_uri: str):
    """Return the Google OAuth consent URL for the given frontend redirect_uri.

    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    The frontend MUST pass its own window.location.origin + "/auth/google" as redirect_uri.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth non configuré côté serveur.")
    # Sanity check: must be an https URL (except localhost for dev)
    if not (redirect_uri.startswith("https://") or redirect_uri.startswith("http://localhost")):
        raise HTTPException(status_code=400, detail="redirect_uri invalide")
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
        redirect_uri=redirect_uri,
        autogenerate_code_verifier=True,
    )
    state_token = secrets.token_urlsafe(24)
    auth_url, _ = flow.authorization_url(
        access_type="online",
        include_granted_scopes="true",
        prompt="select_account",
        state=state_token,
    )
    # Persist the PKCE code_verifier bound to the state so /exchange can complete the handshake
    await db.oauth_states.insert_one({
        "state": state_token,
        "kind": "login",
        "redirect_uri": redirect_uri,
        "code_verifier": getattr(flow, "code_verifier", None),
        "created_at": now_utc(),  # TTL index will expire after 10 min
    })
    return {"auth_url": auth_url, "state": state_token}


@api.post("/auth/google/exchange")
async def google_exchange(data: GoogleExchangeIn, response: Response, request: Request):
    """Exchange a Google OAuth authorization code for a local session cookie.

    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    redirect_uri MUST match exactly what was used in /auth/google/start.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth non configuré côté serveur.")
    # Recover the PKCE code_verifier stored at /start keyed by state (single-use)
    code_verifier: Optional[str] = None
    if data.state:
        st = await db.oauth_states.find_one_and_delete({"state": data.state, "kind": "login"})
        if st:
            code_verifier = st.get("code_verifier")
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [data.redirect_uri],
            }
        },
        scopes=None,  # accept whatever Google grants
        redirect_uri=data.redirect_uri,
    )
    if code_verifier:
        flow.code_verifier = code_verifier
    try:
        flow.fetch_token(code=data.code)
    except Exception as e:
        err_txt = str(e)
        logger.error("Google token exchange failed (redirect_uri=%s): %s", data.redirect_uri, err_txt)
        # Expose a safe sub-code to the client to help users self-diagnose
        detail_code = "unknown"
        lower = err_txt.lower()
        if "redirect_uri_mismatch" in lower:
            detail_code = "redirect_mismatch"
        elif "invalid_client" in lower:
            detail_code = "invalid_client"
        elif "invalid_grant" in lower:
            detail_code = "code_used"  # code reused or expired
        # Persist last failure for operator debugging via /api/auth/_last_google_error
        try:
            await db.oauth_debug.update_one(
                {"_id": "last_google_error"},
                {"$set": {
                    "detail_code": detail_code,
                    "error_excerpt": err_txt[:500],
                    "redirect_uri": data.redirect_uri,
                    "at": now_utc().isoformat(),
                }},
                upsert=True,
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=400,
            detail={"message": "Code Google invalide ou expiré.", "detail_code": detail_code},
        )
    creds = flow.credentials
    # Fetch userinfo
    try:
        svc = build_google_service("oauth2", "v2", credentials=creds, cache_discovery=False)
        info = svc.userinfo().get().execute()
    except Exception as e:
        logger.error("Google userinfo failed: %s", e)
        raise HTTPException(status_code=502, detail="Impossible de récupérer le profil Google")
    email = (info.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email Google introuvable")
    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")
    user = await upsert_user(email, name, picture, "google", request=request)
    await create_session(user["user_id"], response)
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


# ---------------- Parental Code (child-mode safety) ----------------
class ParentalCodeSet(BaseModel):
    code: str = Field(..., min_length=4, max_length=8)


class ParentalCodeVerify(BaseModel):
    code: str


@api.post("/auth/parental-code")
async def set_parental_code(data: ParentalCodeSet, user: User = Depends(get_current_user)):
    """Set or replace the 4-8 digit parental code (hashed with bcrypt)."""
    if not data.code.isdigit():
        raise HTTPException(status_code=400, detail="Le code doit être composé de chiffres uniquement")
    hashed = bcrypt.hashpw(data.code.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"parental_code_hash": hashed}})
    return {"success": True}


@api.delete("/auth/parental-code")
async def clear_parental_code(user: User = Depends(get_current_user)):
    await db.users.update_one({"user_id": user.user_id}, {"$unset": {"parental_code_hash": ""}})
    return {"success": True}


@api.post("/auth/verify-parental-code")
async def verify_parental_code(data: ParentalCodeVerify, user: User = Depends(get_current_user)):
    # Rate-limit brute force: max 5 failed attempts / 5 min per user
    five_min_ago = (now_utc() - timedelta(minutes=5)).isoformat()
    recent_fails = await db.parental_code_attempts.count_documents({
        "user_id": user.user_id, "success": False, "at": {"$gte": five_min_ago}
    })
    if recent_fails >= 5:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans 5 minutes.")
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "parental_code_hash": 1})
    h = (doc or {}).get("parental_code_hash")
    if not h:
        # SECURITY: do NOT auto-grant access when no code is configured.
        # Require the parent to set one first via Settings.
        raise HTTPException(
            status_code=412,
            detail="Aucun code parental n'est défini. Configurez-en un dans Paramètres avant d'accéder à la zone parent.",
        )
    if not data.code or not data.code.strip():
        # Empty submission must always fail when a code is set (no implicit bypass)
        await db.parental_code_attempts.insert_one({
            "user_id": user.user_id, "success": False, "at": now_utc().isoformat()
        })
        raise HTTPException(status_code=401, detail="Code parental incorrect")
    ok = bcrypt.checkpw(data.code.encode("utf-8"), h.encode("utf-8"))
    await db.parental_code_attempts.insert_one({
        "user_id": user.user_id, "success": ok, "at": now_utc().isoformat()
    })
    if not ok:
        raise HTTPException(status_code=401, detail="Code parental incorrect")
    return {"success": True, "configured": True}


@api.get("/auth/parental-code/status")
async def parental_code_status(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "parental_code_hash": 1})
    return {"configured": bool((doc or {}).get("parental_code_hash"))}


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
# ---------------- Blog (SEO) ----------------
from blog_data import ARTICLES as _BLOG_ARTICLES_BASE
from blog_data_batch1 import ARTICLES_BATCH_1 as _BLOG_ARTICLES_B1
from blog_seo_meta import enrich_article as _enrich_blog

# Combine all article batches
_BLOG_ARTICLES = _BLOG_ARTICLES_BASE + _BLOG_ARTICLES_B1

# Enrich all articles once at import-time with SEO metadata (hero_image, dates, FAQ…)
_BLOG_ARTICLES = [_enrich_blog(a) for a in _BLOG_ARTICLES]


@api.get("/blog/articles")
async def blog_list():
    """Public list of blog articles (SEO-friendly)."""
    return {
        "items": [
            {
                "slug": a["slug"],
                "title": a["title"],
                "meta_description": a["meta_description"],
                "hero_emoji": a.get("hero_emoji", "📝"),
                "hero_image": a.get("hero_image"),
                "hero_image_alt": a.get("hero_image_alt"),
                "category": a.get("category", "Blog"),
                "read_time": a.get("read_time", 5),
                "keywords": a.get("keywords", []),
                "published_at": a.get("published_at"),
                "updated_at": a.get("updated_at"),
            }
            for a in _BLOG_ARTICLES
        ],
        "count": len(_BLOG_ARTICLES),
    }


@api.get("/blog/articles/{slug}")
async def blog_article(slug: str):
    for a in _BLOG_ARTICLES:
        if a["slug"] == slug:
            # Build "related articles" list — same category first, then other articles, max 3
            same_cat = [
                {
                    "slug": x["slug"],
                    "title": x["title"],
                    "meta_description": x["meta_description"],
                    "hero_image": x.get("hero_image"),
                    "category": x.get("category", "Blog"),
                    "read_time": x.get("read_time", 5),
                }
                for x in _BLOG_ARTICLES
                if x["slug"] != slug and x.get("category") == a.get("category")
            ]
            others = [
                {
                    "slug": x["slug"],
                    "title": x["title"],
                    "meta_description": x["meta_description"],
                    "hero_image": x.get("hero_image"),
                    "category": x.get("category", "Blog"),
                    "read_time": x.get("read_time", 5),
                }
                for x in _BLOG_ARTICLES
                if x["slug"] != slug and x.get("category") != a.get("category")
            ]
            related = (same_cat + others)[:3]
            out = dict(a)
            out["related"] = related
            return out
    raise HTTPException(status_code=404, detail="Article introuvable")


# ---------------- Notifications (in-app bell + PWA push prep) ----------------
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:contact@mwana-lingala.com")


class PushSubIn(BaseModel):
    endpoint: str
    keys: dict


@api.get("/notifications/vapid-public-key")
async def vapid_public_key():
    return {"vapid_public_key": VAPID_PUBLIC_KEY}


def _send_push(sub: dict, payload: dict):
    """Send a single web push notification. Returns (ok, error_msg)."""
    try:
        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=3600,
        )
        return True, None
    except Exception as e:
        return False, str(e)[:200]


@api.post("/notifications/test-push")
async def test_push(user: User = Depends(get_current_user)):
    """Send a test push to all active subscriptions of the current user."""
    if not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=503, detail="Push non configuré")
    subs = await db.push_subscriptions.find({"user_id": user.user_id}, {"_id": 0}).to_list(20)
    payload = {"title": "Mwana Lingala", "body": "Test de notification réussi ✨", "url": "/app"}
    sent, failed = 0, 0
    for s in subs:
        ok, err = _send_push(s, payload)
        if ok:
            sent += 1
        else:
            failed += 1
            if "410" in (err or "") or "404" in (err or ""):
                await db.push_subscriptions.delete_one({"user_id": user.user_id, "endpoint": s["endpoint"]})
    return {"sent": sent, "failed": failed, "total": len(subs)}


@api.get("/notifications")
async def get_notifications(profile_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Return in-app notifications badge counts.

    - srs_due: words due for review today
    - new_messages: parent messages unread (not yet implemented read-state, returns last 24h count)
    - total: sum for bell badge
    """
    now_iso = now_utc().isoformat()
    q_srs: dict = {"user_id": user.user_id, "next_review_at": {"$lte": now_iso}}
    if profile_id:
        q_srs["profile_id"] = profile_id
    srs_due = await db.progress.count_documents(q_srs)

    # Parent messages created in last 24h
    yesterday = (now_utc() - timedelta(hours=24)).isoformat()
    q_msg: dict = {"user_id": user.user_id, "created_at": {"$gte": yesterday}}
    if profile_id:
        q_msg["profile_id"] = profile_id
    new_messages = await db.parent_messages.count_documents(q_msg)

    # Build notification list
    notifs = []
    if srs_due > 0:
        notifs.append({
            "id": "srs-due",
            "kind": "srs",
            "title": f"{srs_due} mot{'s' if srs_due > 1 else ''} à réviser",
            "body": "Quelques minutes suffisent pour ancrer la mémoire.",
            "url": "/app/enfant",
            "icon": "🧠",
        })
    if new_messages > 0:
        notifs.append({
            "id": "new-msgs",
            "kind": "message",
            "title": f"{new_messages} message{'s' if new_messages > 1 else ''} de Papa/Maman",
            "body": "Regarde ce que tes parents ont préparé pour toi 💌",
            "url": "/app/enfant",
            "icon": "💌",
        })
    return {"items": notifs, "total": len(notifs), "srs_due": srs_due, "new_messages": new_messages}


@api.post("/notifications/push-subscription")
async def save_push_subscription(data: PushSubIn, user: User = Depends(get_current_user)):
    """Store browser push subscription for future push notifications.

    VAPID keys + real push sending (via pywebpush) TODO in a dedicated session.
    For now we simply persist the endpoint so we can re-enable later.
    """
    await db.push_subscriptions.update_one(
        {"user_id": user.user_id, "endpoint": data.endpoint},
        {"$set": {
            "user_id": user.user_id,
            "endpoint": data.endpoint,
            "keys": data.keys,
            "updated_at": now_utc().isoformat(),
        }},
        upsert=True,
    )
    return {"success": True}


@api.delete("/notifications/push-subscription")
async def delete_push_subscription(endpoint: str, user: User = Depends(get_current_user)):
    await db.push_subscriptions.delete_one({"user_id": user.user_id, "endpoint": endpoint})
    return {"success": True}


@api.get("/progress/journal")
async def get_journal(profile_id: Optional[str] = None, limit: int = 30, user: User = Depends(get_current_user)):
    """Journal familial — last learned words (chronological, with word info for nice display)."""
    q: dict = {"user_id": user.user_id, "learned": True}
    if profile_id:
        q["profile_id"] = profile_id
    # Sort by last_review_at or created_at (desc)
    items = await db.progress.find(q, {"_id": 0}).sort("last_review_at", -1).limit(limit).to_list(limit)
    items.sort(key=lambda x: x.get("last_review_at") or x.get("created_at") or "", reverse=True)
    word_ids = [p["word_id"] for p in items]
    words = {}
    if word_ids:
        cursor = db.words.find({"word_id": {"$in": word_ids}}, {"_id": 0})
        async for w in cursor:
            words[w["word_id"]] = w
    from seed_data import _slug
    journal = []
    for p in items:
        w = words.get(p["word_id"])
        if not w:
            continue
        img = w.get("image") or ""
        if not img or not img.startswith("/images/words/"):
            img = f"/images/words/{_slug(w['lingala'])}.jpg"
        journal.append({
            "word_id": w["word_id"],
            "lingala": w["lingala"],
            "french": w["french"],
            "image": img,
            "theme": w.get("theme"),
            "date": p.get("last_review_at") or p.get("created_at"),
            "srs_level": p.get("srs_level", 0),
        })
    return {"items": journal, "count": len(journal)}


@api.post("/progress")
async def add_progress(data: ProgressIn, user: User = Depends(get_current_user)):
    doc = {
        "user_id": user.user_id,
        "profile_id": data.profile_id,
        "word_id": data.word_id,
        "learned": data.learned,
        "last_review_at": now_utc().isoformat(),
    }
    await db.progress.update_one(
        {"user_id": user.user_id, "profile_id": data.profile_id, "word_id": data.word_id},
        {"$set": doc, "$setOnInsert": {"created_at": now_utc().isoformat()}},
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


# Spaced Repetition System (SRS) — algorithme inspiré Fluent Forever / Anki simplifié.
# 6 niveaux : 0 (vu), 1 (J+1), 2 (J+3), 3 (J+7), 4 (J+15), 5 (J+30+)
SRS_INTERVALS_DAYS = [0, 1, 3, 7, 15, 30, 60]


@api.post("/progress/review")
async def post_review(data: ReviewIn, user: User = Depends(get_current_user)):
    """Update SRS state after a flashcard review.

    quality: 0 = encore (reset au niveau 0), 1 = bien (+1 niveau), 2 = facile (+2 niveaux)
    """
    q = {"user_id": user.user_id, "profile_id": data.profile_id, "word_id": data.word_id}
    cur = await db.progress.find_one(q, {"_id": 0})
    level = (cur or {}).get("srs_level", 0) if cur else 0
    if data.quality == 0:
        level = 0  # reset complet (la carte revient en révision dès maintenant)
    elif data.quality == 1:
        level = min(len(SRS_INTERVALS_DAYS) - 1, level + 1)
    else:
        level = min(len(SRS_INTERVALS_DAYS) - 1, level + 2)
    interval = SRS_INTERVALS_DAYS[level]
    next_at = (now_utc() + timedelta(days=interval)).isoformat()
    upd = {
        "user_id": user.user_id,
        "profile_id": data.profile_id,
        "word_id": data.word_id,
        "learned": True,
        "srs_level": level,
        "srs_quality_last": data.quality,
        "last_review_at": now_utc().isoformat(),
        "next_review_at": next_at,
    }
    await db.progress.update_one(q, {"$set": upd}, upsert=True)
    return {"success": True, "srs_level": level, "next_review_at": next_at}


@api.get("/progress/review-queue")
async def get_review_queue(profile_id: Optional[str] = None, theme: Optional[str] = None, user: User = Depends(get_current_user)):
    """Returns words due for review (next_review_at <= now) + new words to learn."""
    now_iso = now_utc().isoformat()
    q: dict = {"user_id": user.user_id, "next_review_at": {"$lte": now_iso}}
    if profile_id:
        q["profile_id"] = profile_id
    due = await db.progress.find(q, {"_id": 0, "word_id": 1, "srs_level": 1}).to_list(200)
    due_ids = [d["word_id"] for d in due]
    due_words = []
    if due_ids:
        wq: dict = {"word_id": {"$in": due_ids}}
        if theme:
            wq["theme"] = theme
        due_words = await db.words.find(wq, {"_id": 0}).to_list(200)
    # New words (not yet seen)
    seen_ids = [p["word_id"] async for p in db.progress.find({"user_id": user.user_id}, {"_id": 0, "word_id": 1})]
    new_q: dict = {"word_id": {"$nin": seen_ids}}
    if theme:
        new_q["theme"] = theme
    new_words = await db.words.find(new_q, {"_id": 0}).limit(10).to_list(10)
    # Normalise les images vers /images/words/<slug>.jpg si l'asset local existe
    from seed_data import _slug
    for w in due_words + new_words:
        cur = (w.get("image") or "")
        if not cur or not cur.startswith("/images/words/"):
            w["image"] = f"/images/words/{_slug(w['lingala'])}.jpg"
    return {"due": due_words, "new": new_words, "due_count": len(due_words), "new_count": len(new_words)}


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
        "theme": sub["theme"] if sub["theme"] in {"famille", "nourriture", "emotions", "bible", "animaux", "couleurs", "nombres", "corps", "salutations", "maison"} else "famille",
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


# ---------------- AI image generation (Nano Banana 2 via Mammouth) ----------------
class ImageGenIn(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500)


IMAGE_MODEL = "gemini-3.1-flash-image-preview"
IMAGE_COST = 2  # 2 crédits par image


@api.post("/ai/generate-image")
async def ai_generate_image(data: ImageGenIn, user: User = Depends(get_current_user)):
    if (user.credits or 0) < IMAGE_COST:
        raise HTTPException(status_code=402, detail="Crédits insuffisants pour générer une image")
    # Deduct first (refund on failure)
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": -IMAGE_COST}})
    try:
        style = (
            "Soft pastel children book illustration, panafrican aesthetic, warm friendly tones, "
            "simple flat design with thick rounded shapes, no text or letters in the image, "
            "1:1 square, centered subject on a calm pastel background. "
        )
        full_prompt = style + data.prompt
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{MAMMOTH_API_URL}/chat/completions",
                headers={"Authorization": f"Bearer {MAMMOTH_API_KEY}", "Content-Type": "application/json"},
                json={"model": IMAGE_MODEL, "messages": [{"role": "user", "content": full_prompt}]},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Mammouth error {r.status_code}")
        js = r.json()
        msg = js.get("choices", [{}])[0].get("message", {})
        imgs = msg.get("images") or []
        if not imgs:
            raise HTTPException(status_code=502, detail="No image returned")
        url = imgs[0].get("image_url", {}).get("url", "")
        new_credits = (user.credits or 0) - IMAGE_COST
        return {"success": True, "image_b64": url, "credits_spent": IMAGE_COST, "credits_total": new_credits}
    except HTTPException:
        await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": IMAGE_COST}})
        raise
    except Exception as e:
        await db.users.update_one({"user_id": user.user_id}, {"$inc": {"credits": IMAGE_COST}})
        raise HTTPException(status_code=500, detail=str(e)[:100])


# ---------------- Whisper Speech-to-Text (pronunciation check) ----------------
class TranscribeIn(BaseModel):
    audio_b64: str = Field(..., min_length=100)
    expected: Optional[str] = None


@api.post("/ai/transcribe")
async def ai_transcribe(data: TranscribeIn, user: User = Depends(get_current_user)):
    """Transcribe a short audio recording via OpenAI Whisper (Emergent LLM Key).

    Returns {text, ok, expected, match_score}.
    """
    import base64 as _b64
    import tempfile
    import os as _os
    try:
        try:
            from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
        except ImportError:
            raise HTTPException(status_code=503, detail="Reconnaissance vocale indisponible sur ce déploiement.")
        # Decode data URL
        raw = data.audio_b64
        if "," in raw:
            raw = raw.split(",", 1)[1]
        audio_bytes = _b64.b64decode(raw)
        # Write to temp webm file (Whisper supports webm)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tf:
            tf.write(audio_bytes)
            tmp_path = tf.name
        try:
            stt = OpenAISpeechToText(api_key=os.environ.get("EMERGENT_LLM_KEY", ""))
            with open(tmp_path, "rb") as f:
                result = await stt.transcribe(file=f, model="whisper-1", response_format="json")
            text = (result.get("text") if isinstance(result, dict) else str(result)) or ""
        finally:
            try: _os.unlink(tmp_path)
            except Exception: pass
        # Compute simple match score
        expected = (data.expected or "").strip().lower()
        heard = text.strip().lower()
        match_score = 0.0
        if expected and heard:
            import difflib
            match_score = difflib.SequenceMatcher(None, expected, heard).ratio()
        return {
            "text": text.strip(),
            "expected": data.expected,
            "match_score": round(match_score, 2),
            "ok": match_score >= 0.6 if expected else True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Whisper error: {str(e)[:120]}")


# ---------------- Parent Messages (envoyés au Mode Enfant) ----------------
@api.post("/parent-messages")
async def create_parent_message(data: ParentMessageIn, user: User = Depends(get_current_user)):
    """Save a message/prayer/story for the child to see in Mode Enfant.

    Only the owner (user_id) can read/delete. Content is stored encrypted-at-rest by MongoDB
    but NOT shared with any external service. Max 50 messages per user.
    """
    count = await db.parent_messages.count_documents({"user_id": user.user_id})
    if count >= 50:
        raise HTTPException(status_code=400, detail="Limite de 50 messages atteinte. Supprimez-en pour en créer de nouveaux.")
    mid = "pm_" + uuid.uuid4().hex[:12]
    doc = {
        "message_id": mid,
        "user_id": user.user_id,
        "profile_id": data.profile_id,
        "title": data.title,
        "content": data.content,
        "kind": data.kind,
        "voice_b64": data.voice_b64,
        "image_b64": data.image_b64,
        "created_at": now_utc().isoformat(),
    }
    await db.parent_messages.insert_one(doc)
    return {"success": True, "message_id": mid}


@api.get("/parent-messages")
async def list_parent_messages(profile_id: Optional[str] = None, user: User = Depends(get_current_user)):
    q: dict = {"user_id": user.user_id}
    if profile_id:
        q["profile_id"] = profile_id
    items = await db.parent_messages.find(q, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"items": items, "count": len(items)}


@api.delete("/parent-messages/{message_id}")
async def delete_parent_message(message_id: str, user: User = Depends(get_current_user)):
    res = await db.parent_messages.delete_one({"message_id": message_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message introuvable")
    return {"success": True}


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


class GuestCheckoutIn(BaseModel):
    type: str  # "pack" or "subscription"
    pack_id: Optional[str] = None
    email: str
    name: Optional[str] = None


class ClaimIn(BaseModel):
    claim_token: str


async def mollie_request(method: str, path: str, json_body: Optional[dict] = None):
    if not MOLLIE_API_KEY:
        raise HTTPException(status_code=503, detail="Paiement indisponible (clé manquante)")
    headers = {"Authorization": f"Bearer {MOLLIE_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.request(method, f"{MOLLIE_API_URL}{path}", json=json_body, headers=headers)
        if r.status_code >= 400:
            logger.error("Mollie %s %s → %s: %s", method, path, r.status_code, r.text[:500])
            # Try to surface a human-readable error so the merchant knows what to fix.
            try:
                body = r.json()
                title = body.get("title", "")
                d = body.get("detail", "")
                # Common Mollie misconfiguration: no payment method activated on the live account
                if "not activated" in d.lower() or "method" in body.get("field", "").lower():
                    raise HTTPException(
                        status_code=503,
                        detail="Paiement temporairement indisponible. Le compte Mollie doit activer au moins une méthode de paiement (Carte, iDEAL, SEPA, PayPal) dans son tableau de bord. Réessayez plus tard.",
                    )
                if title or d:
                    raise HTTPException(status_code=502, detail=f"Erreur paiement Mollie : {title or d}")
            except HTTPException:
                raise
            except Exception:
                pass
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


@api.post("/billing/checkout-guest")
async def billing_checkout_guest(body: GuestCheckoutIn, request: Request):
    """Allow checkout without authentication. Creates (or reuses) a user account by email,
    issues a one-time claim_token that, after successful payment, can be exchanged for a
    real session via /billing/claim — the user is auto-logged in upon return.
    """
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Email invalide")

    if body.type == "pack":
        if not body.pack_id or body.pack_id not in PACKS:
            raise HTTPException(status_code=400, detail="Pack invalide")
        pack = PACKS[body.pack_id]
        description = f"Mwana Lingala — {pack['label']}"
        amount = pack["amount"]
    elif body.type == "subscription":
        description = "Mwana Lingala — Abonnement Premium (1 mois)"
        amount = SUBSCRIPTION_AMOUNT
    else:
        raise HTTPException(status_code=400, detail="Type inconnu")

    # Upsert user (creates the account if first time) — auth_method "guest_checkout"
    name = (body.name or email.split("@")[0]).strip()[:80]
    user_doc = await upsert_user(email=email, name=name, picture=None, auth_method="guest_checkout", request=request)
    user_id = user_doc["user_id"]

    claim_token = secrets.token_urlsafe(32)
    metadata = {
        "user_id": user_id,
        "type": body.type,
        "pack_id": body.pack_id,
        "credits": PACKS[body.pack_id]["credits"] if body.type == "pack" else None,
        "claim_token": claim_token,
        "guest": True,
    }
    payload = {
        "amount": {"currency": "EUR", "value": amount},
        "description": description,
        "redirectUrl": f"{PUBLIC_BASE_URL}/billing/return",
        "webhookUrl": f"{PUBLIC_BASE_URL}/api/billing/webhook",
        "metadata": metadata,
    }
    res = await mollie_request("POST", "/payments", payload)
    await db.payments.insert_one({
        "payment_id": res["id"],
        "user_id": user_id,
        "type": body.type,
        "pack_id": body.pack_id,
        "amount": amount,
        "currency": "EUR",
        "status": res.get("status", "open"),
        "credits_granted": False,
        "metadata": metadata,
        "claim_token": claim_token,
        "guest": True,
        "created_at": now_utc().isoformat(),
    })
    return {
        "payment_id": res["id"],
        "checkout_url": res["_links"]["checkout"]["href"],
        "claim_token": claim_token,
    }


@api.post("/billing/claim")
async def billing_claim(body: ClaimIn, response: Response):
    """Exchange a one-time claim_token (issued at guest checkout) for a real session.
    Only works if the corresponding payment status is 'paid' (and credits granted).
    """
    if not body.claim_token:
        raise HTTPException(status_code=400, detail="Token manquant")
    payment = await db.payments.find_one({"claim_token": body.claim_token}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Token invalide")
    # Refresh status from Mollie if not paid yet (idempotent)
    try:
        await _apply_paid_payment(payment["payment_id"])
    except Exception as e:
        logger.warning("Claim refresh failed: %s", e)
    payment = await db.payments.find_one({"claim_token": body.claim_token}, {"_id": 0})
    if not payment or payment.get("status") != "paid":
        raise HTTPException(status_code=409, detail="Paiement non validé")
    user_id = payment["user_id"]
    # Issue a real session — invalidate the claim_token so it can't be reused
    await create_session(user_id, response)
    await db.payments.update_one({"claim_token": body.claim_token}, {"$unset": {"claim_token": ""}})
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"ok": True, "user": user_doc}


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


@api.get("/billing/_diagnostics")
async def billing_diagnostics():
    """Public diagnostic endpoint (no secrets leaked) — checks Mollie/Billing config in production.
    Returns presence + prefix of MOLLIE_API_KEY, value of PUBLIC_BASE_URL, and tests Mollie /methods.
    """
    diag = {
        "mollie_key_present": bool(MOLLIE_API_KEY),
        "mollie_key_prefix": (MOLLIE_API_KEY[:5] + "...") if MOLLIE_API_KEY else None,
        "mollie_key_mode": "live" if MOLLIE_API_KEY.startswith("live_") else ("test" if MOLLIE_API_KEY.startswith("test_") else "unknown") if MOLLIE_API_KEY else None,
        "public_base_url": PUBLIC_BASE_URL,
        "public_base_url_is_default_preview": "preview.emergentagent.com" in PUBLIC_BASE_URL,
        "public_base_url_is_prod": ("mwana-lingala.com" in PUBLIC_BASE_URL),
        "expected_redirect_url": f"{PUBLIC_BASE_URL}/billing/return",
        "expected_webhook_url": f"{PUBLIC_BASE_URL}/api/billing/webhook",
    }
    # Live test against Mollie API
    if MOLLIE_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                r = await http.get(
                    f"{MOLLIE_API_URL}/methods",
                    headers={"Authorization": f"Bearer {MOLLIE_API_KEY}"},
                )
            diag["mollie_api_reachable"] = r.status_code == 200
            diag["mollie_api_status_code"] = r.status_code
            if r.status_code != 200:
                diag["mollie_api_error_excerpt"] = r.text[:300]
        except Exception as e:
            diag["mollie_api_reachable"] = False
            diag["mollie_api_error_excerpt"] = str(e)[:300]
    return diag


@api.get("/auth/_diagnostics")
async def auth_diagnostics():
    """Public diagnostic — does NOT leak secrets. Checks email-sending readiness (Brevo + SMTP)."""
    return {
        "brevo_key_present": bool(BREVO_API_KEY),
        "brevo_sender_email": BREVO_SENDER_EMAIL,
        "brevo_sender_name": BREVO_SENDER_NAME,
        "smtp_host": SMTP_HOST or None,
        "smtp_port": SMTP_PORT,
        "smtp_user_present": bool(SMTP_USER),
        "smtp_password_present": bool(SMTP_PASSWORD),
        "smtp_from_email": SMTP_FROM_EMAIL,
        "smtp_from_name": SMTP_FROM_NAME,
        "google_client_id_present": bool(GOOGLE_CLIENT_ID),
        "google_client_secret_present": bool(GOOGLE_CLIENT_SECRET),
    }


@api.get("/auth/_last_google_error")
async def last_google_error():
    """Public — returns the last Google OAuth exchange failure (error excerpt + detail_code).
    Use after a failed login to diagnose exactly what Google returned."""
    doc = await db.oauth_debug.find_one({"_id": "last_google_error"}, {"_id": 0})
    if not doc:
        return {"has_error": False}
    return {"has_error": True, **doc}


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


# ---------------- Maintenance mode (admin toggle) ----------------
class MaintenanceIn(BaseModel):
    enabled: bool
    message: Optional[str] = None


async def _get_maintenance() -> dict:
    doc = await db.app_settings.find_one({"_id": "maintenance"}, {"_id": 0})
    if not doc:
        return {"enabled": False, "message": "", "updated_at": None, "updated_by": None}
    return doc


@api.get("/maintenance/status")
async def maintenance_status():
    """Public — frontend reads this to display maintenance page when enabled."""
    s = await _get_maintenance()
    return {"enabled": bool(s.get("enabled")), "message": s.get("message") or ""}


@api.get("/admin/maintenance")
async def admin_get_maintenance(user: User = Depends(require_admin)):
    return await _get_maintenance()


@api.post("/admin/maintenance")
async def admin_set_maintenance(data: MaintenanceIn, user: User = Depends(require_admin)):
    payload = {
        "enabled": bool(data.enabled),
        "message": (data.message or "").strip()[:500],
        "updated_at": now_utc().isoformat(),
        "updated_by": user.email,
    }
    await db.app_settings.update_one(
        {"_id": "maintenance"},
        {"$set": payload},
        upsert=True,
    )
    logger.info("Maintenance %s by %s", "ENABLED" if data.enabled else "DISABLED", user.email)
    return {"success": True, **payload}


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
    thirty_days_ago = (now_utc() - timedelta(days=30)).isoformat()
    new_users_7d = await db.users.count_documents({"created_at": {"$gte": seven_days_ago}})
    active_users_7d = await db.users.count_documents({"last_login_at": {"$gte": seven_days_ago}})
    active_users_30d = await db.users.count_documents({"last_login_at": {"$gte": thirty_days_ago}})
    total_words = await db.words.count_documents({})
    total_audios = await db.audio_submissions.count_documents({"status": "approved"})
    pending_words = await db.word_submissions.count_documents({"status": "pending"})
    pending_audios = await db.audio_submissions.count_documents({"status": "pending"})
    total_contributions = await db.word_submissions.count_documents({})
    total_progress = await db.progress.count_documents({"learned": True})

    # --- Credits & revenue analytics ---
    agg_credits = await db.users.aggregate([
        {"$group": {"_id": None, "sum": {"$sum": "$credits"}}}
    ]).to_list(1)
    total_credits_in_circulation = (agg_credits[0]["sum"] if agg_credits else 0) or 0

    # Paid subscriptions revenue (cumulative) — from `subscriptions` if it exists
    try:
        agg_rev = await db.subscriptions.aggregate([
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "sum": {"$sum": "$amount_eur"}, "n": {"$sum": 1}}}
        ]).to_list(1)
        total_revenue_eur = float(agg_rev[0]["sum"]) if agg_rev else 0.0
        paid_transactions = int(agg_rev[0]["n"]) if agg_rev else 0
    except Exception:
        total_revenue_eur = 0.0
        paid_transactions = 0

    # MRR estimate = active premium users × 12.99€
    MRR_PER_USER = 12.99
    mrr_eur = round(premium_users * MRR_PER_USER, 2)

    # Credits spent (approx): 100 credits per Early Bird + any top-ups
    early_bird_claims = await db.users.count_documents({"early_bird": True})

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "new_users_7d": new_users_7d,
        "active_users_7d": active_users_7d,
        "active_users_30d": active_users_30d,
        "total_words": total_words,
        "approved_audios": total_audios,
        "pending_words": pending_words,
        "pending_audios": pending_audios,
        "total_contributions": total_contributions,
        "total_progress": total_progress,
        "total_credits_in_circulation": total_credits_in_circulation,
        "total_revenue_eur": total_revenue_eur,
        "paid_transactions": paid_transactions,
        "mrr_eur": mrr_eur,
        "early_bird_claims": early_bird_claims,
    }


@api.get("/admin/recent-users")
async def admin_recent_users(limit: int = 30, user: User = Depends(require_admin)):
    """Recent users with last login timestamp + visitor context for admin dashboard."""
    items = await db.users.find(
        {},
        {
            "_id": 0, "hashed_password": 0, "parental_code_hash": 0,
            # Don't leak full UA / referrer in the list — only summary fields
            "last_user_agent": 0,
        },
    ).sort("last_login_at", -1).limit(limit).to_list(limit)
    # Mark new users (first login = same day as created_at)
    for u in items:
        is_new = u.get("login_count", 1) <= 1
        u["is_new"] = bool(is_new)
        # Returning if logged again at least once
        u["is_returning"] = (u.get("login_count", 1) or 1) > 1
    return {"items": items}


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


@api.get("/admin/early-bird")
async def admin_early_bird(user: User = Depends(require_admin)):
    """Detailed Early Bird tracking for admin dashboard."""
    items = await db.users.find(
        {"early_bird": True},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "created_at": 1, "last_login_at": 1,
         "early_bird_until": 1, "premium_until": 1, "credits": 1, "is_premium": 1}
    ).sort("early_bird_until", -1).limit(100).to_list(100)
    return {
        "limit": EARLY_BIRD_LIMIT,
        "claimed": len(items),
        "remaining": max(0, EARLY_BIRD_LIMIT - len(items)),
        "trial_days": EARLY_BIRD_DAYS,
        "items": items,
    }


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
        # Backfill word images : toujours pointer vers /images/words/<slug>.jpg si l'asset local existe
        from seed_data import _slug
        assets_dir = ROOT_DIR.parent / "frontend" / "public" / "images" / "words"
        async for doc in db.words.find({}, {"_id": 0, "word_id": 1, "lingala": 1, "image": 1}):
            slug = _slug(doc["lingala"])
            new_path = f"/images/words/{slug}.jpg"
            current = doc.get("image") or ""
            if (assets_dir / f"{slug}.jpg").exists() and current != new_path:
                await db.words.update_one({"word_id": doc["word_id"]}, {"$set": {"image": new_path}})

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
        # OAuth states (login + drive) — TTL 10 min
        await db.oauth_states.create_index("state", unique=True)
        await db.oauth_states.create_index("created_at", expireAfterSeconds=600)
        # Public translator rate-limit — TTL auto-expire
        await db.translate_rate_log.create_index("expires_at", expireAfterSeconds=0)
        await db.translate_rate_log.create_index("ip")
        # Translation cache
        await db.translation_cache.create_index("key", unique=True)
        # Drive credentials
        await db.drive_credentials.create_index("user_id", unique=True)
        # Legacy plaintext cleanup: remove unencrypted token fields from old rows
        try:
            await db.drive_credentials.update_many(
                {"$or": [{"refresh_token": {"$exists": True}}, {"access_token": {"$exists": True}}, {"client_secret": {"$exists": True}}]},
                {"$unset": {"refresh_token": "", "access_token": "", "client_secret": ""}},
            )
        except Exception:
            pass
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


# ---------------- Public translation tool (SEO-focused) ----------------
# Mongo-backed IP rate limit: max 20 requests per hour per IP (TTL index on expires_at)
_TRANSLATE_WINDOW = 3600
_TRANSLATE_MAX = 20


async def _translate_rate_limit(ip: str) -> bool:
    now_ts = now_utc()
    count = await db.translate_rate_log.count_documents({"ip": ip, "expires_at": {"$gt": now_ts}})
    if count >= _TRANSLATE_MAX:
        return False
    await db.translate_rate_log.insert_one({
        "ip": ip,
        "created_at": now_ts,
        "expires_at": now_ts + timedelta(seconds=_TRANSLATE_WINDOW),
    })
    return True


class PublicTranslateIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=300)
    direction: str = Field(default="auto")  # "auto" | "fr-lg" | "lg-fr"


def _normalize_text(s: str) -> str:
    import unicodedata
    s = s.strip().lower()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w\s]", "", s).strip()


@api.post("/translate/public")
async def translate_public(data: PublicTranslateIn, request: Request):
    ip = (request.headers.get("x-forwarded-for") or request.client.host or "anon").split(",")[0].strip()
    if not await _translate_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Trop de traductions — réessayez dans 1 heure ou créez un compte gratuit.")
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texte vide")
    direction = data.direction if data.direction in ("auto", "fr-lg", "lg-fr") else "auto"

    # 1) Dictionary exact-match fast path (free, instant) — case-insensitive regex
    if direction in ("auto", "fr-lg"):
        word = await db.words.find_one({"french": {"$regex": f"^{re.escape(text)}$", "$options": "i"}}, {"_id": 0, "lingala": 1, "french": 1, "image": 1, "audio_url": 1})
        if word:
            return {
                "source": text, "target": word["lingala"], "direction": "fr-lg",
                "method": "dictionary", "image": word.get("image"), "audio_url": word.get("audio_url"),
            }
    if direction in ("auto", "lg-fr"):
        word = await db.words.find_one({"lingala": {"$regex": f"^{re.escape(text)}$", "$options": "i"}}, {"_id": 0, "lingala": 1, "french": 1, "image": 1, "audio_url": 1})
        if word:
            return {
                "source": text, "target": word["french"], "direction": "lg-fr",
                "method": "dictionary", "image": word.get("image"), "audio_url": word.get("audio_url"),
            }

    # 2) AI fallback (Claude via Mammouth) — cached
    norm = _normalize_text(text)
    cache_key = f"{direction}:{norm}"
    cached = await db.translation_cache.find_one({"key": cache_key}, {"_id": 0, "target": 1, "direction": 1})
    if cached:
        return {"source": text, "target": cached["target"], "direction": cached["direction"], "method": "ai-cached"}

    if direction == "auto":
        prompt = (
            "Tu es un traducteur expert Français ↔ Lingala (langue bantoue d'Afrique Centrale, RDC/Congo). "
            f"Détecte la langue de cette phrase puis traduis-la dans l'autre langue : « {text} »\n\n"
            "Réponds UNIQUEMENT en JSON strict : {\"direction\":\"fr-lg\" ou \"lg-fr\",\"target\":\"traduction seule\"}. "
            "Pas de commentaire, pas d'explication. Traduction naturelle et correcte."
        )
    elif direction == "fr-lg":
        prompt = (
            "Traduis cette phrase française en Lingala (langue bantoue, RDC/Congo). "
            f"Phrase : « {text} »\n\n"
            "Réponds UNIQUEMENT en JSON : {\"direction\":\"fr-lg\",\"target\":\"traduction lingala seule\"}. "
            "Traduction naturelle, pas de commentaire."
        )
    else:
        prompt = (
            "Traduis cette phrase Lingala en Français. "
            f"Phrase : « {text} »\n\n"
            "Réponds UNIQUEMENT en JSON : {\"direction\":\"lg-fr\",\"target\":\"traduction française seule\"}. "
            "Traduction naturelle, pas de commentaire."
        )
    try:
        content = await call_mammouth([{"role": "user", "content": prompt}])
    except HTTPException as e:
        # Graceful degradation if AI down
        if e.status_code in (502, 503):
            raise HTTPException(status_code=503, detail="Service de traduction IA indisponible — réessayez plus tard.")
        raise
    # Extract JSON
    try:
        m = re.search(r"\{[^{}]*\}", content, re.DOTALL)
        payload = json.loads(m.group(0)) if m else json.loads(content)
        target = (payload.get("target") or "").strip()
        out_dir = payload.get("direction") or (direction if direction != "auto" else "fr-lg")
        if not target:
            raise ValueError("empty target")
    except Exception:
        # Fallback: treat raw content as target
        target = content.strip().strip('"')
        out_dir = direction if direction != "auto" else "fr-lg"
    # Cache
    try:
        await db.translation_cache.insert_one({
            "key": cache_key, "source": text, "target": target, "direction": out_dir,
            "created_at": now_utc().isoformat(),
        })
    except Exception:
        pass
    return {"source": text, "target": target, "direction": out_dir, "method": "ai"}


@api.get("/translate/sample-words")
async def translate_sample_words():
    """Public endpoint: 20 free words shown as examples under the translator."""
    items = await db.words.find({"tier": {"$ne": "premium"}}, {"_id": 0, "lingala": 1, "french": 1, "theme": 1, "image": 1}).to_list(40)
    return items[:20]


@api.get("/translate/word-of-day")
async def translate_word_of_day():
    """Public: deterministic 'word of the day' rotated daily — used by the embeddable widget."""
    items = await db.words.find({}, {"_id": 0, "lingala": 1, "french": 1, "theme": 1, "image": 1, "audio_url": 1, "example_fr": 1, "example_ln": 1}).sort("lingala", 1).to_list(200)
    if not items:
        raise HTTPException(status_code=404, detail="Aucun mot disponible")
    # Days since epoch, deterministic rotation
    idx = (now_utc().date() - datetime(2026, 1, 1, tzinfo=timezone.utc).date()).days % len(items)
    w = items[idx]
    return {
        "lingala": w.get("lingala"),
        "french": w.get("french"),
        "theme": w.get("theme"),
        "image": w.get("image"),
        "audio_url": w.get("audio_url"),
        "example_fr": w.get("example_fr"),
        "example_ln": w.get("example_ln"),
        "date": now_utc().date().isoformat(),
    }


# ---------------- Google Drive OAuth (personal drive upload) ----------------
DRIVE_CLIENT_ID = os.environ.get("GOOGLE_DRIVE_CLIENT_ID", os.environ.get("GOOGLE_CLIENT_ID", ""))
DRIVE_CLIENT_SECRET = os.environ.get("GOOGLE_DRIVE_CLIENT_SECRET", os.environ.get("GOOGLE_CLIENT_SECRET", ""))
DRIVE_REDIRECT_URI = os.environ.get("GOOGLE_DRIVE_REDIRECT_URI", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"]
DRIVE_FOLDER_NAME = "Mwana Lingala"

# Fernet encryption for sensitive OAuth tokens at rest
FERNET_KEY = os.environ.get("FERNET_KEY", "")
_fernet = Fernet(FERNET_KEY.encode()) if FERNET_KEY else None


def _enc(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a string with Fernet. Returns None for None/empty."""
    if not plaintext:
        return None
    if not _fernet:
        return plaintext  # passthrough if key missing (dev only)
    return _fernet.encrypt(plaintext.encode()).decode()


def _dec(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a Fernet string. Falls back to plaintext for legacy rows."""
    if not ciphertext:
        return None
    if not _fernet:
        return ciphertext
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return ciphertext  # legacy unencrypted value


def _drive_client_config():
    return {
        "web": {
            "client_id": DRIVE_CLIENT_ID,
            "client_secret": DRIVE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [DRIVE_REDIRECT_URI],
        }
    }


@api.get("/drive/auth-url")
async def drive_auth_url(user: User = Depends(get_current_user)):
    if not DRIVE_CLIENT_ID or not DRIVE_CLIENT_SECRET or not DRIVE_REDIRECT_URI:
        raise HTTPException(status_code=503, detail="Google Drive non configuré côté serveur.")
    flow = Flow.from_client_config(_drive_client_config(), scopes=DRIVE_SCOPES, redirect_uri=DRIVE_REDIRECT_URI)
    state_token = secrets.token_urlsafe(24)
    # Persist state in Mongo (TTL index on created_at removes after 10 min)
    await db.oauth_states.insert_one({
        "state": state_token,
        "kind": "drive",
        "user_id": user.user_id,
        "created_at": now_utc(),
    })
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state_token,
    )
    return {"authorization_url": auth_url}


@api.get("/oauth/drive/callback")
async def drive_oauth_callback(code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    redirect_target = f"{FRONTEND_URL}/app/parametres?drive="
    if error:
        return RedirectResponse(url=f"{redirect_target}error&reason={error}")
    if not code or not state:
        return RedirectResponse(url=f"{redirect_target}error&reason=missing_code")
    st_doc = await db.oauth_states.find_one_and_delete({"state": state, "kind": "drive"})
    if not st_doc:
        return RedirectResponse(url=f"{redirect_target}error&reason=invalid_state")
    user_id = st_doc["user_id"]
    try:
        flow = Flow.from_client_config(_drive_client_config(), scopes=None, redirect_uri=DRIVE_REDIRECT_URI)
        flow.fetch_token(code=code)
        creds = flow.credentials
        # Fetch user's email for display
        email = None
        try:
            svc = build_google_service("oauth2", "v2", credentials=creds, cache_discovery=False)
            info = svc.userinfo().get().execute()
            email = info.get("email")
        except Exception:
            pass
        await db.drive_credentials.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "access_token_enc": _enc(creds.token),
                "refresh_token_enc": _enc(creds.refresh_token),
                "token_uri": creds.token_uri,
                "client_id": creds.client_id,
                "scopes": list(creds.scopes or []),
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "email": email,
                "updated_at": now_utc().isoformat(),
            }},
            upsert=True,
        )
        return RedirectResponse(url=f"{redirect_target}connected")
    except Exception as e:
        logger.error("Drive callback error: %s", e)
        return RedirectResponse(url=f"{redirect_target}error&reason=exchange_failed")


async def _get_drive_service(user_id: str):
    doc = await db.drive_credentials.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=400, detail="Google Drive non connecté. Connectez-le depuis Paramètres.")
    refresh = _dec(doc.get("refresh_token_enc"))
    access = _dec(doc.get("access_token_enc"))
    if not refresh:
        raise HTTPException(status_code=400, detail="Google Drive non connecté. Reconnectez-le depuis Paramètres.")
    creds = GoogleCreds(
        token=access,
        refresh_token=refresh,
        token_uri=doc.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=doc.get("client_id", DRIVE_CLIENT_ID),
        client_secret=DRIVE_CLIENT_SECRET,
        scopes=doc.get("scopes") or DRIVE_SCOPES,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleAuthRequest())
        await db.drive_credentials.update_one(
            {"user_id": user_id},
            {"$set": {
                "access_token_enc": _enc(creds.token),
                "expiry": creds.expiry.isoformat() if creds.expiry else None,
                "updated_at": now_utc().isoformat(),
            }},
        )
    return build_google_service("drive", "v3", credentials=creds, cache_discovery=False)


async def _ensure_drive_folder(service) -> str:
    """Return the ID of the 'Mwana Lingala' folder, creating it if missing."""
    q = (
        f"name='{DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' "
        "and trashed=false"
    )
    res = service.files().list(q=q, spaces="drive", fields="files(id,name)", pageSize=5).execute()
    files = res.get("files", [])
    if files:
        return files[0]["id"]
    meta = {"name": DRIVE_FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"}
    folder = service.files().create(body=meta, fields="id").execute()
    return folder["id"]


@api.get("/drive/status")
async def drive_status(user: User = Depends(get_current_user)):
    doc = await db.drive_credentials.find_one({"user_id": user.user_id}, {"_id": 0, "email": 1, "refresh_token_enc": 1, "updated_at": 1})
    connected = bool(doc and doc.get("refresh_token_enc"))
    return {"connected": connected, "email": (doc or {}).get("email") if connected else None, "updated_at": (doc or {}).get("updated_at") if connected else None}


@api.delete("/drive/disconnect")
async def drive_disconnect(user: User = Depends(get_current_user)):
    # Best-effort token revoke
    doc = await db.drive_credentials.find_one({"user_id": user.user_id}, {"_id": 0, "access_token_enc": 1, "refresh_token_enc": 1})
    token = _dec((doc or {}).get("refresh_token_enc")) or _dec((doc or {}).get("access_token_enc"))
    if token:
        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                await http.post("https://oauth2.googleapis.com/revoke", params={"token": token})
        except Exception:
            pass
    await db.drive_credentials.delete_one({"user_id": user.user_id})
    return {"success": True}


class DriveUploadIn(BaseModel):
    filename: str = Field(..., min_length=1, max_length=200)
    mime_type: str = Field(default="application/octet-stream")
    data_b64: str = Field(..., min_length=10)


@api.post("/drive/upload")
async def drive_upload(data: DriveUploadIn, user: User = Depends(get_current_user)):
    try:
        raw = _b64.b64decode(data.data_b64, validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Contenu base64 invalide")
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (10 MB max).")
    allowed = ("audio/", "image/", "text/", "application/pdf", "application/json")
    if not any(data.mime_type.startswith(p) for p in allowed):
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")

    service = await _get_drive_service(user.user_id)
    folder_id = await _ensure_drive_folder(service)
    media = MediaIoBaseUpload(_io.BytesIO(raw), mimetype=data.mime_type, resumable=False)
    meta = {"name": data.filename, "parents": [folder_id]}
    try:
        f = service.files().create(body=meta, media_body=media, fields="id,name,webViewLink").execute()
    except Exception as e:
        logger.error("Drive upload error: %s", e)
        raise HTTPException(status_code=502, detail="Échec de l'envoi sur Drive")
    return {"success": True, "file_id": f.get("id"), "name": f.get("name"), "web_view_link": f.get("webViewLink")}


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

# ---------------- Serve React build (single-service deploy on Railway) ----------------
# When frontend/build exists (Railway will build it at deploy time), FastAPI serves it
# at the root so `mwana-lingala.com` returns the React app and `/api/*` stays as API.
from fastapi.staticfiles import StaticFiles  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402

_frontend_build = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "build")
_frontend_build = os.path.abspath(_frontend_build)
if os.path.isdir(_frontend_build):
    # Serve /static/* from the CRA build
    app.mount("/static", StaticFiles(directory=os.path.join(_frontend_build, "static")), name="static")

    @app.get("/robots.txt", include_in_schema=False)
    async def serve_robots():
        path = os.path.join(_frontend_build, "robots.txt")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(path, media_type="text/plain; charset=utf-8", headers={"Cache-Control": "public, max-age=86400"})

    @app.get("/sitemap.xml", include_in_schema=False)
    async def serve_sitemap():
        path = os.path.join(_frontend_build, "sitemap.xml")
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(path, media_type="application/xml; charset=utf-8", headers={"Cache-Control": "public, max-age=3600"})

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # API routes already handled above; never reach here for /api/*
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = os.path.join(_frontend_build, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        # SPA fallback → index.html (React Router handles client-side)
        return FileResponse(os.path.join(_frontend_build, "index.html"))


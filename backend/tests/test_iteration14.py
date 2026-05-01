"""Iteration 14 — Admin word asset upload + theme filtering."""
import os
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # Fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip().rstrip("/")
                break

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
mcli = MongoClient(MONGO_URL)
mdb = mcli[DB_NAME]

PNG_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
MP3_B64 = "data:audio/mpeg;base64,SUQzBAAAAAAAFlRJVDIAAAACAAAAAFRZRVIAAAACAAAAAA=="


def _insert_session(email, role):
    import time, secrets
    uid = f"test-user-{int(time.time()*1000)}"
    token = f"test_session_{secrets.token_hex(8)}"
    mdb.users.update_one(
        {"email": email},
        {"$set": {
            "user_id": uid, "email": email, "name": email.split("@")[0],
            "auth_method": "otp", "christian_mode": False, "is_premium": False,
            "credits": 500, "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    u = mdb.users.find_one({"email": email})
    mdb.user_sessions.insert_one({
        "session_token": token, "user_id": u["user_id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token, u["user_id"]


@pytest.fixture(scope="module")
def admin_token():
    t, _ = _insert_session("test.admin+iter14@example.com", "admin")
    yield t

@pytest.fixture(scope="module")
def user_token():
    t, _ = _insert_session("test.user+iter14@example.com", "user")
    yield t

@pytest.fixture(scope="module")
def a_word_id():
    w = mdb.words.find_one({}, {"word_id": 1})
    return w["word_id"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


class TestAssetUpload:
    def test_image_upload(self, admin_token, a_word_id):
        r = requests.post(f"{BASE}/api/admin/words/{a_word_id}/asset",
                          headers=_h(admin_token), json={"image_b64": PNG_B64})
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True
        # verify persisted
        g = requests.get(f"{BASE}/api/words/{a_word_id}")
        assert g.status_code == 200
        assert g.json()["image"] == PNG_B64

    def test_audio_upload(self, admin_token, a_word_id):
        r = requests.post(f"{BASE}/api/admin/words/{a_word_id}/asset",
                          headers=_h(admin_token), json={"audio_b64": MP3_B64})
        assert r.status_code == 200, r.text
        g = requests.get(f"{BASE}/api/words/{a_word_id}")
        assert g.json()["audio"] == MP3_B64

    def test_invalid_format_400(self, admin_token, a_word_id):
        r = requests.post(f"{BASE}/api/admin/words/{a_word_id}/asset",
                          headers=_h(admin_token), json={"image_b64": "notavaliddataurl"})
        assert r.status_code == 400

    def test_unknown_word_404(self, admin_token):
        r = requests.post(f"{BASE}/api/admin/words/NOPE_XXX/asset",
                          headers=_h(admin_token), json={"image_b64": PNG_B64})
        assert r.status_code == 404

    def test_non_admin_403(self, user_token, a_word_id):
        r = requests.post(f"{BASE}/api/admin/words/{a_word_id}/asset",
                          headers=_h(user_token), json={"image_b64": PNG_B64})
        assert r.status_code == 403


class TestThemeCounts:
    @pytest.mark.parametrize("theme,expected", [
        ("animaux", 8),
        ("couleurs", 6),
        ("nombres", 10),
    ])
    def test_theme_count(self, theme, expected):
        r = requests.get(f"{BASE}/api/words?theme={theme}")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == expected, f"theme={theme}: got {len(data)} expected {expected}. Words: {[w['lingala'] for w in data]}"

"""Iteration 4 backend tests: per-user custom images + AI actions regression + translate validation."""
import os
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _seed_user(mongo_db, credits=0, email_prefix="iter4"):
    uid = f"test-{email_prefix}-{int(time.time()*1000)}"
    token = f"sess_{email_prefix}_{int(time.time()*1000)}"
    now = datetime.now(timezone.utc)
    mongo_db.users.insert_one({
        "user_id": uid,
        "email": f"TEST_{uid}@example.com",
        "name": "Test User",
        "picture": None,
        "auth_method": "otp",
        "christian_mode": False,
        "is_premium": False,
        "credits": credits,
        "created_at": now.isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "session_token": token,
        "user_id": uid,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    return uid, token


@pytest.fixture
def user_a(mongo_db):
    uid, token = _seed_user(mongo_db, credits=0, email_prefix="A")
    yield {"user_id": uid, "token": token}
    mongo_db.user_word_images.delete_many({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_one({"user_id": uid})


@pytest.fixture
def user_b(mongo_db):
    uid, token = _seed_user(mongo_db, credits=0, email_prefix="B")
    yield {"user_id": uid, "token": token}
    mongo_db.user_word_images.delete_many({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_one({"user_id": uid})


@pytest.fixture
def ai_user(mongo_db):
    uid, token = _seed_user(mongo_db, credits=100, email_prefix="ai")
    yield {"user_id": uid, "token": token}
    mongo_db.ai_generations.delete_many({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_one({"user_id": uid})


def _client(token=None):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.cookies.set("session_token", token)
    return s


# ------------- Custom image endpoint -------------
SMALL_PNG = "data:image/png;base64," + ("A" * 100)


class TestCustomImage:
    def test_post_requires_auth(self):
        c = _client()
        r = c.post(f"{API}/words/w1/custom-image", json={"image_b64": SMALL_PNG})
        assert r.status_code == 401

    def test_post_unknown_word_404(self, user_a):
        c = _client(user_a["token"])
        r = c.post(f"{API}/words/does-not-exist/custom-image", json={"image_b64": SMALL_PNG})
        assert r.status_code == 404

    def _fam_word_id(self):
        r = requests.get(f"{API}/words", params={"theme": "famille"})
        assert r.status_code == 200
        return r.json()[0]["word_id"]

    def test_post_missing_prefix_400(self, user_a):
        c = _client(user_a["token"])
        wid = self._fam_word_id()
        # Must have >=20 chars but lack the data:image/ prefix
        r = c.post(f"{API}/words/{wid}/custom-image", json={"image_b64": "X" * 50})
        assert r.status_code == 400

    def test_post_too_large_413(self, user_a):
        c = _client(user_a["token"])
        wid = self._fam_word_id()
        big = "data:image/png;base64," + ("A" * 600_001)
        r = c.post(f"{API}/words/{wid}/custom-image", json={"image_b64": big})
        assert r.status_code == 413

    def test_post_success_and_get_reflects_custom(self, user_a, mongo_db):
        c = _client(user_a["token"])
        wid = self._fam_word_id()
        r = c.post(f"{API}/words/{wid}/custom-image", json={"image_b64": SMALL_PNG})
        assert r.status_code == 200, r.text
        assert r.json()["success"] is True

        # GET /words with the same session must show custom=true + data URL
        g = c.get(f"{API}/words", params={"theme": "famille"})
        assert g.status_code == 200
        words = g.json()
        target = next(w for w in words if w["word_id"] == wid)
        assert target["custom"] is True
        assert target["image"].startswith("data:image/")

        # Other words: custom=false and image stays original (http)
        other = next(w for w in words if w["word_id"] != wid)
        assert other.get("custom") in (False, None)
        assert other["image"].startswith("http")

    def test_other_user_does_not_see_custom(self, user_a, user_b):
        ca = _client(user_a["token"])
        wid = self._fam_word_id()
        ca.post(f"{API}/words/{wid}/custom-image", json={"image_b64": SMALL_PNG})

        cb = _client(user_b["token"])
        g = cb.get(f"{API}/words", params={"theme": "famille"})
        target = next(w for w in g.json() if w["word_id"] == wid)
        assert target.get("custom") in (False, None)
        assert target["image"].startswith("http")

    def test_delete_removes_custom(self, user_a):
        c = _client(user_a["token"])
        wid = self._fam_word_id()
        c.post(f"{API}/words/{wid}/custom-image", json={"image_b64": SMALL_PNG})

        d = c.delete(f"{API}/words/{wid}/custom-image")
        assert d.status_code == 200
        assert d.json()["success"] is True

        g = c.get(f"{API}/words", params={"theme": "famille"})
        target = next(w for w in g.json() if w["word_id"] == wid)
        assert target.get("custom") in (False, None)
        assert target["image"].startswith("http")


# ------------- AI regression -------------
class TestAI:
    def test_translate_requires_french_400_no_debit(self, ai_user, mongo_db):
        c = _client(ai_user["token"])
        before = mongo_db.users.find_one({"user_id": ai_user["user_id"]})["credits"]
        r = c.post(f"{API}/ai/generate", json={"action": "translate", "params": {"french": "   "}})
        assert r.status_code == 400
        after = mongo_db.users.find_one({"user_id": ai_user["user_id"]})["credits"]
        assert before == after, "No credits should be deducted on 400"

    def test_sentence_1_credit(self, ai_user, mongo_db):
        c = _client(ai_user["token"])
        r = c.post(f"{API}/ai/generate", json={"action": "sentence", "params": {"theme": "famille", "age": 5}})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["credits_spent"] == 1
        assert body["content"]
        u = mongo_db.users.find_one({"user_id": ai_user["user_id"]})
        assert u["credits"] == 99

    def test_translate_2_credits(self, ai_user, mongo_db):
        c = _client(ai_user["token"])
        r = c.post(f"{API}/ai/generate", json={"action": "translate", "params": {"french": "Bonjour maman"}})
        assert r.status_code == 200, r.text
        assert r.json()["credits_spent"] == 2

    def test_daily_sentences_3_credits(self, ai_user):
        c = _client(ai_user["token"])
        r = c.post(f"{API}/ai/generate", json={"action": "daily_sentences", "params": {"theme": "famille", "age": 5}})
        assert r.status_code == 200, r.text
        assert r.json()["credits_spent"] == 3

    def test_activity_4_credits(self, ai_user):
        c = _client(ai_user["token"])
        r = c.post(f"{API}/ai/generate", json={"action": "activity", "params": {"theme": "famille", "age": 5}})
        assert r.status_code == 200, r.text
        assert r.json()["credits_spent"] == 4

    def test_prayer_5_credits(self, ai_user):
        c = _client(ai_user["token"])
        r = c.post(f"{API}/ai/generate", json={"action": "prayer", "params": {"theme": "famille", "age": 5}})
        assert r.status_code == 200, r.text
        assert r.json()["credits_spent"] == 5

    def test_mini_story_8_credits(self, ai_user):
        c = _client(ai_user["token"])
        r = c.post(f"{API}/ai/generate", json={"action": "mini_story", "params": {"age": 5, "words": "mama, tata"}})
        assert r.status_code == 200, r.text
        assert r.json()["credits_spent"] == 8


# ------------- Regression smoke -------------
class TestRegression:
    def test_missions_still_two(self, user_a):
        c = _client(user_a["token"])
        r = c.get(f"{API}/contributions/missions")
        assert r.status_code == 200
        missions = r.json()["missions"]
        assert len(missions) == 2
        keys = {m["key"] for m in missions}
        assert keys == {"add_word", "validate_3"}

    def test_billing_checkout_pack5(self, user_a):
        c = _client(user_a["token"])
        r = c.post(f"{API}/billing/checkout", json={"type": "pack", "pack_id": "pack_5"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "checkout_url" in body or "url" in body or body.get("payment_id", "").startswith("tr_")

    def test_billing_checkout_subscription(self, user_a):
        c = _client(user_a["token"])
        r = c.post(f"{API}/billing/checkout", json={"type": "subscription"})
        assert r.status_code == 200, r.text

    def test_admin_submissions_requires_admin(self, user_a):
        c = _client(user_a["token"])
        r = c.get(f"{API}/admin/submissions")
        assert r.status_code == 403

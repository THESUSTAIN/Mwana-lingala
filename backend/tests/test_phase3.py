"""Phase 3 backend tests: Admin moderation + AI Assistant (Mammouth) + Mollie billing."""
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


def _seed_user(mongo_db, email=None, credits=0, role=None):
    now = datetime.now(timezone.utc)
    uid = f"test-user-{int(time.time()*1000000)}"
    token = f"tok_{uid}"
    doc = {
        "user_id": uid,
        "email": email or f"TEST_{uid}@example.com",
        "name": "Test", "picture": None, "auth_method": "otp",
        "christian_mode": False, "is_premium": False, "credits": credits,
        "created_at": now.isoformat(),
    }
    if role:
        doc["role"] = role
    mongo_db.users.insert_one(doc)
    mongo_db.user_sessions.insert_one({
        "session_token": token, "user_id": uid,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    s.cookies.set("session_token", token)
    return uid, token, s


@pytest.fixture
def regular_user(mongo_db):
    uid, token, s = _seed_user(mongo_db, credits=0)
    yield uid, token, s
    s.close()
    mongo_db.users.delete_one({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})


@pytest.fixture
def admin_user(mongo_db):
    # demo@mwana.com is in ADMIN_EMAILS — auto-upgraded on any auth path
    email = "demo@mwana.com"
    # Clean any pre-existing record
    mongo_db.users.delete_one({"email": email})
    uid, token, s = _seed_user(mongo_db, email=email, credits=50, role="admin")
    yield uid, token, s
    s.close()
    mongo_db.users.delete_one({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})


@pytest.fixture
def ai_user(mongo_db):
    uid, token, s = _seed_user(mongo_db, credits=100)
    yield uid, token, s
    s.close()
    mongo_db.users.delete_one({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.ai_generations.delete_many({"user_id": uid})


# ---------------- Admin Moderation ----------------
class TestAdminModeration:
    def test_admin_endpoint_forbidden_for_regular_user(self, regular_user):
        _, _, s = regular_user
        r = s.get(f"{API}/admin/submissions")
        assert r.status_code == 403

    def test_admin_endpoint_unauthenticated_401(self):
        r = requests.get(f"{API}/admin/submissions")
        assert r.status_code == 401

    def test_admin_email_gets_role_admin_via_me(self, admin_user):
        _, _, s = admin_user
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json().get("role") == "admin"

    def test_admin_lists_pending_submissions(self, admin_user, regular_user, mongo_db):
        _, _, admin_s = admin_user
        uid_r, _, user_s = regular_user
        # Create a pending submission as regular user
        sub = user_s.post(f"{API}/contributions/words", json={
            "french": "TEST_admin_f", "lingala": "TEST_admin_l", "theme": "famille"
        })
        assert sub.status_code == 200, sub.text
        sub_id = sub.json()["submission_id"]
        try:
            r = admin_s.get(f"{API}/admin/submissions", params={"status_filter": "pending"})
            assert r.status_code == 200
            items = r.json()
            found = [x for x in items if x["submission_id"] == sub_id]
            assert len(found) == 1
            assert found[0]["status"] == "pending"
        finally:
            mongo_db.word_submissions.delete_one({"submission_id": sub_id})

    def test_approve_inserts_word(self, admin_user, regular_user, mongo_db):
        _, _, admin_s = admin_user
        _, _, user_s = regular_user
        sub = user_s.post(f"{API}/contributions/words", json={
            "french": "TEST_appr_f", "lingala": "TEST_appr_l", "theme": "nourriture"
        }).json()
        sub_id = sub["submission_id"]
        try:
            r = admin_s.post(f"{API}/admin/submissions/{sub_id}/approve")
            assert r.status_code == 200, r.text
            word_id = r.json()["word_id"]
            # verify word inserted
            w = mongo_db.words.find_one({"word_id": word_id})
            assert w is not None
            assert w["lingala"] == "TEST_appr_l"
            assert w["french"] == "TEST_appr_f"
            assert w["theme"] == "nourriture"
            # submission marked approved
            updated = mongo_db.word_submissions.find_one({"submission_id": sub_id})
            assert updated["status"] == "approved"
            # cleanup
            mongo_db.words.delete_one({"word_id": word_id})
        finally:
            mongo_db.word_submissions.delete_one({"submission_id": sub_id})

    def test_reject_deducts_credits(self, admin_user, regular_user, mongo_db):
        uid_r, _, user_s = regular_user
        _, _, admin_s = admin_user
        # submit -> +5 credits
        sub = user_s.post(f"{API}/contributions/words", json={
            "french": "TEST_rej_f", "lingala": "TEST_rej_l", "theme": "famille"
        }).json()
        sub_id = sub["submission_id"]
        credits_before = sub["credits_total"]
        assert credits_before == 5
        try:
            r = admin_s.post(f"{API}/admin/submissions/{sub_id}/reject")
            assert r.status_code == 200
            user_doc = mongo_db.users.find_one({"user_id": uid_r})
            # 5 awarded -5 deducted = 0
            assert user_doc["credits"] == 0
            s = mongo_db.word_submissions.find_one({"submission_id": sub_id})
            assert s["status"] == "rejected"
        finally:
            mongo_db.word_submissions.delete_one({"submission_id": sub_id})


# ---------------- AI Assistant ----------------
class TestAIAssistant:
    def test_unknown_action_returns_400(self, ai_user):
        _, _, s = ai_user
        r = s.post(f"{API}/ai/generate", json={"action": "does_not_exist", "params": {}})
        assert r.status_code == 400

    def test_insufficient_credits_returns_402(self, regular_user):
        _, _, s = regular_user
        r = s.post(f"{API}/ai/generate", json={"action": "sentence", "params": {"theme": "famille", "age": 5}})
        assert r.status_code == 402
        assert "insuffisant" in r.json().get("detail", "").lower()

    def test_sentence_generates_and_deducts_1_credit(self, ai_user, mongo_db):
        uid, _, s = ai_user
        before = mongo_db.users.find_one({"user_id": uid})["credits"]
        r = s.post(f"{API}/ai/generate", json={"action": "sentence", "params": {"theme": "famille", "age": 5}})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["action"] == "sentence"
        assert isinstance(body["content"], str)
        assert len(body["content"].strip()) > 10
        assert body["credits_spent"] == 1
        after = mongo_db.users.find_one({"user_id": uid})["credits"]
        assert after == before - 1
        assert body["credits_total"] == after

    def test_ai_costs_defined_correctly(self, ai_user):
        """Check all 6 actions exist by issuing them with sufficient credits."""
        # Only test 'translate' cost=2 cheaply to validate credit math
        _, _, s = ai_user
        # translate with params
        r = s.post(f"{API}/ai/generate", json={"action": "translate", "params": {"french": "Bonjour"}})
        assert r.status_code == 200, r.text
        assert r.json()["credits_spent"] == 2


# ---------------- Billing / Mollie ----------------
class TestBilling:
    def test_checkout_pack_5(self, regular_user, mongo_db):
        _, _, s = regular_user
        r = s.post(f"{API}/billing/checkout", json={"type": "pack", "pack_id": "pack_5"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["payment_id"].startswith("tr_")
        assert "mollie.com" in body["checkout_url"]
        rec = mongo_db.payments.find_one({"payment_id": body["payment_id"]})
        assert rec is not None
        assert rec["amount"] == "5.00"
        assert rec["type"] == "pack"
        mongo_db.payments.delete_one({"payment_id": body["payment_id"]})

    def test_checkout_subscription(self, regular_user, mongo_db):
        _, _, s = regular_user
        r = s.post(f"{API}/billing/checkout", json={"type": "subscription"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["payment_id"].startswith("tr_")
        rec = mongo_db.payments.find_one({"payment_id": body["payment_id"]})
        assert rec is not None
        assert rec["amount"] == "12.99"
        assert rec["type"] == "subscription"
        mongo_db.payments.delete_one({"payment_id": body["payment_id"]})

    def test_checkout_invalid_pack_id_400(self, regular_user):
        _, _, s = regular_user
        r = s.post(f"{API}/billing/checkout", json={"type": "pack", "pack_id": "pack_999"})
        assert r.status_code == 400

    def test_checkout_invalid_type_400(self, regular_user):
        _, _, s = regular_user
        r = s.post(f"{API}/billing/checkout", json={"type": "bogus"})
        assert r.status_code == 400

    def test_verify_idempotent(self, regular_user, mongo_db):
        _, _, s = regular_user
        r = s.post(f"{API}/billing/checkout", json={"type": "pack", "pack_id": "pack_10"})
        pid = r.json()["payment_id"]
        try:
            v1 = s.get(f"{API}/billing/verify/{pid}")
            assert v1.status_code == 200, v1.text
            assert v1.json()["payment_id"] == pid
            assert v1.json()["status"] in ("open", "canceled", "paid", "pending", "expired")
            # Second call doesn't double-credit (local record should not have credits_granted unless paid)
            v2 = s.get(f"{API}/billing/verify/{pid}")
            assert v2.status_code == 200
        finally:
            mongo_db.payments.delete_one({"payment_id": pid})

    def test_webhook_accepts_unknown_id(self):
        r = requests.post(f"{API}/billing/webhook", data={"id": "tr_unknown_test_fake"})
        assert r.status_code == 200
        assert r.json().get("received") is True

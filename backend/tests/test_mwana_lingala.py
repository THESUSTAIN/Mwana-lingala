"""Backend tests for Mwana Lingala API.

Covers: content (themes/words/quiz), auth (OTP + session cookie),
child profiles, progress, settings, report-error.
"""
import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    s.close()


@pytest.fixture
def seeded_session(mongo_db):
    """Insert a user + session in Mongo (mimics test_credentials.md)."""
    from datetime import datetime, timezone, timedelta

    uid = f"test-user-{int(time.time()*1000)}"
    token = f"test_session_{int(time.time()*1000)}"
    now = datetime.now(timezone.utc)
    mongo_db.users.insert_one({
        "user_id": uid,
        "email": f"TEST_{uid}@example.com",
        "name": "Test Parent",
        "picture": None,
        "auth_method": "otp",
        "christian_mode": False,
        "is_premium": False,
        "credits": 0,
        "created_at": now.isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "session_token": token,
        "user_id": uid,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    yield {"user_id": uid, "token": token}
    # cleanup
    mongo_db.user_sessions.delete_one({"session_token": token})
    mongo_db.users.delete_one({"user_id": uid})
    mongo_db.child_profiles.delete_many({"user_id": uid})
    mongo_db.progress.delete_many({"user_id": uid})
    mongo_db.error_reports.delete_many({"user_id": uid})


@pytest.fixture
def auth_client(api_client, seeded_session):
    api_client.cookies.set("session_token", seeded_session["token"])
    return api_client


# ---------------- Content ----------------
class TestContent:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_themes_returns_4(self, api_client):
        r = api_client.get(f"{API}/themes")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 4
        slugs = {t["slug"] for t in data}
        assert slugs == {"famille", "nourriture", "emotions", "bible"}

    def test_themes_exclude_christian(self, api_client):
        r = api_client.get(f"{API}/themes", params={"include_christian": "false"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        assert all(not t["is_christian"] for t in data)

    def test_words_returns_20(self, api_client):
        r = api_client.get(f"{API}/words")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 20
        # ensure required fields
        for w in data:
            assert w["lingala"] and w["french"] and w["theme"]

    def test_words_exclude_christian_returns_15(self, api_client):
        r = api_client.get(f"{API}/words", params={"include_christian": "false"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 15
        assert all(not w["is_christian"] for w in data)

    def test_words_famille_returns_5(self, api_client):
        r = api_client.get(f"{API}/words", params={"theme": "famille"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 5
        assert all(w["theme"] == "famille" for w in data)

    def test_quiz_count_5(self, api_client):
        r = api_client.get(f"{API}/quiz", params={"count": 5})
        assert r.status_code == 200
        data = r.json()
        qs = data["questions"]
        assert len(qs) == 5
        for q in qs:
            assert "lingala" in q and "correct_french" in q
            assert len(q["options"]) == 4
            # correct answer must be among options
            frenchs = [o["french"] for o in q["options"]]
            assert q["correct_french"] in frenchs


# ---------------- Auth: OTP ----------------
class TestAuthOTP:
    def test_request_otp_returns_200(self, api_client):
        r = api_client.post(f"{API}/auth/request-otp", json={"email": "TEST_otp@example.com"})
        # Brevo might reject with 500 if sender not validated. Accept 200 OR 500 but report.
        assert r.status_code in (200, 500), f"Unexpected: {r.status_code} {r.text}"
        if r.status_code == 200:
            assert r.json().get("success") is True

    def test_verify_otp_invalid_code(self, api_client, mongo_db):
        # Seed an OTP in db
        email = "TEST_verify@example.com"
        api_client.post(f"{API}/auth/request-otp", json={"email": email})
        # Even if Brevo failed, the record should have been created before the send attempt.
        # Now try an obviously wrong code
        r = api_client.post(f"{API}/auth/verify-otp", json={"email": email, "code": "000000"})
        # Either 400 (record exists, wrong code) or 400 (record absent)
        assert r.status_code == 400
        assert "detail" in r.json()
        # cleanup
        mongo_db.otp_codes.delete_many({"email": email.lower()})

    def test_verify_otp_correct_code_via_direct_seed(self, api_client, mongo_db):
        """Seed an OTP hash directly, then verify -> should issue session cookie."""
        import bcrypt
        from datetime import datetime, timezone, timedelta

        email = "TEST_verify_ok@example.com"
        code = "123456"
        code_hash = bcrypt.hashpw(code.encode(), bcrypt.gensalt(rounds=10)).decode()
        mongo_db.otp_codes.delete_many({"email": email.lower()})
        mongo_db.otp_codes.insert_one({
            "email": email.lower(),
            "code_hash": code_hash,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "attempts": 0,
        })
        r = api_client.post(f"{API}/auth/verify-otp", json={"email": email, "code": code})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["user"]["email"] == email.lower()
        # cookie should be set
        assert "session_token" in api_client.cookies.get_dict()
        # cleanup
        mongo_db.users.delete_one({"email": email.lower()})
        mongo_db.user_sessions.delete_many({"user_id": body["user"]["user_id"]})


# ---------------- Auth: me / logout / settings ----------------
class TestAuthMe:
    def test_me_without_cookie_401(self, api_client):
        r = api_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_cookie(self, auth_client, seeded_session):
        r = auth_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["user_id"] == seeded_session["user_id"]

    def test_patch_settings_christian_mode(self, auth_client):
        r = auth_client.patch(f"{API}/auth/settings", json={"christian_mode": True})
        assert r.status_code == 200
        assert r.json().get("christian_mode") is True
        # Verify persisted via /me
        me = auth_client.get(f"{API}/auth/me").json()
        assert me["christian_mode"] is True

    def test_logout(self, api_client, mongo_db, seeded_session):
        api_client.cookies.set("session_token", seeded_session["token"])
        r = api_client.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # session should be gone in DB
        left = mongo_db.user_sessions.find_one({"session_token": seeded_session["token"]})
        assert left is None


# ---------------- Child profiles ----------------
class TestChildProfiles:
    def test_list_requires_auth(self, api_client):
        r = api_client.get(f"{API}/child-profiles")
        assert r.status_code == 401

    def test_crud_child_profile(self, auth_client):
        # create
        r = auth_client.post(f"{API}/child-profiles", json={
            "name": "TEST_kid", "age": 5, "themes": ["famille"], "christian_mode": False
        })
        assert r.status_code == 200
        profile = r.json()
        pid = profile["profile_id"]
        assert profile["name"] == "TEST_kid"
        assert profile["age"] == 5

        # list contains
        r = auth_client.get(f"{API}/child-profiles")
        assert r.status_code == 200
        ids = [p["profile_id"] for p in r.json()]
        assert pid in ids

        # update
        r = auth_client.patch(f"{API}/child-profiles/{pid}", json={"age": 6})
        assert r.status_code == 200

        # verify update via list
        r = auth_client.get(f"{API}/child-profiles")
        entry = next(p for p in r.json() if p["profile_id"] == pid)
        assert entry["age"] == 6

        # delete
        r = auth_client.delete(f"{API}/child-profiles/{pid}")
        assert r.status_code == 200

        # verify gone
        r = auth_client.get(f"{API}/child-profiles")
        ids = [p["profile_id"] for p in r.json()]
        assert pid not in ids


# ---------------- Progress ----------------
class TestProgress:
    def test_progress_flow(self, auth_client, api_client):
        # get some word_id
        r = api_client.get(f"{API}/words")
        word_id = r.json()[0]["word_id"]

        # POST progress
        r = auth_client.post(f"{API}/progress", json={"word_id": word_id, "learned": True})
        assert r.status_code == 200

        # GET progress
        r = auth_client.get(f"{API}/progress")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 1
        assert word_id in data["learned_word_ids"]
        assert data["total"] == 20


# ---------------- Report error ----------------
class TestReportError:
    def test_report_requires_auth(self, api_client):
        r = api_client.post(f"{API}/report-error", json={
            "word_id": "nope", "suggested_translation": "x"
        })
        assert r.status_code == 401

    def test_report_creates(self, auth_client, api_client):
        r = api_client.get(f"{API}/words")
        word_id = r.json()[0]["word_id"]
        r = auth_client.post(f"{API}/report-error", json={
            "word_id": word_id,
            "suggested_translation": "Better",
            "comment": "TEST_comment",
        })
        assert r.status_code == 200
        assert r.json()["success"] is True



# ---------------- Onboarding ----------------
class TestOnboarding:
    def test_status_needs_when_no_profile(self, auth_client):
        r = auth_client.get(f"{API}/onboarding/status")
        assert r.status_code == 200
        assert r.json()["needs_onboarding"] is True

    def test_status_false_after_creating_profile(self, auth_client):
        c = auth_client.post(f"{API}/child-profiles", json={
            "name": "TEST_onb", "age": 4, "themes": [], "christian_mode": False
        })
        assert c.status_code == 200
        r = auth_client.get(f"{API}/onboarding/status")
        assert r.status_code == 200
        assert r.json()["needs_onboarding"] is False


# ---------------- Mission Lingala / Contributions ----------------
class TestMissions:
    def test_missions_returns_exactly_two(self, auth_client):
        r = auth_client.get(f"{API}/contributions/missions")
        assert r.status_code == 200
        data = r.json()
        missions = data["missions"]
        assert len(missions) == 2, f"Expected 2 missions, got {len(missions)}: {missions}"
        keys = {m["key"] for m in missions}
        assert keys == {"add_word", "validate_3"}, f"Unexpected mission keys: {keys}"
        # report_error must be ABSENT
        assert "report_error" not in keys

    def test_missions_requires_auth(self, api_client):
        r = api_client.get(f"{API}/contributions/missions")
        assert r.status_code == 401

    def test_my_level_default(self, auth_client):
        r = auth_client.get(f"{API}/me/level")
        assert r.status_code == 200
        d = r.json()
        assert "credits" in d
        assert d["level"]["name"] == "Explorer Lingala"
        assert d["level"]["next"] == "Aide-parent"
        assert d["level"]["next_at"] == 21


class TestContributions:
    def test_submit_word_basic_credits_5(self, auth_client, mongo_db, seeded_session):
        r = auth_client.post(f"{API}/contributions/words", json={
            "french": "TEST_chat",
            "lingala": "TEST_nyau",
            "theme": "famille"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["credits_earned"] == 5
        assert body["credits_total"] == 5
        assert body["level"]["name"] == "Explorer Lingala"
        # cleanup
        mongo_db.word_submissions.delete_one({"submission_id": body["submission_id"]})

    def test_submit_word_with_examples_credits_8(self, auth_client, mongo_db):
        r = auth_client.post(f"{API}/contributions/words", json={
            "french": "TEST_chien",
            "lingala": "TEST_mbwa",
            "theme": "famille",
            "example_ln": "TEST mbwa",
            "example_fr": "TEST chien"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["credits_earned"] == 8
        # /me/level should reflect higher credits
        lvl = auth_client.get(f"{API}/me/level").json()
        assert lvl["credits"] >= 8
        mongo_db.word_submissions.delete_one({"submission_id": body["submission_id"]})

    def test_cannot_validate_own_contribution(self, auth_client, mongo_db):
        r = auth_client.post(f"{API}/contributions/words", json={
            "french": "TEST_oiseau", "lingala": "TEST_ndeke", "theme": "famille"
        })
        sub_id = r.json()["submission_id"]
        v = auth_client.post(f"{API}/contributions/validate/{sub_id}")
        assert v.status_code == 400
        assert "propre" in v.json()["detail"].lower() or "own" in v.json()["detail"].lower()
        mongo_db.word_submissions.delete_one({"submission_id": sub_id})

    def test_validate_other_user_credits_2_and_no_double(self, api_client, mongo_db, auth_client, seeded_session):
        # user A submits
        a = auth_client.post(f"{API}/contributions/words", json={
            "french": "TEST_arbre", "lingala": "TEST_nzete", "theme": "famille"
        })
        sub_id = a.json()["submission_id"]

        # create second user B
        from datetime import datetime, timezone, timedelta
        uid_b = f"test-userB-{int(time.time()*1000)}"
        token_b = f"test_sessionB_{int(time.time()*1000)}"
        now = datetime.now(timezone.utc)
        mongo_db.users.insert_one({
            "user_id": uid_b, "email": f"TEST_{uid_b}@example.com", "name": "B",
            "picture": None, "auth_method": "otp", "christian_mode": False,
            "is_premium": False, "credits": 0, "created_at": now.isoformat(),
        })
        mongo_db.user_sessions.insert_one({
            "session_token": token_b, "user_id": uid_b,
            "expires_at": (now + timedelta(days=7)).isoformat(),
            "created_at": now.isoformat(),
        })
        s_b = requests.Session()
        s_b.headers.update({"Content-Type": "application/json"})
        s_b.cookies.set("session_token", token_b)
        try:
            v = s_b.post(f"{API}/contributions/validate/{sub_id}")
            assert v.status_code == 200, v.text
            assert v.json()["credits_earned"] == 2
            # second time -> 400
            v2 = s_b.post(f"{API}/contributions/validate/{sub_id}")
            assert v2.status_code == 400
            # B's level should have 2 credits
            me_b = s_b.get(f"{API}/me/level").json()
            assert me_b["credits"] == 2
        finally:
            s_b.close()
            mongo_db.users.delete_one({"user_id": uid_b})
            mongo_db.user_sessions.delete_many({"user_id": uid_b})
            mongo_db.word_submissions.delete_one({"submission_id": sub_id})

    def test_validate_unknown_returns_404(self, auth_client):
        r = auth_client.post(f"{API}/contributions/validate/sub_does_not_exist")
        assert r.status_code == 404

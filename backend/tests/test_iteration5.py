"""Iteration 5 backend tests:
   - GET /api/me/badges (10 badges, earned booleans correct)
   - GET /api/me/photo-gallery (custom images with lingala/french)
   - POST /api/words/{word_id}/audio-submission (validation + crediting)
   - Admin: list / approve / reject audio submissions
   - POST /api/ai/generate action='coach' (cost 4, refuses empty question)
   - POST /api/weekly-program/generate (cost 12, deactivates previous)
   - GET  /api/weekly-program (returns active or {program_id: null})
   - GET  /api/words returns audio after approval
"""
import os
import time
import base64
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _seed_user(mongo_db, credits=0, role="user", email_prefix="iter5"):
    uid = f"test-{email_prefix}-{int(time.time() * 1000)}-{os.urandom(2).hex()}"
    token = f"sess_{email_prefix}_{int(time.time() * 1000)}_{os.urandom(2).hex()}"
    now = datetime.now(timezone.utc)
    user_doc = {
        "user_id": uid,
        "email": f"TEST_{uid}@example.com",
        "name": f"Test {email_prefix}",
        "picture": None,
        "auth_method": "otp",
        "christian_mode": False,
        "is_premium": False,
        "credits": credits,
        "created_at": now.isoformat(),
    }
    if role == "admin":
        user_doc["role"] = "admin"
    mongo_db.users.insert_one(user_doc)
    mongo_db.user_sessions.insert_one({
        "session_token": token,
        "user_id": uid,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    return uid, token


def _cleanup_user(mongo_db, uid):
    mongo_db.user_word_images.delete_many({"user_id": uid})
    mongo_db.audio_submissions.delete_many({"user_id": uid})
    mongo_db.weekly_programs.delete_many({"user_id": uid})
    mongo_db.progress.delete_many({"user_id": uid})
    mongo_db.word_submissions.delete_many({"user_id": uid})
    mongo_db.ai_generations.delete_many({"user_id": uid})
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_one({"user_id": uid})


def _cookies(token):
    return {"session_token": token}


@pytest.fixture
def fresh_user(mongo_db):
    uid, token = _seed_user(mongo_db, credits=200, email_prefix="iter5")
    yield {"user_id": uid, "token": token}
    _cleanup_user(mongo_db, uid)


@pytest.fixture
def admin_user(mongo_db):
    uid, token = _seed_user(mongo_db, credits=0, role="admin", email_prefix="iter5adm")
    yield {"user_id": uid, "token": token}
    _cleanup_user(mongo_db, uid)


@pytest.fixture(scope="session")
def first_word_id(mongo_db):
    w = mongo_db.words.find_one({}, {"_id": 0, "word_id": 1})
    assert w, "No words seeded"
    return w["word_id"]


# ---------- Badges ----------
class TestBadges:
    def test_badges_initial_state(self, fresh_user):
        r = requests.get(f"{API}/me/badges", cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 200
        data = r.json()
        assert "badges" in data
        assert data["total"] == 10
        assert len(data["badges"]) == 10
        # Expect at least these keys
        keys = {b["key"] for b in data["badges"]}
        for k in ["first_word", "ten_words", "twenty_words", "first_contribution",
                  "five_contributions", "first_audio", "first_photo",
                  "level_aide_parent", "level_gardien", "level_ambassadeur"]:
            assert k in keys
        # 200 credits → ambassadeur, gardien, aide-parent should be earned
        earned = {b["key"] for b in data["badges"] if b["earned"]}
        assert "level_aide_parent" in earned
        assert "level_gardien" in earned
        assert "level_ambassadeur" in earned
        # progress badges not earned
        assert "first_word" not in earned

    def test_badges_progress_unlocks(self, mongo_db, fresh_user):
        # Mark 1 word as learned
        mongo_db.progress.insert_one({
            "user_id": fresh_user["user_id"],
            "word_id": "word_test",
            "learned": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        r = requests.get(f"{API}/me/badges", cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 200
        earned = {b["key"] for b in r.json()["badges"] if b["earned"]}
        assert "first_word" in earned
        assert "ten_words" not in earned


# ---------- Photo gallery ----------
class TestPhotoGallery:
    PNG_B64 = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"x" * 200).decode()

    def test_empty_gallery(self, fresh_user):
        r = requests.get(f"{API}/me/photo-gallery", cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 200
        assert r.json() == {"photos": []}

    def test_gallery_returns_uploaded_image(self, fresh_user, first_word_id):
        # Upload custom image
        up = requests.post(
            f"{API}/words/{first_word_id}/custom-image",
            json={"image_b64": self.PNG_B64},
            cookies=_cookies(fresh_user["token"]),
        )
        assert up.status_code == 200, up.text
        # Fetch gallery
        r = requests.get(f"{API}/me/photo-gallery", cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 200
        photos = r.json()["photos"]
        assert len(photos) == 1
        assert photos[0]["word_id"] == first_word_id
        assert photos[0]["image"] == self.PNG_B64
        assert "lingala" in photos[0] and photos[0]["lingala"]
        assert "french" in photos[0] and photos[0]["french"]


# ---------- Audio submission flow ----------
class TestAudioSubmission:
    GOOD = "data:audio/webm;base64," + base64.b64encode(b"webm-binary" * 50).decode()

    def test_submit_audio_invalid_prefix(self, fresh_user, first_word_id):
        bad = "data:image/png;base64," + ("a" * 200)  # >=100 chars but wrong prefix
        r = requests.post(
            f"{API}/words/{first_word_id}/audio-submission",
            json={"word_id": first_word_id, "audio_b64": bad},
            cookies=_cookies(fresh_user["token"]),
        )
        assert r.status_code == 400

    def test_submit_audio_too_large(self, fresh_user, first_word_id):
        big = "data:audio/webm;base64," + ("a" * 460_000)
        r = requests.post(
            f"{API}/words/{first_word_id}/audio-submission",
            json={"word_id": first_word_id, "audio_b64": big},
            cookies=_cookies(fresh_user["token"]),
        )
        assert r.status_code == 413

    def test_submit_audio_credits_user(self, mongo_db, fresh_user, first_word_id):
        before = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        r = requests.post(
            f"{API}/words/{first_word_id}/audio-submission",
            json={"word_id": first_word_id, "audio_b64": self.GOOD},
            cookies=_cookies(fresh_user["token"]),
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["credits_earned"] == 10
        after = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        assert after == before + 10

    def test_submit_unknown_word_404(self, fresh_user, first_word_id):
        r = requests.post(
            f"{API}/words/word_does_not_exist/audio-submission",
            json={"word_id": first_word_id, "audio_b64": self.GOOD},
            cookies=_cookies(fresh_user["token"]),
        )
        assert r.status_code == 404

    def test_submit_audio_unauthenticated(self, first_word_id):
        r = requests.post(
            f"{API}/words/{first_word_id}/audio-submission",
            json={"word_id": first_word_id, "audio_b64": self.GOOD},
        )
        assert r.status_code == 401


# ---------- Admin audio moderation ----------
class TestAdminAudio:
    GOOD = "data:audio/webm;base64," + base64.b64encode(b"webm-binary" * 50).decode()

    def test_admin_list_requires_admin(self, fresh_user):
        r = requests.get(f"{API}/admin/audio-submissions", cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 403

    def test_admin_approve_flow(self, mongo_db, fresh_user, admin_user, first_word_id):
        # Snapshot original audio (may be empty)
        original_audio = mongo_db.words.find_one({"word_id": first_word_id}).get("audio")

        # User submits
        s1 = requests.post(
            f"{API}/words/{first_word_id}/audio-submission",
            json={"word_id": first_word_id, "audio_b64": self.GOOD},
            cookies=_cookies(fresh_user["token"]),
        )
        assert s1.status_code == 200
        sub_id = s1.json()["submission_id"]

        # Admin lists pending
        lst = requests.get(f"{API}/admin/audio-submissions?status_filter=pending",
                           cookies=_cookies(admin_user["token"]))
        assert lst.status_code == 200
        ids = [x["submission_id"] for x in lst.json()]
        assert sub_id in ids

        # Admin approves
        ap = requests.post(f"{API}/admin/audio-submissions/{sub_id}/approve",
                           cookies=_cookies(admin_user["token"]))
        assert ap.status_code == 200

        # Word now has audio populated
        word = mongo_db.words.find_one({"word_id": first_word_id})
        assert word["audio"] == self.GOOD

        # GET /api/words returns the audio
        items = requests.get(f"{API}/words").json()
        match = [w for w in items if w["word_id"] == first_word_id]
        assert match and match[0]["audio"] == self.GOOD

        # Restore original audio
        mongo_db.words.update_one(
            {"word_id": first_word_id},
            {"$set": {"audio": original_audio}, "$unset": {"audio_contributor": ""}},
        )

    def test_admin_reject_deducts_credits(self, mongo_db, fresh_user, admin_user, first_word_id):
        # Submit
        before = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        s = requests.post(
            f"{API}/words/{first_word_id}/audio-submission",
            json={"word_id": first_word_id, "audio_b64": self.GOOD},
            cookies=_cookies(fresh_user["token"]),
        )
        assert s.status_code == 200
        sub_id = s.json()["submission_id"]
        after_submit = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        assert after_submit == before + 10

        # Reject
        rej = requests.post(f"{API}/admin/audio-submissions/{sub_id}/reject",
                            cookies=_cookies(admin_user["token"]))
        assert rej.status_code == 200

        # Submission is rejected
        sub = mongo_db.audio_submissions.find_one({"submission_id": sub_id})
        assert sub["status"] == "rejected"

        # Credits deducted back
        after_rej = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        assert after_rej == before

    def test_approve_supersedes_other_pending(self, mongo_db, fresh_user, admin_user, first_word_id):
        # Two submissions on the same word
        s1 = requests.post(f"{API}/words/{first_word_id}/audio-submission",
                           json={"word_id": first_word_id, "audio_b64": self.GOOD},
                           cookies=_cookies(fresh_user["token"]))
        s2 = requests.post(f"{API}/words/{first_word_id}/audio-submission",
                           json={"word_id": first_word_id, "audio_b64": self.GOOD},
                           cookies=_cookies(fresh_user["token"]))
        assert s1.status_code == 200 and s2.status_code == 200
        sub_id_1, sub_id_2 = s1.json()["submission_id"], s2.json()["submission_id"]

        ap = requests.post(f"{API}/admin/audio-submissions/{sub_id_1}/approve",
                           cookies=_cookies(admin_user["token"]))
        assert ap.status_code == 200

        sub2 = mongo_db.audio_submissions.find_one({"submission_id": sub_id_2})
        assert sub2["status"] == "superseded"

        # Restore
        mongo_db.words.update_one({"word_id": first_word_id},
                                  {"$unset": {"audio_contributor": ""}})


# ---------- AI Coach ----------
class TestAICoach:
    def test_coach_empty_question_400(self, fresh_user):
        r = requests.post(f"{API}/ai/generate",
                          json={"action": "coach", "params": {"question": "", "age": 4}},
                          cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 400

    def test_coach_charges_4_credits(self, mongo_db, fresh_user):
        before = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        r = requests.post(
            f"{API}/ai/generate",
            json={"action": "coach", "params": {
                "question": "Comment encourager mon enfant à parler Lingala chaque jour?",
                "age": 4}},
            cookies=_cookies(fresh_user["token"]),
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["credits_spent"] == 4
        assert isinstance(body["content"], str) and len(body["content"]) > 20
        after = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        assert after == before - 4


# ---------- Weekly program ----------
class TestWeeklyProgram:
    def test_get_when_none_active(self, fresh_user):
        r = requests.get(f"{API}/weekly-program", cookies=_cookies(fresh_user["token"]))
        assert r.status_code == 200
        assert r.json() == {"program_id": None}

    def test_generate_charges_12_credits_and_deactivates_old(self, mongo_db, fresh_user):
        before = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]

        r1 = requests.post(f"{API}/weekly-program/generate",
                           json={"age": 4, "themes": ["famille", "couleurs"]},
                           cookies=_cookies(fresh_user["token"]),
                           timeout=120)
        assert r1.status_code == 200, r1.text
        body1 = r1.json()
        pid_1 = body1["program_id"]
        assert isinstance(body1["content"], str) and len(body1["content"]) > 50

        after1 = mongo_db.users.find_one({"user_id": fresh_user["user_id"]})["credits"]
        assert after1 == before - 12

        # GET should return the active program
        g = requests.get(f"{API}/weekly-program", cookies=_cookies(fresh_user["token"]))
        assert g.status_code == 200
        assert g.json()["program_id"] == pid_1

        # Generate again → deactivates the first
        r2 = requests.post(f"{API}/weekly-program/generate",
                           json={"age": 5, "themes": ["nourriture"]},
                           cookies=_cookies(fresh_user["token"]),
                           timeout=120)
        assert r2.status_code == 200
        pid_2 = r2.json()["program_id"]
        assert pid_2 != pid_1

        old = mongo_db.weekly_programs.find_one({"program_id": pid_1})
        assert old["active"] is False

        g2 = requests.get(f"{API}/weekly-program", cookies=_cookies(fresh_user["token"]))
        assert g2.json()["program_id"] == pid_2

    def test_generate_402_when_insufficient_credits(self, mongo_db):
        uid, token = _seed_user(mongo_db, credits=5, email_prefix="lowc")
        try:
            r = requests.post(f"{API}/weekly-program/generate",
                              json={"age": 4, "themes": ["famille"]},
                              cookies=_cookies(token))
            assert r.status_code == 402
        finally:
            _cleanup_user(mongo_db, uid)

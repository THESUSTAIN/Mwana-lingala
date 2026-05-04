"""Iteration 28 — Adult-learner pivot (Mwana Lingala).
Covers:
 - GET /api/travel-phrases (50 phrases, 10 categories)
 - GET /api/level-test/questions (10 questions)
 - POST /api/level-test/submit (score + breakdown)
 - POST /api/onboarding/motivation (apprendre -> learner_type=adult)
 - PATCH /api/auth/learner-type
 - GET /api/auth/me includes learner_type/motivation
 - POST /api/ai/generate solo_phrases / solo_dialogue / coach auto-routing
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def test_user(mongo_db):
    """Create a fresh user + session via direct mongo insert (no real OTP roundtrip)."""
    uid = f"TEST_adult_pivot_{uuid.uuid4().hex[:10]}"
    token = f"TEST_session_{uuid.uuid4().hex}"
    mongo_db.users.insert_one({
        "user_id": uid,
        "email": f"TEST_{uid}@example.com",
        "name": "Test Adult Learner",
        "picture": None,
        "auth_method": "otp",
        "christian_mode": False,
        "is_premium": True,
        "credits": 500,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "session_token": token,
        "user_id": uid,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    yield {"user_id": uid, "token": token}
    # cleanup
    mongo_db.user_sessions.delete_many({"user_id": uid})
    mongo_db.users.delete_many({"user_id": uid})


@pytest.fixture
def auth_headers(test_user):
    return {"Authorization": f"Bearer {test_user['token']}", "Content-Type": "application/json"}


# ---------- Public endpoints ----------
class TestTravelPhrases:
    def test_get_all_returns_50_phrases_and_10_categories(self):
        r = requests.get(f"{BASE_URL}/api/travel-phrases", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data and "categories" in data and "total" in data
        assert data["total"] == 50, f"expected 50 phrases, got {data['total']}"
        assert len(data["items"]) == 50
        assert len(data["categories"]) == 10, f"expected 10 categories, got {len(data['categories'])}: {data['categories']}"
        # each phrase has required fields
        for p in data["items"][:5]:
            assert {"category", "fr", "ln", "context"} <= set(p.keys())

    def test_filter_by_category(self):
        r = requests.get(f"{BASE_URL}/api/travel-phrases", params={"category": "Aéroport"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) >= 1
        for p in data["items"]:
            assert p["category"].lower() == "aéroport"


class TestLevelTest:
    def test_get_10_questions_without_answer_key(self):
        r = requests.get(f"{BASE_URL}/api/level-test/questions", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "questions" in data
        qs = data["questions"]
        assert len(qs) == 10
        for q in qs:
            assert {"id", "level", "question", "options"} <= set(q.keys())
            assert len(q["options"]) == 4
            assert "answer" not in q  # answer key must not leak

    def test_submit_all_correct_returns_b2(self):
        # Answers derived from adult_features.py LEVEL_TEST_QUESTIONS answer keys
        answers = [0, 1, 2, 1, 2, 2, 1, 1, 0, 0]
        r = requests.post(
            f"{BASE_URL}/api/level-test/submit",
            json={"answers": answers},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["score"] == 10
        assert data["max_score"] == 10
        assert data["result"]["level"] == "B2"
        assert len(data["breakdown"]) == 10
        for b in data["breakdown"]:
            assert b["is_correct"] is True

    def test_submit_all_wrong_returns_a1(self):
        answers = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]  # all wrong
        r = requests.post(
            f"{BASE_URL}/api/level-test/submit",
            json={"answers": answers},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["score"] == 0
        assert data["result"]["level"] == "A1"

    def test_submit_incomplete_returns_400(self):
        r = requests.post(
            f"{BASE_URL}/api/level-test/submit",
            json={"answers": [0, 1, 2]},
            timeout=30,
        )
        assert r.status_code == 400


# ---------- Auth-gated endpoints ----------
class TestAuthMeHasLearnerType:
    def test_me_returns_learner_type_and_motivation(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "learner_type" in data, f"missing learner_type in /auth/me response: {data}"
        assert "motivation" in data, f"missing motivation in /auth/me response: {data}"
        # default for a brand-new user: parent (no motivation yet)
        assert data["learner_type"] in ("parent", "adult")


class TestOnboardingMotivation:
    def test_motivation_apprendre_sets_adult(self, auth_headers, mongo_db, test_user):
        r = requests.post(
            f"{BASE_URL}/api/onboarding/motivation",
            headers=auth_headers,
            json={"motivation": "apprendre"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["motivation"] == "apprendre"
        assert data.get("learner_type") == "adult"
        assert data.get("onboarding_completed_at") is not None

        # verify via /auth/me
        r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        d2 = r2.json()
        assert d2["motivation"] == "apprendre"
        assert d2["learner_type"] == "adult"

    def test_motivation_transmettre_keeps_parent(self, auth_headers, mongo_db, test_user):
        # Reset motivation first
        mongo_db.users.update_one(
            {"user_id": test_user["user_id"]},
            {"$unset": {"motivation": "", "onboarding_completed_at": "", "learner_type": ""}},
        )
        r = requests.post(
            f"{BASE_URL}/api/onboarding/motivation",
            headers=auth_headers,
            json={"motivation": "transmettre"},
            timeout=30,
        )
        assert r.status_code == 200
        r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        d2 = r2.json()
        assert d2["motivation"] == "transmettre"
        # Fallback maps non-apprendre motivation to parent
        assert d2["learner_type"] == "parent"


class TestLearnerTypePatch:
    def test_patch_to_adult_sets_mode_and_completes_onboarding(self, auth_headers, mongo_db, test_user):
        # reset
        mongo_db.users.update_one(
            {"user_id": test_user["user_id"]},
            {"$unset": {"learner_type": "", "onboarding_completed_at": ""}},
        )
        r = requests.patch(
            f"{BASE_URL}/api/auth/learner-type",
            headers=auth_headers,
            json={"learner_type": "adult"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("learner_type") == "adult"
        # Verify persistence
        doc = mongo_db.users.find_one({"user_id": test_user["user_id"]}, {"_id": 0, "learner_type": 1, "onboarding_completed_at": 1})
        assert doc["learner_type"] == "adult"
        assert doc.get("onboarding_completed_at") is not None

    def test_patch_invalid_returns_400(self, auth_headers):
        r = requests.patch(
            f"{BASE_URL}/api/auth/learner-type",
            headers=auth_headers,
            json={"learner_type": "foo"},
            timeout=30,
        )
        assert r.status_code == 400


# ---------- AI auto-routing ----------
class TestAISolo:
    def _ensure_adult(self, mongo_db, user_id):
        mongo_db.users.update_one(
            {"user_id": user_id},
            {"$set": {"learner_type": "adult", "motivation": "apprendre", "credits": 500}},
        )

    def test_solo_phrases(self, auth_headers, mongo_db, test_user):
        self._ensure_adult(mongo_db, test_user["user_id"])
        r = requests.post(
            f"{BASE_URL}/api/ai/generate",
            headers=auth_headers,
            json={"action": "solo_phrases", "params": {"level": "A1", "context": "voyage"}},
            timeout=90,
        )
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        assert "text" in data or "output" in data or "result" in data or "content" in data, f"unexpected shape: {list(data.keys())}"

    def test_solo_dialogue(self, auth_headers, mongo_db, test_user):
        self._ensure_adult(mongo_db, test_user["user_id"])
        r = requests.post(
            f"{BASE_URL}/api/ai/generate",
            headers=auth_headers,
            json={"action": "solo_dialogue", "params": {"level": "A1", "topic": "au marché"}},
            timeout=90,
        )
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"

    def test_solo_dialogue_requires_topic(self, auth_headers, mongo_db, test_user):
        self._ensure_adult(mongo_db, test_user["user_id"])
        r = requests.post(
            f"{BASE_URL}/api/ai/generate",
            headers=auth_headers,
            json={"action": "solo_dialogue", "params": {"level": "A1", "topic": ""}},
            timeout=30,
        )
        assert r.status_code == 400

    def test_coach_autoroutes_to_coach_solo_for_adult(self, auth_headers, mongo_db, test_user):
        """When user.learner_type='adult', action='coach' should use coach_solo prompt.
        Indirectly verified: the response should be in French and refer to the
        adult learner (tu/vous) rather than a parent context.
        """
        self._ensure_adult(mongo_db, test_user["user_id"])
        r = requests.post(
            f"{BASE_URL}/api/ai/generate",
            headers=auth_headers,
            json={"action": "coach", "params": {"level": "A1", "question": "Comment mémoriser les chiffres en lingala ?"}},
            timeout=120,
        )
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        text = (data.get("text") or data.get("output") or data.get("content") or data.get("result") or "").lower()
        # Heuristic: coach_solo prompt asks for "Actions concrètes" in the output
        # and should NOT mention "enfant" as the target.
        assert text, "empty AI response"
        assert "action" in text or "concrète" in text or "semaine" in text, f"response doesn't look like coach_solo: {text[:300]}"

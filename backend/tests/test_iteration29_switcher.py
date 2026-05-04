"""Iteration 29 — Onboarding fix + LearnerSwitchCard + 3-way ProfileSwitcher + label coherence.

Backend tests (focus on what Main Agent changed):
  1. Onboarding status + motivation flow (apprendre → skip; transmettre → needs child)
  2. PATCH /api/auth/learner-type switches between adult & parent
  3. GET /api/auth/me returns the new learner_type after switch
"""
import os
import time
import uuid
import pytest
import requests
import subprocess

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"


def _mongo_insert_user(learner_type="parent", motivation=None):
    """Insert a user + session directly into Mongo and return (token, user_id)."""
    uid = f"test-it29-{uuid.uuid4().hex[:8]}"
    token = f"test_session_{uuid.uuid4().hex}"
    js = (
        "db=db.getSiblingDB('test_database');"
        f"db.users.insertOne({{user_id:'{uid}',email:'{uid}@ex.com',name:'Test It29',"
        f"picture:null,auth_method:'otp',christian_mode:false,is_premium:false,credits:200,role:'user',"
        f"learner_type:'{learner_type}',"
        + (f"motivation:'{motivation}'," if motivation else "")
        + f"created_at:new Date().toISOString()}});"
        f"db.user_sessions.insertOne({{session_token:'{token}',user_id:'{uid}',"
        f"expires_at:new Date(Date.now()+7*24*3600*1000).toISOString(),created_at:new Date().toISOString()}});"
    )
    r = subprocess.run(["mongosh", "--quiet", "--eval", js], capture_output=True, text=True, timeout=20)
    assert r.returncode == 0, f"mongosh failed: {r.stderr}"
    return token, uid


def _cleanup_user(uid):
    js = f"db=db.getSiblingDB('test_database');db.users.deleteMany({{user_id:'{uid}'}});db.user_sessions.deleteMany({{user_id:'{uid}'}});db.child_profiles.deleteMany({{user_id:'{uid}'}});"
    subprocess.run(["mongosh", "--quiet", "--eval", js], capture_output=True, text=True, timeout=20)


@pytest.fixture
def parent_client():
    token, uid = _mongo_insert_user(learner_type="parent")
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    yield s, uid
    _cleanup_user(uid)


@pytest.fixture
def adult_client():
    token, uid = _mongo_insert_user(learner_type="adult", motivation="apprendre")
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    yield s, uid
    _cleanup_user(uid)


# ---- Onboarding status ----
class TestOnboardingFlow:
    def test_fresh_user_needs_onboarding(self, parent_client):
        s, _ = parent_client
        r = s.get(f"{BASE_URL}/api/onboarding/status")
        assert r.status_code == 200
        data = r.json()
        # Fresh parent user has no motivation yet & no child profile
        assert data["needs_onboarding"] is True
        assert data["has_motivation"] is False
        assert data["has_child_profile"] is False

    def test_motivation_apprendre_completes_onboarding(self, parent_client):
        s, _ = parent_client
        r = s.post(f"{BASE_URL}/api/onboarding/motivation", json={"motivation": "apprendre"})
        assert r.status_code == 200
        body = r.json()
        assert body["motivation"] == "apprendre"
        assert body.get("learner_type") == "adult"
        # Now onboarding no longer needed (adult doesn't need child profile)
        st = s.get(f"{BASE_URL}/api/onboarding/status").json()
        assert st["needs_onboarding"] is False
        assert st["is_adult_learner"] is True

    def test_motivation_transmettre_still_needs_child(self, parent_client):
        s, _ = parent_client
        r = s.post(f"{BASE_URL}/api/onboarding/motivation", json={"motivation": "transmettre"})
        assert r.status_code == 200
        st = s.get(f"{BASE_URL}/api/onboarding/status").json()
        assert st["has_motivation"] is True
        assert st["has_child_profile"] is False
        assert st["needs_onboarding"] is True  # still needs child profile
        assert st["is_adult_learner"] is False

    def test_user_with_motivation_but_no_child_still_shows_needs_onboarding(self):
        """Reproduces the bug context: user saved motivation='transmettre' earlier,
        then abandoned — must still be allowed to re-enter onboarding at step 1."""
        token, uid = _mongo_insert_user(learner_type="parent", motivation="transmettre")
        try:
            s = requests.Session()
            s.headers.update({"Authorization": f"Bearer {token}"})
            st = s.get(f"{BASE_URL}/api/onboarding/status").json()
            assert st["has_motivation"] is True
            assert st["has_child_profile"] is False
            assert st["needs_onboarding"] is True
        finally:
            _cleanup_user(uid)


# ---- PATCH /api/auth/learner-type ----
class TestLearnerTypeSwitch:
    def test_parent_switches_to_adult(self, parent_client):
        s, _ = parent_client
        r = s.patch(f"{BASE_URL}/api/auth/learner-type", json={"learner_type": "adult"})
        assert r.status_code == 200
        assert r.json()["learner_type"] == "adult"
        me = s.get(f"{BASE_URL}/api/auth/me").json()
        assert me["learner_type"] == "adult"

    def test_adult_switches_back_to_parent(self, adult_client):
        s, _ = adult_client
        r = s.patch(f"{BASE_URL}/api/auth/learner-type", json={"learner_type": "parent"})
        assert r.status_code == 200
        assert r.json()["learner_type"] == "parent"
        me = s.get(f"{BASE_URL}/api/auth/me").json()
        assert me["learner_type"] == "parent"

    def test_invalid_learner_type_rejected(self, parent_client):
        s, _ = parent_client
        r = s.patch(f"{BASE_URL}/api/auth/learner-type", json={"learner_type": "foobar"})
        assert r.status_code == 400


# ---- /api/auth/me exposes learner_type ----
class TestMeFields:
    def test_me_has_learner_type_adult(self, adult_client):
        s, _ = adult_client
        me = s.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get("learner_type") == "adult"
        assert me.get("motivation") == "apprendre"

    def test_me_has_learner_type_parent(self, parent_client):
        s, _ = parent_client
        me = s.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get("learner_type") == "parent"

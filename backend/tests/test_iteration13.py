"""
Iteration 13 backend tests - Mwana Lingala
Tests:
- Early Bird launch offer (status + claim)
- Feedback widget (submit + admin list)
- Regression of key iteration 12 endpoints
"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")

USER1_TOKEN = os.environ.get("USER1_TOKEN", "test_session_eb_user_1777664552456")
USER2_TOKEN = os.environ.get("USER2_TOKEN", "test_session_eb_user2_1777664552456")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "test_session_admin_i13_1777664552456")


def cookies(token):
    return {"session_token": token}


# --------- Early Bird ----------
class TestEarlyBird:
    def test_status_public_no_auth(self):
        r = requests.get(f"{BASE}/api/early-bird/status")
        assert r.status_code == 200
        data = r.json()
        assert data["limit"] == 10
        assert data["trial_days"] == 30
        assert "claimed" in data
        assert "remaining" in data
        assert data["active"] is (data["remaining"] > 0)
        # Initial state: no claims
        assert data["claimed"] == 0
        assert data["remaining"] == 10
        assert data["active"] is True

    def test_claim_no_auth_401(self):
        r = requests.post(f"{BASE}/api/early-bird/claim")
        assert r.status_code == 401

    def test_claim_first_time_success_and_status_updates(self):
        r = requests.post(f"{BASE}/api/early-bird/claim", cookies=cookies(USER1_TOKEN))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "premium_until" in data
        assert data.get("credits_bonus") == 100

        # Verify status reflects 1 claim
        s = requests.get(f"{BASE}/api/early-bird/status").json()
        assert s["claimed"] == 1
        assert s["remaining"] == 9
        assert s["active"] is True

        # Verify user is now premium via /api/auth/me
        me = requests.get(f"{BASE}/api/auth/me", cookies=cookies(USER1_TOKEN)).json()
        assert me.get("is_premium") is True

    def test_claim_second_time_same_user_409(self):
        r = requests.post(f"{BASE}/api/early-bird/claim", cookies=cookies(USER1_TOKEN))
        assert r.status_code == 409
        assert "déjà" in r.json().get("detail", "").lower() or "deja" in r.json().get("detail", "").lower() or "already" in r.json().get("detail", "").lower()


# --------- Feedback ----------
class TestFeedback:
    def test_submit_feedback_success(self):
        r = requests.post(
            f"{BASE}/api/feedback",
            json={"message": "Super app!", "rating": 4, "page": "/app"},
            cookies=cookies(USER2_TOKEN),
        )
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

    def test_submit_feedback_no_auth_401(self):
        r = requests.post(f"{BASE}/api/feedback", json={"message": "hello world", "rating": 5})
        assert r.status_code == 401

    def test_submit_feedback_too_short_422(self):
        r = requests.post(
            f"{BASE}/api/feedback",
            json={"message": "ab", "rating": 3},
            cookies=cookies(USER2_TOKEN),
        )
        assert r.status_code == 422

    def test_submit_feedback_empty_422(self):
        r = requests.post(
            f"{BASE}/api/feedback",
            json={"message": "", "rating": 3},
            cookies=cookies(USER2_TOKEN),
        )
        assert r.status_code == 422

    def test_admin_feedback_list_admin_ok(self):
        r = requests.get(f"{BASE}/api/admin/feedback", cookies=cookies(ADMIN_TOKEN))
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        # Should contain at least the one we just submitted
        assert len(items) >= 1
        # Structure check
        item = items[0]
        assert "feedback_id" in item
        assert "message" in item
        assert "rating" in item
        assert "user_email" in item
        assert "early_bird" in item
        assert "created_at" in item

    def test_admin_feedback_list_non_admin_403(self):
        r = requests.get(f"{BASE}/api/admin/feedback", cookies=cookies(USER2_TOKEN))
        assert r.status_code == 403

    def test_admin_feedback_list_anonymous_401(self):
        r = requests.get(f"{BASE}/api/admin/feedback")
        assert r.status_code == 401


# --------- Regression ----------
class TestRegression:
    def test_plans_public(self):
        r = requests.get(f"{BASE}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) >= 2

    def test_words_public(self):
        r = requests.get(f"{BASE}/api/words")
        assert r.status_code == 200
        words = r.json()
        assert len(words) >= 80
        # Every word has locked + tier
        assert all("locked" in w and "tier" in w for w in words)

    def test_themes(self):
        r = requests.get(f"{BASE}/api/themes")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_auth_me_user(self):
        r = requests.get(f"{BASE}/api/auth/me", cookies=cookies(USER2_TOKEN))
        assert r.status_code == 200
        assert r.json().get("email")

    def test_admin_stats(self):
        r = requests.get(f"{BASE}/api/admin/stats", cookies=cookies(ADMIN_TOKEN))
        assert r.status_code == 200

    def test_testimonials_public(self):
        r = requests.get(f"{BASE}/api/testimonials")
        assert r.status_code == 200

    def test_my_badges(self):
        r = requests.get(f"{BASE}/api/me/badges", cookies=cookies(USER2_TOKEN))
        assert r.status_code == 200

    def test_admin_403_for_user_on_words(self):
        r = requests.get(f"{BASE}/api/admin/words", cookies=cookies(USER2_TOKEN))
        assert r.status_code == 403


# --------- Early Bird loop (claim 9 more to exhaust pool) ----------
class TestEarlyBirdExhaustion:
    """Claims slots 2..10 via freshly inserted users then verifies 11th -> 410."""

    @pytest.fixture(scope="class")
    def extra_tokens(self):
        from pymongo import MongoClient
        import time

        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = MongoClient(mongo_url)
        dbh = client[db_name]
        tokens = []
        for i in range(10):  # create 10 extra users (we need 9 more claims + 1 to test 410)
            ts = int(time.time() * 1000) + i
            uid = f"test-eb-bulk-{ts}"
            tok = f"test_session_eb_bulk_{ts}"
            dbh.users.insert_one({
                "user_id": uid,
                "email": f"test.eb.bulk+{ts}@example.com",
                "name": f"EB Bulk {i}",
                "auth_method": "otp",
                "christian_mode": False,
                "is_premium": False,
                "credits": 50,
                "role": "user",
                "created_at": "2026-01-01T00:00:00+00:00",
            })
            dbh.user_sessions.insert_one({
                "session_token": tok,
                "user_id": uid,
                "expires_at": "2027-01-01T00:00:00+00:00",
                "created_at": "2026-01-01T00:00:00+00:00",
            })
            tokens.append((tok, uid))
        yield tokens
        # cleanup
        for tok, uid in tokens:
            dbh.user_sessions.delete_one({"session_token": tok})
            dbh.users.delete_one({"user_id": uid})
        client.close()

    def test_claim_until_exhausted_then_410(self, extra_tokens):
        # Current claimed count
        s0 = requests.get(f"{BASE}/api/early-bird/status").json()
        start_claimed = s0["claimed"]
        need = max(0, 10 - start_claimed)
        successful = 0
        for tok, _ in extra_tokens[:need]:
            r = requests.post(f"{BASE}/api/early-bird/claim", cookies=cookies(tok))
            assert r.status_code == 200, f"claim {successful+1} should succeed but got {r.status_code} {r.text}"
            successful += 1
        # Now pool exhausted
        s1 = requests.get(f"{BASE}/api/early-bird/status").json()
        assert s1["claimed"] == 10
        assert s1["remaining"] == 0
        assert s1["active"] is False
        # Next user -> 410
        next_tok = extra_tokens[need][0]
        r = requests.post(f"{BASE}/api/early-bird/claim", cookies=cookies(next_tok))
        assert r.status_code == 410, f"expected 410, got {r.status_code} {r.text}"

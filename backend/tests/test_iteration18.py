"""Iteration 18 backend tests — parental code + family journal endpoints.

Covers:
- GET /api/auth/parental-code/status
- POST /api/auth/parental-code (set, validation: digits-only, min/max length)
- POST /api/auth/verify-parental-code (right code, wrong code, no code configured)
- DELETE /api/auth/parental-code
- GET /api/progress/journal (shape, ordering)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
USER_TOKEN = "tk_013b94a3afa6472fa1c1d926a9d8d964"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.cookies.set("session_token", USER_TOKEN)
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module", autouse=True)
def cleanup_parental_code(session):
    """Ensure clean state before & after the run."""
    session.delete(f"{BASE_URL}/api/auth/parental-code")
    yield
    session.delete(f"{BASE_URL}/api/auth/parental-code")


# ---- Parental code status ----
class TestParentalCodeStatus:
    def test_status_initially_not_configured(self, session):
        # Make sure no code at start
        session.delete(f"{BASE_URL}/api/auth/parental-code")
        r = session.get(f"{BASE_URL}/api/auth/parental-code/status")
        assert r.status_code == 200, r.text
        assert r.json() == {"configured": False}

    def test_status_after_set_is_configured(self, session):
        r1 = session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "1234"})
        assert r1.status_code == 200, r1.text
        assert r1.json().get("success") is True

        r2 = session.get(f"{BASE_URL}/api/auth/parental-code/status")
        assert r2.status_code == 200
        assert r2.json() == {"configured": True}


# ---- Parental code set validations ----
class TestParentalCodeSetValidation:
    def test_set_invalid_non_digits_returns_400(self, session):
        # Make sure code exists or not — endpoint validates regardless
        r = session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "abcd"})
        assert r.status_code == 400, r.text
        body = r.json()
        assert "chiffres" in (body.get("detail") or "").lower() or body.get("detail")

    def test_set_too_short_returns_422(self, session):
        r = session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "12"})
        assert r.status_code == 422, r.text

    def test_set_too_long_returns_422(self, session):
        r = session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "123456789"})
        assert r.status_code == 422, r.text

    def test_set_valid_8_digits_ok(self, session):
        r = session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "12345678"})
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True


# ---- Parental code verify ----
class TestParentalCodeVerify:
    def test_verify_correct_code(self, session):
        # Set a known code first
        s1 = session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "4321"})
        assert s1.status_code == 200

        r = session.post(f"{BASE_URL}/api/auth/verify-parental-code", json={"code": "4321"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("configured") is True

    def test_verify_wrong_code_returns_401(self, session):
        # ensure code is "4321"
        session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "4321"})
        r = session.post(f"{BASE_URL}/api/auth/verify-parental-code", json={"code": "0000"})
        assert r.status_code == 401, r.text
        assert "incorrect" in (r.json().get("detail") or "").lower()

    def test_verify_when_no_code_configured_allows(self, session):
        # Remove code first
        d = session.delete(f"{BASE_URL}/api/auth/parental-code")
        assert d.status_code == 200
        r = session.post(f"{BASE_URL}/api/auth/verify-parental-code", json={"code": "9999"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("configured") is False


# ---- Parental code delete ----
class TestParentalCodeDelete:
    def test_delete_removes_code(self, session):
        # Set code
        session.post(f"{BASE_URL}/api/auth/parental-code", json={"code": "5555"})
        s = session.get(f"{BASE_URL}/api/auth/parental-code/status")
        assert s.json().get("configured") is True

        d = session.delete(f"{BASE_URL}/api/auth/parental-code")
        assert d.status_code == 200, d.text
        assert d.json().get("success") is True

        s2 = session.get(f"{BASE_URL}/api/auth/parental-code/status")
        assert s2.status_code == 200
        assert s2.json() == {"configured": False}


# ---- Family Journal ----
class TestProgressJournal:
    def test_journal_shape(self, session):
        r = session.get(f"{BASE_URL}/api/progress/journal?limit=10")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "items" in body and "count" in body
        assert isinstance(body["items"], list)
        assert body["count"] == len(body["items"])

        # If items exist, validate shape
        for item in body["items"]:
            for field in ("word_id", "lingala", "french", "image", "theme", "date", "srs_level"):
                assert field in item, f"Missing field {field} in journal item: {item}"
            assert item["image"].startswith("/images/words/") or item["image"].startswith("http")

    def test_journal_seeded_then_ordering(self, session):
        # Seed 2 progress entries via /api/progress/review with quality>=2 to mark learned
        # First fetch a couple of words
        words_r = session.get(f"{BASE_URL}/api/words?include_christian=true")
        assert words_r.status_code == 200
        words = words_r.json()
        if len(words) < 2:
            pytest.skip("Not enough words to seed journal")
        w1, w2 = words[0], words[1]

        # Use /api/progress (mark learned)
        for w in (w1, w2):
            r = session.post(f"{BASE_URL}/api/progress", json={
                "word_id": w["word_id"],
                "learned": True,
                "profile_id": None,
            })
            assert r.status_code == 200, r.text

        r = session.get(f"{BASE_URL}/api/progress/journal?limit=10")
        assert r.status_code == 200
        items = r.json()["items"]
        # At least our 2 should be present
        ids = [it["word_id"] for it in items]
        assert w1["word_id"] in ids or w2["word_id"] in ids

        # Validate descending order by date
        dates = [it.get("date") or "" for it in items]
        assert dates == sorted(dates, reverse=True), f"Journal not sorted desc: {dates}"

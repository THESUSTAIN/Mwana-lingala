"""Iteration 20 tests — Public translation tool + Google Drive OAuth integration."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Created via mongosh helper before run
SESSION_TOKEN = os.environ.get("ITER20_TOKEN", "test_session_iter20_1777685533841")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.cookies.set("session_token", SESSION_TOKEN)
    return s


@pytest.fixture(scope="module")
def anon():
    return requests.Session()


# ---------------- Public translation ----------------

class TestPublicTranslation:
    def test_dictionary_fr_lg_bonjour(self, anon):
        r = anon.post(f"{API}/translate/public", json={"text": "Bonjour", "direction": "fr-lg"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["source"] == "Bonjour"
        assert data["direction"] == "fr-lg"
        assert "target" in data and len(data["target"]) > 0
        # Method should be dictionary if 'Bonjour' seeded
        assert data["method"] in ("dictionary", "ai", "ai-cached")

    def test_dictionary_auto_detect_lingala(self, anon):
        r = anon.post(f"{API}/translate/public", json={"text": "Mbote", "direction": "auto"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "target" in data and len(data["target"]) > 0
        assert data["direction"] in ("lg-fr", "fr-lg")

    def test_ai_fallback_long_phrase(self, anon):
        r = anon.post(f"{API}/translate/public", json={"text": "Bonne nuit mon enfant chéri", "direction": "fr-lg"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["direction"] == "fr-lg"
        assert data["method"] in ("ai", "ai-cached")
        assert isinstance(data["target"], str) and len(data["target"]) > 0

    def test_no_auth_required(self, anon):
        r = anon.post(f"{API}/translate/public", json={"text": "Merci", "direction": "fr-lg"})
        assert r.status_code in (200, 429)
        assert r.status_code != 401

    def test_sample_words(self, anon):
        r = anon.get(f"{API}/translate/sample-words")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0, "expected sample words list non-empty"
        # Up to 20
        assert len(data) <= 20
        # Validate shape
        first = data[0]
        for k in ("lingala", "french"):
            assert k in first
        # _id should NOT leak
        assert "_id" not in first

    def test_empty_text_400(self, anon):
        r = anon.post(f"{API}/translate/public", json={"text": "  ", "direction": "fr-lg"})
        assert r.status_code in (400, 422)

    def test_rate_limit_429(self, anon):
        # Hit endpoint many times rapidly; expect 429 within 25 attempts (limit=20/h)
        last = None
        seen_429 = False
        for i in range(25):
            r = anon.post(f"{API}/translate/public", json={"text": f"Bonjour {i}", "direction": "fr-lg"})
            last = r.status_code
            if r.status_code == 429:
                seen_429 = True
                break
        assert seen_429, f"Expected 429 within 25 calls, last status={last}"


# ---------------- Google Drive endpoints ----------------

class TestDriveEndpoints:
    def test_auth_url_requires_auth(self, anon):
        r = anon.get(f"{API}/drive/auth-url")
        assert r.status_code == 401

    def test_auth_url_authed(self, session):
        r = session.get(f"{API}/drive/auth-url")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "authorization_url" in data
        url = data["authorization_url"]
        assert url.startswith("https://accounts.google.com/o/oauth2/auth")
        assert "client_id=" in url
        # scope=drive.file (URL-encoded)
        assert "drive.file" in url

    def test_status_disconnected(self, session):
        r = session.get(f"{API}/drive/status")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("connected") is False
        assert data.get("email") in (None, "")

    def test_disconnect_idempotent(self, session):
        r = session.delete(f"{API}/drive/disconnect")
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True
        # call again
        r2 = session.delete(f"{API}/drive/disconnect")
        assert r2.status_code == 200
        assert r2.json().get("success") is True

    def test_upload_no_connection_400(self, session):
        # base64 of "hello" minimum length
        r = session.post(f"{API}/drive/upload", json={
            "filename": "test.txt",
            "mime_type": "text/plain",
            "data_b64": "aGVsbG8gd29ybGQgaGVsbG8="
        })
        assert r.status_code == 400, r.text
        # message contains "non connecté"
        detail = (r.json().get("detail") or "").lower()
        assert "drive" in detail and ("non connect" in detail or "connect" in detail)

    def test_upload_requires_auth(self, anon):
        r = anon.post(f"{API}/drive/upload", json={
            "filename": "x.txt",
            "mime_type": "text/plain",
            "data_b64": "aGVsbG8gd29ybGQ="
        })
        assert r.status_code == 401

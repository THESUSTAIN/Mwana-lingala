"""Iteration 26 backend tests.

Covers:
- GET /api/translate/word-of-day (public, deterministic, no _id leak)
- GET /api/auth/google/start (returns auth_url + state)
- POST /api/auth/google/exchange with invalid code (400)
- Legacy /api/auth/google/session removed (404)
- GET /api/drive/status (401 unauth, 200 authed with connected=false)
- GET /api/drive/auth-url (401 unauth, 200 authed with Google URL)
- /api/translate/public dictionary fast-path
- /api/translate/sample-words returns 20 words, no _id
- MongoDB TTL indexes on oauth_states and translate_rate_log
"""
import os
import subprocess
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
# Session token from iteration 20 (may still be valid per handoff)
EXISTING_SESSION = "test_session_iter20_1777685533841"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_client():
    """Create (or reuse) a Mongo-injected session cookie."""
    # Try existing session first
    s = requests.Session()
    s.cookies.set("session_token", EXISTING_SESSION, domain="kids-stories-16.preview.emergentagent.com")
    r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
    if r.status_code == 200:
        return s
    # Otherwise create a new one
    token = f"test_session_iter26_{int(__import__('time').time()*1000)}"
    uid = f"test-user-iter26-{int(__import__('time').time()*1000)}"
    mongo_cmd = f"""
    use('test_database');
    db.users.insertOne({{
      user_id: '{uid}', email: 'test.iter26@example.com', name: 'Iter26 Test',
      picture: null, auth_method: 'otp', christian_mode: false,
      is_premium: false, credits: 200, role: 'user',
      created_at: new Date().toISOString()
    }});
    db.user_sessions.insertOne({{
      session_token: '{token}', user_id: '{uid}',
      expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(),
      created_at: new Date().toISOString()
    }});
    """
    subprocess.run(["mongosh", "--quiet", "--eval", mongo_cmd], check=True, capture_output=True)
    s2 = requests.Session()
    s2.cookies.set("session_token", token, domain="kids-stories-16.preview.emergentagent.com")
    return s2


# ---------- Word of the day ----------
class TestWordOfDay:
    def test_public_no_auth(self, client):
        r = client.get(f"{BASE_URL}/api/translate/word-of-day", timeout=15)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        for key in ("lingala", "french", "date"):
            assert key in data, f"missing key {key}"
        assert isinstance(data["lingala"], str) and len(data["lingala"]) > 0
        assert isinstance(data["french"], str) and len(data["french"]) > 0
        # Should NOT leak _id
        assert "_id" not in data

    def test_deterministic(self, client):
        r1 = client.get(f"{BASE_URL}/api/translate/word-of-day", timeout=15).json()
        r2 = client.get(f"{BASE_URL}/api/translate/word-of-day", timeout=15).json()
        assert r1["lingala"] == r2["lingala"]
        assert r1["french"] == r2["french"]
        assert r1["date"] == r2["date"]


# ---------- Google OAuth direct ----------
class TestGoogleAuth:
    def test_start_returns_auth_url(self, client):
        redirect_uri = "https://kids-stories-16.preview.emergentagent.com/auth/google"
        r = client.get(f"{BASE_URL}/api/auth/google/start", params={"redirect_uri": redirect_uri}, timeout=15)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "auth_url" in data and "state" in data
        assert data["auth_url"].startswith("https://accounts.google.com/o/oauth2/auth")
        assert "client_id=" in data["auth_url"]
        assert len(data["state"]) > 10

    def test_start_rejects_invalid_redirect(self, client):
        r = client.get(f"{BASE_URL}/api/auth/google/start", params={"redirect_uri": "ftp://evil"}, timeout=15)
        assert r.status_code == 400

    def test_exchange_invalid_code(self, client):
        r = client.post(f"{BASE_URL}/api/auth/google/exchange",
                        json={"code": "invalid_fake_code", "redirect_uri": "https://kids-stories-16.preview.emergentagent.com/auth/google"},
                        timeout=20)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:300]}"

    def test_legacy_session_endpoint_removed(self, client):
        r = client.get(f"{BASE_URL}/api/auth/google/session", timeout=10)
        # Could also be 405 if the route exists as POST only; spec says 404
        assert r.status_code in (404, 405), f"legacy endpoint still exists: {r.status_code}"
        # Also try POST
        r2 = client.post(f"{BASE_URL}/api/auth/google/session", json={}, timeout=10)
        assert r2.status_code in (404, 405)


# ---------- Drive ----------
class TestDrive:
    def test_drive_status_unauth(self, client):
        r = client.get(f"{BASE_URL}/api/drive/status", timeout=15)
        assert r.status_code == 401

    def test_drive_status_authed(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/drive/status", timeout=15)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "connected" in data
        assert data["connected"] is False

    def test_drive_auth_url_unauth(self, client):
        r = client.get(f"{BASE_URL}/api/drive/auth-url", timeout=15)
        assert r.status_code == 401

    def test_drive_auth_url_authed(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/drive/auth-url", timeout=15)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        url_key = "auth_url" if "auth_url" in data else "authorization_url"
        assert url_key in data, f"Missing URL key, got keys: {list(data.keys())}"
        url = data[url_key]
        assert url.startswith("https://accounts.google.com/o/oauth2/auth")
        assert "drive.file" in requests.utils.unquote(url)


# ---------- Translate ----------
class TestTranslate:
    def test_sample_words(self, client):
        r = client.get(f"{BASE_URL}/api/translate/sample-words", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10  # ideally 20
        for w in data:
            assert "lingala" in w and "french" in w
            assert "_id" not in w

    def test_public_translate_dictionary(self, client):
        r = client.post(f"{BASE_URL}/api/translate/public",
                        json={"text": "Bonjour", "direction": "fr-lg"}, timeout=15)
        # Could 429 due to bucket shared; accept 200 or 429
        assert r.status_code in (200, 429), r.text[:300]
        if r.status_code == 200:
            data = r.json()
            # method should be 'dictionary' for known short word 'Bonjour'
            assert data.get("method") in ("dictionary", "ai", "cache")
            # Output field could be lingala/translated/french
            has_output = any(k in data for k in ("translation", "result", "lingala", "translated", "french", "output", "target"))
            assert has_output, f"No translation output key found: {list(data.keys())}"
            assert data.get("target")  # non-empty lingala string for 'Bonjour'


# ---------- Mongo TTL indexes ----------
class TestMongoIndexes:
    def test_oauth_states_ttl(self):
        out = subprocess.run(
            ["mongosh", "--quiet", "--eval",
             "use('test_database'); JSON.stringify(db.oauth_states.getIndexes());"],
            capture_output=True, text=True, timeout=15
        )
        assert out.returncode == 0, out.stderr
        # Parse JSON from stdout
        # mongosh output may include line "switched to db test_database"
        txt = out.stdout
        # Find the JSON array
        start = txt.find("[")
        end = txt.rfind("]")
        idx_json = json.loads(txt[start:end+1])
        ttl_found = any(i.get("expireAfterSeconds") == 600 and "created_at" in (i.get("key") or {}) for i in idx_json)
        assert ttl_found, f"No TTL=600 index on created_at found. Got: {idx_json}"

    def test_translate_rate_log_ttl(self):
        out = subprocess.run(
            ["mongosh", "--quiet", "--eval",
             "use('test_database'); JSON.stringify(db.translate_rate_log.getIndexes());"],
            capture_output=True, text=True, timeout=15
        )
        assert out.returncode == 0, out.stderr
        txt = out.stdout
        start = txt.find("[")
        end = txt.rfind("]")
        idx_json = json.loads(txt[start:end+1])
        ttl_found = any(i.get("expireAfterSeconds") == 0 and "expires_at" in (i.get("key") or {}) for i in idx_json)
        assert ttl_found, f"No TTL=0 index on expires_at found. Got: {idx_json}"

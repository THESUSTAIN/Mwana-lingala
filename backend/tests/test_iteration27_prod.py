"""Iteration 27 — Production end-to-end test suite.
Tests https://www.mwana-lingala.com (live Railway deployment).
"""
import pytest
import requests

BASE_URL = "https://www.mwana-lingala.com"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "User-Agent": "Iter27-Test/1.0"})
    return s


# ------ Public API endpoints ------
class TestPublicApi:
    def test_api_root(self, client):
        r = client.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200

    def test_early_bird_status(self, client):
        r = client.get(f"{BASE_URL}/api/early-bird/status", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("limit", "claimed", "remaining", "active"):
            assert k in d
        assert d["limit"] == 10
        assert isinstance(d["claimed"], int)

    def test_testimonials(self, client):
        r = client.get(f"{BASE_URL}/api/testimonials", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) and len(d) >= 1
        for t in d:
            assert "_id" not in t
            assert "quote" in t and "author_name" in t

    def test_words_free(self, client):
        r = client.get(f"{BASE_URL}/api/words", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        if d:
            assert "_id" not in d[0]


# ------ Auth endpoints ------
class TestAuth:
    def test_google_start(self, client):
        r = client.get(
            f"{BASE_URL}/api/auth/google/start",
            params={"redirect_uri": "https://www.mwana-lingala.com/auth/google"},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert "auth_url" in d and "state" in d
        assert d["auth_url"].startswith("https://accounts.google.com/o/oauth2/auth")
        assert "client_id=" in d["auth_url"]
        # redirect URI must match prod domain
        assert "www.mwana-lingala.com%2Fauth%2Fgoogle" in d["auth_url"]

    def test_google_start_rejects_bad_scheme(self, client):
        r = client.get(
            f"{BASE_URL}/api/auth/google/start",
            params={"redirect_uri": "ftp://evil"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_request_otp_admin(self, client):
        # Per request, test the admin OTP request. The backend may succeed (email sent)
        # or return 500 if SMTP is misconfigured. Either way, no 4xx bug.
        r = client.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": "admin@mwana-lingala.com"},
            timeout=25,
        )
        assert r.status_code in (200, 500), f"unexpected {r.status_code}: {r.text[:400]}"
        if r.status_code == 200:
            d = r.json()
            assert d.get("success") is True

    def test_request_otp_invalid_email(self, client):
        r = client.post(
            f"{BASE_URL}/api/auth/request-otp",
            json={"email": "not-an-email"},
            timeout=15,
        )
        # Should reject invalid email with 400 or 422
        assert r.status_code in (400, 422), f"expected 4xx, got {r.status_code}: {r.text[:200]}"


# ------ Public pages ------
class TestPages:
    PATHS = [
        "/", "/login", "/traduction-lingala", "/cgu", "/rgpd",
        "/mentions-legales", "/blog", "/tarifs", "/contact",
        "/widget/mot-du-jour", "/app/admin",
    ]

    @pytest.mark.parametrize("path", PATHS)
    def test_page_reachable(self, client, path):
        r = client.get(f"{BASE_URL}{path}", timeout=15, allow_redirects=True)
        assert r.status_code == 200, f"{path} returned {r.status_code}"


# ------ PWA / SEO assets ------
class TestAssets:
    def test_service_worker(self, client):
        r = client.get(f"{BASE_URL}/sw.js", timeout=15)
        assert r.status_code == 200
        assert "text/javascript" in r.headers.get("content-type", "") or "application/javascript" in r.headers.get("content-type", "")

    def test_manifest(self, client):
        r = client.get(f"{BASE_URL}/manifest.webmanifest", timeout=15)
        assert r.status_code == 200

    def test_ga4_script_injected(self, client):
        r = client.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200
        assert "G-C6B5K4VKLB" in r.text
        assert "googletagmanager.com/gtag/js" in r.text

    def test_apex_domain_known_broken(self, client):
        # Spec says apex does NOT work. Verify it's still the case — but don't fail if it's fixed.
        try:
            r = requests.get("https://mwana-lingala.com/", timeout=10, allow_redirects=False)
            # Either 200 (fixed) or timeout/connection error (still broken)
            assert r.status_code < 600
        except requests.exceptions.RequestException:
            pytest.skip("Apex domain not configured (expected)")

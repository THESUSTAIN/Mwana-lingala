"""Iteration 7 backend tests - Mwana Lingala production-ready.

Covers:
- Public testimonials
- Admin testimonials CRUD
- Admin users listing / search / update / credits
- Admin stats
- Anti-spam audio (429 on 2nd submission within 24h)
- Regression: public endpoints + static assets
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")

ADMIN_TOKEN = "sess-admin-it7"
USER_TOKEN = "sess-user-it7"


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------------- Auth sanity ----------------
class TestAuthSanity:
    def test_admin_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(ADMIN_TOKEN), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == "test-admin-it7"
        assert data["role"] == "admin"

    def test_user_me(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["user_id"] == "test-user-it7"


# ---------------- Public testimonials ----------------
class TestTestimonialsPublic:
    def test_list_public(self):
        r = requests.get(f"{BASE_URL}/api/testimonials", timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 3
        for t in items:
            assert "testimonial_id" in t
            assert "quote" in t
            assert "author_name" in t
            assert "image" in t
            assert "_id" not in t


# ---------------- Admin testimonials CRUD ----------------
class TestTestimonialsAdmin:
    created_id = None

    def test_admin_list_requires_admin(self):
        # non-admin user -> 403
        r = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 403
        # admin -> 200
        r = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=_h(ADMIN_TOKEN), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_create_and_get(self):
        payload = {
            "quote": "TEST_quote iter7",
            "author_name": "TEST_author",
            "author_role": "TEST_role",
            "image": "/images/temoignage-2.png",
            "active": True,
            "order": 99,
        }
        r = requests.post(f"{BASE_URL}/api/admin/testimonials", headers=_h(ADMIN_TOKEN), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["author_name"] == "TEST_author"
        assert created["testimonial_id"].startswith("tst_")
        TestTestimonialsAdmin.created_id = created["testimonial_id"]

        # Verify presence in admin list
        r2 = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=_h(ADMIN_TOKEN), timeout=15)
        ids = [t["testimonial_id"] for t in r2.json()]
        assert TestTestimonialsAdmin.created_id in ids

    def test_admin_patch(self):
        assert TestTestimonialsAdmin.created_id
        r = requests.patch(
            f"{BASE_URL}/api/admin/testimonials/{TestTestimonialsAdmin.created_id}",
            headers=_h(ADMIN_TOKEN),
            json={"quote": "TEST_quote updated", "author_name": "TEST_author", "active": False, "order": 50},
            timeout=15,
        )
        assert r.status_code == 200, r.text

    def test_admin_patch_not_found(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/testimonials/tst_does_not_exist",
            headers=_h(ADMIN_TOKEN),
            json={"quote": "TEST_404_probe_quote", "author_name": "TEST_404", "active": True, "order": 0},
            timeout=15,
        )
        assert r.status_code == 404

    def test_admin_delete(self):
        assert TestTestimonialsAdmin.created_id
        r = requests.delete(
            f"{BASE_URL}/api/admin/testimonials/{TestTestimonialsAdmin.created_id}",
            headers=_h(ADMIN_TOKEN),
            timeout=15,
        )
        assert r.status_code == 200

    def test_admin_delete_not_found(self):
        r = requests.delete(
            f"{BASE_URL}/api/admin/testimonials/tst_does_not_exist",
            headers=_h(ADMIN_TOKEN),
            timeout=15,
        )
        assert r.status_code == 404


# ---------------- Admin users ----------------
class TestAdminUsers:
    def test_list_requires_admin(self):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 403

    def test_list_ok(self):
        r = requests.get(f"{BASE_URL}/api/admin/users", headers=_h(ADMIN_TOKEN), timeout=15)
        assert r.status_code == 200, r.text
        users = r.json()
        assert isinstance(users, list)
        assert any(u["user_id"] == "test-user-it7" for u in users)
        one = next(u for u in users if u["user_id"] == "test-user-it7")
        assert "progress_count" in one
        assert "contributions_count" in one

    def test_search(self):
        r = requests.get(f"{BASE_URL}/api/admin/users?q=TEST_user_it7", headers=_h(ADMIN_TOKEN), timeout=15)
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 1
        assert all("TEST_user_it7" in u["email"] or "TEST_user_it7" in u["name"] for u in users)

    def test_patch_role_invalid(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/users/test-user-it7",
            headers=_h(ADMIN_TOKEN),
            json={"role": "superadmin"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_patch_ok(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/users/test-user-it7",
            headers=_h(ADMIN_TOKEN),
            json={"is_premium": True, "banned": False},
            timeout=15,
        )
        assert r.status_code == 200
        # Verify
        users = requests.get(f"{BASE_URL}/api/admin/users?q=TEST_user_it7", headers=_h(ADMIN_TOKEN), timeout=15).json()
        assert users[0]["is_premium"] is True

    def test_patch_not_found(self):
        r = requests.patch(
            f"{BASE_URL}/api/admin/users/nonexistent_uid",
            headers=_h(ADMIN_TOKEN),
            json={"is_premium": True},
            timeout=15,
        )
        assert r.status_code == 404

    def test_grant_credits(self):
        # before
        before = requests.get(f"{BASE_URL}/api/admin/users?q=TEST_user_it7", headers=_h(ADMIN_TOKEN), timeout=15).json()[0]["credits"]
        r = requests.post(
            f"{BASE_URL}/api/admin/users/test-user-it7/credits",
            headers=_h(ADMIN_TOKEN),
            json={"delta": 50},
            timeout=15,
        )
        assert r.status_code == 200
        after = requests.get(f"{BASE_URL}/api/admin/users?q=TEST_user_it7", headers=_h(ADMIN_TOKEN), timeout=15).json()[0]["credits"]
        assert after == before + 50


# ---------------- Admin stats ----------------
class TestAdminStats:
    def test_stats(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=_h(ADMIN_TOKEN), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in [
            "total_users",
            "premium_users",
            "new_users_7d",
            "total_words",
            "approved_audios",
            "pending_words",
            "pending_audios",
            "total_contributions",
            "total_progress",
        ]:
            assert key in data, f"missing key {key}"
            assert isinstance(data[key], int)

    def test_stats_forbidden_for_user(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 403


# ---------------- Anti-spam audio ----------------
class TestAntiSpamAudio:
    def test_audio_429_on_second_submission(self):
        # Get a valid word_id
        words = requests.get(f"{BASE_URL}/api/words", timeout=15).json()
        assert isinstance(words, list) and len(words) > 0
        word_id = words[0]["word_id"]
        # tiny valid data-url audio payload
        audio_b64 = "data:audio/webm;base64," + ("A" * 200)

        # Clean any previous submission by this test user for this word (within 24h) to ensure first call succeeds
        # (We rely on a fresh DB state for test-user-it7; iteration was just seeded.)
        r1 = requests.post(
            f"{BASE_URL}/api/words/{word_id}/audio-submission",
            headers=_h(USER_TOKEN),
            json={"word_id": word_id, "audio_b64": audio_b64},
            timeout=15,
        )
        assert r1.status_code == 200, f"first call should succeed: {r1.status_code} {r1.text}"

        r2 = requests.post(
            f"{BASE_URL}/api/words/{word_id}/audio-submission",
            headers=_h(USER_TOKEN),
            json={"word_id": word_id, "audio_b64": audio_b64},
            timeout=15,
        )
        assert r2.status_code == 429, f"second call should 429: {r2.status_code} {r2.text}"


# ---------------- Regression: public / user endpoints ----------------
class TestRegression:
    def test_themes(self):
        r = requests.get(f"{BASE_URL}/api/themes", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_words(self):
        r = requests.get(f"{BASE_URL}/api/words", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_badges(self):
        r = requests.get(f"{BASE_URL}/api/me/badges", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 200

    def test_progress(self):
        r = requests.get(f"{BASE_URL}/api/progress", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 200

    def test_child_profiles(self):
        r = requests.get(f"{BASE_URL}/api/child-profiles", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 200

    def test_photo_gallery(self):
        r = requests.get(f"{BASE_URL}/api/photo-gallery", headers=_h(USER_TOKEN), timeout=15)
        # If not existing, skip
        assert r.status_code in (200, 404)

    def test_quiz(self):
        r = requests.get(f"{BASE_URL}/api/quiz", headers=_h(USER_TOKEN), timeout=15)
        assert r.status_code == 200


# ---------------- Static SEO assets ----------------
class TestStaticSEO:
    def test_robots(self):
        r = requests.get(f"{BASE_URL}/robots.txt", timeout=15)
        assert r.status_code == 200
        assert "User-agent: *" in r.text
        assert "Sitemap" in r.text

    def test_sitemap(self):
        r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15)
        assert r.status_code == 200
        assert "<urlset" in r.text or "<?xml" in r.text

    def test_manifest(self):
        r = requests.get(f"{BASE_URL}/manifest.webmanifest", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "name" in data or "short_name" in data

    def test_index_seo_meta(self):
        r = requests.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200
        html = r.text
        assert 'property="og:title"' in html
        assert 'property="og:image"' in html
        assert 'name="twitter:card"' in html
        assert 'application/ld+json' in html

"""Iteration 12 backend tests — dictionnaire 87 mots + tier/locked + admin CRUD words/plans + plans public."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")

# Cookies injected via conftest from env or command line in the future; for now hardcode the fresh tokens
USER_TOKEN = os.environ.get("USER_TOKEN", "test_session_i12_1777662509766")
PREMIUM_TOKEN = os.environ.get("PREMIUM_TOKEN", "test_session_premium_i12_1777662509778")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "test_session_admin_i12_1777662509781")


def _c(token=None):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.cookies.set("session_token", token)
    return s


# ---------- Public plans ----------
class TestPlansPublic:
    def test_list_plans_no_auth(self):
        r = _c().get(f"{BASE_URL}/api/plans")
        assert r.status_code == 200
        plans = r.json()
        assert isinstance(plans, list)
        assert len(plans) >= 2
        slugs = {p["slug"] for p in plans}
        assert "free" in slugs
        assert "premium" in slugs
        premium = next(p for p in plans if p["slug"] == "premium")
        assert premium["price_eur"] == 12.99
        assert premium["highlight"] is True
        assert len(premium["features"]) >= 1
        free = next(p for p in plans if p["slug"] == "free")
        assert free["price_eur"] == 0
        assert len(free["features"]) >= 1


# ---------- Words + tier/locked ----------
class TestWordsTier:
    def test_words_anonymous_premium_locked(self):
        r = _c().get(f"{BASE_URL}/api/words")
        assert r.status_code == 200
        words = r.json()
        assert len(words) >= 80, f"expected ~87 words, got {len(words)}"
        free = [w for w in words if w.get("tier") == "free"]
        premium = [w for w in words if w.get("tier") == "premium"]
        assert len(free) >= 15, f"free count={len(free)}"
        assert len(premium) >= 60, f"premium count={len(premium)}"
        # all premium locked for anonymous
        for w in premium:
            assert w.get("locked") is True, f"premium word {w['lingala']} not locked"
        for w in free:
            assert w.get("locked") is False, f"free word {w['lingala']} is locked"

    def test_words_non_premium_user_locked(self):
        r = _c(USER_TOKEN).get(f"{BASE_URL}/api/words")
        assert r.status_code == 200
        words = r.json()
        premium = [w for w in words if w.get("tier") == "premium"]
        assert all(w.get("locked") is True for w in premium)

    def test_words_premium_user_not_locked(self):
        r = _c(PREMIUM_TOKEN).get(f"{BASE_URL}/api/words")
        assert r.status_code == 200
        words = r.json()
        for w in words:
            assert w.get("locked") is False, f"premium user sees locked on {w['lingala']}"

    def test_words_admin_not_locked(self):
        r = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/words")
        assert r.status_code == 200
        words = r.json()
        for w in words:
            assert w.get("locked") is False

    def test_words_have_audio(self):
        r = _c().get(f"{BASE_URL}/api/words")
        assert r.status_code == 200
        words = r.json()
        with_audio = [w for w in words if w.get("audio")]
        # At least 67 should have audio as per iteration spec
        assert len(with_audio) >= 67, f"with_audio={len(with_audio)}/{len(words)}"

    def test_words_filter_by_theme(self):
        for theme in ("famille", "nourriture", "animaux", "bible"):
            r = _c().get(f"{BASE_URL}/api/words", params={"theme": theme})
            assert r.status_code == 200
            ws = r.json()
            assert len(ws) >= 5
            assert all(w["theme"] == theme for w in ws)


# ---------- Admin auth protection ----------
class TestAdminAuth:
    @pytest.mark.parametrize("method,path", [
        ("get", "/api/admin/words"),
        ("post", "/api/admin/words"),
        ("get", "/api/admin/plans"),
        ("post", "/api/admin/plans"),
    ])
    def test_admin_endpoints_reject_non_admin(self, method, path):
        r = _c(USER_TOKEN).request(method, f"{BASE_URL}{path}", json={})
        assert r.status_code in (401, 403), f"{method} {path} returned {r.status_code}"

    def test_admin_endpoints_reject_anonymous(self):
        r = _c().get(f"{BASE_URL}/api/admin/words")
        assert r.status_code in (401, 403)


# ---------- Admin Words CRUD ----------
class TestAdminWords:
    created_word_id = None

    def test_01_list_words_admin(self):
        r = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/words")
        assert r.status_code == 200
        assert len(r.json()) >= 80

    def test_02_list_words_filter_theme(self):
        r = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/words", params={"theme": "animaux"})
        assert r.status_code == 200
        ws = r.json()
        assert len(ws) >= 5
        assert all(w["theme"] == "animaux" for w in ws)

    def test_03_create_word(self):
        body = {
            "lingala": "TEST_Motu",
            "french": "TEST mot de test",
            "theme": "famille",
            "example_ln": "",
            "example_fr": "",
            "is_christian": False,
            "tier": "premium",
            "image": "",
        }
        r = _c(ADMIN_TOKEN).post(f"{BASE_URL}/api/admin/words", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "word_id" in data
        assert data["lingala"] == "TEST_Motu"
        assert data["tier"] == "premium"
        TestAdminWords.created_word_id = data["word_id"]

    def test_04_patch_word(self):
        wid = TestAdminWords.created_word_id
        assert wid
        body = {
            "lingala": "TEST_Motu2",
            "french": "TEST mot modifié",
            "theme": "famille",
            "example_ln": "",
            "example_fr": "",
            "is_christian": False,
            "tier": "free",
            "image": "",
        }
        r = _c(ADMIN_TOKEN).patch(f"{BASE_URL}/api/admin/words/{wid}", json=body)
        assert r.status_code == 200
        # verify persistence
        r2 = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/words")
        assert r2.status_code == 200
        found = [w for w in r2.json() if w.get("word_id") == wid]
        assert len(found) == 1
        assert found[0]["lingala"] == "TEST_Motu2"
        assert found[0]["tier"] == "free"

    def test_05_patch_nonexistent_word_404(self):
        body = {"lingala": "x", "french": "x", "theme": "famille", "tier": "free"}
        r = _c(ADMIN_TOKEN).patch(f"{BASE_URL}/api/admin/words/nonexistent_id_xyz", json=body)
        assert r.status_code == 404

    def test_06_delete_word(self):
        wid = TestAdminWords.created_word_id
        r = _c(ADMIN_TOKEN).delete(f"{BASE_URL}/api/admin/words/{wid}")
        assert r.status_code == 200
        # verify gone
        r2 = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/words")
        assert not any(w.get("word_id") == wid for w in r2.json())

    def test_07_delete_nonexistent_word_404(self):
        r = _c(ADMIN_TOKEN).delete(f"{BASE_URL}/api/admin/words/nonexistent_id_xyz")
        assert r.status_code == 404


# ---------- Admin Plans CRUD ----------
class TestAdminPlans:
    created_plan_id = None

    def test_01_list_plans_admin(self):
        r = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/plans")
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_02_create_plan(self):
        body = {
            "slug": "test_plan_i12",
            "name": "TEST Plan I12",
            "price_eur": 4.99,
            "period": "par mois",
            "tagline": "TEST",
            "features": ["feat1", "feat2"],
            "cta_label": "Tester",
            "highlight": False,
            "active": True,
            "order": 99,
        }
        r = _c(ADMIN_TOKEN).post(f"{BASE_URL}/api/admin/plans", json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "plan_id" in data
        assert data["slug"] == "test_plan_i12"
        TestAdminPlans.created_plan_id = data["plan_id"]

    def test_03_patch_plan(self):
        pid = TestAdminPlans.created_plan_id
        body = {
            "slug": "test_plan_i12_upd",
            "name": "TEST Plan Updated",
            "price_eur": 5.99,
            "period": "par mois",
            "tagline": "TEST upd",
            "features": ["feat1", "feat2", "feat3"],
            "cta_label": "Go",
            "highlight": False,
            "active": True,
            "order": 99,
        }
        r = _c(ADMIN_TOKEN).patch(f"{BASE_URL}/api/admin/plans/{pid}", json=body)
        assert r.status_code == 200
        r2 = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/plans")
        found = [p for p in r2.json() if p.get("plan_id") == pid]
        assert len(found) == 1
        assert found[0]["name"] == "TEST Plan Updated"
        assert len(found[0]["features"]) == 3

    def test_04_patch_nonexistent_plan_404(self):
        body = {
            "slug": "xx", "name": "xx", "price_eur": 0,
            "period": "", "tagline": "", "features": [],
            "cta_label": "x", "highlight": False, "active": True, "order": 0,
        }
        r = _c(ADMIN_TOKEN).patch(f"{BASE_URL}/api/admin/plans/nonexistent_pid", json=body)
        assert r.status_code == 404

    def test_05_delete_plan(self):
        pid = TestAdminPlans.created_plan_id
        r = _c(ADMIN_TOKEN).delete(f"{BASE_URL}/api/admin/plans/{pid}")
        assert r.status_code == 200

    def test_06_delete_nonexistent_plan_404(self):
        r = _c(ADMIN_TOKEN).delete(f"{BASE_URL}/api/admin/plans/nonexistent_pid")
        assert r.status_code == 404


# ---------- Regression: core endpoints still work ----------
class TestRegression:
    def test_root(self):
        r = _c().get(f"{BASE_URL}/api/")
        assert r.status_code == 200

    def test_themes(self):
        r = _c().get(f"{BASE_URL}/api/themes")
        assert r.status_code == 200
        assert len(r.json()) >= 8

    def test_me_authenticated(self):
        r = _c(USER_TOKEN).get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "test.parent+i12@example.com"
        assert data["is_premium"] is False

    def test_me_admin(self):
        r = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json().get("role") == "admin"

    def test_testimonials_public(self):
        r = _c().get(f"{BASE_URL}/api/testimonials")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_admin_stats(self):
        r = _c(ADMIN_TOKEN).get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        d = r.json()
        assert "total_users" in d
        assert d.get("total_words", 0) >= 80

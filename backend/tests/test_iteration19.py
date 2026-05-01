"""Iteration 19 — Child profiles + progress filtering by profile_id."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://kids-stories-16.preview.emergentagent.com").rstrip("/")
TOKEN = "tk_013b94a3afa6472fa1c1d926a9d8d964"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Cookie": f"session_token={TOKEN}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def cleanup(client):
    """Cleanup all child profiles created with TEST_ prefix at end."""
    yield
    try:
        r = client.get(f"{BASE_URL}/api/child-profiles")
        for p in r.json():
            if p.get("name", "").startswith("TEST_"):
                client.delete(f"{BASE_URL}/api/child-profiles/{p['profile_id']}")
    except Exception:
        pass


def test_auth_works(client):
    r = client.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user_id" in data


def test_list_child_profiles_returns_list(client):
    r = client.get(f"{BASE_URL}/api/child-profiles")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_child_profile(client, cleanup):
    payload = {"name": "TEST_Eliya", "age": 4, "themes": ["famille", "animaux"], "christian_mode": False}
    r = client.post(f"{BASE_URL}/api/child-profiles", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "profile_id" in data
    assert data["name"] == "TEST_Eliya"
    assert data["age"] == 4
    assert set(data["themes"]) == {"famille", "animaux"}
    assert data["christian_mode"] is False
    # GET to verify persistence
    r2 = client.get(f"{BASE_URL}/api/child-profiles")
    assert any(p["profile_id"] == data["profile_id"] for p in r2.json())


def test_progress_with_profile_id_filters(client, cleanup):
    # Create 2 profiles
    p1 = client.post(f"{BASE_URL}/api/child-profiles", json={"name": "TEST_Eliya2", "age": 4, "themes": ["famille"], "christian_mode": False}).json()
    p2 = client.post(f"{BASE_URL}/api/child-profiles", json={"name": "TEST_Noah", "age": 6, "themes": ["animaux"], "christian_mode": False}).json()

    # Pick a couple of word_ids from /api/words
    words = client.get(f"{BASE_URL}/api/words?theme=famille").json()
    assert len(words) >= 2
    w1 = words[0]["word_id"]
    w2 = words[1]["word_id"]

    # Post progress for p1 with w1
    r = client.post(f"{BASE_URL}/api/progress", json={"word_id": w1, "learned": True, "profile_id": p1["profile_id"]})
    assert r.status_code == 200, r.text
    # Post progress for p2 with w2
    r = client.post(f"{BASE_URL}/api/progress", json={"word_id": w2, "learned": True, "profile_id": p2["profile_id"]})
    assert r.status_code == 200, r.text

    # Verify filtering
    r1 = client.get(f"{BASE_URL}/api/progress?profile_id={p1['profile_id']}")
    assert r1.status_code == 200
    learned1 = r1.json().get("learned_word_ids", [])
    assert w1 in learned1
    assert w2 not in learned1

    r2 = client.get(f"{BASE_URL}/api/progress?profile_id={p2['profile_id']}")
    learned2 = r2.json().get("learned_word_ids", [])
    assert w2 in learned2
    assert w1 not in learned2


def test_progress_review_with_profile_id(client, cleanup):
    p = client.post(f"{BASE_URL}/api/child-profiles", json={"name": "TEST_Review", "age": 5, "themes": ["famille"], "christian_mode": False}).json()
    words = client.get(f"{BASE_URL}/api/words?theme=famille").json()
    w_id = words[0]["word_id"]
    r = client.post(f"{BASE_URL}/api/progress/review", json={"word_id": w_id, "quality": 1, "profile_id": p["profile_id"]})
    assert r.status_code == 200, r.text

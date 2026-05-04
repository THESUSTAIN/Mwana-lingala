"""Test SSR meta-tag injection for SPA fallback. Ensures Googlebot and crawlers see
the right title/description/canonical/OG even before JS executes.
"""
import os
import sys
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_spa_meta_overrides_match_correctly():
    import server as s
    matches = dict()
    for prefix, _ in s.SPA_META_OVERRIDES:
        matches[prefix] = True
    # Each route we publicly expose should have meta
    expected = ["/apprendre-pour-soi", "/phrases-voyage", "/test-niveau", "/blog", "/tarifs", "/contact"]
    for r in expected:
        assert r in matches, f"Missing SEO meta override for {r}"


def test_meta_html_builds_all_required_tags():
    import server as s
    meta = dict(s.SPA_META_OVERRIDES)["/apprendre-pour-soi"]
    html = s._build_meta_html(meta, "https://mwana-lingala.com/apprendre-pour-soi")
    assert "<title>" in html
    assert 'name="description"' in html
    assert 'name="keywords"' in html
    assert 'rel="canonical"' in html
    assert 'property="og:title"' in html
    assert 'property="og:image"' in html
    assert "Apprendre le lingala" in html
    assert "cours facile" in html
    assert "/apprendre-pour-soi" in html


def test_spa_response_replaces_default_meta_for_known_routes(tmp_path):
    """End-to-end: feed a real index.html and verify the response body contains the new meta only."""
    import server as s
    # Copy real index.html into a tmp build folder
    src = open("/app/frontend/public/index.html", "r", encoding="utf-8").read()
    build = tmp_path / "build"
    build.mkdir()
    (build / "index.html").write_text(src, encoding="utf-8")
    s._frontend_build = str(build)
    s._INDEX_HTML_CACHE = None

    resp = s._spa_response_with_meta("/apprendre-pour-soi")
    body = resp.body.decode("utf-8")

    # Exactly one <title>, with the new content
    titles = re.findall(r"<title>([^<]+)</title>", body)
    assert len(titles) == 1
    assert "Apprendre le lingala" in titles[0]
    assert "cours facile" in titles[0]

    # Default index.html title gone
    assert "App + audio natif pour la famille" not in body

    # Exactly one description with the new content
    descs = re.findall(r'<meta name="description"[^>]*content="([^"]+)"', body)
    assert len(descs) == 1
    assert "cours facile" in descs[0]

    # Canonical points to the page URL
    canons = re.findall(r'<link rel="canonical"[^>]*href="([^"]+)"', body)
    assert canons == ["https://mwana-lingala.com/apprendre-pour-soi"]

    # OG image points to the inclusive hero
    ogs = re.findall(r'<meta property="og:image"[^>]*content="([^"]+)"', body)
    assert "hero-apprendre-pour-soi" in ogs[0]


def test_spa_response_does_not_break_unknown_routes(tmp_path):
    """For routes not in SPA_META_OVERRIDES, fall back to default index.html (no error)."""
    import server as s
    src = open("/app/frontend/public/index.html", "r", encoding="utf-8").read()
    build = tmp_path / "build"
    build.mkdir()
    (build / "index.html").write_text(src, encoding="utf-8")
    s._frontend_build = str(build)
    s._INDEX_HTML_CACHE = None

    resp = s._spa_response_with_meta("/some-random-page")
    # Should return FileResponse (default index.html), NOT crash
    assert resp is not None


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))

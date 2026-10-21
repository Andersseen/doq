"""CONTRACT-040..044: inline Angular components in Markdown, checked on the packed tarball and the static output."""

from __future__ import annotations

import gzip
import json
import re

from test_search import _fragments


def _html(site, path: str) -> str:
    status, _, body = site.get(path)
    assert status == 200, path
    return body.decode()


def test_contract_040_tarball_declares_and_ships_the_inline_demo_api(package_files):
    """CONTRACT-040: the additive public API is typed and shipped; the tarball ships no showcase code."""
    declarations = package_files["types/doqs-analog.d.ts"].decode()
    for name in ("splitDoqInlineDemos", "DOQ_INLINE_DEMO_PATTERN", "DoqContentSegment"):
        assert name in declarations, name
    runtime = package_files["fesm2022/doqs-analog.mjs"].decode()
    assert "data-doq-demo" in runtime
    for path, data in package_files.items():
        if path.endswith(".md"):  # prose may legitimately name the reference consumer
            continue
        text = data.decode("utf-8", errors="ignore")
        for private in ("vanta-contrast", "forge-query", "VantaInstallDemo", "ForgeQueryDemo", "angular-movement"):
            assert private not in text, f"{path} leaks {private}"


def test_contract_041_static_html_renders_demos_between_sections_without_directive_text(site_a, site_b):
    """CONTRACT-041: prerendered pages place the demo at its position and never print the raw directive."""
    html = _html(site_a, "/docs/guides/accessibility")
    ids = re.findall(r'<h2[^>]*id="([^"]+)"|data-doq-demo="([^"]+)"', html)
    order = [a or b for a, b in ids if (a or b) != "doq-search-title"]
    assert order == ["principles", "keyboard-operation", "focus-visibility", "examples", "vanta-contrast", "color-and-contrast", "announcements", "examples-1", "checklist"]
    assert 'aria-label="Vanta contrast checker"' in html
    assert "::demo[" not in html
    api = _html(site_b, "/docs/reference/api")
    assert 'data-doq-demo="forge-query"' in api and "/v1/entries?collection=product-guides&amp;limit=20" in api
    assert "::demo[" not in api


def test_contract_042_documents_without_directives_are_unchanged_in_structure(site_a):
    """CONTRACT-042: a plain document has one Markdown region and no inline demo wrapper."""
    html = _html(site_a, "/docs/overview")
    assert html.count('class="doq-markdown"') == 1 and "doq-inline-demo" not in html


def test_contract_043_search_index_has_text_after_the_demo_but_not_its_controls(site_a, site_b):
    """CONTRACT-043: Pagefind holds Markdown on both sides of a demo and none of the demo's own text."""
    pages_a = {page["url"]: page for page in _fragments(site_a)}
    pages_b = {page["url"]: page for page in _fragments(site_b)}
    pages = {**pages_a, **pages_b}
    a = pages_a["/docs/guides/accessibility/"]
    assert "keep the ratio you measured" in a["content"]  # after the demo
    assert "should name what it destroys" in a["content"]  # before the demo
    for control_text in ("Sample text", "passes AA", "fails AA"):
        assert control_text not in a["content"], control_text
    b = pages_b["/docs/reference/api/"]
    assert "unknown parameters are rejected" in b["content"]
    for control_text in ("Published only", "/v1/entries?collection"):
        assert control_text not in b["content"], control_text
    for page in pages.values():
        assert "::demo[" not in page["content"]


def test_contract_044_heading_ids_and_search_sections_match_the_unsplit_document(site_a):
    """CONTRACT-044: duplicate heading suffixes survive a demo between them; search anchors use the same ids."""
    html = _html(site_a, "/docs/guides/accessibility")
    assert 'id="examples"' in html and 'id="examples-1"' in html and 'id="examples-2"' not in html
    page = next(p for p in _fragments(site_a) if p["url"] == "/docs/guides/accessibility/")
    anchors = {anchor["id"] for anchor in page.get("anchors", [])}
    assert {"examples", "examples-1", "color-and-contrast"} <= anchors

"""CONTRACT-011..016: the static search index and the packaged indexer, checked from outside the toolchain."""

from __future__ import annotations

import gzip
import json
import re
from pathlib import Path

import pytest

from conftest import REPO
from test_http import _expected_routes, expected_archive_routes

BUNDLE_FILES = ("pagefind.js", "pagefind-entry.json", "pagefind-worker.js", "wasm.unknown.pagefind", "wasm.en.pagefind")


def _fragments(site) -> list[dict]:
    """Every indexed page: Pagefind stores each as gzip('pagefind_dcd' + JSON)."""
    pages = []
    for file in sorted((site.root / "pagefind/fragment").glob("*.pf_fragment")):
        raw = gzip.decompress(file.read_bytes())
        assert raw.startswith(b"pagefind_dcd"), file.name
        pages.append(json.loads(raw.removeprefix(b"pagefind_dcd")))
    return pages


@pytest.mark.parametrize("site_name", ["site_a", "site_b"])
def test_contract_011_search_bundle_is_served_over_http(site_name, request):
    """CONTRACT-011: the bundle Doq loads at runtime exists next to the app and answers 200 with a usable type."""
    site = request.getfixturevalue(site_name)
    for name in BUNDLE_FILES:
        status, headers, body = site.get(f"/pagefind/{name}")
        assert status == 200 and body, name
    assert site.get("/pagefind/pagefind.js")[1]["content-type"].startswith("text/javascript")
    assert site.get("/pagefind/pagefind-entry.json")[2].startswith(b"{")
    # Doq has its own UI, so the default Pagefind widgets must not be deployed.
    for name in ("pagefind-ui.js", "pagefind-ui.css", "pagefind-modular-ui.js", "pagefind-component-ui.js", "pagefind-highlight.js"):
        assert site.get(f"/pagefind/{name}")[0] == 404, name


@pytest.mark.parametrize("app,site_name", [("showcase-a", "site_a"), ("showcase-b", "site_b")])
def test_contract_012_every_documentation_page_is_indexed_at_its_canonical_route(app, site_name, request):
    """CONTRACT-012: the index holds exactly the documents, keyed by their public (custom or nested) URLs."""
    site = request.getfixturevalue(site_name)
    expected = {**_expected_routes(app), **expected_archive_routes(app)}
    pages = _fragments(site)
    assert sorted(page["url"] for page in pages) == sorted(route + "/" for route in expected)
    titles = {page["url"].rstrip("/"): page["meta"]["title"] for page in pages}
    assert titles == expected
    entry = json.loads(site.get("/pagefind/pagefind-entry.json")[2])
    assert sum(language["page_count"] for language in entry["languages"].values()) == len(expected)


@pytest.mark.parametrize("site_name", ["site_a", "site_b"])
def test_contract_013_host_pages_and_document_chrome_are_not_indexed(site_name, request):
    """CONTRACT-013: no landing page, no docs index, no sidebar, TOC, pagination, demo or slot text in the index."""
    site = request.getfixturevalue(site_name)
    pages = _fragments(site)
    urls = {page["url"] for page in pages}
    assert "/" not in urls and "/docs/" not in urls
    chrome = ["On this page", "Close navigation", "Page navigation"]
    # Showcase A has a host landing page at "/"; Showcase B's "/" is the documentation index, whose text is documentation.
    landing = re.sub(r"<[^>]+>", " ", site.get("/")[2].decode()) if site_name == "site_a" else ""
    host_text = [phrase for phrase in re.findall(r"[A-Z][a-z]+(?: [a-z]+){3,}", landing)][:10]
    for page in pages:
        content = page["content"]
        for text in chrome:
            assert text not in content, f"{page['url']} indexes chrome text {text!r}"
        for text in host_text:
            assert text not in content, f"{page['url']} indexes host text {text!r}"


def test_contract_014_custom_slug_page_is_indexed_under_the_public_url_only(site_b):
    """CONTRACT-014: Showcase B's getting-started.md is indexed as /onboarding/first-application/."""
    pages = {page["url"]: page for page in _fragments(site_b)}
    assert "/onboarding/first-application/" in pages
    assert not any("getting-started" in url for url in pages)
    page = pages["/onboarding/first-application/"]
    assert page["meta"]["title"] == "Getting started"
    assert "Keep environment credentials out of browser bundles" in page["content"]
    assert any(anchor.get("id") == "create-a-workspace" for anchor in page.get("anchors", []))


def test_contract_015_a_search_disabled_build_ships_no_search_assets_or_markup(site_b_nosearch):
    """CONTRACT-015: disabling search leaves the same documents but no index and no search control."""
    assert not (site_b_nosearch.root / "pagefind").exists()
    assert site_b_nosearch.get("/pagefind/pagefind.js")[0] == 404
    status, _, body = site_b_nosearch.get("/concepts/models")
    assert status == 200 and b"Content models" in body
    assert b"doq-search" not in body and b'aria-labelledby="doq-search-title"' not in body
    for name in _expected_routes("showcase-b"):
        assert site_b_nosearch.get(name)[0] == 200, name


def test_contract_016_tarball_ships_the_indexer_without_a_pagefind_dependency(package_files, manifest):
    """CONTRACT-016: the CLI and ./search-index entry exist, pagefind is only an optional peer, the package version is declared."""
    assert manifest["version"] == json.loads((REPO / "packages/doq/package.json").read_text())["version"]
    assert manifest["bin"] == {"doq": "./bin/doq.mjs", "doq-search": "./bin/doq-search.mjs", "doq-api": "./bin/doq-api.mjs"}
    entry = manifest["exports"]["./search-index"]
    assert entry == {"types": "./bin/search-index.d.mts", "default": "./bin/search-index.mjs"}
    for path in ("bin/doq-search.mjs", "bin/search-index.mjs", "bin/search-index.d.mts"):
        assert path in package_files, path
    assert "pagefind" not in manifest.get("dependencies", {})
    assert "pagefind" in manifest["peerDependencies"]
    assert manifest["peerDependenciesMeta"]["pagefind"] == {"optional": True}
    runtime = package_files["fesm2022/doqs-analog.mjs"].decode()
    assert "node:" not in runtime and "pagefind.js" in runtime  # browser entry: no Node imports, only the lazy bundle URL
    browser_only = package_files["types/doqs-analog.d.ts"].decode()
    assert "indexDoqSearch" not in browser_only
    indexer = package_files["bin/search-index.mjs"].decode()
    assert "import" in indexer and "from '@angular" not in indexer

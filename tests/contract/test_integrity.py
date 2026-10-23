"""CONTRACT-080..: 0.7 production hardening, checked from outside on the packed tarball and the served static output.

This is an independent Python re-implementation of the main rules of `pnpm docs:check` (which runs in Node on the same files),
so a mistake in one implementation cannot hide a defect from both. Links are followed over real HTTP.
"""

from __future__ import annotations

import re
from html import unescape
from urllib.parse import unquote, urldefrag, urljoin, urlparse

import pytest

SITES = ["site_a", "site_b"]


def test_contract_080_vite_helper_is_a_node_only_export_without_dependencies(package_files, manifest):
    """CONTRACT-080: `@doqs/analog/vite` ships its module and declarations; the browser entry and the dependencies are untouched."""
    assert manifest["exports"]["./vite"] == {"types": "./bin/vite.d.mts", "default": "./bin/vite.mjs"}
    module = package_files["bin/vite.mjs"].decode()
    assert "export function doqDeterministicMarkdown" in module
    assert not re.search(r"^\s*import\s", module, re.M), "the helper must have no imports"
    assert "doqDeterministicMarkdown" in package_files["bin/vite.d.mts"].decode()
    browser_entry = package_files["fesm2022/doqs-analog.mjs"].decode()
    assert "doqDeterministicMarkdown" not in browser_entry
    assert set(manifest["dependencies"]) == {"tslib"}
    assert "vite" not in manifest.get("peerDependencies", {})


def test_contract_081_no_private_sources_or_tests_in_the_tarball(package_files):
    """CONTRACT-081: only the documented distributable files are published."""
    forbidden = re.compile(r"^(src|test|tests|e2e|docs|scripts|apps)/|\.spec\.|perf-budgets|\.agentyx|node_modules/")
    leaked = [name for name in package_files if forbidden.search(name)]
    assert leaked == []


def _pages(site) -> dict[str, str]:
    pages = {}
    for index in sorted(site.root.rglob("index.html")):
        route = "/" + str(index.parent.relative_to(site.root)).replace("\\", "/")
        pages[route.replace("/.", "/") if route != "/." else "/"] = index.read_text(encoding="utf8")
    return pages


def _ids(html: str) -> set[str]:
    return set(re.findall(r'\sid="([^"]*)"', html))


def _article_headings(html: str) -> list[tuple[str, str]]:
    found = []
    for region in re.findall(r"<analog-markdown\b[^>]*>(.*?)</analog-markdown>", html, re.S):
        for _, attrs, inner in re.findall(r"<h([1-6])\b([^>]*)>(.*?)</h\1>", region, re.S):
            match = re.search(r'\sid="([^"]*)"', attrs)
            if match:
                found.append((match.group(1), unescape(re.sub(r"<[^>]*>", "", inner)).strip()))
    return found


@pytest.mark.parametrize("fixture", SITES)
def test_contract_082_heading_ids_are_unique_and_toc_fragments_resolve(fixture, request):
    """CONTRACT-082: per documentation page, heading ids are unique and every table-of-contents link reaches a real id."""
    site = request.getfixturevalue(fixture)
    checked = 0
    for route, html in _pages(site).items():
        if 'class="doq-article"' not in html and "doq-article" not in html:
            continue
        ids = [heading_id for heading_id, _ in _article_headings(html)]
        assert len(ids) == len(set(ids)), f"{route}: duplicate heading ids {sorted(i for i in set(ids) if ids.count(i) > 1)}"
        toc = re.search(r'<aside\b[^>]*doq-toc[^>]*>(.*?)</aside>', html, re.S)
        if toc:
            for href in re.findall(r'href="([^"]*#[^"]+)"', toc.group(1)):
                assert unquote(href.split("#", 1)[1]) in _ids(html), f"{route}: TOC link {href} has no target"
        checked += 1
    assert checked >= 10


@pytest.mark.parametrize("fixture", SITES)
def test_contract_083_same_site_links_answer_200_and_fragments_exist(fixture, request):
    """CONTRACT-083: every internal link on every page is served (HTTP 200) and its fragment exists in the served document."""
    site = request.getfixturevalue(fixture)
    pages = _pages(site)
    served: dict[str, tuple[int, str]] = {}

    def fetch(path: str) -> tuple[int, str]:
        if path not in served:
            status, _, body = site.get(path)
            served[path] = (status, body.decode("utf8", "replace") if status == 200 and path.endswith(("/", "")) and "." not in path.rsplit("/", 1)[-1] else "")
        return served[path]

    problems: list[str] = []
    for route, html in pages.items():
        for href in set(re.findall(r'<a\b[^>]*\shref="([^"]*)"', html)):
            href = unescape(href)
            if re.match(r"^(mailto:|tel:|javascript:|https?://|//)", href):
                continue
            target, fragment = urldefrag(urljoin(f"http://x{route}", href))
            path = unquote(urlparse(target).path)
            status, body = fetch(path)
            if status != 200:
                problems.append(f"{route}: {href} -> {path} answers {status}")
            elif fragment and body and unquote(fragment) not in _ids(body):
                problems.append(f"{route}: {href} -> #{fragment} missing in {path}")
    assert problems == []
    assert len(pages) >= 15

"""CONTRACT-050..055: rich Markdown authoring (0.4) in the packed tarball and the generated static output."""

from __future__ import annotations

import re

from test_search import _fragments


def _html(site, path: str) -> str:
    status, _, body = site.get(path)
    assert status == 200, path
    return body.decode()


def _page(site, url: str) -> dict:
    return next(page for page in _fragments(site) if page["url"] == url)


def test_contract_050_tarball_ships_the_rich_content_api_and_styles(package_files):
    """CONTRACT-050: additive exports are typed, the component and its styles ship, no showcase code leaks."""
    declarations = package_files["types/doqs-analog.d.ts"].decode()
    for name in ("parseDoqContent", "DOQ_CALLOUT_TYPES", "DoqRichSegment", "DoqTabsComponent", "splitDoqInlineDemos"):
        assert name in declarations, name
    runtime = package_files["fesm2022/doqs-analog.mjs"].decode()
    for marker in ("doq-callout", "doq-steps", "doq-code-title", "role=\"tablist\""):
        assert marker in runtime, marker
    css = package_files["styles.css"].decode()
    for selector in (".doq-callout", ".doq-tabs", ".doq-steps", ".doq-code-title", "--host-docs-callout-warning"):
        assert selector in css, selector
    for path, data in package_files.items():
        text = data.decode("utf-8", errors="ignore")
        if path.endswith(".md"):
            continue
        for private in ("voltui", "forgecms", "vanta-", "angular-movement", "@voltui", "lumen"):
            assert private not in text.lower(), f"{path} leaks {private}"


def test_contract_051_static_html_has_meaningful_callouts_and_no_directive_text(site_a, site_b):
    """CONTRACT-051: callouts are prerendered notes with their body; markers and directives never leak into the page."""
    html = _html(site_a, "/docs/guides/accessibility")
    kinds = re.findall(r'<div class="doq-callout" data-callout="([a-z]+)" role="note">', html)
    assert kinds == ["important", "warning", "caution"]
    assert "A modal must return focus to the control that opened it" in html
    assert "<blockquote" not in html
    for page in (html, _html(site_b, "/guides/environments"), _html(site_a, "/docs/installation")):
        assert "[!" not in page and ":::" not in page and "::demo[" not in page


def test_contract_052_tabs_are_prerendered_with_all_panels_and_aria_relationships(site_a):
    """CONTRACT-052: every panel is in the static HTML (inactive ones hidden); ids relate tabs and panels."""
    html = _html(site_a, "/docs/installation")
    assert 'role="tablist"' in html and 'aria-label="Package manager"' in html
    tabs = re.findall(r'<button[^>]*role="tab"[^>]*>', html)
    panels = re.findall(r'<div role="tabpanel"[^>]*>', html)
    assert len(tabs) == len(panels) == 3
    assert [("aria-selected=\"true\"" in tab) for tab in tabs] == [True, False, False]
    assert ["hidden" in panel for panel in panels] == [False, True, True]
    for tab, panel in zip(tabs, panels):
        tab_id = re.search(r'id="([^"]+)"', tab).group(1)
        panel_id = re.search(r'id="([^"]+)"', panel).group(1)
        assert f'aria-controls="{panel_id}"' in tab and f'aria-labelledby="{tab_id}"' in panel
    assert "npx voltui" in html and "yarn</span> dlx voltui" in html


def test_contract_053_code_payload_titles_and_language_labels_survive_prerendering(site_a, site_b):
    """CONTRACT-053: language labels and the `:::code` caption are static; code keeps its exact text."""
    button = _html(site_a, "/docs/components/button")
    assert 'data-language="html"' in button and 'data-language="ts"' in button
    assert "(pressed)=" in button.replace("&quot;", '"') or "pressed" in button
    api = _html(site_b, "/reference/api")
    assert '<figure class="doq-code"><figcaption class="doq-code-title">src/app/entries.ts</figcaption><pre data-language="ts">' in api


def test_contract_054_steps_keep_native_ordered_list_semantics(site_a, site_b):
    """CONTRACT-054: a steps group is one real <ol>, with its nested code and callout in the list items."""
    html = _html(site_a, "/docs/installation")
    block = re.search(r'<div class="doq-steps">\s*<ol>(.*?)</ol>', html, re.S).group(1)
    assert block.count("<li>") == 3 and 'data-callout="tip"' in block and "data-language=\"ts\"" in block
    env = _html(site_b, "/guides/environments")
    assert re.search(r'<div class="doq-steps">\s*<ol>', env) and env.count("<li>") >= 3


def test_contract_055_search_indexes_rich_content_but_not_its_controls(site_a, site_b):
    """CONTRACT-055: callout bodies, steps and inactive tab panels are searchable; tab strips and callout titles are not."""
    install = _page(site_a, "/docs/installation/")["content"]
    assert "Commit the copied source before you change it" in install  # a callout inside a step
    assert "yarn dlx voltui add button" in install  # an inactive tab panel
    assert "Review what was added" in install  # a step
    assert "Package manager" not in install  # the tab strip's name
    access = _page(site_a, "/docs/guides/accessibility/")["content"]
    assert "A modal must return focus" in access
    api = _page(site_b, "/reference/api/")["content"]
    assert "forge.entries.list" in api
    started = _page(site_b, "/onboarding/first-application/")["content"]
    assert "curl" in started and "Request style" not in started


def _expected_heading_ids(markdown: str) -> list[str]:
    """GitHub-style heading ids with `-1`, `-2` suffixes for repeats, from the Markdown source (fenced code skipped)."""
    seen: dict[str, int] = {}
    ids = []
    fenced = False
    for line in markdown.split("---\n", 2)[-1].splitlines():
        if line.lstrip().startswith(("```", "~~~")):
            fenced = not fenced
            continue
        match = None if fenced else re.match(r"^(#{1,6})\s+(.+?)\s*#*$", line)
        if not match or len(match.group(1)) == 1:
            continue
        text = re.sub(r"[`*_]", "", match.group(2)).lower()
        slug = re.sub(r"\s", "-", re.sub(r"[^\w\s-]", "", text))
        count = seen.get(slug, 0)
        seen[slug] = count + 1
        ids.append(slug if count == 0 else f"{slug}-{count}")
    return ids


def test_contract_056_heading_ids_in_static_output_are_exactly_the_canonical_ones(site_a, site_b):
    """CONTRACT-056: rich blocks never add, drop, reorder or re-suffix heading ids, on every prerendered page."""
    from conftest import REPO
    from test_http import BASE_PATH, _expected_routes

    for app, site in (("showcase-a", site_a), ("showcase-b", site_b)):
        content = REPO / f"apps/{app}/src/content/docs"
        by_title = {title: route for route, title in _expected_routes(app).items()}
        for file in sorted(content.rglob("*.md")):
            title = re.search(r"^title: (.+)$", file.read_text(), re.M).group(1)
            html = _html(site, by_title[title])
            article = html.split('class="doq-content"', 1)[1].split('class="doq-toc"', 1)[0]
            actual = re.findall(r'<h[2-6] id="([^"]+)"', article)
            assert actual == _expected_heading_ids(file.read_text()), f"{app} {file.name}"

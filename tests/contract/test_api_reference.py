"""CONTRACT-060..066: Angular API reference generation (0.5) in the packed tarball and the generated static output."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import subprocess
import tarfile
from pathlib import Path

import pytest

from conftest import REPO
from test_search import _fragments

APPS = {
    "showcase-a": {"base": "/docs", "site": "site_a"},
    "showcase-b": {"base": "", "site": "site_b"},
}


def _generated(app: str) -> Path:
    return REPO / f"apps/{app}/src/content/docs/reference/generated"


def _script_flags(app: str, script: str) -> list[str]:
    command = json.loads((REPO / f"apps/{app}/package.json").read_text())["scripts"][script]
    parts = shlex.split(command)
    assert parts[:2] == ["doq-api", "check" if script.startswith("api:check") else "generate"], command
    return parts[2:]


@pytest.fixture(scope="session")
def packed_cli(tarball: Path, tmp_path_factory) -> Path:
    """The CLI exactly as it ships in the tarball, extracted outside the repository."""
    target = tmp_path_factory.mktemp("packed-doq-api")
    with tarfile.open(tarball, "r:gz") as archive:
        archive.extractall(target, filter="data")
    return target / "package/bin/doq-api.mjs"


def _run(cli: Path, *args: str, cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(["node", str(cli), *args], cwd=cwd, capture_output=True, text=True, env={**os.environ, "NO_COLOR": "1"})


def test_contract_060_tarball_ships_the_node_only_generator(package_files, manifest):
    """CONTRACT-060: bin, Node entry and declarations ship; TypeScript is an optional peer, never bundled or imported by the browser entry."""
    assert manifest["bin"]["doq-api"] == "./bin/doq-api.mjs"
    assert manifest["exports"]["./api-reference"] == {"types": "./bin/api-reference.d.mts", "default": "./bin/api-reference.mjs"}
    assert manifest["peerDependencies"]["typescript"] == "^5.5.0 || ^6.0.0"
    assert manifest["peerDependenciesMeta"]["typescript"] == {"optional": True}
    assert "typescript" not in manifest.get("dependencies", {})
    declarations = package_files["bin/api-reference.d.mts"].decode()
    for name in ("generateApiReference", "checkApiReference", "buildApiReference", "DoqApiError", "ApiReferenceOptions"):
        assert name in declarations, name
    assert package_files["bin/doq-api.mjs"].startswith(b"#!/usr/bin/env node")
    # The browser entry and its declarations know nothing about the generator, Node built-ins or the compiler.
    runtime = package_files["fesm2022/doqs-analog.mjs"].decode()
    assert not re.search(r"from ['\"](typescript|node:[a-z/]+|fs|path)['\"]", runtime)
    assert "createProgram" not in runtime and "getTypeChecker" not in runtime
    browser_types = package_files["types/doqs-analog.d.ts"].decode()
    assert "generateApiReference" not in browser_types and "typescript" not in browser_types


def test_contract_061_generator_sources_import_only_node_builtins_and_each_other(package_files):
    """CONTRACT-061: no private workspace path, showcase code or third-party import leaks into the shipped generator."""
    sources = {name: data.decode() for name, data in package_files.items() if name.startswith("bin/") and name.endswith(".mjs") and "api" in name}
    assert len(sources) >= 7
    for name, text in sources.items():
        for specifier in re.findall(r"(?:from|import\()\s*['\"]([^'\"]+)['\"]", text):
            assert specifier.startswith(("node:", "./", "../")), f"{name} imports {specifier}"
        for private in ("workspace:", "/Volumes/", "/Users/", "showcase-", "packages/doq/", "apps/"):
            assert private not in text, f"{name} mentions {private}"


@pytest.mark.parametrize("app", APPS)
def test_contract_062_generated_markdown_is_valid_owned_and_free_of_machine_paths(app):
    """CONTRACT-062: frontmatter is valid, every page is in the manifest with its hash, and nothing is machine specific."""
    directory = _generated(app)
    manifest = json.loads((directory / ".doq-api.json").read_text())
    assert manifest["generator"] == "doq-api"
    pages = sorted(path.name for path in directory.glob("*.md"))
    assert pages == sorted(manifest["files"]) and "index.md" in pages and len(pages) >= 4
    orders = []
    for name in pages:
        text = (directory / name).read_text()
        assert hashlib.sha256(text.encode()).hexdigest() == manifest["files"][name], name
        match = re.match(r"---\n(.*?)\n---\n", text, re.S)
        assert match and text.endswith("\n") and "\r" not in text, name
        meta = dict(line.split(": ", 1) for line in match.group(1).splitlines() if ": " in line and not line.startswith("#"))
        assert meta["generated"] == "doq-api" and meta["title"] and meta["description"] and meta["group"], name
        orders.append(int(meta["order"]))
        for forbidden in ("/Users/", "/Volumes/", "node_modules", "import(", str(REPO)):
            assert forbidden not in text, f"{name} contains {forbidden}"
    assert len(set(orders)) == len(orders) and min(orders) >= 1000


@pytest.mark.parametrize("app", APPS)
def test_contract_063_packed_cli_check_agrees_with_the_committed_reference(app, packed_cli):
    """CONTRACT-063: the CLI from the tarball regenerates exactly the committed files (deterministic, not stale)."""
    result = _run(packed_cli, "check", *_script_flags(app, "api:check:latest"), cwd=REPO / f"apps/{app}")
    assert result.returncode == 0, result.stderr
    assert "are up to date" in result.stdout


@pytest.mark.parametrize("app", APPS)
def test_contract_064_reference_pages_are_prerendered_at_canonical_nested_routes(app, request):
    """CONTRACT-064: every generated page answers 200 with its title, selector or signature, tables and heading ids."""
    site = request.getfixturevalue(APPS[app]["site"])
    base = APPS[app]["base"]
    for path in sorted(_generated(app).glob("*.md")):
        route = f"{base}/reference/generated" + ("" if path.stem == "index" else f"/{path.stem}")
        status, headers, body = site.get(route)
        assert status == 200 and headers["content-type"].startswith("text/html"), route
        html = body.decode()
        title = re.search(r"^title: (.+)$", path.read_text(), re.M).group(1).strip('"')
        assert re.search(rf"<h1[^>]*>{re.escape(title)}</h1>", html), route
        assert 'data-pagefind-body' in html and "<h2" in html, route
        assert "doq-api" not in html.split("<body", 1)[1], f"{route} leaks the generator marker"
    html = site.get(f"{base}/reference/generated/" + ("vanta-alert-component" if app == "showcase-a" else "create-forge-client"))[2].decode()
    if app == "showcase-a":
        assert "<code>vanta-alert</code>" in html or ">vanta-alert<" in html
        assert "<table" in html and "alertTitle" in html and "dismissed" in html and "Yes" in html
        assert 'id="inputs"' in html and 'id="outputs"' in html and 'id="public-methods"' in html
        assert f'href="{base}/reference/generated/vanta-tone"' in html
    else:
        assert "createForgeClient" in html and 'id="signatures"' in html and 'id="overload-1"' in html
        assert 'href="/reference/generated/forge-client"' in html


@pytest.mark.parametrize("app,needles", [("showcase-a", ["VantaAlertComponent", "alertTitle", "vantaTooltipDelay", "vanta-alert"]), ("showcase-b", ["createForgeClient", "ForgeErrorCode", "pageSize", "RateLimited"])])
def test_contract_065_search_index_holds_symbol_input_and_selector_names(app, needles, request):
    """CONTRACT-065: Pagefind fragments of reference pages carry symbol names, input names and members, at canonical URLs only."""
    site = request.getfixturevalue(APPS[app]["site"])
    base = APPS[app]["base"]
    pages = [page for page in _fragments(site) if page["url"].startswith(f"{base}/reference/generated")]
    assert len(pages) == len(list(_generated(app).glob("*.md")))
    text = " ".join(page["content"] for page in pages)
    for needle in needles:
        assert needle in text, needle
    for page in pages:
        assert "On this page" not in page["content"] and "Page navigation" not in page["content"]
        assert page["url"].endswith("/") and "generated" in page["url"]


def test_contract_066_check_fails_for_stale_output_and_never_writes(packed_cli, tmp_path, tmp_path_factory):
    """CONTRACT-066: black-box exit codes of the packed CLI in a clean project: 0 up to date, 1 stale, 2 usage; check is read-only."""
    ts = (REPO / "apps/showcase-a/node_modules/typescript").resolve()
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules/typescript").symlink_to(ts, target_is_directory=True)
    source = tmp_path / "src/public-api.ts"
    source.parent.mkdir(parents=True)
    source.write_text("/** Adds. */\nexport function add(a: number, b: number): number { return a + b; }\n")
    flags = ["--entry", "src/public-api.ts", "--out", "src/content/docs/api"]
    out = tmp_path / "src/content/docs/api"
    assert _run(packed_cli, "check", *flags, cwd=tmp_path).returncode == 1  # nothing generated yet: stale
    assert not out.exists(), "check must not create files"
    assert _run(packed_cli, "generate", *flags, cwd=tmp_path).returncode == 0
    snapshot = {p.name: p.read_bytes() for p in out.iterdir()}
    assert _run(packed_cli, "check", *flags, cwd=tmp_path).returncode == 0
    source.write_text("/** Adds. */\nexport function add(a: number, b: number, c = 0): number { return a + b + c; }\n")
    stale = _run(packed_cli, "check", *flags, cwd=tmp_path)
    assert stale.returncode == 1 and "modified  add.md" in stale.stderr
    assert {p.name: p.read_bytes() for p in out.iterdir()} == snapshot, "check mutated generated files"
    assert _run(packed_cli, "generate", *flags, cwd=tmp_path).returncode == 0
    assert _run(packed_cli, "check", *flags, cwd=tmp_path).returncode == 0
    assert _run(packed_cli, "generate", "--entry", "src/public-api.ts", "--out", "../outside", cwd=tmp_path).returncode == 2
    assert _run(packed_cli, "frobnicate", cwd=tmp_path).returncode == 2
    # Without a TypeScript installation the failure is a clear configuration error, not a stack trace.
    bare = tmp_path_factory.mktemp("no-typescript")
    (bare / "src").mkdir(parents=True)
    (bare / "src/public-api.ts").write_text("export const x = 1;\n")
    missing = _run(packed_cli, "generate", *flags, cwd=bare)
    assert missing.returncode == 2 and "typescript" in missing.stderr and "    at " not in missing.stderr

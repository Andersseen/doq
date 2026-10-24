"""CONTRACT-001..005: the npm tarball as an external consumer would receive it."""

from __future__ import annotations

import json
import re
from pathlib import Path

from conftest import REPO

PUBLIC_EXPORTS = [
    "defineDoqConfig",
    "provideDoq",
    "doqRoutes",
    "doqPrerenderRoutes",
    "doqPrerenderRoute",
    "splitDoqInlineDemos",
    "normalizeDoqPaths",
    "normalizeDoqDocument",
    "sortDoqDocuments",
    "DoqDocsComponent",
    "DoqIndexComponent",
    "DoqShellComponent",
    "DoqConfig",
    "DoqPaths",
    "DoqSlots",
    "DoqPresentation",
    "DoqSearchConfig",
    "DoqSearchResult",
    "normalizeDoqSearchConfig",
    "normalizeSearchResultUrl",
]


def test_contract_001_manifest_exports_resolve_to_shipped_files(package_files, manifest):
    """CONTRACT-001: every path in `exports`/`module`/`typings` exists in the tarball."""
    assert manifest["name"] == "@doqs/analog"
    targets = {
        manifest["module"],
        manifest["typings"],
        *(value for entry in manifest["exports"].values() for value in (entry.values() if isinstance(entry, dict) else [entry])),
    }
    # `dist/` prefixes in the source manifest are rewritten by the packer; compare by file name.
    assert targets
    for target in targets:
        shipped = target.removeprefix("./").removeprefix("dist/")
        assert shipped in package_files, f"{target} -> {shipped} missing from tarball"


def test_contract_002_declarations_expose_the_public_api(package_files):
    """CONTRACT-002: the shipped .d.ts declares every documented public symbol."""
    # Configuration declarations live in the `@doqs/analog/config` entry since 0.11; the root re-exports them.
    declarations = package_files["types/doqs-analog.d.ts"].decode() + package_files["types/doqs-analog-config.d.ts"].decode()
    missing = [name for name in PUBLIC_EXPORTS if not re.search(rf"\b{name}\b", declarations)]
    assert not missing, f"not declared: {missing}"
    runtime = package_files["fesm2022/doqs-analog.mjs"].decode()
    clauses = re.findall(r"export \{([^}]*)\}", runtime)
    assert clauses, "bundle has no export clause"
    exported = {item.split(" as ")[-1].strip() for clause in clauses for item in clause.split(",") if item.strip()}
    runtime_symbols = [name for name in PUBLIC_EXPORTS if name[0].islower() or name.endswith("Component")]
    assert not [name for name in runtime_symbols if name not in exported]


def test_contract_003_stylesheet_export_ships_the_documented_selectors(package_files, manifest):
    """CONTRACT-003: `@doqs/analog/styles.css` exists and carries the public CSS tokens."""
    assert "./styles.css" in manifest["exports"]
    css = package_files["styles.css"].decode()
    for token in ("--host-docs-background", "--host-docs-primary", "--host-docs-focus", "--host-docs-code-background"):
        assert token in css, f"{token} not referenced by styles.css"
    assert ".doq-root" in css and ".doq-index" in css


def test_contract_004_only_distributable_files_without_private_references(package_files, manifest):
    """CONTRACT-004: no workspace, showcase or source-tree leakage in files or metadata."""
    for path in package_files:
        assert not re.match(r"(apps|src|e2e|tests|scripts|docs|node_modules|\.github|\.agents|\.agentyx|\.claude|\.codex)/", path), path
        assert not path.endswith((".spec.ts", ".test.ts", ".env")), path
    dependencies = {**manifest.get("dependencies", {}), **manifest.get("peerDependencies", {}), **manifest.get("devDependencies", {})}
    assert not any(version.startswith(("workspace:", "file:", "link:")) for version in dependencies.values())
    assert "scripts" not in manifest and "devDependencies" not in manifest
    for path, data in package_files.items():
        if path.endswith((".mjs", ".d.ts", ".json", ".md", ".css")):
            text = data.decode()
            for needle in ("showcase-a", "showcase-b", "/Volumes/", "workspace:", "packages/doq/src"):
                assert needle not in text or path.endswith(("README.md", "CHANGELOG.md")), f"{path} references {needle}"


def test_contract_005_license_is_shipped_and_consistent(package_files, manifest):
    """CONTRACT-005: MIT metadata, a LICENSE identical to the repository's, and consumer-facing docs."""
    assert manifest["license"] == "MIT"
    assert package_files["LICENSE"] == (REPO / "LICENSE").read_bytes()
    assert "MIT License" in package_files["LICENSE"].decode()
    assert {"README.md", "CHANGELOG.md"} <= set(package_files)
    assert manifest["repository"]["url"].endswith("Andersseen/doqs.git")
    assert json.loads((REPO / "packages/doq/package.json").read_text())["license"] == "MIT"
    assert not Path(REPO / "packages/doq/dist/dist").exists()

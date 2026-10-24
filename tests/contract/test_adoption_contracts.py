"""CONTRACT-110..115: package boundaries and landmark output of Doqs 0.11, checked from outside (tarball and static HTTP)."""

from __future__ import annotations

import re

from conftest import REPO

CONFIG_NAMES = ["defineDoqConfig", "provideDoq", "doqPrerenderRoutes", "DOQ_CONFIG", "normalizeDoqPaths"]
CONFIG_TYPES = ["DoqConfig", "DoqLandmark", "DoqUnmatched", "DoqPaths", "DoqSlots", "DoqPresentation"]


def test_contract_110_config_entry_is_exported_and_shipped(package_files, manifest):
    """CONTRACT-110: the `./config` subpath resolves to shipped files and declares the configuration surface."""
    entry = manifest["exports"]["./config"]
    for key in ("types", "default"):
        shipped = entry[key].removeprefix("./").removeprefix("dist/")
        assert shipped in package_files, f"{entry[key]} missing from the tarball"
    declarations = package_files["types/doqs-analog-config.d.ts"].decode()
    for name in CONFIG_NAMES + CONFIG_TYPES:
        assert re.search(rf"\b{name}\b", declarations), f"{name} not declared by @doqs/analog/config"
    assert re.search(r"landmark\?:\s*DoqLandmark", declarations)
    assert re.search(r"unmatched\?:\s*DoqUnmatched", declarations)


def test_contract_111_config_entry_imports_only_angular_core(package_files):
    """CONTRACT-111: no documentation component, router, content or rxjs code is reachable from the configuration entry."""
    source = package_files["fesm2022/doqs-analog-config.mjs"].decode()
    modules = set(re.findall(r"""^import[^'"\n]*from\s+['"]([^'"]+)['"]""", source, flags=re.M))
    assert modules == {"@angular/core"}, modules
    assert "@Component" not in source and "ɵɵngDeclareComponent" not in source


def test_contract_112_root_entry_reexports_the_configuration_surface(package_files):
    """CONTRACT-112: existing 0.10 imports from `@doqs/analog` keep working: the root bundle imports the config entry and re-exports its names."""
    runtime = package_files["fesm2022/doqs-analog.mjs"].decode()
    assert "'@doqs/analog/config'" in runtime
    exported = set()
    for clause in re.findall(r"export \{([^}]*)\}", runtime):
        exported |= {item.split(" as ")[-1].strip() for item in clause.split(",") if item.strip()}
    for name in ("defineDoqConfig", "provideDoq", "doqPrerenderRoutes", "DOQ_CONFIG", "doqRoutes", "DoqShellComponent"):
        assert name in exported, f"{name} is no longer exported by @doqs/analog"
    declarations = package_files["types/doqs-analog.d.ts"].decode()
    for name in CONFIG_TYPES:
        assert re.search(rf"\b{name}\b", declarations), f"{name} not declared by @doqs/analog"


def test_contract_113_node_only_entries_never_import_the_browser_entries(package_files):
    """CONTRACT-113: Node-only tooling stays free of Angular and of the browser entries."""
    for path, source in package_files.items():
        # bin/cli/init.mjs contains import statements as text: it writes them into the files it scaffolds.
        if path.startswith("bin/") and path.endswith(".mjs") and path != "bin/cli/init.mjs":
            imports = re.findall(r"""^(?:import|export)\b[^'"\n]*from\s+['"]([^'"]+)['"]""", source.decode(), flags=re.M)
            assert not [name for name in imports if name.startswith(("@doqs/analog", "@angular/"))], (path, imports)


def _mains(html: bytes) -> int:
    return len(re.findall(rb"<main[\s>]", html))


def test_contract_114_landmark_output_has_one_main_per_documentation_page(site_a, site_b, site_official):
    """CONTRACT-114: embedded (Showcase A), docs-first (Showcase B) and the official site: exactly one `main` in the prerendered HTML."""
    samples = [
        (site_a, ["/docs", "/docs/installation", "/docs/components/button", "/docs/v/1"]),
        (site_b, ["/", "/onboarding/first-application"]),
        (site_official, ["/docs", "/docs/getting-started", "/docs/guides/existing-component-library-site"]),
    ]
    for site, paths in samples:
        for path in paths:
            status, _headers, body = site.get(path)
            assert status == 200, path
            assert _mains(body) == 1, f"{path}: {_mains(body)} main landmarks"
            assert b"<main" not in re.sub(rb"<main[^>]*>.*?</main>", b"", body, count=1, flags=re.S), f"{path}: nested or repeated main"


def test_contract_115_stability_inventory_is_shipped_with_the_repository_not_the_package(package_files):
    """CONTRACT-115: the tier file is a repository document; the tarball carries no private inventory or test files."""
    assert not [path for path in package_files if "stability" in path or path.endswith(".spec.ts")]
    assert (REPO / "packages/doq/public-api.stability.json").exists()

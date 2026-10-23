"""CONTRACT-090..095: the doq CLI as shipped in the npm tarball, executed from the extracted package."""

from __future__ import annotations

import json
import re
import subprocess
import tarfile
from pathlib import Path

import pytest

from conftest import LIBRARY_VERSION


@pytest.fixture(scope="session")
def unpacked(tarball: Path, tmp_path_factory) -> Path:
    destination = tmp_path_factory.mktemp("doq-tarball")
    with tarfile.open(tarball, "r:gz") as archive:
        archive.extractall(destination, filter="data")
    return destination / "package"


def _doq(unpacked: Path, *args: str, cwd: Path | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(["node", str(unpacked / "bin/doq.mjs"), *args], capture_output=True, text=True, cwd=cwd, timeout=60)


def _project(tmp_path: Path) -> Path:
    (tmp_path / "package.json").write_text(json.dumps({"name": "fixture", "dependencies": {"@angular/core": "^21.2.2"}}))
    return tmp_path


def test_contract_090_the_tarball_declares_and_ships_all_three_binaries(tarball, package_files, manifest):
    """CONTRACT-090: doq, doq-search and doq-api are in `bin`, shipped, with a shebang and the executable bit."""
    assert set(manifest["bin"]) == {"doq", "doq-search", "doq-api"}
    modes = {}
    with tarfile.open(tarball, "r:gz") as archive:
        modes = {member.name.removeprefix("package/"): member.mode for member in archive.getmembers() if member.isfile()}
    for name, target in manifest["bin"].items():
        path = target.removeprefix("./")
        assert path in package_files, f"{name} -> {path} missing"
        assert package_files[path].startswith(b"#!/usr/bin/env node"), name
        assert modes[path] & 0o111, f"{path} is not executable"
    for module in ("args", "doctor", "init", "node-support", "project", "semver", "source"):
        assert f"bin/cli/{module}.mjs" in package_files


def test_contract_091_cli_runs_from_the_unpacked_tarball_without_dependencies(unpacked):
    """CONTRACT-091: --version and --help work with no node_modules around, and the CLI imports only Node and itself."""
    assert not (unpacked / "node_modules").exists()
    assert _doq(unpacked, "--version").stdout.strip() == LIBRARY_VERSION
    assert "doq init" in _doq(unpacked, "--help").stdout
    for file in [unpacked / "bin/doq.mjs", *(unpacked / "bin/cli").glob("*.mjs")]:
        # Only the module's own leading import block counts; snippets inside template literals are text.
        header = []
        for line in file.read_text().splitlines():
            if line.startswith("import ") or not line.strip() or line.startswith("//"):
                header.append(line)
            else:
                break
        for specifier in re.findall(r"from '([^']+)'", "\n".join(header)):
            assert specifier.startswith(("node:", "./")), f"{file.name} imports {specifier}"


def test_contract_092_init_generates_valid_onboarding_files_and_is_repeatable(unpacked, tmp_path):
    """CONTRACT-092: the generated paths file and Markdown have the documented shape; a rerun changes nothing."""
    project = _project(tmp_path)
    first = _doq(unpacked, "init", "--json", cwd=project)
    assert first.returncode == 0, first.stderr
    result = json.loads(first.stdout)
    assert (result["scaffold"], result["integration"], result["basePath"]) == ("complete", "incomplete", "/docs")
    paths = (project / "src/doq.paths.ts").read_text()
    assert "contentDirectory: 'docs'" in paths and "basePath: '/docs'" in paths and not re.search(r"^import ", paths, re.M)
    for name in ("introduction", "getting-started"):
        text = (project / f"src/content/docs/{name}.md").read_text()
        front = text.split("---")[1]
        assert re.search(r"^title: .+$", front, re.M) and re.search(r"^order: \d+$", front, re.M), name
    before = {p: p.read_bytes() for p in project.rglob("*") if p.is_file()}
    second = json.loads(_doq(unpacked, "init", "--json", cwd=project).stdout)
    assert [f["status"] for f in second["files"]] == ["unchanged"] * 3
    assert before == {p: p.read_bytes() for p in project.rglob("*") if p.is_file()}


def test_contract_093_init_dry_run_and_conflicts_never_write(unpacked, tmp_path):
    """CONTRACT-093: --dry-run writes nothing; a conflicting paths file stops the command with exit code 1."""
    project = _project(tmp_path)
    assert _doq(unpacked, "init", "--dry-run", cwd=project).returncode == 0
    assert not (project / "src").exists()
    (project / "src").mkdir()
    (project / "src/doq.paths.ts").write_text("export const doqPaths = { contentDirectory: 'other', basePath: '/other' } as const;\n")
    conflict = _doq(unpacked, "init", "--json", cwd=project)
    assert conflict.returncode == 1
    assert json.loads(conflict.stdout)["scaffold"] == "blocked"
    assert not (project / "src/content").exists()


def test_contract_094_doctor_json_is_one_document_with_actionable_findings(unpacked, tmp_path):
    """CONTRACT-094: stdout is exactly one JSON document, stderr is empty, failures carry a fix and the exit code is 1."""
    project = _project(tmp_path)
    run = _doq(unpacked, "doctor", "--json", cwd=project)
    assert run.returncode == 1 and run.stderr == ""
    report = json.loads(run.stdout)
    assert report["command"] == "doctor" and report["exitCode"] == 1
    failures = [item for item in report["findings"] if item["status"] == "FAIL"]
    assert failures and all(item.get("fix") and item.get("why") and item.get("check") for item in failures)
    assert {item["status"] for item in report["findings"]} <= {"PASS", "WARN", "FAIL", "UNKNOWN"}
    assert not any(item["id"] == "search.pagefind" for item in report["findings"]), "Pagefind must not be demanded while search is off"


def test_contract_095_usage_errors_go_to_stderr_with_exit_code_two(unpacked, tmp_path):
    """CONTRACT-095: invalid options and a missing project never print to stdout and exit with 2."""
    bad = _doq(unpacked, "init", "--mode", "nope", cwd=_project(tmp_path))
    assert (bad.returncode, bad.stdout) == (2, "") and "Invalid --mode" in bad.stderr
    empty = tmp_path / "empty"
    empty.mkdir()
    missing = _doq(unpacked, "init", cwd=empty)
    assert (missing.returncode, missing.stdout) == (2, "") and "No package.json" in missing.stderr
    unsafe = _doq(unpacked, "init", "--content-dir", "../x", cwd=_project(tmp_path / "again" if (tmp_path / "again").mkdir() is None else tmp_path))
    assert unsafe.returncode == 2

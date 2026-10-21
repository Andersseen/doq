"""Black-box fixtures: the packed npm tarball and the production static output, served over real HTTP.

Nothing here builds Doq. Run `pnpm build && pnpm pack:doq` first (pnpm test:contract documents the flow).
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
LIBRARY_VERSION = json.loads((REPO / "packages/doq/package.json").read_text())["version"]


def _tarball_path() -> Path:
    return Path(os.environ.get("DOQ_TARBALL", REPO / "artifacts" / f"getdoq-analog-{LIBRARY_VERSION}.tgz"))


@pytest.fixture(scope="session")
def tarball() -> Path:
    path = _tarball_path()
    if not path.exists():
        pytest.fail(f"{path} not found. Run `pnpm pack:doq` first.", pytrace=False)
    return path


@pytest.fixture(scope="session")
def package_files(tarball: Path) -> dict[str, bytes]:
    """Every regular file of the tarball, keyed by path without the leading `package/`."""
    files: dict[str, bytes] = {}
    with tarfile.open(tarball, "r:gz") as archive:
        for member in archive.getmembers():
            if member.isfile():
                data = archive.extractfile(member)
                assert data is not None
                files[member.name.removeprefix("package/")] = data.read()
    return files


@pytest.fixture(scope="session")
def manifest(package_files: dict[str, bytes]) -> dict:
    return json.loads(package_files["package.json"])


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class Site:
    """A running static preview of one production build."""

    def __init__(self, root: Path, base: str):
        self.root = root
        self.base = base

    def get(self, path: str) -> tuple[int, dict[str, str], bytes]:
        """GET without following redirects or raising on 4xx/5xx; `path` is sent verbatim."""
        request = urllib.request.Request(self.base + path)
        opener = urllib.request.build_opener(_NoRedirect)
        try:
            with opener.open(request, timeout=10) as response:
                return response.status, _lower(response.headers), response.read()
        except urllib.error.HTTPError as error:
            return error.code, _lower(error.headers), error.read()


def _lower(headers) -> dict[str, str]:
    return {key.lower(): value for key, value in headers.items()}


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # noqa: D401 - urllib hook
        return None


def _serve(root: Path):
    if not (root / "index.html").exists():
        pytest.fail(f"{root} has no production build. Run `pnpm build` first.", pytrace=False)
    port = _free_port()
    process = subprocess.Popen(
        ["node", str(REPO / "scripts/preview-static.ts"), str(root)],
        cwd=REPO,
        env={**os.environ, "PORT": str(port)},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    site = Site(root, f"http://127.0.0.1:{port}")
    try:
        deadline = time.time() + 20
        while time.time() < deadline:
            if process.poll() is not None:
                pytest.fail("preview server exited early", pytrace=False)
            try:
                site.get("/")
                break
            except OSError:
                time.sleep(0.1)
        else:
            pytest.fail("preview server did not start", pytrace=False)
        yield site
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


@pytest.fixture(scope="session")
def site_a():
    yield from _serve(REPO / "apps/showcase-a/dist/analog/public")


@pytest.fixture(scope="session")
def site_b():
    yield from _serve(REPO / "apps/showcase-b/dist/analog/public")


@pytest.fixture(scope="session")
def site_b_nosearch():
    """Showcase B built with `vite build --mode nosearch`: identical content, search disabled."""
    yield from _serve(REPO / "apps/showcase-b/dist/analog-nosearch/public")

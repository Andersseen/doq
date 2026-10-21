/**
 * Runs the pytest contract suite (tests/contract) against the packed tarball and the production builds.
 * Python is used only for these black-box checks; nothing in the library or its build depends on it.
 *
 *   pnpm test:contract [pytest args...]
 *
 * Creates .venv on first use and installs the pinned requirements from tests/contract/requirements.txt.
 * Needs `pnpm build` and `pnpm pack:doq` first.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const venv = resolve(repo, '.venv');
const python = resolve(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const run = (command: string, args: string[], quiet = false) =>
  spawnSync(command, args, { cwd: repo, stdio: quiet ? 'ignore' : 'inherit', env: process.env });

if (!existsSync(python)) {
  const candidates = [process.env['PYTHON'], 'python3.13', 'python3.12', 'python3.11', 'python3', 'python'].filter(
    Boolean,
  ) as string[];
  const interpreter = candidates.find((candidate) => {
    const probe = spawnSync(candidate, ['-c', 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)']);
    return probe.status === 0;
  });
  if (!interpreter) {
    console.error('contract: Python 3.11 or newer is required (set PYTHON to select an interpreter).');
    process.exit(1);
  }
  console.log(`contract: creating .venv with ${interpreter}`);
  if (run(interpreter, ['-m', 'venv', venv]).status !== 0) process.exit(1);
}
if (run(python, ['-c', 'import pytest'], true).status !== 0) {
  console.log('contract: installing pinned test requirements');
  const install = run(python, [
    '-m',
    'pip',
    'install',
    '--disable-pip-version-check',
    '--no-cache-dir',
    '-r',
    'tests/contract/requirements.txt',
  ]);
  if (install.status !== 0) process.exit(1);
}
process.exit(run(python, ['-m', 'pytest', 'tests/contract', ...process.argv.slice(2)]).status ?? 1);

/**
 * Platform smoke for the Node-only tooling (`pnpm verify:portable`): the same checks run on macOS, Linux and Windows
 * (the CI "tooling-windows" job). They target what differs between platforms, not the generators' logic:
 *   - a project path with spaces and non-ASCII characters;
 *   - CRLF line endings in every authored and source file (what `core.autocrlf` produces on Windows): generated output must
 *     stay byte-identical to the committed LF pages, so `doq content check` and `doq-api check` pass;
 *   - a symbolic link (a junction on Windows, which needs no privileges) that leaves the allowed source roots is refused, nothing
 *     outside the project is read and nothing is written;
 *   - generated manifests and diagnostics use `/` separators, never the platform separator;
 *   - `doq doctor --json` and `doq init --dry-run --json` print valid JSON and write nothing.
 * It copies the Showcase A sources to a temporary directory and never touches the repository.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const bin = (name: string) => resolve(repo, 'packages/doq/bin', name);
const root = await mkdtemp(join(await realpath(tmpdir()), 'doq portable smoké '));
const project = join(root, 'projéct');
const results: string[] = [];

async function walk(directory: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    out.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return out;
}
const run = (script: string, args: string[]) => {
  const result = spawnSync(process.execPath, [bin(script), ...args], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
};
const pass = (name: string) => {
  results.push(name);
  console.log(`  ok  ${name}`);
};

try {
  await cp(resolve(repo, 'apps/showcase-a'), project, {
    recursive: true,
    filter: (path) => !/[\\/](node_modules|dist|\.turbo|\.angular)([\\/]|$)/.test(path),
  });
  // TypeScript and Angular resolve from the consumer project: link the workspace app's installed dependencies.
  await symlink(resolve(repo, 'apps/showcase-a/node_modules'), join(project, 'node_modules'), 'junction');
  for (const file of await walk(project)) {
    if (!/\.(md|ts|json)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    await writeFile(file, text.replace(/\r?\n/g, '\r\n'));
  }
  pass('project copied to a path with spaces and non-ASCII characters, every text file converted to CRLF');

  const content = run('doq.mjs', ['content', 'check']);
  assert.equal(content.status, 0, content.out);
  pass('doq content check passes on CRLF sources and matches the committed LF pages byte for byte');

  const api = run('doq-api.mjs', [
    'check',
    '--project',
    'vanta-ui/tsconfig.json',
    '--entry',
    'vanta-ui/src/public-api.ts',
    '--out',
    'src/content/docs/reference/generated',
    '--strict',
  ]);
  assert.equal(api.status, 0, api.out);
  assert.ok(api.out.includes('src/content/docs/reference/generated'), `doq-api prints paths with "/": ${api.out}`);
  pass('doq-api check --strict passes on CRLF sources');

  const manifest = JSON.parse(await readFile(join(project, 'src/authoring/docs/.doq-content.json'), 'utf8')) as {
    files: Record<string, unknown>;
  };
  assert.ok(Object.keys(manifest.files).length > 0);
  assert.ok(
    Object.keys(manifest.files).every((key) => !key.includes('\\')),
    'manifest keys use "/"',
  );
  pass('manifest keys use "/" as the separator');

  // A link inside an allowed source root that points outside the project must be refused.
  const secret = join(root, 'outside');
  await mkdir(secret);
  await writeFile(join(secret, 'secret.ts'), 'export const secret = 1;\n');
  await symlink(secret, join(project, 'vanta-ui/src/leak'), 'junction');
  const page = join(project, 'src/authoring/docs/guides/leak.md');
  await writeFile(
    page,
    '---\r\ntitle: Leak\r\ngroup: Guides\r\norder: 99\r\n---\r\n\r\n::source{file="vanta-ui/src/leak/secret.ts"}\r\n',
  );
  const before = (await walk(join(project, 'src/content'))).length;
  const leak = run('doq.mjs', ['content', 'generate']);
  assert.notEqual(leak.status, 0, leak.out);
  assert.match(leak.out, /outside|leave|refus/i, leak.out);
  assert.ok(!leak.out.includes('export const secret'), 'the outside file was never read into output');
  assert.equal((await walk(join(project, 'src/content'))).length, before, 'a refused generate writes nothing');
  assert.ok((await lstat(join(project, 'vanta-ui/src/leak'))).isSymbolicLink());
  await rm(page);
  await rm(join(project, 'vanta-ui/src/leak'));
  pass('a link that leaves the source roots is refused, with a diagnostic, and nothing is written');

  for (const args of [
    ['doctor', '--json'],
    ['init', '--dry-run', '--json'],
  ]) {
    const report = run('doq.mjs', args);
    assert.ok([0, 1].includes(report.status ?? -1), `${args.join(' ')}: exit ${report.status}\n${report.out}`);
    JSON.parse(report.out);
  }
  pass('doq doctor and doq init --dry-run print valid JSON');
  console.log(`portable smoke: PASS (${results.length} checks on ${process.platform}, Node ${process.version})`);
} finally {
  await rm(root, { recursive: true, force: true });
}

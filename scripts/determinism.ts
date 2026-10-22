/**
 * Repeated clean builds of a stress consumer must agree on every heading id.
 *
 *   node scripts/determinism.ts [--builds=5] [--docs=60] [--app=showcase-a|showcase-b] [--control]
 *
 * It builds an independent consumer from the packed tarball (consumer.ts) with generated documents that repeat headings,
 * adds an asynchronous Markdown step so renders really interleave, then runs `vite build` from a clean output K times.
 * After each build `docs:check` verifies the output against a sequential render, and a fingerprint of
 * route -> heading ids must be identical in all builds. `--control` removes doqDeterministicMarkdown() and passes only when
 * the unguarded build is caught (a failing docs:check or differing fingerprints), proving the check can fail.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { extractPageFacts } from './docs-check/lib.ts';

const repo = resolve(import.meta.dirname, '..');
const arg = (name: string, fallback: string) => process.argv.find(item => item.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const builds = Number(arg('builds', '5'));
const docs = Number(arg('docs', '60'));
const app = arg('app', 'showcase-a');
const control = process.argv.includes('--control');
const outDir = resolve(process.env['DOQ_DETERMINISM_DIR'] ?? join(tmpdir(), `doq-determinism-${app}${control ? '-control' : ''}`));
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as { version: string };
const tarball = resolve(repo, `artifacts/doqs-analog-${version}.tgz`);

const run = (command: string, args: string[], cwd: string, quiet = false) =>
  spawnSync(command, args, { cwd, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8', env: { ...process.env, CI: 'true' } });

const consumerFlags = [`--app=${app}`, `--stress=${docs}`, '--skip-api', '--slow-markdown', ...(control ? ['--without-deterministic-markdown'] : [])];
const setup = run('node', ['scripts/consumer.ts', tarball, outDir, ...consumerFlags], repo);
if (setup.status !== 0) process.exit(setup.status ?? 1);

async function fingerprint(dist: string): Promise<{ hash: string; pages: number }> {
  const map: Record<string, string[]> = {};
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === 'index.html') map[`/${relative(dist, directory)}`] = extractPageFacts(await readFile(path, 'utf8')).markdownHeadings.map(heading => heading.id);
    }
  };
  await walk(dist);
  const ordered = Object.keys(map).sort().map(route => [route, map[route]]);
  return { hash: createHash('sha256').update(JSON.stringify(ordered)).digest('hex').slice(0, 16), pages: ordered.length };
}

const dist = join(outDir, 'dist/analog/public');
const prints: string[] = [];
let checkFailures = 0;
for (let build = 1; build <= builds; build++) {
  await rm(join(outDir, 'dist'), { recursive: true, force: true });
  await rm(join(outDir, 'node_modules/.vite'), { recursive: true, force: true });
  const built = run('pnpm', ['exec', 'vite', 'build'], outDir, true);
  if (built.status !== 0) { console.error(built.stdout, built.stderr); process.exit(1); }
  const checked = run('node', ['scripts/docs-check.ts', `--dist=${dist}`, `--source=${outDir}`], repo, true);
  const { hash, pages } = await fingerprint(dist);
  prints.push(hash);
  if (checked.status !== 0) checkFailures++;
  const firstProblem = checked.status !== 0 ? (checked.stderr.split('\n').find(line => line.includes('[')) ?? '').trim() : '';
  console.log(`build ${build}/${builds}: ${pages} pages, heading fingerprint ${hash}, docs:check ${checked.status === 0 ? 'ok' : `FAILED ${firstProblem}`}`);
}

const identical = new Set(prints).size === 1;
console.log(`\ndeterminism (${control ? 'control, guard removed' : 'guarded'}): ${builds} clean builds, ${new Set(prints).size} distinct fingerprint(s), ${checkFailures} docs:check failure(s)`);
if (control) {
  const caught = !identical || checkFailures > 0;
  console.log(caught ? 'control PASS: the unguarded build is detected as inconsistent.' : 'control INCONCLUSIVE: the unguarded build happened to be consistent; the race did not trigger.');
  process.exit(caught ? 0 : 3);
}
process.exit(identical && checkFailures === 0 ? 0 : 1);

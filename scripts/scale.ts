/**
 * Documentation scaling benchmark: `pnpm perf:scale [--sizes=20,200,1000] [--app=showcase-b] [--navigations=8]`.
 *
 * For each size it builds an independent consumer from the packed tarball with that many generated documents in the current
 * version and half as many in the archive (the fixtures are generated into a disposable directory, never committed), then
 * records: build success, `vite build` and `doq-search` duration, the JavaScript a page loads first and in total, the search
 * index size, the number of static pages and the median client-side navigation latency in a real browser.
 *
 * Durations and latencies are reported, never asserted: they depend on the machine. The byte metrics are what perf-budgets.json
 * guards.
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { measureSite } from './perf.ts';

const repo = resolve(import.meta.dirname, '..');
const arg = (name: string, fallback: string) =>
  process.argv.find((item) => item.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const sizes = arg('sizes', '20,200,1000').split(',').map(Number);
const app = arg('app', 'showcase-b');
const navigations = Number(arg('navigations', '8'));
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};
const tarball = resolve(repo, `artifacts/doqs-analog-${version}.tgz`);

const run = (command: string, args: string[], cwd: string) => {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
    maxBuffer: 1 << 28,
  });
  return {
    ok: result.status === 0,
    seconds: (Date.now() - started) / 1000,
    output: `${result.stdout}${result.stderr}`,
  };
};

async function navigationLatency(publicDir: string, count: number): Promise<number | undefined> {
  const { chromium } = await import('@playwright/test');
  const port = 4300 + Math.floor(Math.random() * 100);
  const preview = spawn('node', ['scripts/preview-static.ts', publicDir], {
    cwd: repo,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  try {
    await new Promise((done) => setTimeout(done, 800));
    const browser = await chromium.launch({ channel: process.env['PW_CHANNEL'] || undefined });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/stress/stress-0000`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const samples: number[] = [];
    for (let index = 1; index <= count; index++) {
      const heading = `Stress ${String(index).padStart(4, '0')} (current)`;
      const started = Date.now();
      await page
        .evaluate((i) => {
          const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find(
            (a) => a.getAttribute('href') === `/stress/stress-${String(i).padStart(4, '0')}`,
          );
          if (!link) throw new Error(`no link to stress ${i}`);
          link.click();
        }, index)
        .catch(() => undefined);
      await page
        .getByRole('heading', { level: 1, name: heading })
        .waitFor({ timeout: 15_000 })
        .catch(() => undefined);
      samples.push(Date.now() - started);
    }
    await browser.close();
    samples.sort((a, b) => a - b);
    return samples[Math.floor(samples.length / 2)];
  } finally {
    preview.kill();
  }
}

const rows: Record<string, string | number>[] = [];
for (const size of sizes) {
  const dir = join(tmpdir(), `doq-scale-${app}-${size}`);
  const prepared = run(
    'node',
    ['scripts/consumer.ts', tarball, dir, `--app=${app}`, `--stress=${size}`, '--skip-api', '--no-build'],
    repo,
  );
  if (!prepared.ok) {
    rows.push({ docs: size, build: 'PREPARE FAILED' });
    console.error(prepared.output.slice(-2000));
    continue;
  }
  const built = run('pnpm', ['exec', 'vite', 'build'], dir);
  const indexed = built.ok ? run('pnpm', ['exec', 'doq-search', 'index', 'dist/analog/public'], dir) : undefined;
  if (!built.ok) console.error(built.output.slice(-3000));
  const publicDir = join(dir, 'dist/analog/public');
  const metrics = built.ok ? await measureSite(publicDir, 'stress/stress-0001') : undefined;
  const latency =
    built.ok && navigations > 0 ? await navigationLatency(publicDir, navigations).catch(() => undefined) : undefined;
  rows.push({
    docs: size,
    archiveDocs: Math.ceil(size / 2),
    build: built.ok ? 'ok' : 'FAILED',
    viteBuildSeconds: Math.round(built.seconds * 10) / 10,
    searchIndexSeconds: indexed ? Math.round(indexed.seconds * 10) / 10 : 0,
    initialJsGzip: metrics?.initialJsGzip ?? 0,
    allJsGzip: metrics?.allJsGzip ?? 0,
    searchIndexBytes: metrics?.searchIndexBytes ?? 0,
    staticPages: metrics?.staticPages ?? 0,
    medianNavigationMs: latency ?? 0,
  });
  console.log(JSON.stringify(rows.at(-1)));
}
console.log(`\nperf:scale (${app}, tarball ${version})`);
console.table(rows);

// --check: the cost of one more document in the first-loaded JavaScript, between the two smallest sizes, against perf-budgets.json.
let slopeOk = true;
if (process.argv.includes('--check')) {
  const [small, large] = rows.filter((row) => row['build'] === 'ok');
  if (!small || !large) throw new Error('perf:scale --check needs two successful sizes');
  const documents =
    Number(large['docs']) + Number(large['archiveDocs']) - (Number(small['docs']) + Number(small['archiveDocs']));
  const perDocument = Math.round((Number(large['initialJsGzip']) - Number(small['initialJsGzip'])) / documents);
  const budget = (
    JSON.parse(await readFile(resolve(repo, 'perf-budgets.json'), 'utf8')) as {
      budgets: { target: string; metric: string; baseline: number; max: number; reason: string }[];
    }
  ).budgets.find((item) => item.target === 'scale' && item.metric === 'initialJsGzipBytesPerDocument');
  if (!budget) throw new Error('perf-budgets.json has no scale/initialJsGzipBytesPerDocument budget');
  slopeOk = perDocument <= budget.max;
  console.log(
    `${slopeOk ? 'ok  ' : 'FAIL'} initial JS grows ${perDocument} B (gzip) per document between ${small['docs']} and ${large['docs']} (baseline ${budget.baseline}, max ${budget.max})${slopeOk ? '' : `\n     ${budget.reason}`}`,
  );
}
process.exit(rows.every((row) => row['build'] === 'ok') ? 0 : 1);

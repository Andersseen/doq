/**
 * Measured size budgets for the generated output: `pnpm perf:check [--update-report]`.
 *
 * What is measured is a property of the artifact, never of the clock: the JavaScript a page loads before it is interactive
 * (the module entry plus its modulepreload chunks, gzip), the core stylesheet, the size of the search index, and how many
 * static pages and files a site produces. Build durations are reported by `perf:scale` but never fail a build because wall-clock
 * time depends on the machine.
 *
 * Budgets live in perf-budgets.json: { target, metric, baseline, max, reason }. `baseline` is what was measured when the budget
 * was set; `max` is the failing threshold (baseline plus a stated allowance). A budget is raised only in a pull request that
 * says why in its verification report, never to absorb an unrelated feature.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const repo = resolve(import.meta.dirname, '..');

export interface SiteMetrics {
  /** Gzipped bytes of the entry module and the chunks it preloads, as referenced by a documentation page. */
  initialJsGzip: number;
  /** Gzipped bytes of every JavaScript file in assets/ (lazy chunks included). */
  allJsGzip: number;
  /** Gzipped bytes of the CSS a documentation page links. */
  initialCssGzip: number;
  /** Bytes of the Pagefind index, fragments and filters (the search runtime itself excluded). */
  searchIndexBytes: number;
  staticPages: number;
  files: number;
}

async function walk(directory: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

const gzipSize = async (file: string): Promise<number> => gzipSync(await readFile(file), { level: 9 }).length;

export function referencedAssets(html: string): { scripts: string[]; styles: string[] } {
  const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
  const scripts = new Set<string>();
  const styles = new Set<string>();
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/g) ?? []) {
    const rel = attr(tag, 'rel');
    const url = tag.startsWith('<script') ? attr(tag, 'src') : attr(tag, 'href');
    if (!url?.startsWith('/')) continue;
    if (tag.startsWith('<script') && attr(tag, 'type') === 'module') scripts.add(url);
    else if (rel === 'modulepreload') scripts.add(url);
    else if (rel === 'stylesheet') styles.add(url);
  }
  return { scripts: [...scripts].sort(), styles: [...styles].sort() };
}

export async function measureSite(publicDir: string, samplePage: string): Promise<SiteMetrics> {
  const files = await walk(publicDir);
  const { scripts, styles } = referencedAssets(await readFile(join(publicDir, samplePage, 'index.html'), 'utf8'));
  const sum = async (urls: string[]) =>
    (await Promise.all(urls.map((url) => gzipSize(join(publicDir, url))))).reduce((a, b) => a + b, 0);
  const assets = files.filter((file) => relative(publicDir, file).startsWith('assets/') && file.endsWith('.js'));
  const indexFiles = files.filter(
    (file) =>
      /\/pagefind\/(index|fragment|filter)\//.test(file) ||
      file.endsWith('.pf_meta') ||
      file.endsWith('pagefind-entry.json'),
  );
  return {
    initialJsGzip: await sum(scripts),
    allJsGzip: (await Promise.all(assets.map(gzipSize))).reduce((a, b) => a + b, 0),
    initialCssGzip: await sum(styles),
    searchIndexBytes: (await Promise.all(indexFiles.map(async (file) => (await stat(file)).size))).reduce(
      (a, b) => a + b,
      0,
    ),
    staticPages: files.filter((file) => file.endsWith('/index.html')).length,
    files: files.length,
  };
}

export async function coreCss(): Promise<{ bytes: number; gzip: number }> {
  const file = resolve(repo, 'packages/doq/styles.css');
  return { bytes: (await stat(file)).size, gzip: await gzipSize(file) };
}

interface Budget {
  target: string;
  metric: string;
  baseline: number;
  max: number;
  reason: string;
}

const targets: Record<string, { dir: string; page: string }> = {
  'showcase-a': { dir: 'apps/showcase-a/dist/analog/public', page: 'docs/installation' },
  'showcase-b': { dir: 'apps/showcase-b/dist/analog/public', page: 'onboarding/first-application' },
  // The official site: its landing page is the sample, because the documentation region is a lazy route that the landing never loads.
  site: { dir: 'apps/site/dist/analog/public', page: '.' },
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const budgets = (JSON.parse(await readFile(resolve(repo, 'perf-budgets.json'), 'utf8')) as { budgets: Budget[] })
    .budgets;
  const measured: Record<string, Record<string, number>> = { 'doq-core': {} };
  const css = await coreCss();
  measured['doq-core'] = { stylesBytes: css.bytes, stylesGzip: css.gzip };
  for (const [name, target] of Object.entries(targets))
    measured[name] = { ...(await measureSite(resolve(repo, target.dir), target.page)) };

  let failed = false;
  console.log('perf:check');
  for (const budget of budgets) {
    if (budget.target === 'scale') continue; // measured by perf:scale --check, which builds generated fixtures
    const value = measured[budget.target]?.[budget.metric];
    if (value === undefined) {
      console.error(`  ? ${budget.target} ${budget.metric}: not measured`);
      failed = true;
      continue;
    }
    const ok = value <= budget.max;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? 'ok ' : 'FAIL'} ${budget.target.padEnd(11)} ${budget.metric.padEnd(16)} ${String(value).padStart(9)}  (baseline ${budget.baseline}, max ${budget.max})${ok ? '' : `\n       ${budget.reason}`}`,
    );
  }
  process.exit(failed ? 1 : 0);
}

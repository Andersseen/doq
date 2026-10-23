// Node-only API reference generator for Doqs. Never import this from browser code.
// It reads a library's public TypeScript declarations with the consumer's own compiler and writes ordinary Doqs
// Markdown below the content directory; Doqs, Analog and Pagefind then treat those pages like any other document.
import { relative, resolve } from 'node:path';
import { DoqApiError } from './api-reference/errors.mjs';
import { extractApi } from './api-reference/extract.mjs';
import { applyOutput, planOutput, resolveOutput } from './api-reference/output.mjs';
import { categoryIds, renderReference, symbolRoutes } from './api-reference/render.mjs';
import { loadTypeScript } from './api-reference/typescript.mjs';

export { DoqApiError };

const DEFAULTS = {
  contentDir: 'src/content/docs',
  out: 'src/content/docs/reference/generated',
  basePath: '/docs',
  group: 'API reference',
  title: 'API reference',
  orderStart: 1000,
};

function normalizeOptions(/** @type {any} */ options) {
  if (!options || typeof options !== 'object') throw new DoqApiError('doq-api: options are required.', 2);
  if (!options.entry || typeof options.entry !== 'string') throw new DoqApiError('doq-api: "entry" is required, for example "projects/lib/src/public-api.ts".', 2);
  const cwd = resolve(options.cwd ?? process.cwd());
  const merged = { ...DEFAULTS, ...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)), cwd };
  const list = (/** @type {unknown} */ value, /** @type {string} */ flag) => {
    if (value === undefined) return [];
    const items = Array.isArray(value) ? value : String(value).split(',');
    const clean = items.map((item) => String(item).trim()).filter(Boolean);
    const unknown = clean.filter((item) => !categoryIds.includes(item));
    if (unknown.length) throw new DoqApiError(`doq-api: unknown ${flag} category "${unknown[0]}". Use: ${categoryIds.join(', ')}.`, 2);
    return clean;
  };
  const include = list(options.include, '--include');
  const exclude = list(options.exclude, '--exclude');
  const basePath = `/${String(merged.basePath).split('/').filter(Boolean).join('/')}`;
  if (merged.sourceUrl !== undefined && !/^https?:\/\//.test(merged.sourceUrl)) {
    throw new DoqApiError('doq-api: --source-url must start with http:// or https:// and may contain {path} and {line}.', 2);
  }
  if (!Number.isInteger(merged.orderStart) || merged.orderStart < 0) throw new DoqApiError('doq-api: --order-start must be a non-negative integer.', 2);
  return { ...merged, include, exclude, basePath };
}

/**
 * Analyses the library and renders the pages in memory. Writes nothing.
 * @param {any} options
 */
export async function buildApiReference(options) {
  const settings = normalizeOptions(options);
  const { outDir, content } = await resolveOutput(settings);
  const ts = loadTypeScript(settings.cwd);
  const extracted = extractApi(ts, { cwd: settings.cwd, project: settings.project, entry: settings.entry });
  const symbols = extracted.symbols.filter(
    (symbol) => (!settings.include.length || settings.include.includes(symbol.category)) && !settings.exclude.includes(symbol.category),
  );
  if (!symbols.length) {
    throw new DoqApiError(`doq-api: ${settings.entry} has no public symbols to document${settings.include.length || settings.exclude.length ? ' after --include/--exclude' : ''}.`);
  }
  const below = relative(content, outDir).split('\\').join('/');
  const routePrefix = `${settings.basePath === '/' ? '' : settings.basePath}/${below}`;
  const files = renderReference(symbols, { routePrefix, group: settings.group, title: settings.title, sourceUrl: settings.sourceUrl, orderStart: settings.orderStart });
  const routes = symbolRoutes(symbols, routePrefix);
  const diagnostics = extracted.diagnostics;
  if (settings.strict) {
    for (const symbol of symbols) {
      if (!symbol.description) diagnostics.push({ severity: 'warning', symbol: symbol.name, message: 'Public symbol has no documentation comment.' });
    }
  }
  const problems = settings.strict ? diagnostics.filter((d) => d.severity === 'warning') : [];
  return { files, routes, outDir, routePrefix, symbols, diagnostics, problems, typescriptVersion: extracted.typescriptVersion };
}

/**
 * Generates the reference pages. Throws `DoqApiError` for invalid configuration, conflicts or `strict` violations.
 * @param {any} options
 */
export async function generateApiReference(options) {
  const built = await buildApiReference(options);
  const plan = await planOutput(built.outDir, built.files, built.routes);
  if (built.problems.length) throw new DoqApiError(strictMessage(built.problems));
  await applyOutput(built.outDir, built.files, plan);
  return { ...summary(built, plan), written: [...plan.added, ...plan.modified], removed: plan.removed };
}

/**
 * Compares the expected pages with the directory without changing anything.
 * @param {any} options
 */
export async function checkApiReference(options) {
  const built = await buildApiReference(options);
  const plan = await planOutput(built.outDir, built.files, built.routes);
  const upToDate = !plan.added.length && !plan.modified.length && !plan.removed.length && !plan.conflicts.length && !plan.manifestChanged;
  return { ...summary(built, plan), upToDate, added: plan.added, modified: plan.modified, removed: plan.removed, conflicts: plan.conflicts };
}

function summary(/** @type {any} */ built, /** @type {any} */ plan) {
  return {
    fileCount: built.files.size,
    symbolCount: built.symbols.length,
    outDir: built.outDir,
    routePrefix: built.routePrefix,
    diagnostics: built.diagnostics,
    problems: built.problems,
    typescriptVersion: built.typescriptVersion,
    conflicts: plan.conflicts,
  };
}

export function strictMessage(/** @type {{ symbol: string, message: string }[]} */ problems) {
  return ['doq-api: --strict found problems:', ...problems.map((p) => `  - ${p.symbol}: ${p.message}`)].join('\n');
}

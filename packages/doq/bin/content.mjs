// Node-only content authoring for Doqs (@doqs/analog/content, `doq content`). Never import this from browser code.
//
// Pages written in an authoring directory may use ::source{}, ::include{} and [[api:Name]]. This module resolves them
// into ordinary Markdown below the content directory, so Analog, Doqs and Pagefind see hand-written-looking pages.
// It reads project files as text only, executes nothing, fetches nothing and owns the files it writes (manifest).
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { composeBody } from './content/compose.mjs';
import { DoqContentError, EXIT_CODES, compare, formatDiagnostic } from './content/errors.mjs';
import { applyOutput, conflictMessage, planOutput, resolveOutDir, MANIFEST_NAME } from './content/output.mjs';
import { isInside, realRoots, toPosix } from './content/paths.mjs';
import { splitFrontmatter } from './content/markdown.mjs';

export { DoqContentError, EXIT_CODES, formatDiagnostic };

export const CONFIG_FILE = 'doq.content.json';
const TARGET_KEYS = new Set(['name', 'authoring', 'out', 'sourceRoots', 'api', 'sourceUrl', 'revision', 'sourcePathPrefix', 'sourceLines']);
const API_MANIFEST = '.doq-api.json';
const ROUTE = /^\/[A-Za-z0-9\-._~/]*$/;
const encodePath = (/** @type {string} */ path) => path.split('/').map(encodeURIComponent).join('/');

/** Loads and validates `doq.content.json` (or an explicit options object). Pure data: nothing in it is executed. */
export async function loadContentConfig(/** @type {{ cwd?: string, config?: string, targets?: any[] }} */ options = {}) {
  const cwd = await realpath(resolve(options.cwd ?? process.cwd())).catch(() => {
    throw new DoqContentError(`the project directory ${options.cwd} does not exist.`);
  });
  let raw;
  if (options.targets) raw = { targets: options.targets };
  else {
    const file = resolve(cwd, options.config ?? CONFIG_FILE);
    if (!isInside(cwd, file)) throw new DoqContentError('the configuration file must be inside the project.');
    const text = await readFile(file, 'utf8').catch(() => undefined);
    if (text === undefined) throw new DoqContentError(`${toPosix(relative(cwd, file))} was not found. Create it, for example:\n${EXAMPLE_CONFIG}`);
    try {
      raw = JSON.parse(text);
    } catch (error) {
      throw new DoqContentError(`${toPosix(relative(cwd, file))} is not valid JSON: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.targets) || !raw.targets.length) {
    throw new DoqContentError('the configuration needs a non-empty "targets" array (one per documentation version).');
  }
  const names = new Set();
  const targets = raw.targets.map((/** @type {any} */ target, /** @type {number} */ index) => {
    const label = `targets[${index}]`;
    if (!target || typeof target !== 'object') throw new DoqContentError(`${label} must be an object.`);
    for (const key of Object.keys(target)) if (!TARGET_KEYS.has(key)) throw new DoqContentError(`${label}: unknown option "${key}". Allowed: ${[...TARGET_KEYS].join(', ')}.`);
    const text = (/** @type {string} */ key, /** @type {boolean} */ required) => {
      const value = target[key];
      if (value === undefined && !required) return undefined;
      if (typeof value !== 'string' || !value.trim()) throw new DoqContentError(`${label}: "${key}" must be a non-empty string.`);
      return value;
    };
    const list = (/** @type {string} */ key) => {
      const value = target[key] ?? [];
      if (!Array.isArray(value) || value.some((/** @type {unknown} */ item) => typeof item !== 'string')) throw new DoqContentError(`${label}: "${key}" must be an array of directories.`);
      return /** @type {string[]} */ (value);
    };
    const name = text('name', false) ?? (raw.targets.length === 1 ? 'current' : undefined);
    if (!name || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) throw new DoqContentError(`${label}: "name" is required and may contain letters, digits, ".", "_" and "-".`);
    if (names.has(name)) throw new DoqContentError(`${label}: the target name "${name}" is used twice.`);
    names.add(name);
    const sourceUrl = text('sourceUrl', false);
    if (sourceUrl !== undefined) {
      if (!/^https?:\/\//.test(sourceUrl) || !sourceUrl.includes('{path}')) throw new DoqContentError(`${label}: "sourceUrl" must start with http(s):// and contain {path} (also {revision} and {lines}).`);
      if (sourceUrl.includes('{revision}') && !text('revision', false)) throw new DoqContentError(`${label}: "sourceUrl" uses {revision} but no "revision" is configured.`);
    }
    return {
      name,
      authoring: /** @type {string} */ (text('authoring', true)),
      out: /** @type {string} */ (text('out', true)),
      sourceRoots: list('sourceRoots'),
      api: list('api'),
      sourceUrl,
      revision: text('revision', false),
      sourcePathPrefix: text('sourcePathPrefix', false) ?? '',
      sourceLines: text('sourceLines', false) ?? '#L{start}-L{end}',
    };
  });
  const outs = new Set();
  for (const target of targets) {
    const key = resolve(cwd, target.out);
    if (outs.has(key)) throw new DoqContentError(`two targets write to "${target.out}"; each target needs its own "out" directory.`);
    outs.add(key);
  }
  return { cwd, targets };
}

const EXAMPLE_CONFIG = `{
  "targets": [
    { "name": "current", "authoring": "src/authoring/docs", "out": "src/content/docs", "sourceRoots": ["projects/lib/src"], "api": ["src/content/docs/reference/generated"] }
  ]
}`;

/** The symbol → routes index doq-api recorded in its manifest. Routes already contain the configured basePath. */
async function loadApiIndex(/** @type {string} */ cwd, /** @type {any} */ target) {
  /** @type {Map<string, string[]>} */
  const symbols = new Map();
  for (const dir of target.api) {
    const roots = await realRoots(cwd, [dir], `target "${target.name}": api directory`);
    const path = join(roots[0] ?? '', API_MANIFEST);
    const info = await lstat(path).catch(() => undefined);
    if (!info?.isFile()) throw new DoqContentError(`target "${target.name}": ${dir}/${API_MANIFEST} was not found. Run "doq-api generate" for this version first.`);
    let parsed;
    try {
      parsed = JSON.parse(await readFile(path, 'utf8'));
    } catch {
      throw new DoqContentError(`target "${target.name}": ${dir}/${API_MANIFEST} is not valid JSON.`);
    }
    if (parsed?.generator !== 'doq-api' || !parsed.symbols || typeof parsed.symbols !== 'object') {
      throw new DoqContentError(`target "${target.name}": ${dir}/${API_MANIFEST} has no symbol index. Regenerate it with doq-api from @doqs/analog 0.10 or later.`);
    }
    for (const [name, route] of Object.entries(parsed.symbols)) {
      if (typeof route !== 'string' || !ROUTE.test(route) || route.includes('//') || route.split('/').includes('..')) {
        throw new DoqContentError(`target "${target.name}": ${dir}/${API_MANIFEST} lists an unsafe route for "${name}".`);
      }
      const routes = symbols.get(name) ?? [];
      if (!routes.includes(route)) routes.push(route);
      symbols.set(name, routes.sort(compare));
    }
  }
  return { symbols, label: `the ${target.name} API reference` };
}

async function* walkPages(/** @type {string} */ root, /** @type {string} */ dir = root, /** @type {(entry: string) => void} */ onLink = () => {}) {
  const entries = (await readdir(dir)).sort(compare);
  for (const entry of entries) {
    if (entry.startsWith('_') || entry.startsWith('.')) continue; // fragments and dotfiles are never pages
    const path = join(dir, entry);
    const info = await lstat(path);
    if (info.isSymbolicLink()) { onLink(toPosix(relative(root, path))); continue; }
    if (info.isDirectory()) yield* walkPages(root, path, onLink);
    else if (info.isFile() && entry.endsWith('.md')) yield path;
  }
}

/**
 * Resolves every authored page of every target in memory. Writes nothing.
 * @param {{ cwd?: string, config?: string, targets?: any[] }} options
 */
export async function buildContent(options = {}) {
  const { cwd, targets } = await loadContentConfig(options);
  /** @type {Map<string, { symbols: Map<string, string[]>, label: string }>} */
  const indexes = new Map();
  for (const target of targets) if (target.api.length) indexes.set(target.name, await loadApiIndex(cwd, target));

  /** @type {import('./content/errors.mjs').DoqContentDiagnostic[]} */
  const diagnostics = [];
  const dependencies = new Set();
  const results = [];
  for (const target of targets) {
    const [authoringRoot] = await realRoots(cwd, [target.authoring], `target "${target.name}": authoring directory`);
    const sourceRoots = await realRoots(cwd, target.sourceRoots, `target "${target.name}": source root`);
    const outDir = await resolveOutDir(cwd, target.out);
    if (isInside(authoringRoot ?? '', outDir) || isInside(outDir, authoringRoot ?? '')) {
      throw new DoqContentError(`target "${target.name}": "authoring" and "out" must be separate directories (generated pages would otherwise be authored again).`);
    }
    for (const root of sourceRoots) {
      if (isInside(outDir, root)) throw new DoqContentError(`target "${target.name}": a source root cannot be inside the output directory.`);
    }
    const sourceLink = target.sourceUrl
      ? (/** @type {string} */ path, /** @type {{ start: number, end: number } | undefined} */ range) => {
          const lines = range ? target.sourceLines.replace('{start}', String(range.start)).replace('{end}', String(range.end)) : '';
          return target.sourceUrl
            .replace('{path}', () => encodePath(`${target.sourcePathPrefix}${path}`))
            .replace('{revision}', () => encodeURI(target.revision ?? ''))
            .replace('{lines}', () => lines);
        }
      : undefined;
    const files = new Map();
    const links = [];
    const context = {
      cwd,
      authoringRoot: authoringRoot ?? '',
      sourceRoots,
      sourceLabel: `the configured source roots (${target.sourceRoots.join(', ') || 'none configured'})`,
      apiIndex: (/** @type {string | undefined} */ name) => indexes.get(name ?? target.name),
      sourceLink,
      dependencies,
      report: (/** @type {any} */ d) => diagnostics.push(d),
    };
    if (!target.sourceRoots.length) context.sourceLabel = 'the source roots (none are configured: add "sourceRoots" to this target)';
    for await (const page of walkPages(authoringRoot ?? '', authoringRoot, (entry) => links.push(entry))) {
      const rel = toPosix(relative(authoringRoot ?? '', page));
      const shown = toPosix(relative(cwd, page));
      const raw = (await readFile(page, 'utf8')).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
      dependencies.add(page);
      const { frontmatter, body, bodyLine } = splitFrontmatter(raw);
      const resolved = await composeBody(body, shown, bodyLine, context, [], resolve(page, '..'));
      const header = frontmatter
        ? frontmatter.replace(/^---[ \t]*\n/, `---\n# Generated by doq content from ${toPosix(relative(cwd, page))}. Do not edit: change the authored page and run "doq content generate".\n`)
        : '';
      files.set(rel, `${header}${resolved}`.replace(/\n*$/, '\n'));
    }
    for (const link of links) {
      diagnostics.push({ kind: 'unsafe-path', file: `${target.authoring}/${link}`, line: 1, directive: 'page', reference: link, message: 'symbolic links in the authoring directory are not followed.', hint: 'Replace the link with a real file.' });
    }
    results.push({ name: target.name, outDir, authoringRoot, manifestPath: join(authoringRoot ?? '', MANIFEST_NAME), files });
  }
  diagnostics.sort((a, b) => compare(a.file, b.file) || a.line - b.line);
  return { cwd, results, diagnostics, dependencies: [...dependencies].sort(compare), targets };
}

function failOn(/** @type {import('./content/errors.mjs').DoqContentDiagnostic[]} */ diagnostics) {
  if (!diagnostics.length) return;
  const kinds = new Set(diagnostics.map((d) => d.kind));
  const message = [`doq content: ${diagnostics.length} authoring problem${diagnostics.length === 1 ? '' : 's'}:`, ...diagnostics.map(formatDiagnostic), 'Nothing was written.'].join('\n');
  throw Object.assign(new DoqContentError(message, kinds.has('unsafe-path') ? 'unsafe-path' : 'invalid-authoring'), { diagnostics });
}

/** Writes the resolved pages. Throws `DoqContentError` for authoring problems and conflicts; in that case nothing is written. */
export async function generateContent(/** @type {{ cwd?: string, config?: string, targets?: any[] }} */ options = {}) {
  const built = await buildContent(options);
  failOn(built.diagnostics);
  const plans = [];
  for (const result of built.results) plans.push({ result, plan: await planOutput(result.outDir, result.files, result.manifestPath) });
  const conflicts = plans.flatMap(({ plan }) => plan.conflicts);
  if (conflicts.length) throw new DoqContentError(conflictMessage(conflicts), 'conflict');
  for (const { result, plan } of plans) await applyOutput(result.outDir, result.files, plan, result.manifestPath);
  return {
    dependencies: built.dependencies,
    authoringRoots: built.results.map((r) => r.authoringRoot),
    targets: plans.map(({ result, plan }) => ({ name: result.name, outDir: result.outDir, pageCount: result.files.size, written: [...plan.added, ...plan.modified], removed: plan.removed })),
  };
}

/** Compares the resolved pages with the output directories and writes nothing. */
export async function checkContent(/** @type {{ cwd?: string, config?: string, targets?: any[] }} */ options = {}) {
  const built = await buildContent(options);
  failOn(built.diagnostics);
  const targets = [];
  for (const result of built.results) {
    const plan = await planOutput(result.outDir, result.files, result.manifestPath);
    targets.push({
      name: result.name, outDir: result.outDir, pageCount: result.files.size,
      added: plan.added, modified: plan.modified, removed: plan.removed, conflicts: plan.conflicts,
      upToDate: !plan.added.length && !plan.modified.length && !plan.removed.length && !plan.conflicts.length && !plan.manifestChanged,
    });
  }
  return { dependencies: built.dependencies, targets, upToDate: targets.every((t) => t.upToDate), conflicts: targets.flatMap((t) => t.conflicts) };
}

/**
 * Vite plugin: resolves the content when the build or dev server starts and again when an authored page, fragment,
 * source file or API index changes. It uses Vite's own watcher (no polling) and writes before Analog loads the pages.
 * @param {{ cwd?: string, config?: string, targets?: any[] }} [options]
 */
export function doqContent(options = {}) {
  let busy = Promise.resolve();
  let watched = new Set();
  let authoring = /** @type {string[]} */ ([]);
  const run = async () => {
    const result = await generateContent(options);
    watched = new Set(result.dependencies);
    authoring = result.authoringRoots;
    return result;
  };
  return {
    name: 'doq-content',
    enforce: 'pre',
    async buildStart() {
      await run();
      for (const file of watched) /** @type {any} */ (this).addWatchFile?.(file);
    },
    configureServer(/** @type {any} */ server) {
      const outputs = () => [MANIFEST_NAME];
      const onChange = (/** @type {string} */ file) => {
        const path = resolve(file);
        const authored = path.endsWith('.md') && authoring.some((root) => isInside(root, path));
        if ((!watched.has(path) && !authored) || outputs().some((name) => file.endsWith(name))) return;
        busy = busy.then(run).then(() => undefined, (error) => server.config.logger.error(error instanceof Error ? error.message : String(error)));
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

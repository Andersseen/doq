// Node-only static search indexer for Doq. Never import this from browser code.
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Pagefind only exports an ESM "import" condition, so find it by walking up from `cwd` like Node would. */
async function findPagefindEntry(cwd) {
  for (let directory = resolve(cwd); ; directory = dirname(directory)) {
    const manifestPath = resolve(directory, 'node_modules/pagefind/package.json');
    const manifest = await readFile(manifestPath, 'utf8').then(JSON.parse, () => undefined);
    const entry = manifest?.exports?.['.']?.import ?? manifest?.exports?.['.']?.default ?? manifest?.main;
    if (entry) return pathToFileURL(resolve(dirname(manifestPath), entry)).href;
    if (dirname(directory) === directory) return undefined;
  }
}

async function loadPagefind(cwd) {
  const entry = await findPagefindEntry(cwd);
  try {
    return await import(entry ?? 'pagefind');
  } catch (error) {
    if (entry || (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'MODULE_NOT_FOUND')) throw error;
    throw new Error('doq-search: the "pagefind" package is required to build the search index. Install it with "pnpm add -D pagefind".');
  }
}

async function hasDocumentationPage(siteDir) {
  for (const file of await readdir(siteDir, { recursive: true })) {
    if (!file.endsWith('.html')) continue;
    if ((await readFile(resolve(siteDir, file), 'utf8')).includes('data-pagefind-body')) return true;
  }
  return false;
}

/**
 * Builds the Pagefind index for a prerendered Doq site.
 * Run it after the static build; it indexes elements marked `data-pagefind-body` (Doq's article) and writes the
 * bundle to `<siteDir>/<outputDir>`, which is what `search.bundlePath` should point at.
 *
 * @param {{ siteDir: string, outputDir?: string, cwd?: string }} options
 * @returns {Promise<{ pageCount: number, outputPath: string }>}
 */
export async function indexDoqSearch(options) {
  const cwd = options.cwd ?? process.cwd();
  if (!options.siteDir) throw new Error('doq-search: siteDir is required, for example "dist/analog/public".');
  const siteDir = resolve(cwd, options.siteDir);
  const outputDir = options.outputDir ?? 'pagefind';
  const outputPath = resolve(siteDir, outputDir);
  const inside = relative(siteDir, outputPath);
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) throw new Error(`doq-search: outputDir "${outputDir}" must be a directory inside the site directory.`);
  const home = await stat(resolve(siteDir, 'index.html')).catch(() => undefined);
  if (!home?.isFile()) throw new Error(`doq-search: ${siteDir} has no index.html. Run the static build (prerender) first.`);

  // Without any data-pagefind-body element Pagefind would index every page of the host site, so refuse to start.
  if (!(await hasDocumentationPage(siteDir))) {
    throw new Error('doq-search: no documentation pages were found (no element with data-pagefind-body). Is search enabled in provideDoq() and the site prerendered?');
  }
  const pagefind = await loadPagefind(cwd);
  await rm(outputPath, { recursive: true, force: true });
  const { index, errors: createErrors } = await pagefind.createIndex({});
  if (!index) throw new Error(`doq-search: ${createErrors.join('; ')}`);
  try {
    const added = await index.addDirectory({ path: siteDir, glob: '**/*.html' });
    if (added.errors.length) throw new Error(`doq-search: ${added.errors.join('; ')}`);
    const written = await index.writeFiles({ outputPath });
    if (written.errors.length) throw new Error(`doq-search: ${written.errors.join('; ')}`);
    // Pagefind skips pages without a data-pagefind-body element once any page has one, so count what it kept.
    const entry = JSON.parse(await readFile(resolve(outputPath, 'pagefind-entry.json'), 'utf8'));
    const pageCount = Object.values(entry.languages ?? {}).reduce((total, language) => total + (language.page_count ?? 0), 0);
    if (!pageCount) {
      await rm(outputPath, { recursive: true, force: true });
      throw new Error('doq-search: Pagefind kept no pages. Check the build output for indexing errors.');
    }
    // Doq ships its own UI, so Pagefind's default widgets would only be dead weight in the deployed bundle.
    for (const file of await readdir(outputPath)) {
      if (/^pagefind-(component-ui|modular-ui|ui|highlight)\./.test(file)) await rm(resolve(outputPath, file));
    }
    return { pageCount, outputPath };
  } finally {
    await index.deleteIndex();
    await pagefind.close();
  }
}

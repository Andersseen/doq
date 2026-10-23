// Facts about a consumer project, gathered by reading files. Shared by `doq init` and `doq doctor`.
import { join } from 'node:path';
import { exists, mentions, readText, rel, stripComments, walk } from './source.mjs';

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'];
export const STYLES_IMPORT = '@doqs/analog/styles.css';

/** Reads `package.json` below `root`; `undefined` when absent, `null` when it is not valid JSON. */
export async function readPackage(root) {
  const text = await readText(join(root, 'package.json'));
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Reads the installed package manifest from `<root>/node_modules` (the version the build will actually use). */
export async function readInstalled(root, name) {
  const text = await readText(join(root, 'node_modules', ...name.split('/'), 'package.json'));
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const literal = (code, key) => new RegExp(`(?<![\\w$])${key}\\s*:\\s*(['"\`])([^'"\`\\n]*)\\1`).exec(code)?.[2];

/**
 * Extracts the literal values of a `doq.paths.ts` module without executing it. Anything computed (spread, variable,
 * template with substitution) is reported through `computed` instead of being guessed.
 */
export function parsePathsModule(source) {
  const code = stripComments(source);
  const directories = [...code.matchAll(/(?<![\w$])contentDirectory\s*:\s*(['"`])([^'"`\n]*)\1/g)].map(match => match[2]);
  const rawDirectoryKeys = [...code.matchAll(/(?<![\w$])contentDirectory\s*:/g)].length;
  const basePathKey = /(?<![\w$])basePath\s*:/.test(code);
  const basePath = literal(code, 'basePath');
  const archiveIds = [...code.matchAll(/(?<![\w$])id\s*:\s*(['"`])([^'"`\n]*)\1/g)].map(match => match[2]);
  return {
    contentDirectory: directories[0],
    basePath,
    archiveDirectories: directories.slice(1),
    archiveIds: archiveIds.slice(1),
    versioning: mentions(code, 'versioning'),
    computed: directories.length !== rawDirectoryKeys || (basePathKey && basePath === undefined) || rawDirectoryKeys === 0,
  };
}

/**
 * Locate and read the pieces of a project that Doqs integrates with.
 * @param {string} root absolute project directory
 * @param {{ srcDir?: string, pathsFile?: string, viteConfig?: string }} [options]
 */
export async function inspectProject(root, options = {}) {
  const srcDir = options.srcDir ?? 'src';
  const srcRoot = join(root, srcDir);

  let viteConfig;
  for (const name of options.viteConfig ? [options.viteConfig] : VITE_CONFIGS) {
    const text = await readText(join(root, name));
    if (text !== undefined) {
      viteConfig = { path: name, code: stripComments(text) };
      break;
    }
  }

  const sourceFiles = await walk(srcRoot, name => /\.(ts|mts)$/.test(name) && !/\.(spec|test)\.ts$/.test(name) && !name.endsWith('.d.ts'));
  const sources = [];
  for (const file of sourceFiles) {
    if (file.startsWith(join(srcRoot, 'content') + '/')) continue;
    const text = await readText(file);
    if (text !== undefined) sources.push({ path: rel(root, file), code: stripComments(text) });
  }
  const where = identifier => sources.filter(source => mentions(source.code, identifier)).map(source => source.path);

  const pathsPath = options.pathsFile ?? `${srcDir}/doq.paths.ts`;
  const pathsText = await readText(join(root, pathsPath));
  const paths = pathsText === undefined ? undefined : { path: pathsPath, ...parsePathsModule(pathsText) };

  let stylesheet;
  for (const file of await walk(srcRoot, name => /\.(css|scss|sass|less)$/.test(name), 500)) {
    if (file.startsWith(join(srcRoot, 'content') + '/')) continue;
    if ((await readText(file))?.includes('@doqs/analog/styles')) {
      stylesheet = rel(root, file);
      break;
    }
  }
  if (!stylesheet) {
    const angularJson = await readText(join(root, 'angular.json'));
    if (angularJson?.includes('@doqs/analog')) stylesheet = 'angular.json';
  }

  return { root, srcDir, viteConfig, sources, where, paths, stylesheet, hasSrc: await exists(srcRoot) };
}

/** Joins a mount path and a slug: ("/docs", "a") → "/docs/a"; ("/", "a") → "/a". */
export const publicPath = (basePath, slug) => `/${[...basePath.split('/').filter(Boolean), slug].filter(Boolean).join('/')}`;

// Node-only. Resolves the TypeScript compiler from the consumer project, never from Doqs.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DoqApiError } from './errors.mjs';

/** Walks up from `cwd` through `node_modules` like Node's resolver, but ignores global folders and NODE_PATH. */
function findTypeScript(/** @type {string} */ cwd) {
  for (let directory = resolve(cwd); ; directory = dirname(directory)) {
    const manifest = resolve(directory, 'node_modules/typescript/package.json');
    if (existsSync(manifest)) return manifest;
    if (dirname(directory) === directory) return undefined;
  }
}

/**
 * Loads the consumer's TypeScript (so a pnpm-installed `typescript` that the project declares is found, and Doqs
 * itself never bundles a second compiler).
 *
 * @param {string} cwd
 */
export function loadTypeScript(cwd) {
  const manifest = findTypeScript(cwd);
  if (!manifest) {
    throw new DoqApiError(
      `doq-api: the "typescript" package could not be resolved from ${cwd}. Install the compiler your project builds with: pnpm add -D typescript`,
      2,
    );
  }
  const ts = createRequire(manifest)(dirname(manifest));
  const major = Number.parseInt(String(ts.version).split('.')[0] ?? '', 10);
  if (!Number.isFinite(major) || major < 5) {
    throw new DoqApiError(`doq-api: TypeScript ${ts.version} is not supported; TypeScript 5.0 or later is required.`, 2);
  }
  return ts;
}

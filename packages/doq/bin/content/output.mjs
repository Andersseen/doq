// Node-only. Owns every file `doq content` may create, change or delete, using the same rules as doq-api:
// a manifest of what was written, with hashes, so edits and strangers are detected instead of overwritten.
// The manifest lives in the authoring directory, never in `out`: Analog's prerender walks every file below the content
// directory, so a manifest there would be treated as a document.
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { DoqContentError, compare } from './errors.mjs';
import { isInside } from './paths.mjs';

export const MANIFEST_NAME = '.doq-content.json';
const FILE_PATH = /^(?:[A-Za-z0-9_][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_][A-Za-z0-9_.-]*\.md$/;
export const sha256 = (/** @type {string} */ text) => createHash('sha256').update(text).digest('hex');

export function buildManifest(/** @type {Map<string, string>} */ files) {
  const entries = Object.fromEntries([...files].sort(([a], [b]) => compare(a, b)).map(([name, content]) => [name, sha256(content)]));
  return `${JSON.stringify({ generator: 'doq content', files: entries }, null, 2)}\n`;
}

/** The output directory must be a strict sub-path of the project and must not pass through a link that leaves it. */
export async function resolveOutDir(/** @type {string} */ cwd, /** @type {string} */ out) {
  const root = resolve(cwd);
  const outDir = resolve(root, out);
  const path = relative(root, outDir);
  if (!path || path.startsWith('..') || isAbsolute(path)) throw new DoqContentError(`the output directory "${out}" must be a directory inside the project.`);
  const forbidden = path.split(sep).find((part) => part === 'node_modules' || part === '.git');
  if (forbidden) throw new DoqContentError(`refusing to write inside "${forbidden}".`);
  const realRoot = await realpath(root);
  let existing = outDir;
  for (;;) {
    if (await lstat(existing).catch(() => undefined)) break;
    existing = dirname(existing);
  }
  if (!isInside(realRoot, await realpath(existing))) throw new DoqContentError(`"${out}" resolves outside the project through a symbolic link.`);
  const stat = await lstat(outDir).catch(() => undefined);
  if (stat && !stat.isDirectory()) throw new DoqContentError(`"${out}" exists and is not a directory.`);
  return outDir;
}

async function readManifest(/** @type {string} */ path) {
  const stat = await lstat(path).catch(() => undefined);
  if (!stat) return {};
  if (!stat.isFile()) throw new DoqContentError(`${MANIFEST_NAME} is not a regular file, so nothing was changed.`, 'conflict');
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new DoqContentError(`${MANIFEST_NAME} is not valid JSON. It records which files the generator owns, so nothing was changed. Restore it or move the directory aside.`, 'conflict');
  }
  const files = parsed?.files;
  const valid = parsed?.generator === 'doq content' && files && typeof files === 'object' &&
    Object.entries(files).every(([name, hash]) => FILE_PATH.test(name) && typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash));
  if (!valid) throw new DoqContentError(`${MANIFEST_NAME} does not look like a doq content manifest, so nothing was changed.`, 'conflict');
  return /** @type {Record<string, string>} */ (files);
}

async function readIfFile(/** @type {string} */ path) {
  const stat = await lstat(path).catch(() => undefined);
  if (!stat) return undefined;
  if (!stat.isFile()) throw new DoqContentError(`${path} exists and is not a regular file; refusing to touch it.`, 'conflict');
  // Git on Windows (core.autocrlf) checks text files out with CRLF; a generated page that differs only by line endings is unchanged.
  return (await readFile(path, 'utf8')).replace(/\r\n?/g, '\n');
}

/** @returns {Promise<{ added: string[], modified: string[], removed: string[], conflicts: string[], manifestChanged: boolean, expectedManifest: string }>} */
export async function planOutput(/** @type {string} */ outDir, /** @type {Map<string, string>} */ files, /** @type {string} */ manifestPath) {
  for (const name of files.keys()) if (!FILE_PATH.test(name)) throw new DoqContentError(`unsafe generated file name "${name}".`, 'invalid-authoring');
  const owned = await readManifest(manifestPath);
  const added = [];
  const modified = [];
  const removed = [];
  const conflicts = [];
  for (const [name, expected] of [...files].sort(([a], [b]) => compare(a, b))) {
    const current = await readIfFile(join(outDir, name));
    if (current === undefined) { added.push(name); continue; }
    if (current === expected) { if (!(name in owned)) modified.push(name); continue; }
    if (name in owned && sha256(current) === owned[name]) modified.push(name);
    else if (name in owned) conflicts.push(`${name}: was edited after it was generated`);
    else conflicts.push(`${name}: already exists and was not generated by doq content`);
  }
  for (const name of Object.keys(owned).sort(compare)) {
    if (files.has(name)) continue;
    const current = await readIfFile(join(outDir, name));
    if (current === undefined) continue;
    if (sha256(current) === owned[name]) removed.push(name);
    else conflicts.push(`${name}: is no longer generated but was edited after it was generated`);
  }
  const expectedManifest = buildManifest(files);
  const manifestChanged = (await readIfFile(manifestPath)) !== expectedManifest;
  return { added, modified, removed, conflicts, manifestChanged, expectedManifest };
}

export function conflictMessage(/** @type {string[]} */ conflicts) {
  return ['doq content: refusing to overwrite files the generator does not own:', ...conflicts.map((c) => `  - ${c}`), 'Nothing was changed. Move or delete those files, or choose another "out" directory.'].join('\n');
}

export async function applyOutput(/** @type {string} */ outDir, /** @type {Map<string, string>} */ files, /** @type {Awaited<ReturnType<typeof planOutput>>} */ plan, /** @type {string} */ manifestPath) {
  if (plan.conflicts.length) throw new DoqContentError(conflictMessage(plan.conflicts), 'conflict');
  await mkdir(outDir, { recursive: true });
  for (const name of [...plan.added, ...plan.modified]) {
    const content = files.get(name);
    if (content === undefined) continue;
    const target = join(outDir, name);
    await mkdir(dirname(target), { recursive: true });
    const temporary = `${target}.tmp-${process.pid}`;
    await writeFile(temporary, content);
    await rename(temporary, target);
  }
  for (const name of plan.removed) {
    await rm(join(outDir, name), { force: true });
    // Remove directories this generator emptied, never one that still holds something.
    for (let dir = dirname(join(outDir, name)); dir !== outDir && isInside(outDir, dir); dir = dirname(dir)) {
      if ((await readdir(dir).catch(() => ['x'])).length) break;
      await rmdir(dir).catch(() => undefined);
    }
  }
  if (plan.manifestChanged) await writeFile(manifestPath, plan.expectedManifest);
}

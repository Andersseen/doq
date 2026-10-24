// Node-only. Owns every file the generator may create, change or delete.
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { DoqApiError, compare } from './errors.mjs';

export const MANIFEST_NAME = '.doq-api.json';
const FILE_NAME = /^[a-z0-9][a-z0-9-]*\.md$/;

const sha256 = (/** @type {string} */ text) => createHash('sha256').update(text).digest('hex');

/** The manifest records which files the generator owns and what it wrote, so edits and strangers are detectable. */
export function buildManifest(/** @type {Map<string, string>} */ files, /** @type {Record<string, string>} */ symbols = {}) {
  const entries = Object.fromEntries([...files].sort(([a], [b]) => compare(a, b)).map(([name, content]) => [name, sha256(content)]));
  return `${JSON.stringify({ generator: 'doq-api', files: entries, symbols }, null, 2)}\n`;
}

/**
 * Validates `out` against the project and content directory and returns absolute paths.
 * The output must be a directory strictly below the content directory, which must itself be inside the project.
 */
export async function resolveOutput(/** @type {{ cwd: string, out: string, contentDir: string }} */ { cwd, out, contentDir }) {
  const root = resolve(cwd);
  const content = resolve(root, contentDir);
  const outDir = resolve(root, out);
  const inside = (/** @type {string} */ parent, /** @type {string} */ child) => {
    const path = relative(parent, child);
    return path !== '' && !path.startsWith('..') && !isAbsolute(path);
  };
  if (!inside(root, content)) throw new DoqApiError(`doq-api: the content directory ${contentDir} must be inside the project (${root}).`, 2);
  if (!inside(content, outDir)) {
    throw new DoqApiError(
      `doq-api: the output directory ${out} must be a sub-directory of the content directory ${contentDir}, so generated pages never replace hand-written ones. Example: --out ${contentDir}/reference/api`,
      2,
    );
  }
  const forbidden = relative(root, outDir).split(sep).find((part) => part === 'node_modules' || part === '.git');
  if (forbidden) throw new DoqApiError(`doq-api: refusing to write inside "${forbidden}".`, 2);

  // Never follow a link out of the project: the deepest existing ancestor must resolve inside the real project root.
  const realRoot = await realpath(root);
  let existing = outDir;
  for (;;) {
    const stat = await lstat(existing).catch(() => undefined);
    if (stat) break;
    existing = dirname(existing);
  }
  const realExisting = await realpath(existing);
  if (realExisting !== realRoot && !inside(realRoot, realExisting)) {
    throw new DoqApiError(`doq-api: ${out} resolves outside the project through a symbolic link.`, 2);
  }
  const stat = await lstat(outDir).catch(() => undefined);
  if (stat && !stat.isDirectory()) throw new DoqApiError(`doq-api: ${out} exists and is not a directory.`, 2);
  return { root, content, outDir };
}

async function readManifest(/** @type {string} */ outDir) {
  const path = join(outDir, MANIFEST_NAME);
  const stat = await lstat(path).catch(() => undefined);
  if (!stat) return undefined;
  if (!stat.isFile()) throw new DoqApiError(`doq-api: ${path} is not a regular file.`);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new DoqApiError(`doq-api: ${path} is not valid JSON. It records which files the generator owns, so nothing was changed. Restore it or move the directory aside.`);
  }
  const files = parsed?.files;
  const valid =
    parsed?.generator === 'doq-api' &&
    files &&
    typeof files === 'object' &&
    Object.entries(files).every(([name, hash]) => FILE_NAME.test(name) && typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash));
  if (!valid) throw new DoqApiError(`doq-api: ${path} does not look like a doq-api manifest, so nothing was changed.`);
  return /** @type {Record<string, string>} */ (files);
}

async function readIfFile(/** @type {string} */ path) {
  const stat = await lstat(path).catch(() => undefined);
  if (!stat) return undefined;
  if (!stat.isFile()) throw new DoqApiError(`doq-api: ${path} exists and is not a regular file; refusing to touch it.`);
  return readFile(path, 'utf8');
}

/**
 * Compares the expected output with the directory and decides what generation would do.
 * @returns {Promise<{ added: string[], modified: string[], removed: string[], conflicts: string[], manifestChanged: boolean, expectedManifest: string }>}
 */
export async function planOutput(/** @type {string} */ outDir, /** @type {Map<string, string>} */ files, /** @type {Record<string, string>} */ symbols = {}) {
  for (const name of files.keys()) if (!FILE_NAME.test(name)) throw new DoqApiError(`doq-api: internal error, unsafe generated file name "${name}".`);
  const owned = (await readManifest(outDir)) ?? {};
  const added = [];
  const modified = [];
  const removed = [];
  const conflicts = [];

  for (const [name, expected] of [...files].sort(([a], [b]) => compare(a, b))) {
    const current = await readIfFile(join(outDir, name));
    if (current === undefined) {
      added.push(name);
      continue;
    }
    if (current === expected) {
      if (!(name in owned)) modified.push(name); // identical but unrecorded: adopt it into the manifest
      continue;
    }
    if (name in owned && sha256(current) === owned[name]) modified.push(name);
    else if (name in owned) conflicts.push(`${name}: was edited after it was generated`);
    else conflicts.push(`${name}: already exists and was not generated by doq-api`);
  }
  for (const name of Object.keys(owned).sort(compare)) {
    if (files.has(name)) continue;
    const current = await readIfFile(join(outDir, name));
    if (current === undefined) continue;
    if (sha256(current) === owned[name]) removed.push(name);
    else conflicts.push(`${name}: is no longer generated but was edited after it was generated`);
  }

  const expectedManifest = buildManifest(files, symbols);
  const currentManifest = await readIfFile(join(outDir, MANIFEST_NAME));
  return { added, modified, removed, conflicts, manifestChanged: currentManifest !== expectedManifest, expectedManifest };
}

/** Applies a plan produced by `planOutput`. Refuses to start when the plan has conflicts. */
export async function applyOutput(
  /** @type {string} */ outDir,
  /** @type {Map<string, string>} */ files,
  /** @type {Awaited<ReturnType<typeof planOutput>>} */ plan,
) {
  if (plan.conflicts.length) throw new DoqApiError(conflictMessage(plan.conflicts));
  await mkdir(outDir, { recursive: true });
  for (const name of [...plan.added, ...plan.modified]) {
    const content = files.get(name);
    if (content === undefined) continue;
    const target = join(outDir, name);
    const temporary = `${target}.tmp-${process.pid}`;
    await writeFile(temporary, content);
    await rename(temporary, target);
  }
  for (const name of plan.removed) await rm(join(outDir, name), { force: true });
  if (plan.manifestChanged) await writeFile(join(outDir, MANIFEST_NAME), plan.expectedManifest);
}

export function conflictMessage(/** @type {string[]} */ conflicts) {
  return [
    'doq-api: refusing to overwrite files the generator does not own:',
    ...conflicts.map((c) => `  - ${c}`),
    'Nothing was changed. Move or delete those files, or choose another --out directory.',
  ].join('\n');
}

/** Lists the directory entries the generator did not create (for the summary only). */
export async function unmanagedFiles(/** @type {string} */ outDir, /** @type {Map<string, string>} */ files) {
  const entries = await readdir(outDir).catch(() => /** @type {string[]} */ ([]));
  return entries.filter((name) => name !== MANIFEST_NAME && !files.has(name)).sort(compare);
}

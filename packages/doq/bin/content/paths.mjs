// Node-only. The only place that decides which project files an authoring directive may read.
import { lstat, readFile, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { DoqContentError } from './errors.mjs';

/** Text formats a documentation example may show. Anything else is refused, which also keeps binaries out. */
export const LANGUAGES = Object.freeze({
  '.ts': 'ts', '.mts': 'ts', '.cts': 'ts', '.tsx': 'tsx', '.js': 'js', '.mjs': 'js', '.cjs': 'js', '.jsx': 'jsx',
  '.html': 'html', '.css': 'css', '.scss': 'scss', '.json': 'json', '.jsonc': 'jsonc', '.sh': 'bash', '.bash': 'bash',
  '.zsh': 'bash', '.yml': 'yaml', '.yaml': 'yaml',
});

export const MAX_SOURCE_BYTES = 256 * 1024;
export const MAX_FRAGMENT_BYTES = 512 * 1024;

const DENIED_DIRECTORIES = new Set(['node_modules', '.git', '.svn', '.hg', 'dist', '.angular', '.nx', '.turbo', '.vite', '.ssh', '.aws', '.gnupg']);
const DENIED_NAME = [
  /^\.env(\..*)?$/i, /^\.npmrc$/i, /^\.netrc$/i, /^\.pypirc$/i, /^\.htpasswd$/i, /^id_(rsa|dsa|ecdsa|ed25519)/i,
  /\.(pem|key|p12|pfx|jks|keystore|crt|cer)$/i,
  /(^|[._-])(secrets?|credentials?|passwords?|passwd|private[._-]?keys?)([._-]|$)/i,
];

/** @param {string} parent @param {string} child */
export function isInside(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

/** Project-relative POSIX form, for messages and manifests (never an absolute path). */
export const toPosix = (/** @type {string} */ path) => path.split(sep).join('/');

/** Why a project-relative path may never be read, or undefined when its name is acceptable. */
export function deniedReason(/** @type {string} */ path) {
  const parts = toPosix(path).split('/');
  const directory = parts.slice(0, -1).find((part) => DENIED_DIRECTORIES.has(part));
  if (directory) return `it is inside "${directory}", which is never included`;
  const name = parts.at(-1) ?? '';
  if (DENIED_NAME.some((pattern) => pattern.test(name))) return `"${name}" looks like an environment, credential or key file`;
  return undefined;
}

/** Real paths of the configured roots. A root that does not exist is a configuration error, not an empty set. */
export async function realRoots(/** @type {string} */ cwd, /** @type {string[]} */ roots, /** @type {string} */ label) {
  const result = [];
  for (const root of roots) {
    if (typeof root !== 'string' || !root || isAbsolute(root)) {
      throw new DoqContentError(`${label} "${String(root)}" must be a relative directory inside the project.`);
    }
    const absolute = resolve(cwd, root);
    if (!isInside(cwd, absolute) || absolute === cwd) throw new DoqContentError(`${label} "${root}" must be a directory inside the project, not the project itself.`);
    const real = await realpath(absolute).catch(() => undefined);
    if (!real) throw new DoqContentError(`${label} "${root}" does not exist.`);
    if (!(await stat(real)).isDirectory()) throw new DoqContentError(`${label} "${root}" is not a directory.`);
    if (!isInside(await realpath(cwd), real)) throw new DoqContentError(`${label} "${root}" resolves outside the project through a symbolic link.`);
    result.push(real);
  }
  return result;
}

/**
 * Resolves `file` (relative to `base`) to a readable text file whose real path lies inside one of `roots`.
 * Every refusal is a `DoqContentError` whose kind is `unsafe-path` or `missing-source`; nothing outside the roots is opened.
 * @param {{ base: string, file: string, roots: string[], extensions: readonly string[] | undefined, maxBytes: number, rootLabel: string }} options
 * @returns {Promise<{ real: string, text: string }>}
 */
export async function readSafeText({ base, file, roots, extensions, maxBytes, rootLabel }) {
  const unsafe = (/** @type {string} */ message) => new DoqContentError(message, 'unsafe-path');
  if (typeof file !== 'string' || !file.trim()) throw unsafe('the file path is empty.');
  if (file.includes('\0') || /^[a-z][a-z0-9+.-]*:/i.test(file) || file.startsWith('//')) throw unsafe(`"${file}" is not a local project path (URLs and special schemes are never fetched).`);
  if (isAbsolute(file) || /^[a-z]:[\\/]/i.test(file)) throw unsafe(`"${file}" is absolute; use a path relative to ${rootLabel}.`);
  const absolute = resolve(base, file);
  const display = toPosix(relative(base, absolute));
  const denied = deniedReason(display);
  if (denied) throw unsafe(`"${file}" is refused: ${denied}.`);
  if (!roots.some((root) => isInside(root, absolute))) throw unsafe(`"${file}" is outside ${rootLabel}.`);
  const extension = extname(absolute).toLowerCase();
  if (extensions && !extensions.includes(extension)) {
    throw unsafe(`"${file}" has an unsupported type "${extension || basename(absolute)}". Allowed: ${extensions.join(', ')}.`);
  }
  const first = await lstat(absolute).catch(() => undefined);
  if (!first) {
    throw new DoqContentError(`"${file}" does not exist.`, 'missing-source');
  }
  const real = await realpath(absolute);
  if (!roots.some((root) => isInside(root, real))) throw unsafe(`"${file}" is outside ${rootLabel}${first.isSymbolicLink() ? ' (it is a symbolic link that leaves the allowed roots)' : ''}.`);
  const realDenied = deniedReason(basename(real));
  if (realDenied) throw unsafe(`"${file}" is refused: ${realDenied}.`);
  const info = await stat(real);
  if (info.isDirectory()) throw unsafe(`"${file}" is a directory; name a file.`);
  if (!info.isFile()) throw unsafe(`"${file}" is not a regular file.`);
  if (info.size > maxBytes) throw unsafe(`"${file}" is ${info.size} bytes; the limit is ${maxBytes}.`);
  const buffer = await readFile(real);
  if (buffer.includes(0)) throw unsafe(`"${file}" looks like a binary file.`);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw unsafe(`"${file}" is not valid UTF-8 text.`);
  }
  return { real, text: text.replace(/^﻿/, '').replace(/\r\n?/g, '\n') };
}

// Static, read-only inspection of project files. Nothing here executes project code.
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

/** Removes `//` and block comments while leaving string and template literals untouched. */
export function stripComments(source) {
  let out = '';
  for (let i = 0; i < source.length; ) {
    const char = source[i];
    const next = source[i + 1];
    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i++;
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
    } else if (char === '"' || char === "'" || char === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== char) j += source[j] === '\\' ? 2 : 1;
      out += source.slice(i, j + 1);
      i = j + 1;
    } else {
      out += char;
      i++;
    }
  }
  return out;
}

/** True when `identifier` appears as a word in code (comments excluded). */
export const mentions = (code, identifier) => new RegExp(`(?<![\\w$])${identifier.replace(/[$]/g, '\\$')}(?![\\w$])`).test(code);

export async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Resolves `value` below `root`; throws when it is absolute, escapes the root or leaves it through a symlink. */
export async function resolveInside(root, value, label) {
  if (typeof value !== 'string' || !value.trim() || isAbsolute(value) || /^[a-zA-Z]:/.test(value) || value.includes('\0')) {
    throw new CliError(`${label} must be a relative path inside the project, got ${JSON.stringify(value)}.`);
  }
  const target = resolve(root, value);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new CliError(`${label} ${JSON.stringify(value)} resolves outside the project directory.`);
  }
  // The nearest existing ancestor must still be inside the real project root (no symlink escape).
  let probe = target;
  while (!(await exists(probe))) {
    const parent = resolve(probe, '..');
    if (parent === probe) break;
    probe = parent;
  }
  const realRoot = await realpath(root);
  const realProbe = await realpath(probe);
  const realRel = relative(realRoot, realProbe);
  if (realRel === '..' || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) {
    throw new CliError(`${label} ${JSON.stringify(value)} resolves outside the project directory through a symbolic link.`);
  }
  return target;
}

/** A failure with a message meant for the person running the command, with its exit code. */
export class CliError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.exitCode = exitCode;
  }
}

const SKIP = new Set(['node_modules', 'dist', '.git', '.angular', '.nx', '.turbo', 'coverage', 'out-tsc']);

/** Recursively lists files below `dir` whose names satisfy `accept`, in a deterministic order. */
export async function walk(dir, accept, limit = 5000, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    if (found.length >= limit) break;
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) await walk(join(dir, entry.name), accept, limit, found);
    } else if (entry.isFile() && accept(entry.name)) {
      found.push(join(dir, entry.name));
    }
  }
  return found;
}

const posix = path => path.split(sep).join('/');
export const rel = (root, path) => posix(relative(root, path)) || '.';

/** Splits a leading `---` frontmatter block. `state` is "none", "unclosed" or "ok". */
export function parseFrontmatter(text) {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n') && normalized !== '---') return { state: 'none', attributes: {} };
  const end = normalized.indexOf('\n---', 3);
  if (end < 0) return { state: 'unclosed', attributes: {} };
  const attributes = {};
  for (const line of normalized.slice(4, end).split('\n')) {
    const match = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    attributes[match[1]] = value;
  }
  return { state: 'ok', attributes };
}

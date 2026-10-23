// Node-only. Resolves `::source{}`, `::include{}` and `[[api:Name]]` in one authored page into ordinary Markdown.
// Source text is inserted after scanning and is never scanned itself, so nothing in a snippet can become a directive.
import { dirname, extname, relative } from 'node:path';
import { LANGUAGES, MAX_FRAGMENT_BYTES, MAX_SOURCE_BYTES, readSafeText, toPosix } from './paths.mjs';
import { escapeLabel, fenceFor, fenceTracker, outsideInlineCode, parseAttributes, splitFrontmatter } from './markdown.mjs';
import { extractSnippet } from './regions.mjs';

export const MAX_INCLUDE_DEPTH = 5;
const LEAF = /^ {0,3}::(source|include)(\{.*\})?\s*$/;
const API_LINK = /\[\[api:([^\]]*)\]\]/g;
const API_BODY = /^([A-Za-z_$][\w$]*)(?:@([A-Za-z0-9][A-Za-z0-9._-]*))?(?:\|([^\]|\n]{1,120}))?$/;
const LANG = /^[a-z0-9][a-z0-9+#-]{0,19}$/i;
const SOURCE_ATTRIBUTES = new Set(['file', 'region', 'lines', 'lang', 'title', 'link']);

/**
 * @typedef {{
 *   cwd: string,                    real project directory
 *   authoringRoot: string,          real authoring directory (pages and fragments)
 *   sourceRoots: string[],          real directories source files may come from
 *   sourceLabel: string,
 *   apiIndex: (target: string | undefined) => { symbols: Map<string, string[]>, label: string } | undefined,
 *   sourceLink: ((path: string, range: { start: number, end: number } | undefined) => string | undefined) | undefined,
 *   dependencies: Set<string>,      real files read, for watchers
 *   report: (d: { kind: string, line: number, file: string, directive: string, reference: string, message: string, hint?: string }) => void,
 * }} ComposeContext
 */

/** Resolves one authored page body. `file` is the project-relative display name of the page. */
export async function composeBody(/** @type {string} */ body, /** @type {string} */ file, /** @type {number} */ firstLine, /** @type {ComposeContext} */ context, /** @type {string[]} */ stack, /** @type {string} */ directory) {
  const out = [];
  let padNext = false;
  const fence = fenceTracker();
  const lines = body.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const number = firstLine + index;
    if (padNext && line.trim()) out.push('');
    padNext = false;
    if (fence.next(line)) { out.push(line); continue; }
    const leaf = LEAF.exec(line);
    if (leaf) {
      const name = leaf[1] ?? '';
      const problem = (/** @type {string} */ kind, /** @type {string} */ reference, /** @type {string} */ message, /** @type {string | undefined} */ hint) =>
        context.report({ kind, line: number, file, directive: `::${name}`, reference, message, hint });
      const parsed = leaf[2] ? parseAttributes(leaf[2].slice(1, -1)) : { ok: false, message: `write attributes in braces: ::${name}{file="…"}.` };
      if (!parsed.ok) { problem('invalid-authoring', '', parsed.message, `Example: ::${name}{file="path"}`); out.push(`<!-- doq content: ${name} not resolved -->`); continue; }
      const resolved = name === 'source'
        ? await resolveSource(parsed.attributes, context, problem)
        : await resolveInclude(parsed.attributes, context, problem, stack, directory);
      // Inserted blocks are separated from the neighbouring paragraphs so Markdown never merges them.
      if (out.at(-1)?.trim()) out.push('');
      out.push(...(resolved ?? [`<!-- doq content: ${name} not resolved -->`]));
      padNext = true;
      continue;
    }
    if (/^ {0,3}::(source|include)\b/.test(line)) {
      context.report({ kind: 'invalid-authoring', line: number, file, directive: '::directive', reference: line.trim().slice(0, 40), message: 'a directive must be ::source{…} or ::include{…} on its own line.' });
      out.push(line);
      continue;
    }
    out.push(outsideInlineCode(line, (text) => text.replace(API_LINK, (whole, inner) => apiLink(whole, String(inner), number, file, context))));
  }
  return out.join('\n');
}

/** @returns {string} */
function apiLink(/** @type {string} */ whole, /** @type {string} */ inner, /** @type {number} */ line, /** @type {string} */ file, /** @type {ComposeContext} */ context) {
  const fail = (/** @type {string} */ kind, /** @type {string} */ message, /** @type {string | undefined} */ hint) => {
    context.report({ kind, line, file, directive: '[[api:]]', reference: inner, message, hint });
    return whole;
  };
  const match = API_BODY.exec(inner);
  if (!match) return fail('invalid-authoring', 'an API link is [[api:Name]], [[api:Name|Label]] or [[api:Name@version]].', 'Public export names only contain letters, digits, _ and $.');
  const [, name = '', target, label] = match;
  const index = context.apiIndex(target);
  if (!index) {
    return fail(
      'unknown-symbol',
      target ? `no API reference index is configured for "${target}".` : 'no API reference index was found for this documentation.',
      target ? `Add the "${target}" target with its "api" directory, or remove "@${target}".` : 'Run doq-api generate (it records the symbol index) and list its output directory under "api" in doq.content.json.',
    );
  }
  const routes = index.symbols.get(name);
  if (!routes?.length) {
    const near = [...index.symbols.keys()].filter((candidate) => candidate.toLowerCase() === name.toLowerCase()).sort();
    return fail('unknown-symbol', `"${name}" is not a public symbol in ${index.label}.`, near.length ? `Did you mean ${near.join(', ')}? Names are case-sensitive.` : 'Check the export name, or regenerate the API reference.');
  }
  if (routes.length > 1) return fail('ambiguous-symbol', `"${name}" is generated at ${routes.length} routes in ${index.label}: ${routes.join(', ')}.`, 'Keep one API reference per symbol, or link the page by hand.');
  return `[${label ? escapeLabel(label.trim()) : `\`${name}\``}](${routes[0]})`;
}

async function resolveSource(/** @type {Map<string, string>} */ attributes, /** @type {ComposeContext} */ context, /** @type {Function} */ problem) {
  const file = attributes.get('file') ?? '';
  for (const key of attributes.keys()) {
    if (!SOURCE_ATTRIBUTES.has(key)) return void problem('invalid-authoring', key, `unknown attribute "${key}".`, `Use: ${[...SOURCE_ATTRIBUTES].join(', ')}.`);
  }
  if (!file) return void problem('invalid-authoring', '', 'the file attribute is required.', 'Example: ::source{file="src/lib/button.ts" region="usage"}');
  const region = attributes.get('region');
  const linesText = attributes.get('lines');
  if (region !== undefined && linesText !== undefined) return void problem('invalid-authoring', file, 'use either region or lines, not both.');
  if (region !== undefined && !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(region)) return void problem('invalid-authoring', file, `region "${region}" is not a valid name (letters, digits, - and _).`);
  /** @type {{ from: number, to: number } | undefined} */
  let lines;
  if (linesText !== undefined) {
    const range = /^(\d{1,6})(?:-(\d{1,6}))?$/.exec(linesText.trim());
    if (!range) return void problem('invalid-authoring', file, `lines="${linesText}" must be a number or a range such as "3-9".`);
    lines = { from: Number(range[1]), to: Number(range[2] ?? range[1]) };
  }
  const link = attributes.get('link');
  if (link !== undefined && link !== 'false' && link !== 'true') return void problem('invalid-authoring', file, 'link must be "true" or "false".');
  const title = attributes.get('title');
  if (title !== undefined && (!title.trim() || /[\u0000-\u001f\u007f]/.test(title))) return void problem('invalid-authoring', file, 'title must be a single line of text.');

  let read;
  try {
    read = await readSafeText({ base: context.cwd, file, roots: context.sourceRoots, extensions: Object.keys(LANGUAGES), maxBytes: MAX_SOURCE_BYTES, rootLabel: context.sourceLabel });
  } catch (error) {
    const e = /** @type {any} */ (error);
    return void problem(e.kind ?? 'unsafe-path', file, e.message, e.kind === 'missing-source' ? 'Check the path (it is relative to the project) and that the file is committed.' : 'Only files under the configured "sourceRoots" can be shown.');
  }
  context.dependencies.add(read.real);
  const extracted = extractSnippet(read.text, { region, lines });
  if (!extracted.ok) {
    const where = `${file}${region !== undefined ? ` region "${region}"` : ''}`;
    return void problem(
      extracted.reason === 'region-missing' ? 'missing-source' : 'invalid-authoring',
      where,
      `${extracted.message}`,
      extracted.reason === 'region-missing'
        ? extracted.available?.length ? `Available regions: ${extracted.available.join(', ')}.` : `Add "// #region doqs:${region}" and "// #endregion doqs:${region}" around the code.`
        : 'Fix the markers in the source file or the selection in the page.',
    );
  }
  const { snippet } = extracted;
  const language = attributes.get('lang') ?? LANGUAGES[/** @type {keyof typeof LANGUAGES} */ (extname(read.real).toLowerCase())] ?? '';
  if (language && !LANG.test(language)) return void problem('invalid-authoring', file, `lang="${language}" is not a valid language name.`);
  const code = snippet.lines.join('\n');
  const marks = fenceFor(code);
  const projectPath = toPosix(relative(context.cwd, read.real));
  const range = region !== undefined || lines ? { start: snippet.start, end: snippet.end } : undefined;
  const url = link === 'false' ? undefined : context.sourceLink?.(projectPath, range);
  return [
    ...(title !== undefined ? [`:::code ${title.trim()}`, ''] : []),
    `${marks}${language}`,
    ...snippet.lines,
    marks,
    ...(url ? ['', `[View source](${url})`] : []),
  ];
}

async function resolveInclude(
  /** @type {Map<string, string>} */ attributes, /** @type {ComposeContext} */ context, /** @type {Function} */ problem,
  /** @type {string[]} */ stack, /** @type {string} */ directory,
) {
  const file = attributes.get('file') ?? '';
  for (const key of attributes.keys()) if (key !== 'file') return void problem('invalid-authoring', key, `unknown attribute "${key}"; ::include only takes file.`);
  if (!file) return void problem('invalid-authoring', '', 'the file attribute is required.', 'Example: ::include{file="/_partials/prerequisites.md"}');
  if (stack.length >= MAX_INCLUDE_DEPTH) return void problem('invalid-authoring', file, `includes are nested deeper than ${MAX_INCLUDE_DEPTH} levels (${stack.map((s) => toPosix(relative(context.cwd, s))).join(' -> ')}).`);
  const fromRoot = file.startsWith('/');
  let read;
  try {
    read = await readSafeText({
      base: fromRoot ? context.authoringRoot : directory,
      file: fromRoot ? file.slice(1) : file,
      roots: [context.authoringRoot],
      extensions: ['.md'],
      maxBytes: MAX_FRAGMENT_BYTES,
      rootLabel: 'the authoring directory',
    });
  } catch (error) {
    const e = /** @type {any} */ (error);
    return void problem(e.kind ?? 'unsafe-path', file, e.message, e.kind === 'missing-source' ? 'Paths start with "/" for the authoring root, otherwise they are relative to the including file.' : undefined);
  }
  const rel = toPosix(relative(context.authoringRoot, read.real));
  if (!rel.split('/').some((part) => part.startsWith('_'))) {
    return void problem('invalid-authoring', file, `"${rel}" is a page, not a fragment. Fragments live in a file or directory whose name starts with "_" so they never become routes.`, `Move it to e.g. _partials/${rel.split('/').at(-1)}.`);
  }
  if (stack.includes(read.real)) {
    const cycle = [...stack.slice(stack.indexOf(read.real)), read.real].map((s) => toPosix(relative(context.authoringRoot, s))).join(' -> ');
    return void problem('invalid-authoring', file, `include cycle: ${cycle}.`, 'Remove one of the includes.');
  }
  context.dependencies.add(read.real);
  const { frontmatter, body, bodyLine } = splitFrontmatter(read.text);
  if (frontmatter) return void problem('invalid-authoring', file, `fragment "${rel}" starts with frontmatter (line ${bodyLine - 1}); only pages have frontmatter.`, 'Delete the --- block from the fragment.');
  const resolved = await composeBody(body.replace(/\n+$/, ''), `${toPosix(relative(context.cwd, read.real))}`, 1, context, [...stack, read.real], dirname(read.real));
  return resolved.split('\n');
}

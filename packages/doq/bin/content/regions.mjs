// Node-only. Extracts a named region or a line range from source text. No parser: comment markers only.

// #region doqs:region-marker
/**
 * Marker lines: `// #region doqs:name`, `# #region doqs:name`, `/* #region doqs:name *\/`, `<!-- #region doqs:name -->`
 * (and the matching `#endregion`). The `doqs:` prefix keeps the editor's own `#region` folding markers untouched.
 */
const MARKER = /^\s*(?:\/\/|#|\/\*+|<!--)\s*#(end)?region\s+doqs:([A-Za-z0-9][A-Za-z0-9_-]*)\s*(?:\*+\/|-->)?\s*$/;
// #endregion doqs:region-marker

/** @typedef {{ lines: string[], start: number, end: number }} Snippet 1-based inclusive line numbers of the first and last content line. */

/**
 * Finds every marker, validating pairing and nesting for the whole file so a broken file never half-works.
 * @returns {{ regions: Map<string, { open: number, close: number }>, markerLines: Set<number>, problems: string[] }}
 */
export function scanRegions(/** @type {string[]} */ lines) {
  const regions = new Map();
  const markerLines = new Set();
  const problems = [];
  /** @type {{ name: string, open: number }[]} */
  const stack = [];
  const closed = new Set();
  lines.forEach((text, index) => {
    const match = MARKER.exec(text);
    if (!match) return;
    const number = index + 1;
    markerLines.add(number);
    const [, ending, name = ''] = match;
    if (!ending) {
      if (regions.has(name) || stack.some((entry) => entry.name === name) || closed.has(name)) {
        problems.push(`region "${name}" is declared more than once (line ${number}); region names must be unique in a file.`);
        return;
      }
      stack.push({ name, open: number });
      return;
    }
    const top = stack.at(-1);
    if (!top) {
      problems.push(`#endregion doqs:${name} at line ${number} has no matching #region.`);
      return;
    }
    if (top.name !== name) {
      problems.push(`#endregion doqs:${name} at line ${number} closes the wrong region; "${top.name}" (line ${top.open}) is still open. Regions must nest.`);
      return;
    }
    stack.pop();
    closed.add(name);
    regions.set(name, { open: top.open, close: number });
  });
  for (const entry of stack) problems.push(`region "${entry.name}" opened at line ${entry.open} is never closed with #endregion doqs:${entry.name}.`);
  return { regions, markerLines, problems };
}

/** Removes the common indentation (tabs and spaces are not mixed up) and surrounding blank lines. */
function tidy(/** @type {string[]} */ lines) {
  let from = 0;
  let to = lines.length;
  while (from < to && !lines[from]?.trim()) from++;
  while (to > from && !lines[to - 1]?.trim()) to--;
  const body = lines.slice(from, to);
  const indents = body.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)?.[0] ?? '');
  let common = indents[0] ?? '';
  for (const indent of indents) {
    let n = 0;
    while (n < common.length && n < indent.length && common[n] === indent[n]) n++;
    common = common.slice(0, n);
  }
  return { lines: body.map((line) => (line.trim() ? line.slice(common.length) : '')), offset: from };
}

/**
 * @param {string} text normalized source (LF)
 * @param {{ region?: string, lines?: { from: number, to: number } }} selection at most one of the two
 * @returns {{ ok: true, snippet: Snippet } | { ok: false, reason: 'region-missing' | 'invalid' | 'empty' | 'range', message: string, available?: string[] }}
 */
export function extractSnippet(text, selection) {
  const all = text.length ? text.replace(/\n$/, '').split('\n') : [];
  const { regions, markerLines, problems } = scanRegions(all);
  if (problems.length) return { ok: false, reason: 'invalid', message: problems[0] ?? 'invalid region markers' };
  let from = 1;
  let to = all.length;
  if (selection.region !== undefined) {
    const region = regions.get(selection.region);
    if (!region) return { ok: false, reason: 'region-missing', message: `region "${selection.region}" was not found.`, available: [...regions.keys()].sort() };
    from = region.open + 1;
    to = region.close - 1;
  } else if (selection.lines) {
    from = selection.lines.from;
    to = selection.lines.to;
    if (from < 1 || to < from || to > all.length) {
      return { ok: false, reason: 'range', message: `lines ${from}-${to} are outside the file, which has ${all.length} lines.` };
    }
  }
  const selected = [];
  for (let number = from; number <= to; number++) if (!markerLines.has(number)) selected.push({ number, text: all[number - 1] ?? '' });
  const { lines, offset } = tidy(selected.map((entry) => entry.text));
  if (!lines.length) return { ok: false, reason: 'empty', message: selection.region !== undefined ? `region "${selection.region}" is empty.` : 'the selected lines are empty.' };
  const first = selected[offset]?.number ?? from;
  const last = selected[offset + lines.length - 1]?.number ?? to;
  return { ok: true, snippet: { lines, start: first, end: last } };
}

// Node-only. Line-level Markdown scanning shared by the authoring processor: frontmatter, fences, inline code, attributes.

/** Splits a leading `---` frontmatter block from the body. `bodyLine` is the 1-based line where the body starts. */
export function splitFrontmatter(/** @type {string} */ text) {
  const match = /^---[ \t]*\n([\s\S]*?\n)?---[ \t]*(?:\n|$)/.exec(text);
  if (!match) return { frontmatter: undefined, body: text, bodyLine: 1 };
  const header = match[0];
  return { frontmatter: header, body: text.slice(header.length), bodyLine: header.split('\n').length };
}

/** Tracks CommonMark fenced code blocks line by line. Call `next(line)`; true means the line is inside (or delimits) a fence. */
export function fenceTracker() {
  /** @type {{ char: string, size: number } | undefined} */
  let open;
  return {
    next(/** @type {string} */ line) {
      const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (!open) {
        if (match && !(match[1]?.startsWith('`') && match[2]?.includes('`'))) {
          open = { char: match[1]?.[0] ?? '`', size: match[1]?.length ?? 3 };
          return true;
        }
        return false;
      }
      if (match && match[1]?.[0] === open.char && (match[1]?.length ?? 0) >= open.size && !match[2]?.trim()) open = undefined;
      return true;
    },
  };
}

/** Applies `fn` to the parts of a line outside inline code spans, so `` `[[api:X]]` `` stays literal. */
export function outsideInlineCode(/** @type {string} */ line, /** @type {(text: string) => string} */ fn) {
  let result = '';
  let last = 0;
  for (const match of line.matchAll(/(`+)(?:[^`]|(?!\1)`+)+?\1(?!`)/g)) {
    result += fn(line.slice(last, match.index)) + match[0];
    last = match.index + match[0].length;
  }
  return result + fn(line.slice(last));
}

/**
 * Parses `key="value" other="v"` attributes. Values are double-quoted with `\"` and `\\` escapes.
 * @returns {{ ok: true, attributes: Map<string, string> } | { ok: false, message: string }}
 */
export function parseAttributes(/** @type {string} */ text) {
  const attributes = new Map();
  let index = 0;
  const skip = () => { while (text[index] === ' ' || text[index] === '\t') index++; };
  skip();
  while (index < text.length) {
    const key = /^[a-z][a-z0-9-]*/.exec(text.slice(index))?.[0];
    if (!key) return { ok: false, message: `expected an attribute name at "${text.slice(index, index + 12)}".` };
    index += key.length;
    if (text[index] !== '=') return { ok: false, message: `attribute "${key}" needs a value: ${key}="…".` };
    index++;
    if (text[index] !== '"') return { ok: false, message: `the value of "${key}" must be in double quotes.` };
    index++;
    let value = '';
    for (;;) {
      const char = text[index];
      if (char === undefined) return { ok: false, message: `the value of "${key}" is not closed with a double quote.` };
      index++;
      if (char === '"') break;
      if (char === '\\' && (text[index] === '"' || text[index] === '\\')) { value += text[index]; index++; continue; }
      value += char;
    }
    if (attributes.has(key)) return { ok: false, message: `attribute "${key}" is given twice.` };
    attributes.set(key, value);
    if (index < text.length && text[index] !== ' ' && text[index] !== '\t') return { ok: false, message: 'attributes must be separated by a space.' };
    skip();
  }
  return { ok: true, attributes };
}

/** Escapes text used as a Markdown link label. */
export const escapeLabel = (/** @type {string} */ text) => text.replace(/[\\`*_[\]<>&!#|]/g, (char) => `\\${char}`);

/** A fence longer than any backtick run in the code, so no source line can end the fence early. */
export function fenceFor(/** @type {string} */ code) {
  let longest = 2;
  for (const run of code.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return '`'.repeat(longest + 1);
}

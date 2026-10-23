/** One piece of a rendered document: untouched HTML, or a point where a registered demo is mounted. */
export type DoqContentSegment = { readonly kind: 'html'; readonly html: string } | { readonly kind: 'demo'; readonly id: string };

/** The authoring syntax: a paragraph that contains exactly `::demo[id]`. */
export const DOQ_INLINE_DEMO_PATTERN = /^::demo\[([A-Za-z0-9][A-Za-z0-9_-]*)\]$/;

/** The playground syntax: a paragraph that contains exactly `::playground[id]`. */
export const DOQ_INLINE_PLAYGROUND_PATTERN = /^::playground\[([A-Za-z0-9][A-Za-z0-9_-]*)\]$/;

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:"[^"]*"|'[^']*'|[^'">])*>/g;

/**
 * Split Analog's rendered Markdown HTML at `::demo[id]` directives.
 *
 * Analog renders Markdown at build time, so the HTML is already final: heading ids, syntax highlighting and
 * escaping are decided by the whole document. A directive is recognised only as a complete top-level
 * `<p>` element. Directives in fenced or indented code are escaped text inside `<pre>`, and those in lists,
 * blockquotes or tables sit below the top level, so none of them ever match. The HTML is never rewritten,
 * only cut, which keeps heading ids and duplicate-heading suffixes identical to the unsplit document.
 */
export function splitDoqInlineDemos(html: string): DoqContentSegment[] {
  if (!html.includes('::demo[')) return html ? [{ kind: 'html', html }] : [];
  const segments: DoqContentSegment[] = [];
  let depth = 0;
  let consumed = 0;
  TAG.lastIndex = 0;
  for (let match = TAG.exec(html); match; match = TAG.exec(html)) {
    const [tag, closing, rawName] = match;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (closing) { depth = Math.max(0, depth - 1); continue; }
    if (VOID_ELEMENTS.has(name) || tag.endsWith('/>')) continue;
    if (depth === 0 && name === 'p') {
      const end = html.indexOf('</p>', TAG.lastIndex);
      const id = end < 0 ? undefined : DOQ_INLINE_DEMO_PATTERN.exec(html.slice(TAG.lastIndex, end).trim())?.[1];
      if (id !== undefined) {
        const before = html.slice(consumed, match.index);
        if (before.trim()) segments.push({ kind: 'html', html: before });
        segments.push({ kind: 'demo', id });
        consumed = end + '</p>'.length;
        TAG.lastIndex = consumed;
        continue;
      }
    }
    depth++;
  }
  const rest = html.slice(consumed);
  if (rest.trim()) segments.push({ kind: 'html', html: rest });
  return segments;
}

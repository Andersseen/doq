import { DOQ_INLINE_DEMO_PATTERN, DOQ_INLINE_PLAYGROUND_PATTERN } from './doq-inline-demos';

/** The callout kinds, in GitHub's `> [!KIND]` alert syntax. */
export const DOQ_CALLOUT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type DoqCalloutType = (typeof DOQ_CALLOUT_TYPES)[number];

export interface DoqTab { readonly label: string; readonly html: string }

/**
 * One piece of a rendered document. `html` is Markdown HTML to mount; `demo` is a `::demo[id]` mount point;
 * `tabs` is a `:::tabs` group rendered by the interactive tabs component. Callouts, steps, titled code and language
 * labels are rewritten into `html` itself, so they need no component and no hydration.
 */
export type DoqRichSegment =
  | { readonly kind: 'html'; readonly html: string }
  | { readonly kind: 'demo'; readonly id: string }
  | { readonly kind: 'tabs'; readonly label: string; readonly tabs: readonly DoqTab[]; readonly codeOnly: boolean };

/** A `::playground[id]` mount point (0.9). Kept out of `DoqRichSegment` so that union, and code switching over it, is unchanged. */
export interface DoqPlaygroundSegment { readonly kind: 'playground'; readonly id: string }
/** What Doqs renders for a document: every `DoqRichSegment`, plus playground mount points. */
export type DoqDocumentSegment = DoqRichSegment | DoqPlaygroundSegment;

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:"[^"]*"|'[^']*'|[^'">])*>/g;
const CALLOUT_MARKER = new RegExp(`^(\\s*)<p>\\[!(${DOQ_CALLOUT_TYPES.join('|')})\\][ \\t]*(?:\\n|(?=</p>))`, 'i');
const CALLOUT_TITLES: Readonly<Record<DoqCalloutType, string>> = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };

interface Edit { readonly start: number; readonly end: number; readonly text: string }

const applyEdits = (html: string, edits: Edit[]): string => {
  let out = '';
  let cursor = 0;
  for (const edit of edits.sort((a, b) => a.start - b.start)) {
    out += html.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return out + html.slice(cursor);
};

const escapeAttribute = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ENTITIES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
/** Plain text of a fragment of inline HTML: tags dropped, the entities Markdown emits decoded. */
const plainText = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name: string) => ENTITIES[name] ?? '').replace(/\s+/g, ' ').trim();

/**
 * In-place rewrites of Analog's rendered HTML that need no component: `> [!NOTE]` blockquotes become
 * `div.doq-callout`, and `<pre>` gets its language as `data-language`. Tags are located by a tokenizer, the
 * rest of the HTML is copied untouched, so heading ids, highlighting and everything inside `<pre>` are unchanged.
 * Code is escaped by Markdown, so a marker or a tag inside a code block can never be seen as one here.
 */
function rewriteInline(html: string): string {
  if (!html.includes('<blockquote') && !html.includes('<pre')) return html;
  const edits: Edit[] = [];
  const stack: Array<{ name: string; callout: boolean }> = [];
  TAG.lastIndex = 0;
  for (let match = TAG.exec(html); match; match = TAG.exec(html)) {
    const [tag, closing, rawName] = match;
    if (!rawName) continue;
    const name = rawName.toLowerCase();
    if (closing) {
      // Pop to the matching open element; Markdown output is well nested, so this is the top in practice.
      let index = stack.length - 1;
      while (index >= 0 && stack[index]!.name !== name) index--;
      if (index < 0) continue;
      const [frame] = stack.splice(index);
      if (frame!.callout) edits.push({ start: match.index, end: match.index + tag.length, text: '</div>' });
      continue;
    }
    if (VOID_ELEMENTS.has(name) || tag.endsWith('/>')) continue;
    let callout = false;
    if (name === 'blockquote') {
      const marker = CALLOUT_MARKER.exec(html.slice(TAG.lastIndex, TAG.lastIndex + 80));
      if (marker) {
        const type = marker[2]!.toLowerCase() as DoqCalloutType;
        callout = true;
        const open = `<div class="doq-callout" data-callout="${type}" role="note"><p class="doq-callout-title" data-pagefind-ignore>${CALLOUT_TITLES[type]}</p>`;
        const markerEnd = TAG.lastIndex + marker[0].length;
        // `<p>[!NOTE]</p>` (marker alone, then a blank `>` line) leaves an empty paragraph once the marker is gone.
        const alone = html.startsWith('</p>', markerEnd);
        edits.push({ start: match.index, end: markerEnd + (alone ? 4 : 0), text: alone ? open : `${open}<p>` });
      }
    } else if (name === 'pre') {
      const language = /^<code class="language-([A-Za-z0-9+#.-]+)"/.exec(html.slice(TAG.lastIndex, TAG.lastIndex + 80))?.[1];
      if (language && !/\sdata-language=/.test(tag)) edits.push({ start: match.index, end: match.index + tag.length, text: tag.replace(/>$/, ` data-language="${language}">`) });
    }
    stack.push({ name, callout });
  }
  return applyEdits(html, edits);
}

interface Block { readonly name: string; readonly html: string }

/** The top-level elements of an HTML fragment, each with its source text; text between elements stays with the next. */
function topLevelBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let depth = 0;
  let begin = 0;
  let name = '';
  TAG.lastIndex = 0;
  for (let match = TAG.exec(html); match; match = TAG.exec(html)) {
    const [tag, closing, rawName] = match;
    if (!rawName) continue;
    const tagName = rawName.toLowerCase();
    const end = match.index + tag.length;
    if (closing) {
      depth = Math.max(0, depth - 1);
      if (depth === 0) { blocks.push({ name, html: html.slice(begin, end) }); begin = end; }
      continue;
    }
    if (depth === 0) name = tagName;
    if (VOID_ELEMENTS.has(tagName) || tag.endsWith('/>')) {
      if (depth === 0) { blocks.push({ name, html: html.slice(begin, end) }); begin = end; }
      continue;
    }
    depth++;
  }
  if (html.slice(begin).trim()) blocks.push({ name: '', html: html.slice(begin) });
  return blocks;
}

type Directive = { readonly name: 'tabs' | 'tab' | 'steps' | 'code' | 'end'; readonly argument: string };
const DIRECTIVE = /^:::(tabs|tab|steps|code)?(?:[ \t]+(.+))?$/;

/** A top-level paragraph made only of `:::` lines, or undefined when the block is anything else. */
function directivesOf(block: Block): Directive[] | undefined {
  if (block.name !== 'p') return undefined;
  const inner = block.html.trim().replace(/^<p>/, '').replace(/<\/p>$/, '');
  if (!inner.trimStart().startsWith(':::')) return undefined;
  const directives: Directive[] = [];
  for (const line of inner.split('\n')) {
    const match = DIRECTIVE.exec(plainText(line));
    if (!match || (!match[1] && match[2])) return undefined;
    directives.push({ name: (match[1] ?? 'end') as Directive['name'], argument: match[2] ?? '' });
  }
  return directives;
}

const joinHtml = (blocks: readonly Block[]): string => blocks.map(block => block.html).join('');
const CODE_BLOCKS = new Set(['pre', 'figure']);

/**
 * Parse a whole rendered document into mount segments.
 *
 * Authoring (each `:::` line sits in its own paragraph, i.e. surrounded by blank lines or code fences):
 *  - `> [!NOTE]` / `TIP` / `IMPORTANT` / `WARNING` / `CAUTION` at the start of a blockquote: a callout.
 *  - `:::tabs [label]`, then `:::tab Label` per tab, then `:::`: a tab group.
 *  - `:::steps` ... `:::` around an ordered list: a step guide.
 *  - `:::code file.ts` immediately before a fenced block: a titled code block.
 *  - `::demo[id]` alone in a paragraph: a registered consumer demo (unchanged from 0.3).
 *  - `::playground[id]` alone in a paragraph: a registered interactive playground (0.9).
 * Anything that does not parse exactly (an unclosed group, a tab outside tabs, an unknown directive) is left in the
 * document as the literal text the author wrote; nothing is dropped.
 */
export function parseDoqContent(source: string): DoqRichSegment[] {
  return parse(rewriteInline(source), false, false) as DoqRichSegment[];
}

/**
 * `parseDoqContent` plus `::playground[id]` mount points: the document view Doqs renders. A playground directive is
 * recognised exactly like `::demo[id]` and, like it, stays literal text inside code, lists, quotes, tables and tab bodies.
 */
export function parseDoqDocument(source: string): DoqDocumentSegment[] {
  return parse(rewriteInline(source), false, true);
}

function parse(source: string, nested: boolean, playgrounds: boolean): DoqDocumentSegment[] {
  const blocks = topLevelBlocks(source);
  const segments: DoqDocumentSegment[] = [];
  let pending: Block[] = [];
  const flush = () => {
    const html = joinHtml(pending);
    pending = [];
    if (html.trim()) segments.push({ kind: 'html', html });
  };
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index]!;
    const paragraph = !nested && block.name === 'p' ? block.html.trim().replace(/^<p>/, '').replace(/<\/p>$/, '').trim() : undefined;
    const demo = paragraph === undefined ? undefined : DOQ_INLINE_DEMO_PATTERN.exec(paragraph)?.[1];
    if (demo !== undefined) { flush(); segments.push({ kind: 'demo', id: demo }); continue; }
    const playground = paragraph === undefined || !playgrounds ? undefined : DOQ_INLINE_PLAYGROUND_PATTERN.exec(paragraph)?.[1];
    if (playground !== undefined) { flush(); segments.push({ kind: 'playground', id: playground }); continue; }
    const directives = directivesOf(block);
    const name = directives?.[0]?.name;
    if (directives && (name === 'code' || name === 'steps' || (name === 'tabs' && !nested))) {
      const consumed = name === 'code' ? readCode(blocks, index, directives) : readGroup(blocks, index, directives, name);
      if (consumed) {
        flush();
        if (consumed.segment.kind === 'html') pending.push({ name: 'div', html: consumed.segment.html });
        else segments.push(consumed.segment);
        index = consumed.next - 1;
        continue;
      }
    }
    pending.push(block);
  }
  flush();
  // Adjacent html stays one segment so spacing and heading order match the unsplit document.
  return segments.reduce<DoqDocumentSegment[]>((out, segment) => {
    const last = out.at(-1);
    if (segment.kind === 'html' && last?.kind === 'html') out[out.length - 1] = { kind: 'html', html: last.html + segment.html };
    else out.push(segment);
    return out;
  }, []);
}

interface Consumed { readonly segment: DoqRichSegment; readonly next: number }
interface Run { readonly directive: Directive; readonly content: Block[] }

/** `:::code title` + one fenced block -> `<figure class="doq-code">`. */
function readCode(blocks: readonly Block[], index: number, directives: readonly Directive[]): Consumed | undefined {
  const [open, ...extra] = directives;
  const target = blocks[index + 1];
  if (extra.length || !open?.argument || target?.name !== 'pre') return undefined;
  const html = `<figure class="doq-code"><figcaption class="doq-code-title">${escapeHtml(open.argument)}</figcaption>${target.html.trim()}</figure>`;
  return { segment: { kind: 'html', html }, next: index + 2 };
}

/**
 * From the opening paragraph to the paragraph holding the closing `:::`. A group's own directives are only
 * recognised as single-directive paragraphs where they nest (`:::code`, and `:::steps` inside a tab), so a
 * nested `:::` cannot be mistaken for the closing one.
 */
function readGroup(blocks: readonly Block[], index: number, openers: readonly Directive[], kind: 'tabs' | 'steps'): Consumed | undefined {
  const runs: Run[] = openers.map(directive => ({ directive, content: [] }));
  let depth = 0;
  for (let cursor = index + 1; cursor < blocks.length; cursor++) {
    const block = blocks[cursor]!;
    const directives = directivesOf(block);
    // A paragraph that starts with `:::` but is not purely directives (text glued to a marker) makes the group malformed.
    if (!directives && block.name === 'p' && block.html.trim().replace(/^<p>/, '').startsWith(':::')) return undefined;
    const only = directives?.length === 1 ? directives[0] : undefined;
    if (!directives || only?.name === 'code' || depth > 0 || (kind === 'tabs' && only?.name === 'steps')) {
      if (directives && only?.name === 'steps') depth++;
      else if (directives && depth > 0) for (const directive of directives) depth += directive.name === 'end' ? -1 : directive.name === 'steps' ? 1 : 0;
      runs.at(-1)!.content.push(block);
      continue;
    }
    for (const directive of directives) {
      if (directive.name === 'end') return build(runs, cursor + 1, kind);
      if (kind === 'steps' || directive.name !== 'tab') return undefined;
      runs.push({ directive, content: [] });
    }
  }
  return undefined;
}

function build(runs: readonly Run[], next: number, kind: 'tabs' | 'steps'): Consumed | undefined {
  const head = runs[0]!;
  if (kind === 'steps') {
    if (runs.length !== 1 || !head.content.some(block => block.name === 'ol')) return undefined;
    return { segment: { kind: 'html', html: `<div class="doq-steps">${nestedHtml(head.content)}</div>` }, next };
  }
  const tabRuns = runs.slice(1);
  if (head.content.length || !tabRuns.length || tabRuns.some(run => run.directive.name !== 'tab' || !run.directive.argument)) return undefined;
  const tabs = tabRuns.map(run => ({ label: run.directive.argument.replace(/\s+/g, ' '), html: nestedHtml(run.content) }));
  const codeOnly = tabs.every(tab => { const parts = topLevelBlocks(tab.html); return parts.length > 0 && parts.every(part => CODE_BLOCKS.has(part.name)); });
  return { segment: { kind: 'tabs', label: head.directive.argument, tabs, codeOnly }, next };
}

/** A group body is a fragment of its own document: steps and titled code work inside it; tabs, demos and playgrounds do not nest. */
function nestedHtml(content: readonly Block[]): string {
  return parse(joinHtml(content), true, false).map(segment => (segment.kind === 'html' ? segment.html : '')).join('');
}

const escapeHtml = (value: string): string => escapeAttribute(value).replace(/>/g, '&gt;');

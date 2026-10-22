import { describe, expect, it } from 'vitest';
import { parseDoqContent, type DoqRichSegment } from '../../src/lib/doq-rich-content';

// HTML below is what Analog's marked pipeline emits for the Markdown shown in each case.
const html = (segments: DoqRichSegment[]): string => segments.map(segment => (segment.kind === 'html' ? segment.html : `[${segment.kind}]`)).join('');
const tabsOf = (segments: DoqRichSegment[]) => segments.flatMap(segment => (segment.kind === 'tabs' ? [segment] : []));
const code = (language: string, body: string) => `<pre><code class="language-${language}">${body}\n</code></pre>`;

describe('UNIT-080 callouts', () => {
  it.each([
    ['NOTE', 'note', 'Note'],
    ['TIP', 'tip', 'Tip'],
    ['IMPORTANT', 'important', 'Important'],
    ['WARNING', 'warning', 'Warning'],
    ['CAUTION', 'caution', 'Caution'],
    ['note', 'note', 'Note'],
  ])('[!%s] becomes a %s callout titled %s', (marker, type, title) => {
    const out = html(parseDoqContent(`<blockquote>\n<p>[!${marker}]\nBody with <code>code</code> and <a href="/x">a link</a>.</p>\n<ul>\n<li>item</li>\n</ul>\n</blockquote>`));
    expect(out).toContain(`<div class="doq-callout" data-callout="${type}" role="note">`);
    expect(out).toContain(`<p class="doq-callout-title" data-pagefind-ignore>${title}</p><p>Body with <code>code</code> and <a href="/x">a link</a>.</p>`);
    expect(out).toContain('<li>item</li>');
    expect(out).not.toContain('[!');
    expect(out).not.toContain('blockquote');
    expect(out.match(/<div/g)).toHaveLength(1);
    expect(out.match(/<\/div>/g)).toHaveLength(1);
  });

  it('handles a marker alone on its line followed by a blank quoted line', () => {
    const out = html(parseDoqContent('<blockquote>\n<p>[!TIP]</p>\n<p>Body</p>\n</blockquote>'));
    expect(out).toBe('<div class="doq-callout" data-callout="tip" role="note"><p class="doq-callout-title" data-pagefind-ignore>Tip</p>\n<p>Body</p>\n</div>');
  });

  it.each([
    ['an ordinary blockquote', '<blockquote>\n<p>plain quote</p>\n</blockquote>'],
    ['an unknown marker', '<blockquote>\n<p>[!DANGER]\nNo such type</p>\n</blockquote>'],
    ['a marker followed by text on its line', '<blockquote>\n<p>[!NOTE] inline text</p>\n</blockquote>'],
    ['a marker in the middle of a paragraph', '<blockquote>\n<p>See [!NOTE]\nlater</p>\n</blockquote>'],
    ['a marker outside a blockquote', '<p>[!NOTE]\nnot quoted</p>'],
    ['a marker inside a code block', '<pre><code class="language-md">&gt; [!NOTE]\n&gt; shown literally\n</code></pre>'],
    ['a marker inside inline code', '<blockquote>\n<p><code>[!NOTE]</code></p>\n</blockquote>'],
  ])('leaves %s untouched', (_name, source) => {
    const out = html(parseDoqContent(source));
    expect(out).not.toContain('doq-callout');
    expect(out.replace(/ data-language="[^"]+"/, '')).toBe(source);
  });

  it('turns a nested quote callout into a callout and keeps the outer quote', () => {
    const out = html(parseDoqContent('<blockquote>\n<p>outer</p>\n<blockquote>\n<p>[!WARNING]\ninner</p>\n</blockquote>\n</blockquote>'));
    expect(out).toBe('<blockquote>\n<p>outer</p>\n<div class="doq-callout" data-callout="warning" role="note"><p class="doq-callout-title" data-pagefind-ignore>Warning</p><p>inner</p>\n</div>\n</blockquote>');
  });

  it('keeps heading ids and html-significant text inside a callout byte for byte', () => {
    const body = '<h3 id="deep-heading-1">Deep &amp; <em>wide</em></h3>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>';
    const out = html(parseDoqContent(`<blockquote>\n<p>[!IMPORTANT]\nx</p>\n${body}\n</blockquote>`));
    expect(out).toContain(body);
  });
});

describe('UNIT-081 tabs', () => {
  const npm = '<p>:::tabs Install\n:::tab npm</p>\n' + code('bash', 'npm install @doqs/analog') + '\n<p>:::tab pnpm</p>\n' + code('bash', 'pnpm add @doqs/analog') + '\n<p>:::</p>';

  it('parses a tab group with markdown html in each tab', () => {
    const [group] = tabsOf(parseDoqContent(npm));
    expect(group?.label).toBe('Install');
    expect(group?.tabs.map(tab => tab.label)).toEqual(['npm', 'pnpm']);
    expect(group?.tabs[0]?.html).toContain('npm install @doqs/analog');
    expect(group?.tabs[1]?.html).toContain('pnpm add @doqs/analog');
    expect(group?.codeOnly).toBe(true);
  });

  it('keeps prose, lists and code in a tab and marks the group as not code-only', () => {
    const [group] = tabsOf(parseDoqContent('<p>:::tabs</p>\n<p>:::tab One</p>\n<p>Text <code>a</code></p>\n<ul>\n<li>x</li>\n</ul>\n' + code('ts', 'a') + '\n<p>:::tab Two</p>\n<p>Second</p>\n<p>:::</p>'));
    expect(group?.label).toBe('');
    expect(group?.tabs[0]?.html).toContain('<ul>');
    expect(group?.tabs[0]?.html).toContain('<p>Text <code>a</code></p>');
    expect(group?.codeOnly).toBe(false);
  });

  it('decodes labels written with inline markdown and entities, and collapses whitespace', () => {
    const [group] = tabsOf(parseDoqContent('<p>:::tabs\n:::tab app &amp; <em>lib</em></p>\n<p>A</p>\n<p>:::tab <code>x.ts</code>   file</p>\n<p>B</p>\n<p>:::</p>'));
    expect(group?.tabs.map(tab => tab.label)).toEqual(['app & lib', 'x.ts file']);
  });

  it('keeps several groups on a page independent and the html around them in order', () => {
    const segments = parseDoqContent('<h2 id="a">A</h2>\n' + npm + '\n<p>between</p>\n' + npm + '\n<h2 id="b">B</h2>');
    expect(segments.map(segment => segment.kind)).toEqual(['html', 'tabs', 'html', 'tabs', 'html']);
    expect(tabsOf(segments)).toHaveLength(2);
    expect(html(segments)).toContain('<h2 id="a">A</h2>');
    expect(html(segments)).toContain('<h2 id="b">B</h2>');
  });

  it('puts a callout, steps and titled code inside a tab', () => {
    const [group] = tabsOf(parseDoqContent('<p>:::tabs</p>\n<p>:::tab One</p>\n<blockquote>\n<p>[!TIP]\nhi</p>\n</blockquote>\n<p>:::steps</p>\n<ol>\n<li>a</li>\n</ol>\n<p>:::</p>\n<p>:::code a.ts</p>\n' + code('ts', 'x') + '\n<p>:::</p>'));
    const tab = group?.tabs[0]?.html ?? '';
    expect(tab).toContain('data-callout="tip"');
    expect(tab).toMatch(/<div class="doq-steps">\s*<ol>/);
    expect(tab).toContain('<figcaption class="doq-code-title">a.ts</figcaption>');
  });

  it.each([
    ['an unclosed group', '<p>:::tabs\n:::tab A</p>\n<p>text</p>'],
    ['a tab outside tabs', '<p>:::tab A</p>\n<p>text</p>\n<p>:::</p>'],
    ['a group with no tabs', '<p>:::tabs</p>\n<p>:::</p>'],
    ['a tab without a label', '<p>:::tabs\n:::tab</p>\n<p>x</p>\n<p>:::</p>'],
    ['content before the first tab', '<p>:::tabs</p>\n<p>stray</p>\n<p>:::tab A</p>\n<p>x</p>\n<p>:::</p>'],
    ['text glued to a marker', '<p>:::tabs\n:::tab A\nglued text</p>\n<p>:::</p>'],
    ['an unknown directive', '<p>:::cards</p>\n<p>x</p>\n<p>:::</p>'],
  ])('leaves %s as literal html', (_name, source) => {
    const segments = parseDoqContent(source);
    expect(tabsOf(segments)).toHaveLength(0);
    expect(html(segments)).toBe(source);
  });

  it('never reads directives inside code fences or lists as tabs', () => {
    const fenced = '<pre><code class="language-md">:::tabs\n:::tab A\nx\n:::\n</code></pre>';
    const listed = '<ul>\n<li>:::tabs</li>\n<li>:::</li>\n</ul>';
    for (const source of [fenced, listed]) expect(html(parseDoqContent(source)).replace(/ data-language="[^"]+"/, '')).toBe(source);
  });

  it('does not nest tab groups: a group containing another is left literal, so no content is lost', () => {
    const source = '<p>:::tabs</p>\n<p>:::tab A</p>\n<p>:::tabs</p>\n<p>:::</p>';
    expect(tabsOf(parseDoqContent(source))).toHaveLength(0);
    expect(html(parseDoqContent(source))).toBe(source);
  });
});

describe('UNIT-082 steps and titled code', () => {
  it('wraps the ordered list of a steps group, keeping nested code and callouts', () => {
    const out = html(parseDoqContent('<p>:::steps</p>\n<ol>\n<li><p>Install</p>\n' + code('bash', 'pnpm add x') + '</li>\n<li><p>Use</p>\n<blockquote>\n<p>[!NOTE]\nok</p>\n</blockquote>\n</li>\n</ol>\n<p>:::</p>'));
    expect(out).toMatch(/^<div class="doq-steps">\s*<ol>/);
    expect(out).toMatch(/<\/ol>\s*<\/div>$/);
    expect(out).toContain('data-language="bash"');
    expect(out).toContain('data-callout="note"');
    expect(out).not.toContain(':::');
  });

  it('requires an ordered list in a steps group', () => {
    const source = '<p>:::steps</p>\n<ul>\n<li>x</li>\n</ul>\n<p>:::</p>';
    expect(html(parseDoqContent(source))).toBe(source);
  });

  it('wraps a fenced block in a figure with an escaped caption', () => {
    const out = html(parseDoqContent('<p>:::code app &amp; &lt;config&gt;.ts</p>\n' + code('ts', 'const a = 1;')));
    expect(out).toBe(`<figure class="doq-code"><figcaption class="doq-code-title">app &amp; &lt;config&gt;.ts</figcaption><pre data-language="ts"><code class="language-ts">const a = 1;\n</code></pre></figure>`);
  });

  it.each([
    ['no title', '<p>:::code</p>\n' + code('ts', 'a')],
    ['no code block after it', '<p>:::code a.ts</p>\n<p>text</p>'],
  ])('leaves a code directive with %s literal', (_name, source) => {
    expect(html(parseDoqContent(source)).replace(/ data-language="[^"]+"/, '')).toBe(source);
  });
});

describe('UNIT-083 language labels and compatibility with demos and plain markdown', () => {
  it('adds data-language to fenced code and never to language-less or mermaid blocks', () => {
    const out = html(parseDoqContent(code('ts', 'a') + '<pre><code>plain\n</code></pre><pre class="mermaid">graph</pre>'));
    expect(out.match(/data-language="ts"/g)).toHaveLength(1);
    expect(out.match(/data-language/g)).toHaveLength(1);
  });

  it('is the identity for markdown without rich blocks', () => {
    const source = '<h1 id="t">T</h1>\n<p>Plain <strong>text</strong>.</p>\n<table>\n<thead><tr><th>a</th></tr></thead>\n</table>\n<blockquote>\n<p>quote</p>\n</blockquote>\n<ol>\n<li>x</li>\n</ol>';
    expect(parseDoqContent(source)).toEqual([{ kind: 'html', html: source }]);
  });

  it('returns nothing for an empty document', () => {
    expect(parseDoqContent('')).toEqual([]);
  });

  it('keeps ::demo directives live around rich blocks, and literal inside code, lists and quotes', () => {
    const tabs = '<p>:::tabs\n:::tab A</p>\n' + code('ts', 'x') + '\n<p>:::</p>';
    const source = '<blockquote>\n<p>[!NOTE]\nbefore</p>\n</blockquote>\n<p>::demo[one]</p>\n' + tabs + '\n<p>::demo[two]</p>\n<p>::demo[one]</p>\n<pre><code>::demo[nope]\n</code></pre>\n<ul>\n<li>::demo[nope]</li>\n</ul>';
    const segments = parseDoqContent(source);
    expect(segments.map(segment => (segment.kind === 'demo' ? `demo:${segment.id}` : segment.kind))).toEqual(['html', 'demo:one', 'tabs', 'demo:two', 'demo:one', 'html']);
    expect(html(segments)).toContain('::demo[nope]');
  });

  it('does not put demos inside tab bodies', () => {
    const [group] = tabsOf(parseDoqContent('<p>:::tabs\n:::tab A</p>\n<p>::demo[x]</p>\n<p>:::</p>'));
    expect(group?.tabs[0]?.html).toContain('::demo[x]');
  });

  it('only cuts and wraps: every heading id survives, in order, with duplicate suffixes intact', () => {
    const headings = ['<h2 id="usage">Usage</h2>', '<h2 id="usage-1">Usage</h2>', '<h3 id="deep">Deep</h3>'];
    const source = [headings[0], '<blockquote>\n<p>[!TIP]\nx</p>\n</blockquote>', headings[1], '<p>:::steps</p>', '<ol>\n<li>a</li>\n</ol>', '<p>:::</p>', headings[2]].join('\n');
    const ids = [...html(parseDoqContent(source)).matchAll(/<h[1-6] id="([^"]+)"/g)].map(match => match[1]);
    expect(ids).toEqual(['usage', 'usage-1', 'deep']);
  });
});

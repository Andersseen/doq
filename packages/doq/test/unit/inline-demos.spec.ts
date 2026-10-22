import { describe, expect, it } from 'vitest';
import { splitDoqInlineDemos } from '../../src/lib/doq-inline-demos';

const html = (segments: ReturnType<typeof splitDoqInlineDemos>) => segments.map((s) => (s.kind === 'html' ? `H(${s.html.trim()})` : `D(${s.id})`));

describe('splitDoqInlineDemos', () => {
  it('UNIT-040: returns a document without directives as a single untouched segment', () => {
    const source = '<h2 id="a">A</h2>\n<p>Text</p>\n';
    expect(splitDoqInlineDemos(source)).toEqual([{ kind: 'html', html: source }]);
    expect(splitDoqInlineDemos('')).toEqual([]);
  });

  it('UNIT-040: cuts at top-level directive paragraphs and keeps document order', () => {
    const out = splitDoqInlineDemos('<h2 id="a">A</h2>\n<p>one</p>\n<p>::demo[first]</p>\n<h2 id="b">B</h2>\n<p>::demo[second]</p>\n<p>tail</p>');
    expect(html(out)).toEqual(['H(<h2 id="a">A</h2>\n<p>one</p>)', 'D(first)', 'H(<h2 id="b">B</h2>)', 'D(second)', 'H(<p>tail</p>)']);
  });

  it('UNIT-040: allows the same id repeatedly and adjacent directives', () => {
    expect(html(splitDoqInlineDemos('<p>::demo[x]</p>\n<p>::demo[x]</p>\n<p>::demo[y_1-b]</p>'))).toEqual(['D(x)', 'D(x)', 'D(y_1-b)']);
  });

  it('UNIT-041: leaves directives in code blocks, inline code, lists, quotes and tables literal', () => {
    const source = [
      '<pre><code class="language-text">::demo[in-fence]\n</code></pre>',
      '<p>Use <code>::demo[inline]</code> to embed.</p>',
      '<ul><li><p>::demo[in-list]</p></li></ul>',
      '<blockquote>\n<p>::demo[in-quote]</p>\n</blockquote>',
      '<table><tbody><tr><td>::demo[in-table]</td></tr></tbody></table>',
    ].join('\n');
    expect(splitDoqInlineDemos(source)).toEqual([{ kind: 'html', html: source }]);
  });

  it('UNIT-041: ignores paragraphs that merely mention a directive or use an invalid id', () => {
    const source = '<p>see ::demo[x] here</p>\n<p>::demo[]</p>\n<p>::demo[bad id]</p>\n<p>::demo[a]b</p>\n<p>:::demo[x]</p>';
    expect(splitDoqInlineDemos(source)).toEqual([{ kind: 'html', html: source }]);
  });

  it('UNIT-041: recognises a directive after void elements and comments but not inside raw containers', () => {
    const out = splitDoqInlineDemos('<hr>\n<!-- <div> -->\n<img src="a.png" alt="">\n<p>::demo[after]</p>\n<div>\n<p>::demo[nested]</p>\n</div>');
    expect(out.filter((s) => s.kind === 'demo').map((s) => (s as { id: string }).id)).toEqual(['after']);
  });

  it('UNIT-042: never changes heading ids or text, only cuts between top-level elements', () => {
    const source = '<h2 id="usage">Usage</h2>\n<p>::demo[a]</p>\n<h2 id="usage-1">Usage</h2>\n<p>::demo[b]</p>\n<h3 id="usage-2">Usage</h3>';
    const joined = splitDoqInlineDemos(source).filter((s) => s.kind === 'html').map((s) => (s as { html: string }).html).join('');
    expect([...joined.matchAll(/id="([^"]+)"/g)].map((m) => m[1])).toEqual(['usage', 'usage-1', 'usage-2']);
  });
});

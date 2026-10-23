import { Component, input } from '@angular/core';
import { screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Marked } from 'marked';
import { gfmHeadingId, getHeadingList } from 'marked-gfm-heading-id';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildContent } from '../../bin/content.mjs';
import type { DoqPlaygroundDefinition } from '../../src/public-api';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

// The Node-side processor produces the Markdown; marked renders it the way Analog does; the Angular document view displays it.
let cwd: string;
beforeEach(async () => {
  cwd = await realpath(await mkdtemp(join(tmpdir(), 'doq-authoring-comp-')));
});
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

async function write(files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), text);
  }
}

/** Resolves authored pages with the real processor and renders each as Analog would: HTML body plus table of contents. */
async function documents(authored: Record<string, string>, extra: Record<string, unknown> = {}, directory = 'docs'): Promise<FakeDoc[]> {
  await write({ ...authored, 'lib/.keep.ts': '' });
  const built = await buildContent({ cwd, targets: [{ authoring: 'authoring', out: 'out', sourceRoots: ['lib'], ...extra }] });
  expect(built.diagnostics).toEqual([]);
  return [...built.results[0]!.files].map(([name, markdown]) => {
    const marked = new Marked();
    marked.use(gfmHeadingId());
    const [, frontmatter = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(markdown) ?? [];
    const attributes = Object.fromEntries(
      frontmatter.split('\n').filter((line) => !line.startsWith('#')).map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]),
    );
    if (attributes['order']) attributes['order'] = Number(attributes['order']);
    const html = marked.parse(body) as string;
    return { source: name.replace(/\.md$/, ''), directory, body: html, attributes, toc: getHeadingList().map(({ id, text, raw }) => ({ id, text: text ?? raw, level: 2 })) } satisfies FakeDoc;
  });
}

const fm = (title: string, order = 1) => `---\ntitle: ${title}\norder: ${order}\n---\n`;
const SOURCE = `// #region doqs:usage
export const config = provide<Options>({ reducedMotion: 'system', label: "a < b && c" });
// #endregion doqs:usage
`;

@Component({ selector: 'authoring-signal', template: '<output>{{ value() }}</output>' })
class SignalComponent {
  readonly value = input('initial');
}
const playgrounds: Record<string, DoqPlaygroundDefinition> = {
  sig: { component: SignalComponent, title: 'Signal playground', controls: [{ input: 'value', kind: 'string', label: 'Value', initial: 'initial', required: true }] },
};

describe('COMP-130 source-backed code in the document view', () => {
  it('renders the extracted region as a titled, highlighted-ready code block and copies exactly that text', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true });
    const docs = await documents({ 'authoring/guide.md': `${fm('Guide')}Intro\n\n::source{file="lib/movement.ts" region="usage" title="movement.ts"}\n\nOutro`, 'lib/movement.ts': SOURCE });
    await renderDocs({ docs, url: '/docs/guide' });
    const caption = await screen.findByText('movement.ts');
    const figure = caption.closest('figure') as HTMLElement;
    expect(figure.classList.contains('doq-code')).toBe(true);
    expect(figure.querySelector('code')?.textContent).toBe(`export const config = provide<Options>({ reducedMotion: 'system', label: "a < b && c" });\n`);
    expect(within(figure).queryByText(/#region/)).toBeNull();
    expect(screen.queryByText(/::source/)).toBeNull();
    await user.click(within(figure).getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith(`export const config = provide<Options>({ reducedMotion: 'system', label: "a < b && c" });\n`);
    expect(figure.querySelectorAll('button.doq-code-copy')).toHaveLength(1);
  });

  it('keeps a snippet that looks like Markdown, directives and HTML inert text inside one block', async () => {
    const hostile = 'const t = `\n```\n::playground[sig]\n:::tabs\n<script>alert(1)</script>\n`;\n';
    const docs = await documents({ 'authoring/guide.md': `${fm('Guide')}::source{file="lib/h.ts"}\n\nAfter`, 'lib/h.ts': hostile });
    const { container } = await renderDocs({ docs, config: { playgrounds }, url: '/docs/guide', providers: [] });
    await screen.findByRole('heading', { level: 1, name: 'Guide' });
    expect(container.querySelectorAll('pre')).toHaveLength(1);
    expect(container.querySelector('pre code')?.textContent).toContain('<script>alert(1)</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('.doq-playground, [role="group"][aria-label="Signal playground"]')).toBeNull();
    expect(screen.getByText('After')).toBeTruthy();
  });
});

describe('COMP-131 included fragments', () => {
  it('appear in place, keep heading order and ids in the table of contents and next to existing content', async () => {
    const docs = await documents({
      'authoring/guide.md': `${fm('Guide')}## First\n\n::include{file="/_partials/setup.md"}\n\n## Last\n\nEnd`,
      'authoring/_partials/setup.md': '## Set up the library\n\nShared text.\n\n> [!NOTE]\n> Shared note.\n',
    });
    const { container } = await renderDocs({ docs, url: '/docs/guide' });
    await screen.findByRole('heading', { level: 1, name: 'Guide' });
    expect([...container.querySelectorAll('h2')].map((h) => [h.id, h.textContent])).toEqual([['first', 'First'], ['set-up-the-library', 'Set up the library'], ['last', 'Last']]);
    expect(container.querySelector('.doq-callout[data-callout="note"]')?.textContent).toContain('Shared note.');
    const toc = screen.getByRole('complementary', { name: 'On this page' });
    expect(within(toc).getAllByRole('link').map((link) => link.getAttribute('href') ?? link.textContent)).toHaveLength(3);
  });
});

describe('COMP-132 source examples next to demos, playgrounds and tabs', () => {
  it('shows a source block, a fragment-provided playground and a tab group together', async () => {
    const user = userEvent.setup();
    const docs = await documents({
      'authoring/guide.md': `${fm('Guide')}::source{file="lib/movement.ts" region="usage" title="movement.ts"}\n\n::include{file="/_partials/try.md"}\n\n:::tabs Usage\n\n:::tab One\n\n::source{file="lib/movement.ts" region="usage" title="inside.ts"}\n\n:::tab Two\n\nSecond\n\n:::`,
      'authoring/_partials/try.md': '::playground[sig]\n',
      'lib/movement.ts': SOURCE,
    });
    await renderDocs({ docs, config: { playgrounds }, url: '/docs/guide' });
    const playground = await screen.findByRole('group', { name: 'Signal playground' });
    await user.clear(within(playground).getByLabelText(/Value/));
    await user.type(within(playground).getByLabelText(/Value/), 'changed');
    await waitFor(() => expect(playground.querySelector('.doq-pg-frame output')?.textContent).toBe('changed'));
    expect(screen.getByText('movement.ts')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'One' })).toBeTruthy();
    expect(screen.getByRole('tabpanel').textContent).toContain('inside.ts');
  });
});

describe('COMP-133 API links', () => {
  const index = (symbols: Record<string, string>) => JSON.stringify({ generator: 'doq-api', files: {}, symbols });
  const reference = (directory: string, name: string): FakeDoc => ({ directory, source: `reference/generated/${name}`, body: `<p>${name} reference</p>`, attributes: { title: name, order: 5 } });

  it('links a guide to the generated page of the symbol and that route renders it', async () => {
    const docs = [
      ...(await documents(
        { 'authoring/guide.md': `${fm('Guide')}See [[api:MoveEnterDirective]].`, 'api/.doq-api.json': index({ MoveEnterDirective: '/docs/reference/generated/move-enter-directive' }) },
        { api: ['api'] },
      )),
      reference('docs', 'move-enter-directive'),
    ];
    docs[1]!.attributes = { title: 'MoveEnterDirective', order: 5 };
    const { container, router } = await renderDocs({ docs, url: '/docs/guide' });
    await screen.findByRole('heading', { level: 1, name: 'Guide' });
    const link = within(container.querySelector('.doq-markdown') as HTMLElement).getByRole('link', { name: 'MoveEnterDirective' });
    expect(link.getAttribute('href')).toBe('/docs/reference/generated/move-enter-directive');
    await router.navigateByUrl(link.getAttribute('href') as string);
    expect(await screen.findByRole('heading', { level: 1, name: 'MoveEnterDirective' })).toBeTruthy();
    expect(screen.getByText('move-enter-directive reference')).toBeTruthy();
  });

  it('keeps an archived guide inside the archive and never lands on the current page of the same name', async () => {
    await write({ 'api-v1/.doq-api.json': index({ Thing: '/docs/v/1/reference/generated/thing' }), 'api/.doq-api.json': index({ Thing: '/docs/reference/generated/thing' }) });
    await write({ 'authoring/g.md': `${fm('Current guide')}[[api:Thing]]`, 'authoring-v1/g.md': `${fm('Archived guide')}[[api:Thing]]`, 'lib/.keep.ts': '', 'lib-v1/.keep.ts': '' });
    const built = await buildContent({
      cwd,
      targets: [
        { name: 'latest', authoring: 'authoring', out: 'out', api: ['api'] },
        { name: 'v1', authoring: 'authoring-v1', out: 'out-v1', api: ['api-v1'] },
      ],
    });
    expect(built.diagnostics).toEqual([]);
    const html = (index: number) => (built.results[index]!.files.get('g.md') as string).split('\n').find((line) => line.startsWith('[')) as string;
    expect(html(1)).toBe('[`Thing`](/docs/v/1/reference/generated/thing)');
    const docs: FakeDoc[] = [
      { source: 'g', body: '<p>Current</p>', attributes: { title: 'Current guide' } },
      { source: 'reference/generated/thing', body: '<p>Current thing</p>', attributes: { title: 'Thing' } },
      { source: 'g', directory: 'docs-v1', body: `<p><a href="/docs/v/1/reference/generated/thing">Thing</a></p>`, attributes: { title: 'Archived guide' } },
      { source: 'reference/generated/thing', directory: 'docs-v1', body: '<p>Archived thing</p>', attributes: { title: 'Thing' } },
    ];
    const { container, router } = await renderDocs({ docs, url: '/docs/v/1/g', config: { versioning: { current: { id: 'latest' }, archives: [{ id: '1', contentDirectory: 'docs-v1' }] } } });
    await screen.findByRole('heading', { level: 1, name: 'Archived guide' });
    const link = within(container.querySelector('.doq-markdown') as HTMLElement).getByRole('link', { name: 'Thing' });
    expect(link.getAttribute('href')).toBe('/docs/v/1/reference/generated/thing');
    await router.navigateByUrl(link.getAttribute('href') as string);
    expect(await screen.findByText('Archived thing')).toBeTruthy();
    expect(screen.queryByText('Current thing')).toBeNull();
  });

  it('fails the build for an unknown symbol, so no page links to an invented URL', async () => {
    await write({ 'authoring/guide.md': `${fm('Guide')}[[api:Nope]]`, 'api/.doq-api.json': index({ Real: '/docs/real' }), 'lib/.keep.ts': '' });
    const built = await buildContent({ cwd, targets: [{ authoring: 'authoring', out: 'out', sourceRoots: ['lib'], api: ['api'] }] });
    expect(built.diagnostics).toMatchObject([{ kind: 'unknown-symbol', reference: 'Nope' }]);
    expect(built.results[0]!.files.get('guide.md')).toContain('[[api:Nope]]');
  });
});

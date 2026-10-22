import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Marked, type Tokens } from 'marked';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { buildApiReference } from '../../bin/api-reference.mjs';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

const slugger = (text: string) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-');

/** Renders Markdown to the HTML and table of contents Analog's build produces: GFM, heading ids, language classes. */
async function toHtml(markdown: string) {
  const toc: { id: string; text: string; level: number }[] = [];
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = this.parser.parseInline(tokens);
        const plain = text.replace(/<[^>]+>/g, '');
        const id = slugger(plain);
        if (depth > 1 && depth < 4) toc.push({ id, text: plain, level: depth });
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      },
      code({ text, lang }: Tokens.Code) {
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return `<pre><code class="language-${lang ?? 'text'}">${escaped}\n</code></pre>`;
      },
    },
  });
  return { html: await marked.parse(markdown), toc };
}

const work = resolve(import.meta.dirname, '../.work');
const roots: string[] = [];

/** Real generator output for a small Angular library, as Markdown documents of the docs tree. */
async function generatedDocs(): Promise<FakeDoc[]> {
  await mkdir(work, { recursive: true });
  const cwd = await mkdtemp(join(work, 'comp-'));
  roots.push(cwd);
  const files: Record<string, string> = {
    'src/public-api.ts': `export * from './alert';\nexport type { Tone } from './tone';`,
    'src/tone.ts': `/** Visual intent. */\nexport type Tone = 'info' | 'danger';`,
    'src/alert.ts': `
import { Component, booleanAttribute, input, output } from '@angular/core';
import type { Tone } from './tone';

/**
 * An inline message.
 *
 * @example
 * <app-alert tone="danger">Failed</app-alert>
 */
@Component({ selector: 'app-alert', template: '' })
export class AlertComponent {
  /** Visual intent. */
  readonly tone = input.required<Tone>();
  readonly heading = input('', { alias: 'alertTitle' });
  readonly dismissible = input(false, { transform: booleanAttribute });
  readonly dismissed = output<void>();
  /** Closes the alert. */
  dismiss(): void {}
  /** @deprecated Use dismiss(). */
  close(): void {}
}
`,
  };
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await writeFile(join(cwd, path), text);
  }
  const built = await buildApiReference({ cwd, entry: 'src/public-api.ts', out: 'src/content/docs/reference/generated' });
  return Promise.all([...built.files].map(async ([name, text]) => {
    const [, front = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) ?? [];
    const attributes = Object.fromEntries(
      front
        .split('\n')
        .filter((line) => !line.startsWith('#'))
        .map((line) => {
          const [key, ...rest] = line.split(': ');
          const value = rest.join(': ');
          return [key, /^\d+$/.test(value) ? Number(value) : value.replace(/^"|"$/g, '')];
        }),
    );
    const { html, toc } = await toHtml(body);
    return { source: `reference/generated/${name.replace(/\.md$/, '')}`, attributes, body: html, toc };
  }));
}

afterAll(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

const open = async (url: string, config: Record<string, unknown> = {}) =>
  renderDocs({ docs: await generatedDocs(), url, config });

describe('generated API reference pages', () => {
  it('COMP-100: shows the selector, inputs with required flag and alias, and outputs as accessible tables', async () => {
    await open('/docs/reference/generated/alert-component');
    expect(await screen.findByRole('heading', { level: 1, name: 'AlertComponent' })).toBeTruthy();
    expect((await screen.findByRole('heading', { level: 2, name: 'Selector' })).nextElementSibling?.textContent).toContain('app-alert');
    const inputs = screen.getAllByRole('table')[0]!;
    expect(within(inputs).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Input', 'Type', 'Default', 'Required', 'Description']);
    const rows = within(inputs).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent?.trim()));
    expect(rows[0]).toEqual(['tone', 'Tone', '', 'Yes', 'Visual intent.']);
    expect(rows[1]?.[0]).toBe('alertTitle (property heading)');
    expect(rows[2]).toEqual([expect.stringContaining('dismissible'), 'unknown', 'false', '', expect.stringContaining('reads as boolean')]);
    const outputs = screen.getAllByRole('table')[1]!;
    expect(within(outputs).getAllByRole('cell').map((cell) => cell.textContent?.trim())).toContain('dismissed');
  });

  it('COMP-101: links a type to a reference page that exists at exactly that public route', async () => {
    const { router } = await open('/docs/reference/generated/alert-component');
    const link = (await screen.findAllByRole('link', { name: 'Tone' })).find((anchor) => anchor.closest('table'))!;
    const href = link.getAttribute('href')!;
    expect(href).toBe('/docs/reference/generated/tone');
    // Analog does not intercept links inside Markdown, so following one is a normal navigation to this route.
    await router.navigateByUrl(href);
    expect(await screen.findByRole('heading', { level: 1, name: 'Tone' })).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 2, name: 'Definition' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Page navigation' }).textContent).toContain('AlertComponent');
  });

  it('COMP-102: lists the page sections in the table of contents, in order', async () => {
    await open('/docs/reference/generated/alert-component');
    const toc = await screen.findByRole('complementary', { name: 'On this page' });
    expect(within(toc).getAllByRole('link').map((anchor) => anchor.textContent?.trim())).toEqual([
      'Overview',
      'Selector',
      'Inputs',
      'Outputs',
      'Public methods',
      'dismiss',
      'close',
      'Related types',
      'Examples',
    ]);
  });

  it('COMP-103: copies the exact source of a generated code block', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true });
    await open('/docs/reference/generated/alert-component');
    const example = (await screen.findByRole('heading', { level: 2, name: 'Examples' })).nextElementSibling as HTMLElement;
    await user.click(within(example).getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalledWith('<app-alert tone="danger">Failed</app-alert>\n');
  });

  it('COMP-104: renders deprecation as a note and keeps rich blocks working next to tables', async () => {
    await open('/docs/reference/generated/alert-component');
    const close = (await screen.findByRole('heading', { level: 3, name: 'close' })).parentElement as HTMLElement;
    const note = within(close).getByRole('note');
    expect(note.getAttribute('data-callout')).toBe('warning');
    expect(note.textContent).toContain('Deprecated.');
    expect(note.textContent).toContain('Use dismiss().');
    expect(note.textContent).not.toContain('[!WARNING]');
  });

  it('COMP-105: the index links to every documented symbol in docs-first and embedded mounts', async () => {
    await open('/docs/reference/generated');
    const embedded = await screen.findAllByRole('link', { name: 'AlertComponent' });
    expect(embedded.some((anchor) => anchor.getAttribute('href') === '/docs/reference/generated/alert-component')).toBe(true);
  });

  it('COMP-107: a table wider than its column becomes a named, keyboard-focusable scroll region; a narrow one does not', async () => {
    const width = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'TABLE' && this.textContent?.includes('Payload') ? 100 : 900;
    });
    const client = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'TABLE' ? 300 : 0;
    });
    try {
      await open('/docs/reference/generated/alert-component');
      const inputs = (await screen.findByRole('heading', { level: 2, name: 'Inputs' })).nextElementSibling as HTMLElement;
      await vi.waitFor(() => expect(inputs.getAttribute('tabindex')).toBe('0'));
      expect(inputs.tagName).toBe('TABLE');
      expect(inputs.getAttribute('aria-label')).toBe('Inputs table');
      expect(screen.getByRole('table', { name: 'Inputs table' })).toBe(inputs);
      const outputs = screen.getAllByRole('table').find((table) => table.textContent?.includes('Payload'))!;
      expect(outputs.hasAttribute('tabindex')).toBe(false);
    } finally {
      width.mockRestore();
      client.mockRestore();
    }
  });

  it('COMP-106: reads the committed Showcase A output as ordinary documents', async () => {
    const markdown = await readFile(resolve(import.meta.dirname, '../../../../apps/showcase-a/src/content/docs/reference/generated/vanta-alert-component.md'), 'utf8');
    expect(markdown).toMatch(/^---\n# Generated by doq-api/);
    expect(markdown).toContain('| `tone` | [`VantaTone`](/docs/reference/generated/vanta-tone) |');
  });
});

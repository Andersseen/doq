import { Component, OnDestroy, signal } from '@angular/core';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

const destroyed: string[] = [];

@Component({ selector: 'counter-demo', template: '<section aria-label="Counter"><button type="button" (click)="n.set(n() + 1)">Add</button><output>{{ n() }}</output></section>' })
class CounterDemoComponent implements OnDestroy {
  readonly n = signal(0);
  ngOnDestroy() { destroyed.push('counter'); }
}

const page = (body: string): FakeDoc[] => [
  { source: 'guide', body, attributes: { title: 'Guide', order: 1 } },
  { source: 'other', body: '<p>Other body</p>', attributes: { title: 'Other', order: 2 } },
];
const code = (language: string, body: string) => `<pre><code class="language-${language}">${body}\n</code></pre>`;
const group = (label: string, tabs: Array<[string, string]>) => `<p>:::tabs ${label}</p>${tabs.map(([name, body]) => `<p>:::tab ${name}</p>${body}`).join('')}<p>:::</p>`;
const install = group('Package manager', [['npm', code('bash', 'npm install @doqs/analog')], ['pnpm', code('bash', 'pnpm add @doqs/analog')], ['yarn', code('bash', 'yarn add @doqs/analog')]]);
const open = (body: string, extra: Record<string, unknown> = {}) => renderDocs({ docs: page(body), url: '/docs/guide', ...extra });

describe('rich content: callouts', () => {
  it('COMP-080: renders a callout as a labelled note with nested Markdown, and leaves ordinary quotes alone', async () => {
    const { container } = await open('<blockquote><p>[!WARNING]\nAvoid <code>window</code> during SSR, see <a href="/docs/other">Other</a>.</p><ul><li>first</li><li>second</li></ul></blockquote><blockquote><p>An ordinary quote</p></blockquote>');
    const note = await screen.findByRole('note');
    expect(note.getAttribute('data-callout')).toBe('warning');
    expect(within(note).getByText('Warning')).toBeTruthy();
    expect(within(note).getByText('window').tagName).toBe('CODE');
    expect(within(note).getByRole('link', { name: 'Other' }).getAttribute('href')).toBe('/docs/other');
    expect(within(note).getAllByRole('listitem').map(item => item.textContent)).toEqual(['first', 'second']);
    expect(note.textContent).not.toContain('[!WARNING]');
    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
    expect(screen.getByText('An ordinary quote').closest('blockquote')).toBeTruthy();
  });

  it('COMP-081: excludes the callout title from search but not its body', async () => {
    const { container } = await open('<blockquote><p>[!TIP]\nRegister demos once.</p></blockquote>');
    await screen.findByRole('note');
    expect(container.querySelector('.doq-callout-title')?.hasAttribute('data-pagefind-ignore')).toBe(true);
    expect(container.querySelector('.doq-callout')?.hasAttribute('data-pagefind-ignore')).toBe(false);
  });

  it('COMP-082: shows an unknown marker as the author wrote it', async () => {
    await open('<blockquote><p>[!DANGER]\nNo such kind</p></blockquote>');
    expect(await screen.findByText(/\[!DANGER\]/)).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('rich content: tabs', () => {
  it('COMP-083: exposes tablist, tabs and panels with matching relationships and only the first panel visible', async () => {
    await open(install);
    const tablist = await screen.findByRole('tablist', { name: 'Package manager' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent?.trim())).toEqual(['npm', 'pnpm', 'yarn']);
    expect(tabs.map(tab => tab.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map(tab => tab.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    const panels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(panels).toHaveLength(3);
    tabs.forEach((tab, index) => {
      expect(tab.getAttribute('aria-controls')).toBe(panels[index]!.id);
      expect(panels[index]!.getAttribute('aria-labelledby')).toBe(tab.id);
    });
    expect(panels.map(panel => panel.hidden)).toEqual([false, true, true]);
    expect(screen.getByRole('tabpanel')).toBe(panels[0]);
    expect(screen.getByRole('tabpanel').textContent).toContain('npm install @doqs/analog');
  });

  it('COMP-084: selects with the pointer and keeps the content of inactive panels in the document', async () => {
    const user = userEvent.setup();
    await open(install);
    await user.click(await screen.findByRole('tab', { name: 'pnpm' }));
    expect(screen.getByRole('tab', { name: 'pnpm' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('pnpm add @doqs/analog');
    expect(screen.getByRole('tab', { name: 'npm' }).getAttribute('tabindex')).toBe('-1');
  });

  it('COMP-085: moves selection and focus with arrow keys, Home and End, wrapping at the ends', async () => {
    const user = userEvent.setup();
    await open(install);
    const [npm, pnpm, yarn] = await screen.findAllByRole('tab');
    npm!.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(pnpm);
    expect(pnpm!.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(yarn);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(npm);
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(yarn);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(npm);
    expect(screen.getByRole('tabpanel').textContent).toContain('npm install');
  });

  it('COMP-086: keeps several groups independent', async () => {
    const user = userEvent.setup();
    await open(install + '<p>between</p>' + group('Language', [['TypeScript', code('ts', 'const a = 1;')], ['JavaScript', code('js', 'var a = 1;')]]));
    const lists = await screen.findAllByRole('tablist');
    expect(lists).toHaveLength(2);
    await user.click(within(lists[1]!).getByRole('tab', { name: 'JavaScript' }));
    expect(within(lists[0]!).getByRole('tab', { name: 'npm' }).getAttribute('aria-selected')).toBe('true');
    expect(within(lists[1]!).getByRole('tab', { name: 'JavaScript' }).getAttribute('aria-selected')).toBe('true');
    const ids = screen.getAllByRole('tab', { hidden: true }).map(tab => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('COMP-087: renders Markdown, lists and callouts inside a panel and excludes only the tab strip from search', async () => {
    const { container } = await open(group('Setup', [['One', '<p>Intro <strong>bold</strong></p><ul><li>a</li></ul><blockquote><p>[!NOTE]\ninside</p></blockquote>'], ['Two', '<p>second</p>']]));
    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText('bold').tagName).toBe('STRONG');
    expect(within(panel).getByRole('note').textContent).toContain('inside');
    expect(container.querySelector('[role=tablist]')?.hasAttribute('data-pagefind-ignore')).toBe(true);
    expect(container.querySelector('[role=tabpanel]')?.closest('[data-pagefind-ignore]')).toBeNull();
  });

  it('COMP-088: shows malformed tab syntax as literal text', async () => {
    await open('<p>:::tabs\n:::tab npm</p><p>no closing marker</p>');
    expect(await screen.findByText(/:::tab npm/)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('COMP-089: copies exactly the active code payload', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true });
    await open(install);
    await user.click(await screen.findByRole('tab', { name: 'yarn' }));
    const panel = screen.getByRole('tabpanel');
    const copy = await within(panel).findByRole('button', { name: 'Copy code' });
    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith('yarn add @doqs/analog\n');
  });

  it('COMP-095: opens the tab that holds the heading a fragment points to', async () => {
    const body = group('Setup', [['One', '<p>first</p>'], ['Two', '<h3 id="inner-heading">Inner heading</h3><p>second</p>']]);
    await renderDocs({ docs: page(body), url: '/docs/guide#inner-heading' });
    const tab = await screen.findByRole('tab', { name: 'Two' });
    await vi.waitFor(() => expect(tab.getAttribute('aria-selected')).toBe('true'));
    expect(screen.getByRole('tabpanel').textContent).toContain('second');
  });

  it('COMP-090: resets to a clean state when navigating to another document', async () => {
    const user = userEvent.setup();
    const { router } = await open(install);
    await user.click(await screen.findByRole('tab', { name: 'yarn' }));
    await router.navigateByUrl('/docs/other');
    await screen.findByText('Other body');
    expect(screen.queryByRole('tablist')).toBeNull();
    await router.navigateByUrl('/docs/guide');
    expect((await screen.findByRole('tab', { name: 'npm' })).getAttribute('aria-selected')).toBe('true');
  });
});

describe('rich content: steps, titled code and demos', () => {
  it('COMP-091: renders steps as one native ordered list with code and a callout in a step', async () => {
    const { container } = await open('<p>:::steps</p><ol><li><p>Install</p>' + code('bash', 'pnpm add x') + '</li><li><p>Configure</p><blockquote><p>[!NOTE]\nOptional.</p></blockquote></li></ol><p>:::</p>');
    await screen.findByRole('note');
    const list = container.querySelector<HTMLElement>('.doq-steps > ol')!;
    expect(list.tagName).toBe('OL');
    expect(container.querySelectorAll('.doq-steps ol')).toHaveLength(1);
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('pnpm add x')).toBeTruthy();
    expect(within(items[1]!).getByRole('note').textContent).toContain('Optional.');
    expect(container.textContent).not.toContain(':::');
  });

  it('COMP-092: gives a titled code block an accessible caption and keeps the copy control', async () => {
    const { container } = await open('<p>:::code app.config.ts</p>' + code('ts', 'export const config = {};'));
    const figure = container.querySelector('figure.doq-code')!;
    await within(figure as HTMLElement).findByRole('button', { name: 'Copy code' });
    expect(within(figure as HTMLElement).getByText('app.config.ts').tagName).toBe('FIGCAPTION');
    expect(figure.querySelector('pre')?.getAttribute('data-language')).toBe('ts');
  });

  it('COMP-093: keeps registered demos live around callouts and tabs, with independent state', async () => {
    const user = userEvent.setup();
    await renderDocs({
      docs: page('<blockquote><p>[!TIP]\nBefore</p></blockquote><p>::demo[counter]</p>' + install + '<p>::demo[counter]</p><blockquote><p>[!NOTE]\nAfter</p></blockquote>'),
      config: { demos: { counter: CounterDemoComponent } }, url: '/docs/guide',
    });
    const counters = await screen.findAllByRole('region', { name: 'Counter' });
    expect(counters).toHaveLength(2);
    await user.click(within(counters[0]!).getByRole('button', { name: 'Add' }));
    await user.click(await screen.findByRole('tab', { name: 'pnpm' }));
    await user.click(within(counters[1]!).getByRole('button', { name: 'Add' }));
    await user.click(within(counters[1]!).getByRole('button', { name: 'Add' }));
    expect(counters.map(counter => counter.querySelector('output')!.textContent)).toEqual(['1', '2']);
    expect(screen.getAllByRole('note')).toHaveLength(2);
  });

  it('COMP-094: renders a document without rich blocks exactly as before', async () => {
    const { container } = await open('<h2 id="a">A</h2><p>Plain text</p><blockquote><p>quote</p></blockquote>');
    await screen.findByText('Plain text');
    expect(container.querySelector('doq-tabs')).toBeNull();
    expect(container.querySelector('.doq-callout')).toBeNull();
    expect(container.querySelectorAll('.doq-markdown')).toHaveLength(1);
    expect(container.querySelector('h2')?.id).toBe('a');
  });
});

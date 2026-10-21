import { screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';
import { DoqSearchService } from '../../src/lib/doq-search.service';
import { DoqSearchResult } from '../../src/lib/doq-search';

const docs: FakeDoc[] = [
  { source: 'intro', body: 'Intro body', attributes: { title: 'Introduction', group: 'Guide', order: 1 }, toc: [{ id: 'why', text: 'Why Doq', level: 2 }, { id: 'details', text: 'Details', level: 2 }] },
  { source: 'guides/install', body: 'Install body', attributes: { title: 'Install', group: 'Guide', order: 2 } },
];

const text = (value: string, mark = false) => ({ text: value, mark });
const result = (url: string, title: string, excerpt = [text('about '), text('doq', true)], section?: string): DoqSearchResult => ({ url, title, section, excerpt });

class FakeSearch {
  calls: string[] = [];
  handler: (query: string) => Promise<DoqSearchResult[]> = async () => [];
  search(query: string) {
    this.calls.push(query);
    return this.handler(query);
  }
}

beforeEach(() => {
  // jsdom has no modal <dialog>; model the parts Doq relies on.
  const openers = new WeakMap<HTMLDialogElement, Element | null>();
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    openers.set(this, document.activeElement);
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    (openers.get(this) as HTMLElement | null)?.focus();
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => vi.restoreAllMocks());

async function renderSearch(search = new FakeSearch(), url = '/docs/intro') {
  const view = await renderDocs({
    docs,
    url,
    config: { search: { enabled: true } },
    providers: [{ provide: DoqSearchService, useValue: search }],
  });
  await screen.findByRole('heading', { level: 1 });
  return { ...view, search, user: userEvent.setup() };
}

const dialogEl = () => document.querySelector('dialog') as HTMLDialogElement;
const input = () => within(dialogEl()).getByLabelText('Search the documentation') as HTMLInputElement;

describe('DoqSearchComponent', () => {
  it('COMP-010: renders no search control unless search is enabled', async () => {
    await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: /Search/ })).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.querySelector('[data-pagefind-body]')).not.toBeNull();
  });

  it('COMP-010: search disabled explicitly renders nothing and never calls the service', async () => {
    const search = new FakeSearch();
    await renderDocs({ docs, url: '/docs/intro', config: { search: { enabled: false } }, providers: [{ provide: DoqSearchService, useValue: search }] });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: /Search/ })).toBeNull();
    expect(search.calls).toEqual([]);
  });

  it('COMP-010: enabled search shows a trigger, loads nothing until the reader types, and marks documentation content', async () => {
    const { search } = await renderSearch();
    expect(screen.getByRole('button', { name: /^Search/ }).getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K');
    expect(search.calls).toEqual([]);
    expect(document.querySelector('article[data-pagefind-body]')).not.toBeNull();
    for (const ignored of ['.doq-topbar', '.doq-eyebrow', '.doq-pagination']) {
      expect(document.querySelector(ignored)?.hasAttribute('data-pagefind-ignore')).toBe(true);
    }
  });

  it('COMP-011: opening focuses a labelled search field inside a named dialog with a status message', async () => {
    const { user } = await renderSearch();
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    const dialog = screen.getByRole('dialog', { name: 'Search documentation' });
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(document.activeElement).toBe(input());
    expect(within(dialog).getByRole('status').textContent).toContain('Type to search');
  });

  it('COMP-011: typing shows a loading state, then results with title, section and highlighted excerpt', async () => {
    const search = new FakeSearch();
    let release!: (value: DoqSearchResult[]) => void;
    search.handler = () => new Promise((resolve) => (release = resolve));
    const { user } = await renderSearch(search);
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'doq');
    await waitFor(() => expect(search.calls).toEqual(['doq']));
    expect(within(dialogEl()).getByRole('status').textContent).toBe('Searching…');
    release([result('/docs/intro#why', 'Introduction', [text('Learn '), text('Doq', true), text(' today')], 'Why Doq')]);
    const link = await within(dialogEl()).findByRole('link', { name: /Introduction/ });
    expect(link.getAttribute('href')).toBe('/docs/intro#why');
    expect(link.textContent).toContain('Why Doq');
    expect(link.querySelector('mark')?.textContent).toBe('Doq');
    expect(within(dialogEl()).getByRole('status').textContent).toBe('1 result');
    expect(search.calls).toEqual(['doq']);
  });

  it('COMP-011: an unmatched query shows an empty state', async () => {
    const { user } = await renderSearch();
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'zzz');
    await waitFor(() => expect(within(dialogEl()).getByRole('status').textContent).toBe('No results for “zzz”.'));
    expect(within(dialogEl()).queryAllByRole('link')).toHaveLength(0);
  });

  it('COMP-011: an unavailable index shows an error state and clearing the field resets it', async () => {
    const search = new FakeSearch();
    search.handler = async () => {
      throw new Error('missing bundle');
    };
    const { user } = await renderSearch(search);
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'doq');
    await waitFor(() => expect(within(dialogEl()).getByRole('status').textContent).toContain('Search is unavailable'));
    await user.clear(input());
    expect(within(dialogEl()).getByRole('status').textContent).toContain('Type to search');
    expect(screen.getByRole('heading', { level: 1, name: 'Introduction' })).toBeTruthy();
  });

  it('COMP-012: result text is rendered as text, never as markup', async () => {
    const search = new FakeSearch();
    search.handler = async () => [result('/docs/intro', 'Introduction <img src=x onerror=alert(1)>', [text('<script>alert(1)</script>'), text('<b>hit</b>', true)])];
    const { user } = await renderSearch(search);
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'x');
    const link = await within(dialogEl()).findByRole('link');
    expect(link.querySelector('img, script, b')).toBeNull();
    expect(link.textContent).toContain('<script>alert(1)</script>');
    expect(link.querySelector('mark')?.textContent).toBe('<b>hit</b>');
  });

  it('COMP-012: a slow earlier response never replaces a newer query’s results', async () => {
    const search = new FakeSearch();
    const pending = new Map<string, (value: DoqSearchResult[]) => void>();
    search.handler = (query) => new Promise((resolve) => pending.set(query, resolve));
    const { user } = await renderSearch(search);
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'a');
    await waitFor(() => expect(search.calls).toEqual(['a']));
    await user.type(input(), 'b');
    await waitFor(() => expect(search.calls).toEqual(['a', 'ab']));
    pending.get('ab')!([result('/docs/guides/install', 'Install')]);
    await within(dialogEl()).findByRole('link', { name: /Install/ });
    pending.get('a')!([result('/docs/intro', 'Introduction')]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(within(dialogEl()).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/docs/guides/install']);
  });

  it('COMP-013: arrow keys move through results, Enter opens one and closes the dialog', async () => {
    const search = new FakeSearch();
    search.handler = async () => [result('/docs/guides/install', 'Install'), result('/docs/intro#details', 'Introduction', undefined, 'Details')];
    const { user, router } = await renderSearch(search);
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'in');
    const links = await within(dialogEl()).findAllByRole('link');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(links[0]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(links[1]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(links[1]);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(document.activeElement).toBe(input());
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(router.url).toBe('/docs/guides/install'));
    expect(dialogEl()?.hasAttribute('open') ?? false).toBe(false);
  });

  it('COMP-013: Enter in the field opens the first result', async () => {
    const search = new FakeSearch();
    search.handler = async () => [result('/docs/guides/install', 'Install')];
    const { user, router } = await renderSearch(search);
    await user.click(screen.getByRole('button', { name: /^Search/ }));
    await user.type(input(), 'inst');
    await within(dialogEl()).findByRole('link');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(router.url).toBe('/docs/guides/install'));
  });

  it('COMP-013: Escape closes even with text in the field and focus returns to the trigger', async () => {
    const { user } = await renderSearch();
    const trigger = screen.getByRole('button', { name: /^Search/ });
    await user.click(trigger);
    await user.type(input(), 'abc');
    await user.keyboard('{Escape}');
    expect(dialogEl().hasAttribute('open')).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('COMP-013: Ctrl+K and Meta+K open the dialog in documentation views, but not from other text fields', async () => {
    const { user } = await renderSearch();
    await user.keyboard('{Control>}k{/Control}');
    expect(dialogEl().hasAttribute('open')).toBe(true);
    dialogEl().close();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(dialogEl().hasAttribute('open')).toBe(true);
    dialogEl().close();

    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();
    await user.keyboard('{Control>}k{/Control}');
    expect(dialogEl().hasAttribute('open')).toBe(false);
    field.remove();
  });

  it('COMP-013: the shortcut listener is removed when the documentation view is destroyed', async () => {
    const { user, fixture } = await renderSearch();
    fixture.destroy();
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    void user;
  });

  it('COMP-014: the document index offers search when enabled', async () => {
    const view = await renderDocs({ docs, url: '/docs', config: { search: { enabled: true } }, providers: [{ provide: DoqSearchService, useValue: new FakeSearch() }] });
    expect(await screen.findByRole('button', { name: /^Search/ })).toBeTruthy();
    view.fixture.destroy();
  });
});

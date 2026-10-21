import { screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

const docs: FakeDoc[] = [
  { source: 'intro', body: '<h2 id="why">Why Doq</h2><p>Intro body</p><h2 id="details">Details</h2><p>More</p>', attributes: { title: 'Introduction', group: 'Guide', order: 1 }, toc: [{ id: 'why', text: 'Why Doq', level: 2 }, { id: 'details', text: 'Details', level: 2 }] },
  { source: 'guides/install', body: 'Install body', attributes: { title: 'Install', group: 'Guide', order: 2 } },
  { source: 'guides/deploy', body: 'Deploy body', attributes: { title: 'Deploy', group: 'Guide', order: 3 } },
];

let scrollIntoView: ReturnType<typeof vi.fn>;
let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollIntoView = vi.fn();
  scrollTo = vi.fn();
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView;
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
});
afterEach(() => vi.restoreAllMocks());

const scrolledIds = () => scrollIntoView.mock.contexts.map((element) => (element as HTMLElement).id);

describe('fragment navigation', () => {
  it('COMP-015: loading a document URL with a fragment scrolls that heading once the content is rendered', async () => {
    await renderDocs({ docs, url: '/docs/intro#details' });
    await waitFor(() => expect(scrolledIds()).toEqual(['details']));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('COMP-015: following a table-of-contents link scrolls its heading and keeps the fragment', async () => {
    const user = userEvent.setup();
    const { router } = await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { level: 1, name: 'Introduction' });
    await user.click(within(screen.getByRole('complementary', { name: 'On this page' })).getByRole('link', { name: 'Details' }));
    await waitFor(() => expect(scrolledIds()).toEqual(['details']));
    expect(router.url).toBe('/docs/intro#details');
    await user.click(screen.getByRole('link', { name: 'Why Doq' }));
    await waitFor(() => expect(scrolledIds()).toEqual(['details', 'why']));
  });

  it('COMP-015: a fragment that matches no heading scrolls nothing, fails nothing and steals no focus', async () => {
    await renderDocs({ docs, url: '/docs/intro#no-such-heading' });
    await screen.findByRole('heading', { level: 1, name: 'Introduction' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it('COMP-015: only headings inside the Markdown body are scroll targets', async () => {
    await renderDocs({ docs, url: '/docs/intro#details' });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect((scrollIntoView.mock.contexts[0] as HTMLElement).closest('.doq-markdown')).not.toBeNull();
  });

  it('COMP-015: a plain document load does not move focus', async () => {
    await renderDocs({ docs, url: '/docs/guides/install' });
    await screen.findByRole('heading', { level: 1, name: 'Install' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(document.activeElement).toBe(document.body);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('navigation continuity', () => {
  it('COMP-016: choosing a page in the open mobile menu closes it and focuses the new article heading', async () => {
    const user = userEvent.setup();
    const { router } = await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { level: 1, name: 'Introduction' });
    const trigger = screen.getByRole('button', { name: 'Documentation menu' });
    await user.click(trigger);
    await user.click(within(screen.getByRole('navigation', { name: 'Documentation' })).getByRole('link', { name: 'Install' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Install' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(router.url).toBe('/docs/guides/install');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(screen.getByRole('button', { name: 'Documentation menu' }).getAttribute('aria-expanded')).toBe('false');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('COMP-016: the focus target is not a tab stop in the normal tab order', async () => {
    const user = userEvent.setup();
    await renderDocs({ docs, url: '/docs/guides/install' });
    const heading = await screen.findByRole('heading', { level: 1, name: 'Install' });
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(document.activeElement).not.toBe(heading);
    }
  });

  it('COMP-016: previous and next links start the new document at the top with focus on its heading', async () => {
    const user = userEvent.setup();
    const { router } = await renderDocs({ docs, url: '/docs/guides/install' });
    await screen.findByRole('heading', { level: 1, name: 'Install' });
    await user.click(within(screen.getByRole('navigation', { name: 'Page navigation' })).getByRole('link', { name: /Deploy/ }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Deploy' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(router.url).toBe('/docs/guides/deploy');
    await user.click(within(screen.getByRole('navigation', { name: 'Page navigation' })).getByRole('link', { name: /Install/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Install' })));
  });

  it('COMP-016: a result with a fragment on another document focuses that heading, not the page title', async () => {
    const { router } = await renderDocs({ docs, url: '/docs/guides/install' });
    await screen.findByRole('heading', { level: 1, name: 'Install' });
    await router.navigateByUrl('/docs/intro#details');
    await waitFor(() => expect(document.activeElement?.id).toBe('details'));
    expect(scrolledIds().at(-1)).toBe('details');
  });

  it('COMP-016: Escape and Close still return focus to the trigger without navigating', async () => {
    const user = userEvent.setup();
    const { router } = await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { level: 1, name: 'Introduction' });
    const trigger = screen.getByRole('button', { name: 'Documentation menu' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(document.activeElement).toBe(trigger);
    expect(router.url).toBe('/docs/intro');
  });

  it('COMP-016: arriving at the index from a document by link focuses the index heading', async () => {
    const user = userEvent.setup();
    await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { level: 1, name: 'Introduction' });
    await user.click(screen.getByRole('link', { name: 'Docs' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Explore the docs' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});

import { screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';
import { FakeDoc } from './content-state';
import { HostDemoComponent, HostDocSlotComponent } from './demos';
import { renderDocs } from './harness';

const docs: FakeDoc[] = [
  {
    source: 'intro',
    body: 'Intro body',
    attributes: { title: 'Introduction', description: 'Start here', group: 'Guide', order: 1 },
    toc: [
      { id: 'why', text: 'Why Doq', level: 2 },
      { id: 'details', text: 'Details', level: 3 },
    ],
  },
  { source: 'guides/install', body: 'Install body', attributes: { title: 'Install', group: 'Guide', order: 2, demo: 'host' } },
  { source: 'ref/long-file-name', body: 'API body', attributes: { title: 'API', slug: 'reference/api', group: 'Reference', order: 3 } },
  { source: 'misc', body: 'Misc body', attributes: { title: 'Missing demo', order: 4, demo: 'unregistered' } },
];

describe('DoqDocsComponent', () => {
  it('COMP-002: renders the document heading, description, breadcrumb and body', async () => {
    await renderDocs({ docs, url: '/docs/intro' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Introduction' })).toBeTruthy();
    expect(screen.getByText('Start here')).toBeTruthy();
    expect(screen.getByText('Intro body')).toBeTruthy();
    const breadcrumb = screen.getByRole('link', { name: 'Docs' });
    expect(breadcrumb.getAttribute('href')).toBe('/docs');
  });

  it('COMP-002: sets the page title with the documentation suffix', async () => {
    await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { name: 'Introduction' });
    await waitFor(() => expect(TestBed.inject(Title).getTitle()).toBe('Introduction · Documentation'));
  });

  it('COMP-002: uses the product presentation for suffix, label and breadcrumb root', async () => {
    await renderDocs({
      docs,
      url: '/docs/intro',
      config: { presentation: { documentationLabel: 'Vanta Docs', pageTitleSuffix: 'Vanta' } },
    });
    await screen.findByRole('heading', { name: 'Introduction' });
    await waitFor(() => expect(TestBed.inject(Title).getTitle()).toBe('Introduction · Vanta'));
    expect(screen.getByRole('link', { name: 'Vanta Docs' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Vanta Docs' })).toBeTruthy();
  });

  it('COMP-002: omits the suffix when it is configured as empty', async () => {
    await renderDocs({ docs, url: '/docs/intro', config: { presentation: { pageTitleSuffix: '' } } });
    await screen.findByRole('heading', { name: 'Introduction' });
    await waitFor(() => expect(TestBed.inject(Title).getTitle()).toBe('Introduction'));
  });

  it('COMP-002: serves a custom-slug document at its public URL only', async () => {
    await renderDocs({ docs, url: '/docs/reference/api' });
    expect(await screen.findByRole('heading', { level: 1, name: 'API' })).toBeTruthy();
    expect(screen.getByText('API body')).toBeTruthy();
  });

  it('COMP-002: the source filename of a custom-slug document shows the not-found page', async () => {
    await renderDocs({ docs, url: '/docs/ref/long-file-name' });
    expect(await screen.findByRole('heading', { name: 'Documentation page not found' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse documentation' }).getAttribute('href')).toBe('/docs');
  });

  it('COMP-002: an unknown slug shows the not-found page and a not-found title', async () => {
    await renderDocs({ docs, url: '/docs/nope' });
    expect(await screen.findByRole('heading', { name: 'Documentation page not found' })).toBeTruthy();
    await waitFor(() => expect(TestBed.inject(Title).getTitle()).toBe('Page not found · Documentation'));
  });

  it('COMP-003: navigation groups documents and opens the group of the active page', async () => {
    await renderDocs({ docs, url: '/docs/reference/api' });
    await screen.findByRole('heading', { name: 'API' });
    const nav = screen.getByRole('navigation', { name: 'Documentation' });
    const groups = within(nav).getAllByRole('group') as HTMLDetailsElement[];
    const byLabel = Object.fromEntries(groups.map((g) => [g.querySelector('summary')!.textContent, g.open]));
    expect(byLabel).toEqual({ Guide: false, Reference: true });
    const active = within(nav).getByRole('link', { name: 'API' });
    expect(active.classList.contains('is-active')).toBe(true);
  });

  it('COMP-002: lists previous and next documents in the configured order', async () => {
    await renderDocs({ docs, url: '/docs/guides/install' });
    await screen.findByRole('heading', { name: 'Install' });
    const pager = screen.getByRole('navigation', { name: 'Page navigation' });
    expect(within(pager).getByRole('link', { name: /Introduction/ }).getAttribute('href')).toBe('/docs/intro');
    expect(within(pager).getByRole('link', { name: /API/ }).getAttribute('href')).toBe('/docs/reference/api');
  });

  it('COMP-004: the table of contents links to document headings and can be disabled', async () => {
    await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { name: 'Introduction' });
    const toc = screen.getByRole('complementary', { name: 'On this page' });
    expect(within(toc).getAllByRole('link').map((l) => l.textContent)).toEqual(['Why Doq', 'Details']);
  });

  it('COMP-004: no table of contents is rendered when it is disabled', async () => {
    await renderDocs({ docs, url: '/docs/intro', config: { showTableOfContents: false } });
    await screen.findByRole('heading', { name: 'Introduction' });
    expect(screen.queryByRole('complementary', { name: 'On this page' })).toBeNull();
  });

  it('COMP-007: renders a consumer-registered demo after the content', async () => {
    await renderDocs({ docs, url: '/docs/guides/install', config: { demos: { host: HostDemoComponent } } });
    expect(await screen.findByRole('button', { name: 'Host demo control' })).toBeTruthy();
  });

  it('COMP-007: reports an unregistered demo instead of failing the page', async () => {
    await renderDocs({ docs, url: '/docs/misc' });
    const status = await screen.findByRole('status');
    expect(status.textContent).toContain('Demo “unregistered” is not registered by this application.');
    expect(screen.getByRole('heading', { name: 'Missing demo' })).toBeTruthy();
  });

  it('COMP-006: renders the document slot on every document page', async () => {
    await renderDocs({ docs, url: '/docs/intro', config: { slots: { documentAfterContent: HostDocSlotComponent } } });
    expect(await screen.findByText('After every document')).toBeTruthy();
  });

  it('COMP-008: the mobile menu button reports its state and Escape closes it, returning focus', async () => {
    const user = userEvent.setup();
    await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { name: 'Introduction' });
    const trigger = screen.getByRole('button', { name: 'Documentation menu' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const nav = screen.getByRole('navigation', { name: 'Documentation' });
    expect(nav.classList.contains('is-open')).toBe(true);
    await waitFor(() => expect(nav.contains(document.activeElement)).toBe(true));
    await user.keyboard('{Escape}');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('COMP-008: choosing a page closes the open menu', async () => {
    const user = userEvent.setup();
    await renderDocs({ docs, url: '/docs/intro' });
    await screen.findByRole('heading', { name: 'Introduction' });
    const trigger = screen.getByRole('button', { name: 'Documentation menu' });
    await user.click(trigger);
    await user.click(within(screen.getByRole('navigation', { name: 'Documentation' })).getByRole('link', { name: 'Overview' }));
    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
  });

  it('COMP-008: a hidden sidebar renders no navigation or menu button', async () => {
    await renderDocs({ docs, url: '/docs/intro', config: { sidebar: 'hidden' } });
    await screen.findByRole('heading', { name: 'Introduction' });
    expect(screen.queryByRole('navigation', { name: 'Documentation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Documentation menu' })).toBeNull();
  });

  it('COMP-009: the sidebar side is exposed as a data attribute for host styling', async () => {
    const { container } = await renderDocs({ docs, url: '/docs/intro', config: { sidebar: 'right' } });
    await screen.findByRole('heading', { name: 'Introduction' });
    expect(container.querySelector('.doq-root')?.getAttribute('data-sidebar')).toBe('right');
  });
});

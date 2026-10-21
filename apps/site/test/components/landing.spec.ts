import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../../src/app/pages/index.page';
import { CopyCommand } from '../../src/app/copy-command';
import { SiteFooter } from '../../src/app/site-footer';
import { SiteHeader } from '../../src/app/site-header';
import { installCommand, siteLinks } from '../../src/lib/site-config';

describe('COMP-020 landing page content', () => {
  it('has one h1 stating the value, a labelled main region and the required sections', async () => {
    await render(HomePage);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/belongs in your app/i);
    expect(screen.getByRole('main')).toBeTruthy();
    for (const name of ['What Doqs 0.3 does', 'Getting started', 'How it works'])
      expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
  });

  it('lists the real 0.3 features', async () => {
    await render(HomePage);
    const section = screen.getByRole('region', { name: 'What Doqs 0.3 does' });
    const names = within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(names).toEqual(
      expect.arrayContaining(['Pagefind full-text search', 'Composition slots', 'Consumer-owned demos', 'SSR and SSG', 'Angular components inside Markdown']),
    );
  });

  it('COMP-050: explains inline components with the real directive and does not claim MDX', async () => {
    const { container } = await render(HomePage);
    expect(container.textContent).not.toMatch(/does not embed components inside Markdown/);
    expect(container.textContent).toMatch(/Doqs is not MDX/);
    const section = screen.getByRole('region', { name: 'Interactive components in Markdown' });
    expect(section.textContent).toContain('::demo[install-command]');
    expect(section.textContent).toContain('demos: {');
  });

  it('shows the three setup steps using the real public API names', async () => {
    const { container } = await render(HomePage);
    const code = container.textContent ?? '';
    for (const name of ['doqPrerenderRoutes', 'defineDoqConfig', 'doqRoutes', 'provideDoq'])
      expect(code, name).toContain(name);
  });

  it('links the primary actions to the guide and the repository', async () => {
    await render(HomePage);
    expect(screen.getByRole('link', { name: 'Get Started' }).getAttribute('href')).toBe('#getting-started');
    expect(screen.getByRole('link', { name: 'View on GitHub' }).getAttribute('href')).toBe(siteLinks.github);
    expect(screen.getByRole('link', { name: 'package README' }).getAttribute('href')).toBe(siteLinks.readme);
  });
});

describe('COMP-021 navigation and external links', () => {
  it('offers named navigation with the required links', async () => {
    await render(SiteHeader);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Features' }).getAttribute('href')).toBe('#features');
    expect(within(nav).getByRole('link', { name: 'Getting started' }).getAttribute('href')).toBe('#getting-started');
    expect(within(nav).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/Andersseen/doqs');
    expect(within(nav).getByRole('link', { name: 'npm' }).getAttribute('href')).toBe('https://www.npmjs.com/package/@doqs/analog');
  });

  it('opens and closes the mobile menu with the button, a link and Escape', async () => {
    const user = userEvent.setup();
    await render(SiteHeader);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('site-nav');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('site-nav')?.classList.contains('open')).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('link', { name: 'Features' }));
    expect(screen.getByRole('button', { name: 'Menu' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('gives the footer GitHub, npm, license and documentation links', async () => {
    await render(SiteFooter);
    const footer = screen.getByRole('navigation', { name: 'Footer' });
    expect(within(footer).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      siteLinks.github,
      siteLinks.npm,
      siteLinks.readme,
      siteLinks.license,
    ]);
  });
});

describe('COMP-022 install command copy', () => {
  const stubClipboard = (writeText: (text: string) => Promise<void>) =>
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

  it('copies the exact command and announces it', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    const writeText = vi.fn(async () => undefined);
    stubClipboard(writeText);
    await render(CopyCommand, { inputs: { command: installCommand } });
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith(installCommand);
    expect(screen.getByRole('status').textContent).toMatch(/copied/i);
    expect(screen.getByRole('button').textContent).toContain('Copied');
  });

  it('tells the reader to copy manually when the clipboard is unavailable', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    stubClipboard(async () => {
      throw new Error('denied');
    });
    await render(CopyCommand, { inputs: { command: installCommand } });
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(screen.getByText(/copy it manually/i)).toBeTruthy();
  });
});

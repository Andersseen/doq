import { render, screen, waitFor, within } from '@testing-library/angular';
import { TestBed } from '@angular/core/testing';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../../src/app/pages/index.page';
import { CopyCommand } from '../../src/app/copy-command';
import { EnterDemo } from '../../src/app/enter-demo';
import { ThemeController } from '../../src/app/theme';
import { SiteFooter } from '../../src/app/site-footer';
import { SiteHeader } from '../../src/app/site-header';
import { installCommand, siteLinks } from '../../src/lib/site-config';

describe('COMP-020 landing page content', () => {
  it('has one h1 stating the value, a labelled main region and the required sections', async () => {
    await render(HomePage);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/belongs in your app/i);
    expect(screen.getByRole('main')).toBeTruthy();
    for (const name of ['What Doqs 0.6 does', 'Getting started', 'How it works'])
      expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy();
  });

  it('lists the real 0.6 features', async () => {
    await render(HomePage);
    const section = screen.getByRole('region', { name: 'What Doqs 0.6 does' });
    const names = within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(names).toEqual(
      expect.arrayContaining(['Pagefind full-text search', 'Composition slots', 'API reference from source', 'Versioned documentation', 'SSR and SSG', 'Angular components inside Markdown']),
    );
  });

  it('COMP-050: explains inline components with the real directive and does not claim MDX', async () => {
    const { container } = await render(HomePage);
    expect(container.textContent).not.toMatch(/does not embed components inside Markdown/);
    expect(container.textContent).toMatch(/Doqs is not MDX/);
    const section = screen.getByRole('region', { name: 'Interactive components in Markdown' });
    expect(section.textContent).toContain('::demo[install-command]');
    expect(within(section).getByRole('heading', { level: 3, name: 'Rendered' })).toBeTruthy();
  });

  it('COMP-060: switches code examples with accessible tabs and shows the real public API names', async () => {
    const user = userEvent.setup();
    await render(HomePage);
    const tabs = screen.getByRole('tablist', { name: 'Setup steps' });
    const names = within(tabs).getAllByRole('tab').map((tab) => tab.textContent?.trim());
    expect(names).toEqual(['Shared paths', 'Analog prerender', 'Angular providers', 'API reference', 'Demo registration']);
    expect(within(tabs).getByRole('tab', { selected: true }).textContent).toContain('Shared paths');
    const expected = [
      ['Analog prerender', 'doqPrerenderRoutes'],
      ['Angular providers', 'defineDoqConfig'],
      ['Angular providers', 'doqRoutes'],
      ['Angular providers', 'provideDoq'],
      ['API reference', 'doq-api check'],
      ['Demo registration', "'enter-animation'"],
    ] as const;
    for (const [tab, api] of expected) {
      await user.click(within(tabs).getByRole('tab', { name: tab }));
      expect(screen.getByRole('tabpanel').textContent, `${tab}: ${api}`).toContain(api);
    }
    await user.click(within(tabs).getByRole('tab', { name: 'Shared paths' }));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.textContent).toContain('Analog prerender');
  });

  it('COMP-061: renders Volt primitives (cards, badge, buttons) and Lumen icons, with decorative icons hidden', async () => {
    const { container } = await render(HomePage);
    expect(container.querySelectorAll('volt-card').length).toBeGreaterThanOrEqual(9);
    expect(container.querySelector('volt-badge')).toBeTruthy();
    const cta = screen.getByRole('link', { name: 'Get Started' });
    expect(cta.hasAttribute('voltbutton') || cta.className.includes('inline-flex')).toBe(true);
    expect(container.querySelectorAll('lmn-puzzle-piece, lmn-code-bracket').length).toBeGreaterThan(0);
    for (const icon of Array.from(container.querySelectorAll('[class*="lmn"], lmn-arrow-right'))) {
      expect(icon.getAttribute('aria-label')).toBeNull();
    }
    expect(container.querySelector('lmn-arrow-right svg')?.getAttribute('aria-hidden')).toBe('true');
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
    expect(within(nav).getByRole('link', { name: 'Interactive Markdown' }).getAttribute('href')).toBe('#interactive-markdown');
    expect(within(nav).getByRole('link', { name: 'Features' }).getAttribute('href')).toBe('#features');
    expect(within(nav).getByRole('link', { name: 'Getting started' }).getAttribute('href')).toBe('#getting-started');
    expect(within(nav).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe('https://github.com/Andersseen/doqs');
    expect(within(nav).getByRole('link', { name: 'npm' }).getAttribute('href')).toBe('https://www.npmjs.com/package/@doqs/analog');
  });

  it('opens and closes the mobile menu with the button, a link and Escape', async () => {
    const user = userEvent.setup();
    await render(SiteHeader);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(toggle);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('navigation', { name: 'Main' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    const reopened = await screen.findByRole('dialog');
    await user.click(within(reopened).getByRole('link', { name: 'Features' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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
    expect(screen.getByRole('button').querySelector('lmn-check')).toBeTruthy();
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

describe('COMP-062 theme toggle', () => {
  it('is a named pressed-state button that applies Volt\'s dark class and remembers the choice', async () => {
    const user = userEvent.setup();
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('doqs-theme');
    await render(SiteHeader);
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('doqs-theme')).toBe('dark');
    await user.click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('doqs-theme')).toBe('light');
  });

  it('exposes the state through the controller', async () => {
    await render(SiteHeader);
    expect(TestBed.inject(ThemeController).dark()).toBe(false);
  });
});

describe('COMP-063 interactive Markdown demo', () => {
  it('switches the Angular Movement preset and replays with Volt controls', async () => {
    const user = userEvent.setup();
    await render(EnterDemo);
    const group = screen.getByRole('group', { name: 'Enter animation preset' });
    expect(within(group).getByRole('radio', { name: 'fade-up' }).getAttribute('aria-checked')).toBe('true');
    await user.click(within(group).getByRole('radio', { name: 'zoom-in' }));
    expect(screen.getByTestId('enter-target').textContent).toContain('zoom-in');
    expect(screen.getByRole('status').textContent).toContain('zoom-in');
    const before = screen.getByTestId('enter-target');
    await user.click(screen.getByRole('button', { name: /replay/i }));
    expect(screen.getByTestId('enter-target')).not.toBe(before);
  });
});

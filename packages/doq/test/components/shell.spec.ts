import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { DoqShellComponent } from '../../src/lib/doq-shell.component';

describe('DoqShellComponent', () => {
  it('COMP-005: exposes product brand, documentation link and attribution with accessible names', async () => {
    await render(DoqShellComponent, {
      inputs: { productName: 'Vanta', docsPath: '/guides', homeUrl: '/home' },
      providers: [provideRouter([])],
    });
    expect(screen.getByRole('link', { name: /Vanta/ }).getAttribute('href')).toBe('/home');
    const nav = screen.getByRole('navigation', { name: 'Site navigation' });
    expect(nav.querySelector('a')?.getAttribute('href')).toBe('/guides');
    expect(screen.getByText('Documentation by Doq')).toBeTruthy();
  });

  it('COMP-005: defaults point at the documented /docs mount', async () => {
    await render(DoqShellComponent, { providers: [provideRouter([])] });
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/docs']);
  });

  it('COMP-005: projects host content into the main landmark', async () => {
    await render('<doq-shell><p>Host page</p></doq-shell>', { imports: [DoqShellComponent], providers: [provideRouter([])] });
    expect(screen.getByRole('main').textContent).toContain('Host page');
  });
});

import { screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

const docs: FakeDoc[] = [
  { source: 'welcome', body: 'Welcome body', attributes: { title: 'Welcome', group: 'Guide', order: 1 } },
  { source: 'guides/routing', body: 'Routing body', attributes: { title: 'Routing', group: 'Guide', order: 2 } },
];

describe('COMP-070 documentation mounted at the application root', () => {
  it('renders the index at "/" with links to root-level routes', async () => {
    await renderDocs({ docs, config: { basePath: '/' }, url: '/' });
    expect(await screen.findByRole('heading', { level: 1 })).toBeTruthy();
    const link = screen.getAllByRole('link', { name: /Routing/ })[0];
    expect(link.getAttribute('href')).toBe('/guides/routing');
  });

  it('renders a nested document at its root-level URL with the overview link pointing at "/"', async () => {
    await renderDocs({ docs, config: { basePath: '/' }, url: '/guides/routing' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Routing' })).toBeTruthy();
    expect(screen.getByText('Routing body')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe('/');
  });
});

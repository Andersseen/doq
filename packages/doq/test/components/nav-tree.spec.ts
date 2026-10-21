import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { DoqNavigationNode, DoqNavigationTreeComponent } from '../../src/lib/doq-nav-tree.component';

const nodes: DoqNavigationNode[] = [
  { key: 'a', label: 'Guides', containsActive: true, children: [{ key: '/docs/guides/install', label: 'Install', href: '/docs/guides/install' }] },
  { key: 'b', label: 'Reference', containsActive: false, children: [{ key: '/docs/ref/api', label: 'API', href: '/docs/ref/api' }] },
];

async function setup() {
  const emitted = { calls: 0 };
  const view = await render(DoqNavigationTreeComponent, {
    inputs: { nodes },
    on: { navigate: () => emitted.calls++ },
    providers: [provideRouter([{ path: '**', children: [] }])],
  });
  return { emitted, ...view };
}

describe('DoqNavigationTreeComponent', () => {
  it('COMP-003: opens only the group that contains the active document', async () => {
    await setup();
    const groups = screen.getAllByRole('group') as HTMLDetailsElement[];
    expect(groups.map((g) => g.open)).toEqual([true, false]);
  });

  it('COMP-003: renders documents as links to their public routes', async () => {
    await setup();
    expect(screen.getByRole('link', { name: 'Install' }).getAttribute('href')).toBe('/docs/guides/install');
  });

  it('COMP-003: groups are native disclosure controls that reveal their links', async () => {
    const user = userEvent.setup();
    await setup();
    const summary = screen.getByText('Reference');
    expect(summary.tagName).toBe('SUMMARY');
    await user.click(summary);
    expect((summary.closest('details') as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByRole('link', { name: 'API' })).toBeTruthy();
  });

  it('COMP-003: emits navigate when a link is chosen', async () => {
    const user = userEvent.setup();
    const { emitted } = await setup();
    await user.click(screen.getByRole('link', { name: 'Install' }));
    expect(emitted.calls).toBe(1);
  });
});

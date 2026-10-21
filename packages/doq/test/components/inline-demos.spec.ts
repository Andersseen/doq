import { Component, OnDestroy, signal } from '@angular/core';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeDoc } from './content-state';
import { HostDemoComponent, HostDocSlotComponent } from './demos';
import { renderDocs } from './harness';

const destroyed: string[] = [];

@Component({ selector: 'counter-demo', template: '<section aria-label="Counter"><button type="button" (click)="n.set(n() + 1)">Add</button><output>{{ n() }}</output></section>' })
class CounterDemoComponent implements OnDestroy {
  readonly n = signal(0);
  ngOnDestroy() { destroyed.push('counter'); }
}

const demos = { counter: CounterDemoComponent, host: HostDemoComponent };
const page = (body: string, attributes: Record<string, unknown> = {}): FakeDoc[] => [
  { source: 'guide', body, attributes: { title: 'Guide', order: 1, ...attributes } },
  { source: 'other', body: '<p>Other body</p>', attributes: { title: 'Other', order: 2 } },
];
const order = (root: ParentNode) => Array.from(root.querySelectorAll('h2, [data-doq-demo], .doq-demo-fallback')).map((node) => node.getAttribute('data-doq-demo') ?? node.textContent?.trim());

describe('inline demos', () => {
  it('COMP-040: mounts a registered component between the Markdown sections around it', async () => {
    const { container } = await renderDocs({
      docs: page('<h2 id="one">One</h2><p>before</p><p>::demo[counter]</p><h2 id="two">Two</h2><p>after</p>'),
      config: { demos }, url: '/docs/guide',
    });
    await screen.findByRole('heading', { name: 'Guide' });
    const article = container.querySelector('.doq-article')!;
    expect(order(article)).toEqual(['One', 'counter', 'Two']);
    expect(screen.queryByText('::demo[counter]')).toBeNull();
    expect(screen.getByText('after')).toBeTruthy();
  });

  it('COMP-041: keeps several instances independent, including repeats of one id', async () => {
    const user = userEvent.setup();
    await renderDocs({ docs: page('<p>::demo[counter]</p><p>between</p><p>::demo[counter]</p><p>::demo[host]</p>'), config: { demos }, url: '/docs/guide' });
    const regions = await screen.findAllByRole('region', { name: 'Counter' });
    expect(regions).toHaveLength(2);
    await user.click(within(regions[0]!).getByRole('button', { name: 'Add' }));
    await user.click(within(regions[0]!).getByRole('button', { name: 'Add' }));
    await user.click(within(regions[1]!).getByRole('button', { name: 'Add' }));
    expect(regions.map((r) => r.querySelector('output')!.textContent)).toEqual(['2', '1']);
    expect(screen.getByRole('button', { name: 'Host demo control' })).toBeTruthy();
  });

  it('COMP-042: shows an accessible status for an unknown id and still renders the rest', async () => {
    await renderDocs({ docs: page('<p>kept text</p><p>::demo[nope]</p><p>::demo[counter]</p>'), config: { demos }, url: '/docs/guide' });
    const status = (await screen.findAllByRole('status')).find((node) => node.classList.contains('doq-demo-fallback'))!;
    expect(status.textContent).toContain('Demo “nope” is not registered by this application.');
    expect(screen.getByText('kept text')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Counter' })).toBeTruthy();
  });

  it('COMP-043: does not instantiate directives written as code, in lists or in quotes', async () => {
    await renderDocs({
      docs: page('<pre><code>::demo[counter]\n</code></pre><p>Write <code>::demo[counter]</code></p><ul><li><p>::demo[counter]</p></li></ul><blockquote><p>::demo[counter]</p></blockquote>'),
      config: { demos }, url: '/docs/guide',
    });
    await screen.findByRole('heading', { name: 'Guide' });
    expect(screen.queryByRole('region', { name: 'Counter' })).toBeNull();
    expect(screen.getAllByText('::demo[counter]', { exact: false }).length).toBeGreaterThanOrEqual(4);
  });

  it('COMP-044: renders a document without directives as before, with no inline regions', async () => {
    const { container } = await renderDocs({ docs: page('<h2 id="a">A</h2><p>plain</p>'), config: { demos }, url: '/docs/guide' });
    await screen.findByText('plain');
    expect(container.querySelectorAll('.doq-inline-demo')).toHaveLength(0);
    expect(container.querySelectorAll('.doq-markdown')).toHaveLength(1);
  });

  it('COMP-045: renders a frontmatter demo once when the Markdown also places it inline', async () => {
    await renderDocs({ docs: page('<p>::demo[host]</p>', { demo: 'host' }), config: { demos }, url: '/docs/guide' });
    await screen.findByRole('button', { name: 'Host demo control' });
    expect(screen.getAllByRole('button', { name: 'Host demo control' })).toHaveLength(1);
  });

  it('COMP-045: still appends the frontmatter demo and the document slot when no directive uses it', async () => {
    await renderDocs({
      docs: page('<p>::demo[counter]</p>', { demo: 'host' }),
      config: { demos, slots: { documentAfterContent: HostDocSlotComponent } }, url: '/docs/guide',
    });
    expect(await screen.findByRole('button', { name: 'Host demo control' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Counter' })).toBeTruthy();
    expect(screen.getByText('After every document')).toBeTruthy();
  });

  it('COMP-046: destroys instances on navigation and starts fresh ones on return', async () => {
    const user = userEvent.setup();
    destroyed.length = 0;
    const { router } = await renderDocs({ docs: page('<p>::demo[counter]</p>'), config: { demos }, url: '/docs/guide' });
    await user.click(await within(await screen.findByRole('region', { name: 'Counter' })).findByRole('button', { name: 'Add' }));
    await router.navigateByUrl('/docs/other');
    await screen.findByText('Other body');
    expect(destroyed).toEqual(['counter']);
    expect(screen.queryByRole('region', { name: 'Counter' })).toBeNull();
    await router.navigateByUrl('/docs/guide');
    const region = await screen.findByRole('region', { name: 'Counter' });
    expect(region.querySelector('output')!.textContent).toBe('0');
    expect(screen.getAllByRole('region', { name: 'Counter' })).toHaveLength(1);
  });

  it('COMP-047: demo controls do not receive the code-copy button and demo markup is excluded from search', async () => {
    const { container } = await renderDocs({ docs: page('<pre><code>npm i</code></pre><p>::demo[counter]</p>'), config: { demos }, url: '/docs/guide' });
    await screen.findByRole('region', { name: 'Counter' });
    expect(container.querySelectorAll('.doq-code-copy')).toHaveLength(1);
    expect(container.querySelector('.doq-inline-demo')!.hasAttribute('data-pagefind-ignore')).toBe(true);
    expect(container.querySelector('.doq-article')!.hasAttribute('data-pagefind-body')).toBe(true);
  });
});

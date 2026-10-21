import { screen, within } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { HostSlotComponent } from './demos';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

const docs: FakeDoc[] = [
  { source: 'intro', attributes: { title: 'Introduction', description: 'Start here', group: 'Guide', order: 1 } },
  { source: 'guides/install', attributes: { title: 'Install', description: 'Get it running', group: 'Guide', order: 2 } },
  { source: 'ref/api', attributes: { title: 'API', slug: 'reference/api', group: 'Reference', order: 3 } },
];

describe('DoqIndexComponent', () => {
  it('COMP-001: renders default copy and one card per document linking to its public route', async () => {
    await renderDocs({ docs, url: '/docs' });
    expect(screen.getByRole('heading', { level: 1, name: 'Explore the docs' })).toBeTruthy();
    expect(screen.getByText('Browse guides and references for this product.')).toBeTruthy();
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/docs/intro', '/docs/guides/install', '/docs/reference/api']);
    expect(within(links[0]!).getByText('Introduction')).toBeTruthy();
    expect(within(links[0]!).getByText('Start here')).toBeTruthy();
  });

  it('COMP-001: custom slugs replace the source path in the card link', async () => {
    await renderDocs({ docs, url: '/docs' });
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).not.toContain('/docs/ref/api');
  });

  it('COMP-001: configured presentation replaces the defaults, including the page title', async () => {
    await renderDocs({
      docs,
      url: '/docs',
      config: { presentation: { documentationLabel: 'Vanta Docs', indexTitle: 'Build with Vanta', indexDescription: 'Everything Vanta.' } },
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Build with Vanta' })).toBeTruthy();
    expect(screen.getByText('Everything Vanta.')).toBeTruthy();
    expect(screen.getByText('Vanta Docs')).toBeTruthy();
    expect(TestBed.inject(Title).getTitle()).toBe('Build with Vanta');
  });

  it('COMP-001: falls back to the documentation label for the title when no index title is configured', async () => {
    await renderDocs({ docs, url: '/docs', config: { presentation: { documentationLabel: '  Forge  ' } } });
    expect(TestBed.inject(Title).getTitle()).toBe('Forge');
  });

  it('COMP-006: renders the consumer-owned slot between the intro and the cards', async () => {
    await renderDocs({ docs, url: '/docs', config: { slots: { indexAfterIntro: HostSlotComponent } } });
    const slot = screen.getByText('Host composition slot');
    const firstCard = screen.getAllByRole('link')[0]!;
    expect(slot.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('COMP-001: honors a custom base path', async () => {
    await renderDocs({ docs, url: '/learn', config: { basePath: '/learn' } });
    expect(screen.getAllByRole('link')[0]!.getAttribute('href')).toBe('/learn/intro');
  });

  it('COMP-001: rejects two documents that claim the same public route', async () => {
    const duplicate: FakeDoc[] = [
      { source: 'a', attributes: { title: 'A', slug: 'same' } },
      { source: 'b', attributes: { title: 'B', slug: 'same' } },
    ];
    await expect(renderDocs({ docs: duplicate, url: '/docs' })).rejects.toThrow(/duplicate public route "\/docs\/same"/);
  });
});

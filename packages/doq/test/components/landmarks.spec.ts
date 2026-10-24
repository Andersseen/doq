import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';
import { ContentRenderer } from '@analogjs/content';
import { render, screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { contentState, FakeDoc } from './content-state';
import { renderDocs } from './harness';
import { DoqShellComponent, doqRoutes, provideDoq, DoqConfig } from '../../src/public-api';
import { defineDoqConfig } from '../../config/src/public-api';

const docs: FakeDoc[] = [{ source: 'welcome', body: 'Welcome body', attributes: { title: 'Welcome', group: 'Guide', order: 1 } }];

@Component({ selector: 'doq-shell-host', imports: [DoqShellComponent, RouterOutlet], template: '<doq-shell><router-outlet /></doq-shell>' })
class ShellHost {}

class Plain extends ContentRenderer {
  override async render(content: string) {
    return { content: `<p>${content}</p>`, toc: [] };
  }
  override getContentHeadings() {
    return [];
  }
  override enhance() {}
}

async function renderInShell(url: string, config: Partial<DoqConfig>) {
  contentState.docs = docs;
  const full: DoqConfig = { contentDirectory: 'docs', ...config };
  const view = await render(ShellHost, { routes: doqRoutes(full), providers: [provideDoq(full), { provide: ContentRenderer, useClass: Plain }] });
  await TestBed.inject(Router).navigateByUrl(url);
  await view.fixture.whenStable();
  view.detectChanges();
  return view;
}

const views = [
  ['index', '/docs'],
  ['document', '/docs/welcome'],
  ['missing document', '/docs/nope'],
] as const;

describe('COMP-140 LANDMARK-01 main landmark ownership', () => {
  describe.each(views)('%s view', (_name, url) => {
    it('document ownership (default): the view renders exactly one main', async () => {
      await renderDocs({ docs, url });
      await screen.findByRole('heading', { level: 1 });
      expect(screen.getAllByRole('main')).toHaveLength(1);
    });

    it('host ownership: the view renders no main of its own', async () => {
      await renderDocs({ docs, url, config: { landmark: 'host' } });
      await screen.findByRole('heading', { level: 1 });
      expect(screen.queryAllByRole('main')).toHaveLength(0);
    });
  });

  it('keeps the article inside the single main of a document page and its navigation named', async () => {
    await renderDocs({ docs, url: '/docs/welcome' });
    const main = await screen.findByRole('main');
    expect(main.querySelector('article')).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Documentation' })).toBeTruthy();
  });

  it('exactly one h1 per page in both modes', async () => {
    await renderDocs({ docs, url: '/docs/welcome', config: { landmark: 'host' } });
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('the missing-document message is not a main-less status override', async () => {
    await renderDocs({ docs, url: '/docs/nope' });
    expect(await screen.findByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Documentation page not found' })).toBeTruthy();
  });
});

describe('COMP-141 LANDMARK-03 DoqShellComponent never nests main landmarks', () => {
  it.each(views)('default config: %s has one main (Doqs) inside the shell', async (_name, url) => {
    await renderInShell(url, {});
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(document.querySelectorAll('main main')).toHaveLength(0);
  });

  it.each(views)("landmark 'host': %s has one main (the shell)", async (_name, url) => {
    await renderInShell(url, { landmark: 'host' });
    await screen.findByRole('heading', { level: 1 });
    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]!.classList.contains('doq-shell-main')).toBe(true);
  });

  it('keeps header, footer and navigation landmarks outside the main', async () => {
    await renderInShell('/docs/welcome', {});
    await screen.findByRole('heading', { level: 1 });
    expect(document.querySelector('.doq-shell-header')!.closest('main')).toBeNull();
    expect(document.querySelector('.doq-shell-footer')!.closest('main')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Site navigation' }).closest('main')).toBeNull();
  });
});

describe('landmark configuration', () => {
  it('is validated at definition time', () => {
    expect(() => defineDoqConfig({ contentDirectory: 'docs', landmark: 'banner' as never })).toThrow(/landmark must be/);
    expect(defineDoqConfig({ contentDirectory: 'docs', landmark: 'host' }).landmark).toBe('host');
    expect(defineDoqConfig({ contentDirectory: 'docs' }).landmark).toBeUndefined();
  });
});

describe('shell landmark override', () => {
  it('mainLandmark=false keeps a route-scoped configuration from producing a second main', async () => {
    @Component({ selector: 'doq-shell-host-2', imports: [DoqShellComponent, RouterOutlet], template: '<doq-shell [mainLandmark]="false"><router-outlet /></doq-shell>' })
    class Host {}
    contentState.docs = docs;
    const view = await render(Host, { routes: doqRoutes({ contentDirectory: 'docs' }), providers: [provideDoq({ contentDirectory: 'docs' }), { provide: ContentRenderer, useClass: Plain }] });
    await TestBed.inject(Router).navigateByUrl('/docs');
    await view.fixture.whenStable();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(document.querySelector('.doq-shell-main')!.tagName).toBe('DIV');
  });
});

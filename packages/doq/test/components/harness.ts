import { Component, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet } from '@angular/router';
import { ContentRenderer } from '@analogjs/content';
import { render } from '@testing-library/angular';
import { contentState, FakeDoc } from './content-state';
import { DoqConfig, doqRoutes, provideDoq } from '../../src/public-api';

/** Renders each document's body as a paragraph and reports the table of contents declared by the fixture. */
class FixtureRenderer extends ContentRenderer {
  override async render(content: string) {
    const doc = contentState.docs.find((candidate) => content === (candidate.body ?? ''));
    const headings = (doc?.toc ?? []).map((h) => `<h${h.level} id="${h.id}">${h.text}</h${h.level}>`).join('');
    return { content: `${headings}<p>${content}</p>`, toc: doc?.toc ?? [] };
  }
  override getContentHeadings() {
    return [];
  }
  override enhance() {}
}

@Component({ selector: 'doq-test-host', imports: [RouterOutlet], template: '<router-outlet />' })
class HostComponent {}

export async function renderDocs(options: { docs: FakeDoc[]; config?: Partial<DoqConfig>; url: string; providers?: Provider[] }) {
  contentState.docs = options.docs;
  const config: DoqConfig = { contentDirectory: 'docs', ...options.config };
  const view = await render(HostComponent, {
    routes: doqRoutes(config),
    providers: [provideDoq(config), { provide: ContentRenderer, useClass: FixtureRenderer }, ...(options.providers ?? [])],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(options.url);
  await view.fixture.whenStable();
  view.detectChanges();
  return { ...view, router };
}

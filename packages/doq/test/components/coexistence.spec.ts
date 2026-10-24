import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Route } from '@angular/router';
import { screen } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { FakeDoc } from './content-state';
import { renderDocs } from './harness';

@Component({ selector: 'host-intro', template: '<h1>Host introduction</h1>' })
class HostIntro {}
@Component({ selector: 'host-missing', template: '<h1>Host 404</h1>' })
class HostMissing {}

const docs: FakeDoc[] = [
  { source: 'get-started', attributes: { title: 'Get started', order: 1 } },
  { source: 'guides/api', attributes: { title: 'API guide', slug: 'reference/api', order: 2 } },
];
// Doqs routes come FIRST (Analog registers extra routes before file routes); the host's routes follow.
const hostRoutes: Route[] = [{ path: 'docs/introduction', component: HostIntro }, { path: '**', component: HostMissing }];

describe('COMP-142 ADOPT-02 gradual migration under a shared prefix (unmatched: continue)', () => {
  it('default: Doqs claims every URL below the base path, including ones the host owns', async () => {
    await renderDocs({ docs, url: '/docs/introduction', hostRoutes });
    expect(await screen.findByRole('heading', { name: 'Documentation page not found' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Host introduction' })).toBeNull();
  });

  it('continue: documents render from Doqs, custom slugs included', async () => {
    await renderDocs({ docs, url: '/docs/get-started', config: { unmatched: 'continue' }, hostRoutes });
    expect(await screen.findByRole('heading', { level: 1, name: 'Get started' })).toBeTruthy();
  });

  it('continue: a custom slug is the public URL', async () => {
    const { router } = await renderDocs({ docs, url: '/docs/reference/api', config: { unmatched: 'continue' }, hostRoutes });
    expect(await screen.findByRole('heading', { level: 1, name: 'API guide' })).toBeTruthy();
    expect(router.url).toBe('/docs/reference/api');
  });

  it('continue: a URL without a document reaches the host route instead of a Doqs 200 page', async () => {
    await renderDocs({ docs, url: '/docs/introduction', config: { unmatched: 'continue' }, hostRoutes });
    expect(await screen.findByRole('heading', { name: 'Host introduction' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Documentation page not found' })).toBeNull();
  });

  it('continue: an unknown URL falls through to the host 404, and the source path of a custom slug is not a public URL', async () => {
    await renderDocs({ docs, url: '/docs/guides/api', config: { unmatched: 'continue' }, hostRoutes });
    expect(await screen.findByRole('heading', { name: 'Host 404' })).toBeTruthy();
  });

  it('continue: the bare base path belongs to the host', async () => {
    await renderDocs({ docs, url: '/docs', config: { unmatched: 'continue' }, hostRoutes: [{ path: 'docs', component: HostIntro }] });
    expect(await screen.findByRole('heading', { name: 'Host introduction' })).toBeTruthy();
  });

  it('continue also holds in-app: navigating from a Doqs page to a host page leaves Doqs', async () => {
    const { router } = await renderDocs({ docs, url: '/docs/get-started', config: { unmatched: 'continue' }, hostRoutes });
    await router.navigateByUrl('/docs/introduction');
    expect(await screen.findByRole('heading', { name: 'Host introduction' })).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/docs/introduction');
  });
});

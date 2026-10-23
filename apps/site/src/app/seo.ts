import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { canonicalUrl } from '../lib/site-config';

declare const __DOQ_SITE_ORIGIN__: string;

/**
 * Per-route canonical URL and og:url. They depend on the page, so they cannot live in index.html (every prerendered
 * route starts from that file). Without DOQ_SITE_ORIGIN no absolute URL is written. Runs during prerendering too.
 */
@Injectable({ providedIn: 'root' })
export class SeoLinks {
  private readonly document = inject(DOCUMENT);
  private readonly origin = typeof __DOQ_SITE_ORIGIN__ === 'string' ? __DOQ_SITE_ORIGIN__ : '';

  constructor() {
    const router = inject(Router);
    const subscription = router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.update(event.urlAfterRedirects);
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  private update(url: string): void {
    if (!this.origin) return;
    const path = url.split(/[?#]/)[0] || '/';
    const href = canonicalUrl(this.origin, path);
    const head = this.document.head;
    let canonical = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      head.appendChild(canonical);
    }
    canonical.href = href;
    let og = head.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!og) {
      og = this.document.createElement('meta');
      og.setAttribute('property', 'og:url');
      head.appendChild(og);
    }
    og.content = href;
  }
}

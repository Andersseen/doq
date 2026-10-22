import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { injectDoqCatalogs, injectDoqDocuments, injectDoqVersion, resolveDoqCopy } from './doq-catalog';
import { DOQ_CONFIG } from './doq-config';
import { DoqPageMetadata } from './doq-metadata';
import { DoqSearchComponent } from './doq-search.component';
import { DoqVersionSwitcherComponent } from './doq-version-switcher.component';
import { doqCanonicalUrl, doqVersionLinks } from './doq-versions';
import { normalizeDoqPaths } from './doq-paths';

@Component({
  selector: 'doq-index',
  standalone: true,
  imports: [RouterLink, NgComponentOutlet, DoqSearchComponent, DoqVersionSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="doq-index" [style.--doq-content-width]="config.contentWidth" [attr.data-doq-version]="versioned ? version.id : null">
      @if (versionLinks.length > 1 || config.search?.enabled) {
        <div class="doq-topbar">
          @if (versionLinks.length > 1) { <doq-version-switcher [versions]="versionLinks" /> }
          @if (config.search?.enabled) { <doq-search [version]="versioned ? version : undefined" /> }
        </div>
      }
      @if (versioned && !version.current) {
        <p class="doq-version-notice" role="note">You are reading the <strong>{{ version.label }}</strong> documentation, an archived version. <a [routerLink]="versionLinks[0]?.href">View {{ versions[0]?.label }}</a></p>
      }
      <p class="doq-eyebrow">{{ copy.label }}</p><h1 tabindex="-1">{{ copy.indexTitle }}</h1>
      <p class="doq-description">{{ copy.indexDescription }}</p>
      @if (config.slots?.indexAfterIntro; as slot) { <ng-container *ngComponentOutlet="slot" /> }
      <div class="doq-index-grid">
        @for (item of navigation; track item.routePath) {
          <a class="doq-index-card" [routerLink]="item.routePath"><span>{{ item.group }}</span><strong>{{ item.title }}</strong><p>{{ item.description }}</p><span class="doq-index-arrow">Read guide →</span></a>
        }
      </div>
    </main>
  `,
})
export class DoqIndexComponent {
  readonly config = inject(DOQ_CONFIG);
  private readonly versionContext = injectDoqVersion(this.config);
  readonly version = this.versionContext.version;
  readonly versions = this.versionContext.versions;
  readonly versioned = this.versionContext.versioned;
  readonly copy = resolveDoqCopy(this.config);
  readonly navigation = injectDoqDocuments(this.config, this.version.id);
  /** Every version leads to its own index from an index page. */
  readonly versionLinks = this.versioned ? doqVersionLinks(this.versions, this.version.id, null, injectDoqCatalogs(this.config)) : [];

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const router = inject(Router);
    // Arriving from another page by a link: move focus to the heading instead of leaving it on <body>.
    const arrivedByNavigation = router.navigated && router.currentNavigation()?.trigger === 'imperative';
    if (arrivedByNavigation) afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }));
    const metadata = inject(DoqPageMetadata);
    metadata.claim(inject(DestroyRef));
    const title = this.copy.hasIndexTitle ? this.copy.indexTitle : this.copy.label;
    metadata.set(this.versioned && !this.version.current ? `${title} · ${this.version.label}` : title, this.copy.hasIndexDescription ? this.copy.indexDescription : undefined);
    metadata.setCanonical(doqCanonicalUrl(normalizeDoqPaths(this.config).versioning, this.version.basePath));
  }
}

import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, PendingTasks, signal, untracked, PLATFORM_ID, Type } from '@angular/core';
import { DOCUMENT, isPlatformBrowser, NgComponentOutlet } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router, RouterLink } from '@angular/router';
import { catchError, filter, finalize, from, map, of, startWith, switchMap } from 'rxjs';
import { ContentRenderer, injectContentFilesMap, MarkdownComponent, parseRawContentFile } from '@analogjs/content';
import { injectDoqCatalogs, injectDoqDocuments, injectDoqVersion, resolveDoqCopy } from './doq-catalog';
import { DOQ_CONFIG } from './doq-config';
import { doqPageTitle, DoqPageMetadata } from './doq-metadata';
import { DoqButtonDemoComponent } from './doq-demo.component';
import { DoqNavigationNode, DoqNavigationTreeComponent } from './doq-nav-tree.component';
import { DoqPlaygroundComponent } from './doq-playground.component';
import { DoqPlaygroundDefinition } from './doq-playground-model';
import { DoqSearchComponent } from './doq-search.component';
import { DoqVersionSwitcherComponent } from './doq-version-switcher.component';
import { doqCanonicalUrl, doqVersionLinks } from './doq-versions';
import { normalizeDoqPaths } from './doq-paths';
import { parseDoqContent, parseDoqDocument } from './doq-rich-content';
import { DoqTabsComponent } from './doq-tabs.component';

interface DocAttributes { title?: string; description?: string; order?: number; group?: string; slug?: string; demo?: string; }

@Component({
  selector: 'doq-docs',
  standalone: true,
  imports: [RouterLink, MarkdownComponent, DoqButtonDemoComponent, DoqPlaygroundComponent, DoqNavigationTreeComponent, DoqSearchComponent, DoqTabsComponent, DoqVersionSwitcherComponent, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (document(); as doc) {
      @if (doc.attributes.title) {
      <div class="doq-root" [style.--doq-content-width]="config.contentWidth" [style.--doq-sidebar-width]="config.sidebarWidth" [attr.data-sidebar]="config.sidebar" [attr.data-doq-version]="versioned ? version.id : null">
        @if (config.sidebar !== 'hidden') {
        <button class="doq-mobile-trigger" type="button" aria-controls="doq-mobile-navigation" [attr.aria-expanded]="mobileNavigationOpen()" (click)="toggleMobileNavigation()">{{ copy.label }} menu</button>
        <nav id="doq-mobile-navigation" class="doq-sidebar" [class.is-open]="mobileNavigationOpen()" [attr.aria-label]="copy.label" (keydown.escape)="closeMobileNavigation()">
          <button class="doq-mobile-close" type="button" (click)="closeMobileNavigation()">Close navigation</button>
          @if (versionLinks().length > 1) { <doq-version-switcher [versions]="versionLinks()" (chosen)="closeMobileNavigation()" /> }
          <a class="doq-overview" [routerLink]="version.basePath" (click)="closeMobileNavigation()">Overview</a>
          <doq-nav-tree [nodes]="navigationTree()" (navigate)="closeMobileNavigation()" />
        </nav>
        }
        <article class="doq-article" data-pagefind-body [attr.data-pagefind-filter]="versioned ? versionFilter : null">
          @if (versioned && !version.current) {
            <p class="doq-version-notice" role="note" data-pagefind-ignore>You are reading the <strong>{{ version.label }}</strong> documentation, an archived version. <a [routerLink]="versionLinks()[0]?.href">View {{ versions[0]?.label }}</a></p>
          }
          <div class="doq-topbar" data-pagefind-ignore>
            <div class="doq-breadcrumb"><a [routerLink]="version.basePath">{{ copy.breadcrumbRoot }}@if (versioned && !version.current) { ({{ version.label }}) }</a><span>/</span><span>{{ doc.attributes.title }}</span></div>
            @if (versionLinks().length > 1 && config.sidebar === 'hidden') { <doq-version-switcher [versions]="versionLinks()" /> }
            @if (config.search?.enabled) { <doq-search [version]="searchVersion" /> }
          </div>
          <header class="doq-doc-header"><p class="doq-eyebrow" data-pagefind-ignore>{{ doc.attributes.group || copy.label }}</p><h1 tabindex="-1">{{ doc.attributes.title }}</h1>@if (doc.attributes.description) { <p class="doq-description">{{ doc.attributes.description }}</p> }</header>
          <div class="doq-content">
            @for (segment of parts(); track $index) {
              @if (segment.kind === 'html') { <analog-markdown class="doq-markdown" [content]="segment.html" /> }
              @else if (segment.kind === 'tabs') { <doq-tabs [uid]="'doq-tabs-' + $index" [label]="segment.label" [tabs]="segment.tabs" [codeOnly]="segment.codeOnly" /> }
              @else if (segment.kind === 'playground') {
                @if (playgroundDefinition(segment.id); as definition) { <doq-playground [uid]="'doq-playground-' + $index" [playgroundId]="segment.id" [definition]="definition" /> }
                @else { <p class="doq-demo-fallback" data-pagefind-ignore role="status">Playground “{{ segment.id }}” is not registered by this application.</p> }
              }
              @else {
                <div class="doq-region doq-inline-demo" data-pagefind-ignore [attr.data-doq-demo]="segment.id">
                @if (demoComponent(segment.id); as demo) { <ng-container *ngComponentOutlet="demo" /> }
                @else { <p class="doq-demo-fallback" role="status">Demo “{{ segment.id }}” is not registered by this application.</p> }
                </div>
              }
            }
          </div>
          @if (trailingDemo(); as demoId) {
            <div class="doq-region" data-pagefind-ignore>
            @if (demoComponent(demoId); as demo) { <ng-container *ngComponentOutlet="demo" /> }
            @else { <p class="doq-demo-fallback" role="status">Demo “{{ demoId }}” is not registered by this application.</p> }
            </div>
          }
          @if (config.slots?.documentAfterContent; as slot) { <div class="doq-region" data-pagefind-ignore><ng-container *ngComponentOutlet="slot" /></div> }
          @if (config.showTableOfContents && headings().length) {
            <aside class="doq-toc" aria-label="On this page" data-pagefind-ignore><p>On this page</p>@for (heading of headings(); track heading.id) { <a [routerLink]="[]" [fragment]="heading.id" [class.level-three]="heading.level === 3" [class.is-active]="activeHeading() === heading.id">{{ heading.text }}</a> }</aside>
          }
          <nav class="doq-pagination" aria-label="Page navigation" data-pagefind-ignore>
            @if (previous(); as prev) { <a [routerLink]="prev.href"><span>Previous</span><strong>← {{ prev.title }}</strong></a> }
            @if (next(); as nxt) { <a class="next" [routerLink]="nxt.href"><span>Next</span><strong>{{ nxt.title }} →</strong></a> }
          </nav>
        </article>
      </div>
      } @else { <main class="doq-not-found" role="status"><h1>Documentation page not found</h1><p>This page may have moved or does not exist.</p><a [routerLink]="version.basePath">Browse documentation</a></main> }
    } @else if (document() === undefined) { <div class="doq-loading" aria-live="polite">Loading documentation…</div> }
    @else { <main class="doq-not-found" role="status"><h1>Documentation page not found</h1><p>This page may have moved or does not exist.</p><a [routerLink]="version.basePath">Browse documentation</a></main> }
  `,
})
export class DoqDocsComponent {
  readonly config = inject(DOQ_CONFIG);
  private readonly versionContext = injectDoqVersion(this.config);
  readonly version = this.versionContext.version;
  readonly versions = this.versionContext.versions;
  readonly versioned = this.versionContext.versioned;
  readonly versionFilter = `doqsVersion:${this.version.id}`;
  readonly searchVersion = this.versioned ? this.version : undefined;
  readonly activeHeading = signal('');
  readonly mobileNavigationOpen = signal(false);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly routeSlug = toSignal(this.route.paramMap.pipe(map(params => params.get(this.config.routeParam ?? 'slug') ?? '')), { initialValue: '' });
  readonly fragment = toSignal(this.route.fragment, { initialValue: null });
  /** True once the current document's Markdown is in the DOM, so fragment targets exist. */
  private readonly rendered = signal(false);
  private navigationTrigger: string | undefined;
  private lastSlug = this.routeSlug();
  private currentNavigationId?: number;
  private restoreNavigationId?: number;
  private scrollPositions = new Map<number, number>();
  private restorePosition?: number;
  /** Set for an in-app document change: start at the top and move focus once the new document is rendered. */
  private arrival = this.router.navigated && this.router.currentNavigation()?.trigger === 'imperative';
  private readonly trackNavigation = this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
    if (event instanceof NavigationStart) {
      // On Back/Forward the browser may already have restored the destination's scroll, so use the last position the reader had.
      const leavingScroll = event.navigationTrigger === 'popstate' ? this.lastScrollY : this.documentRef.defaultView?.scrollY ?? 0;
      if (this.currentNavigationId !== undefined) this.scrollPositions.set(this.currentNavigationId, leavingScroll);
      this.navigationTrigger = event.navigationTrigger;
      this.restoreNavigationId = event.restoredState?.navigationId;
      this.restorePosition = undefined;
    } else if (event instanceof NavigationCancel || event instanceof NavigationError || event instanceof NavigationSkipped) {
      this.traversing = false;
    } else if (event instanceof NavigationEnd) {
      this.traversing = false;
      this.currentNavigationId = event.id;
      const slug = this.routeSlug();
      const documentChanged = slug !== this.lastSlug;
      this.lastSlug = slug;
      const navigation = this.hostElement.querySelector<HTMLElement>('.doq-sidebar');
      const focusWasInNavigation = !!navigation?.contains(this.documentRef.activeElement);
      this.mobileNavigationOpen.set(false);
      if (this.navigationTrigger === 'popstate' && this.restoreNavigationId !== undefined) this.restorePosition = this.scrollPositions.get(this.restoreNavigationId);
      if (documentChanged && this.navigationTrigger === 'imperative') this.arrival = true;
      else if (focusWasInNavigation && !documentChanged) this.hostElement.querySelector<HTMLElement>('.doq-mobile-trigger')?.focus();
    }
  });
  readonly copy = resolveDoqCopy(this.config);
  private readonly canonicalVersioning = normalizeDoqPaths(this.config).versioning;
  readonly documents = this.versionContext.unknown ? [] : injectDoqDocuments(this.config, this.version.id);
  private readonly catalogs = this.versioned && !this.versionContext.unknown ? injectDoqCatalogs(this.config) : {};
  /** Where each version leads from this page: the same public slug when it exists there, otherwise that version's index. */
  readonly versionLinks = computed(() => this.versioned ? doqVersionLinks(this.versions, this.version.id, this.ownSlug(), this.catalogs) : []);
  private readonly contentMap = injectContentFilesMap();
  private readonly renderer = inject(ContentRenderer);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly metadata = inject(DoqPageMetadata);
  private readonly claimMetadata = this.metadata.claim(inject(DestroyRef));
  /**
   * The reader's last known scroll position, from scroll events, frozen while a Back/Forward traversal is under way.
   * Engines restore the destination's scroll at different moments (WebKit before `popstate`, Chromium right after it), so
   * `scrollY` at NavigationStart is the destination's position there; this is where the reader was leaving from.
   */
  private lastScrollY = 0;
  private traversing = false;
  private readonly trackScroll = (() => {
    const view = isPlatformBrowser(this.platformId) ? this.documentRef.defaultView : null;
    if (!view) return;
    this.lastScrollY = view.scrollY;
    const onScroll = () => { if (!this.traversing) this.lastScrollY = view.scrollY; };
    const onPopstate = () => { this.traversing = true; };
    view.addEventListener('scroll', onScroll, { passive: true });
    view.addEventListener('popstate', onPopstate);
    inject(DestroyRef).onDestroy(() => { view.removeEventListener('scroll', onScroll); view.removeEventListener('popstate', onPopstate); });
  })();
  readonly navigation = computed(() => this.documents.map(document => ({ ...document, href: document.routePath })));
  readonly navigationTree = computed(() => {
    const roots: DoqNavigationNode[] = [];
    for (const document of this.navigation()) {
      const groups = document.group.split('/').map(part => part.trim()).filter(Boolean);
      const sourceDirectories = document.sourceSlug.split('/').slice(0, -1);
      if (groups.length === 1 && sourceDirectories.length > 1) groups.push(...sourceDirectories.slice(1));
      let branch = roots;
      const path: string[] = [];
      for (const label of groups) {
        path.push(label);
        const key = path.join('/');
        let node = branch.find(item => item.key === key);
        if (!node) {
          node = { key, label, containsActive: false, children: [] };
          branch.push(node);
        }
        node.containsActive ||= document.slug === this.routeSlug();
        branch = node.children!;
      }
      branch.push({ key: document.routePath, label: document.title, href: document.routePath });
    }
    return roots;
  });
  readonly document = toSignal(this.route.paramMap.pipe(
    map(params => params.get(this.config.routeParam ?? 'slug') ?? ''),
    switchMap(slug => {
      const entry = this.versionContext.unknown ? undefined : this.documents.find(doc => doc.slug === slug);
      if (!slug || !entry) return of(null);
      // Analog's injectContentFilesMap intentionally re-keys loaders by the
      // frontmatter slug. The canonical catalog resolves that public slug to
      // its source entry; use the matching Analog alias to load its module.
      const contentBase = `src/content/${this.version.contentDirectory}/${entry.slug}`;
      const candidates = new Set([`${contentBase}.md`, `${contentBase}/index.md`]);
      const key = Object.keys(this.contentMap).find(candidate => candidates.has(this.canonicalFilename(candidate)));
      const load = key ? this.contentMap[key] : undefined;
      if (!load) return of(null);
      const clearPendingTask = this.pendingTasks.add();
      return from(load()).pipe(
        switchMap(raw => {
          const parsed = parseRawContentFile<DocAttributes>(raw);
          return from(this.renderer.render(parsed.content)).pipe(map(rendered => ({ filename: entry.sourceFilename, slug: entry.slug, attributes: parsed.attributes, content: parsed.content, toc: rendered.toc })));
        }),
        catchError(error => { console.error(`Doq: failed to resolve ${entry.sourceFilename}`, error); return of(null); }),
        finalize(clearPendingTask),
        startWith(undefined),
      );
    }),
  ), { initialValue: undefined });
  private ownSlug(): string | null { const slug = this.routeSlug(); return slug && this.documents.some(doc => doc.slug === slug) ? slug : null; }
  playgroundDefinition(id: string): DoqPlaygroundDefinition | undefined { return this.config.playgrounds && Object.prototype.hasOwnProperty.call(this.config.playgrounds, id) ? this.config.playgrounds[id] : undefined; }
  demoComponent(id: string): Type<unknown> | undefined { return id === 'button' ? DoqButtonDemoComponent : this.config.demos?.[id]; }
  /** The document cut at `::demo[id]` and `:::tabs`, without playgrounds: the 0.8 shape, kept for compatibility. The view renders `parts`. */
  readonly segments = computed(() => parseDoqContent(this.document()?.content ?? ''));
  /** The rendered document cut at its `::demo[id]`, `::playground[id]` directives and `:::tabs` groups; plain Markdown is one HTML segment. */
  readonly parts = computed(() => parseDoqDocument(this.document()?.content ?? ''));
  /** The frontmatter demo, unless the Markdown already places that same demo inline. */
  readonly trailingDemo = computed(() => {
    const id = this.document()?.attributes.demo;
    return id && !this.parts().some(segment => segment.kind === 'demo' && segment.id === id) ? id : undefined;
  });
  readonly headings = computed(() => this.document()?.toc ?? []);
  readonly previous = computed(() => this.adjacent(-1));
  readonly next = computed(() => this.adjacent(1));
  private readonly titleEffect = effect(() => {
    const doc = this.document();
    if (doc === undefined) return;
    const title = doc?.attributes.title;
    const label = this.versioned && !this.version.current ? this.version.label : undefined;
    if (!title) {
      this.metadata.set(doqPageTitle('Page not found', this.copy.pageTitleSuffix, label));
      this.metadata.setCanonical(undefined);
    } else {
      this.metadata.set(doqPageTitle(title, this.copy.pageTitleSuffix, label), doc?.attributes.description);
      this.metadata.setCanonical(doqCanonicalUrl(this.canonicalVersioning, `${this.version.basePath === '/' ? '' : this.version.basePath}/${this.routeSlug()}`));
    }
  });
  private readonly enhancementEffect = effect(onCleanup => {
    const doc = this.document();
    this.activeHeading.set('');
    this.rendered.set(false);
    onCleanup(() => this.disconnectHeadingObserver());
    if (!doc || !isPlatformBrowser(this.platformId)) return;
    const observer = new MutationObserver(() => {
      if (this.enhanceRenderedDocument()) { observer.disconnect(); this.rendered.set(true); }
    });
    observer.observe(this.hostElement, { childList: true, subtree: true });
    const timer = globalThis.setTimeout(() => {
      if (this.enhanceRenderedDocument()) { observer.disconnect(); this.rendered.set(true); }
    }, 0);
    onCleanup(() => {
      globalThis.clearTimeout(timer);
      observer.disconnect();
    });
  });
  /** Re-runs whenever the document finishes rendering or the fragment changes; one mechanism for every way of arriving. */
  private readonly revealEffect = effect(() => {
    const ready = this.rendered();
    const fragment = this.fragment();
    if (ready) untracked(() => this.reveal(fragment));
  });
  toggleMobileNavigation(): void {
    this.mobileNavigationOpen.update(open => !open);
    if (this.mobileNavigationOpen()) globalThis.setTimeout(() => this.hostElement.querySelector<HTMLElement>('.doq-sidebar .doq-version-summary, .doq-sidebar .doq-overview')?.focus(), 0);
    else this.hostElement.querySelector<HTMLElement>('.doq-mobile-trigger')?.focus();
  }
  closeMobileNavigation(): void {
    if (!this.mobileNavigationOpen()) return;
    this.mobileNavigationOpen.set(false);
    this.hostElement.querySelector<HTMLElement>('.doq-mobile-trigger')?.focus();
  }
  private reveal(fragment: string | null): void {
    this.revealTarget(fragment);
    // The position the reader now has is the one to leave from, even when the browser reported no scroll event for it.
    this.lastScrollY = this.documentRef.defaultView?.scrollY ?? 0;
  }
  private revealTarget(fragment: string | null): void {
    const view = this.documentRef.defaultView;
    const markdown = this.hostElement.querySelector<HTMLElement>('.doq-content');
    const target = fragment && markdown ? this.findFragmentTarget(markdown, fragment) : undefined;
    const focusTarget = this.arrival;
    this.arrival = false;
    // A heading inside an inactive tab: activate that tab first so the target can be scrolled to and focused.
    const hiddenPanel = target?.closest<HTMLElement>('[role="tabpanel"][hidden]');
    if (hiddenPanel) {
      this.hostElement.querySelector<HTMLElement>(`[role="tab"][aria-controls="${hiddenPanel.id}"]`)?.click();
      hiddenPanel.hidden = false;
    }
    if (this.restorePosition !== undefined) {
      view?.scrollTo({ top: this.restorePosition, behavior: 'instant' });
      this.restorePosition = undefined;
      return;
    }
    if (target) target.scrollIntoView?.({ block: 'start' });
    else if (focusTarget) view?.scrollTo(0, 0);
    if (!focusTarget) return;
    const focusable = target ?? this.hostElement.querySelector<HTMLElement>('.doq-doc-header h1');
    if (!focusable) return;
    if (!focusable.hasAttribute('tabindex')) focusable.setAttribute('tabindex', '-1');
    focusable.focus({ preventScroll: true });
  }
  private findFragmentTarget(markdown: HTMLElement, fragment: string): HTMLElement | undefined {
    const candidates = [fragment];
    try { candidates.push(decodeURIComponent(fragment)); } catch { /* keep the raw fragment */ }
    for (const id of candidates) {
      for (const node of Array.from(markdown.querySelectorAll<HTMLElement>('[id]'))) if (node.id === id && node.closest('.doq-markdown')) return node;
    }
    return undefined;
  }
  private canonicalFilename(filename: string): string {
    const normalized = filename.replace(/\\/g, '/');
    const marker = `src/content/${this.version.contentDirectory}/`;
    const index = normalized.lastIndexOf(marker);
    return index < 0 ? normalized : normalized.slice(index);
  }
  private get hostElement(): HTMLElement { return this.host.nativeElement as HTMLElement; }
  private enhanceRenderedDocument(): boolean {
    const root = this.hostElement.querySelector<HTMLElement>('.doq-root');
    const markdown = root?.querySelector<HTMLElement>('.doq-content');
    if (!root || !markdown || !root.querySelector('.doq-markdown')?.childElementCount) return false;
    // Only Markdown-rendered code gets a copy button; consumer demos keep their own markup untouched.
    for (const pre of Array.from(markdown.querySelectorAll<HTMLElement>('.doq-markdown pre:not([data-doq-copy])'))) {
      pre.dataset['doqCopy'] = 'true';
      const button = this.documentRef.createElement('button');
      button.type = 'button'; button.className = 'doq-code-copy'; button.setAttribute('data-pagefind-ignore', ''); button.setAttribute('aria-label', 'Copy code'); button.textContent = 'Copy';
      const copy = async () => {
        try {
          if (!globalThis.navigator?.clipboard) throw new Error('Clipboard unavailable');
          await globalThis.navigator.clipboard.writeText((pre.querySelector('code') ?? pre).textContent ?? '');
          button.textContent = 'Copied'; button.setAttribute('aria-label', 'Code copied');
        } catch { button.textContent = 'Copy unavailable'; button.setAttribute('aria-label', 'Clipboard access unavailable'); }
      };
      button.addEventListener('click', copy);
      pre.appendChild(button);
    }
    const headings = this.headings();
    const nodes = headings.map(heading => this.documentRef.getElementById(heading.id)).filter((node): node is HTMLElement => !!node && !!node.closest('.doq-markdown') && markdown.contains(node));
    // The enhancement may run from both the mutation observer and the timer; replacing the
    // previous observer and resize listener keeps a single active set per rendered document.
    this.disconnectHeadingObserver();
    this.syncScrollableTables(markdown);
    if (!('IntersectionObserver' in globalThis) || !nodes.length) return true;
    const observeHeadings = () => {
      this.enhancementObserver?.disconnect();
      const viewportHeight = this.documentRef.defaultView?.innerHeight ?? 0;
      this.enhancementObserver = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target instanceof HTMLElement) this.activeHeading.set(visible.target.id);
      }, { rootMargin: `0px 0px -${Math.round(viewportHeight * 0.7)}px 0px` });
      nodes.forEach(node => this.enhancementObserver!.observe(node));
    };
    observeHeadings();
    this.headingResizeHandler = observeHeadings;
    this.documentRef.defaultView?.addEventListener('resize', this.headingResizeHandler, { passive: true });
    return true;
  }
  /** A table wider than the column scrolls on its own (CSS), so it must be reachable by keyboard and have a name. */
  private syncScrollableTables(markdown: HTMLElement): void {
    const sync = () => {
      for (const table of Array.from(markdown.querySelectorAll<HTMLElement>('.doq-markdown table'))) {
        if (table.scrollWidth > table.clientWidth) {
          if (table.hasAttribute('tabindex')) continue;
          let heading = table.previousElementSibling;
          while (heading && !/^H[1-6]$/.test(heading.tagName)) heading = heading.previousElementSibling;
          table.setAttribute('tabindex', '0');
          table.dataset['doqScrollable'] = 'true';
          if (!table.hasAttribute('aria-label')) table.setAttribute('aria-label', `${heading?.textContent?.trim() || 'Scrollable'} table`);
        } else if (table.dataset['doqScrollable']) {
          table.removeAttribute('tabindex');
          table.removeAttribute('data-doq-scrollable');
        }
      }
    };
    sync();
    if (this.tableResizeHandler) this.documentRef.defaultView?.removeEventListener('resize', this.tableResizeHandler);
    this.tableResizeHandler = sync;
    this.documentRef.defaultView?.addEventListener('resize', sync, { passive: true });
  }
  private tableResizeHandler?: () => void;
  private enhancementObserver?: IntersectionObserver;
  private headingResizeHandler?: () => void;
  private disconnectHeadingObserver(): void {
    this.enhancementObserver?.disconnect();
    this.enhancementObserver = undefined;
    if (this.tableResizeHandler) this.documentRef.defaultView?.removeEventListener('resize', this.tableResizeHandler);
    this.tableResizeHandler = undefined;
    if (this.headingResizeHandler) this.documentRef.defaultView?.removeEventListener('resize', this.headingResizeHandler);
    this.headingResizeHandler = undefined;
  }
  private adjacent(offset: number) { const items = this.navigation(); const i = items.findIndex(item => item.slug === this.routeSlug()); return items[i + offset]; }
}

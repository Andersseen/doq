import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, PendingTasks, signal, PLATFORM_ID, Type } from '@angular/core';
import { DOCUMENT, isPlatformBrowser, NgComponentOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, from, map, of, startWith, switchMap } from 'rxjs';
import { ContentRenderer, injectContentFiles, injectContentFilesMap, MarkdownComponent, parseRawContentFile } from '@analogjs/content';
import { Meta, Title } from '@angular/platform-browser';
import { DOQ_CONFIG } from './doq-config';
import { DoqButtonDemoComponent } from './doq-demo.component';
import { DoqDocument, normalizeDoqDocument, sortDoqDocuments } from './doq-document';
import { DoqNavigationNode, DoqNavigationTreeComponent } from './doq-nav-tree.component';

interface DocAttributes { title?: string; description?: string; order?: number; group?: string; slug?: string; demo?: string; }

@Component({
  selector: 'doq-docs',
  standalone: true,
  imports: [RouterLink, MarkdownComponent, DoqButtonDemoComponent, DoqNavigationTreeComponent, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (document(); as doc) {
      @if (doc.attributes.title) {
      <div class="doq-root" [style.--doq-content-width]="config.contentWidth" [style.--doq-sidebar-width]="config.sidebarWidth" [attr.data-sidebar]="config.sidebar">
        <button class="doq-mobile-trigger" type="button" aria-controls="doq-mobile-navigation" [attr.aria-expanded]="mobileNavigationOpen()" (click)="toggleMobileNavigation()">Documentation menu</button>
        @if (mobileNavigationOpen()) { <button class="doq-mobile-backdrop" type="button" aria-label="Close documentation menu" (click)="closeMobileNavigation()"></button> }
        <nav id="doq-mobile-navigation" class="doq-sidebar" [attr.role]="mobileNavigationOpen() ? 'dialog' : 'navigation'" [class.is-open]="mobileNavigationOpen()" aria-label="Documentation" [attr.aria-modal]="mobileNavigationOpen() ? 'true' : null" [attr.inert]="mobileNavigationOpen() ? null : ''" (keydown)="onNavigationKeydown($event)">
          <a class="doq-overview" [routerLink]="config.basePath" (click)="closeMobileNavigation()">Overview</a>
          <doq-nav-tree [nodes]="navigationTree()" (navigate)="closeMobileNavigation()" />
        </nav>
        <article class="doq-article">
          <div class="doq-breadcrumb"><a [routerLink]="config.basePath">Docs</a><span>/</span><span>{{ doc.attributes.title }}</span></div>
          <header class="doq-doc-header"><p class="doq-eyebrow">{{ doc.attributes.group || 'Documentation' }}</p><h1>{{ doc.attributes.title }}</h1>@if (doc.attributes.description) { <p class="doq-description">{{ doc.attributes.description }}</p> }</header>
          <analog-markdown class="doq-markdown" [content]="doc.content" />
          @if (doc.attributes.demo; as demoId) {
            @if (demoComponent(demoId); as demo) { <ng-container *ngComponentOutlet="demo" /> }
            @else { <p class="doq-demo-fallback" role="status">Demo “{{ demoId }}” is not registered by this application.</p> }
          }
          @if (config.showTableOfContents && headings().length) {
            <aside class="doq-toc" aria-label="On this page"><p>On this page</p>@for (heading of headings(); track heading.id) { <a [routerLink]="[]" [fragment]="heading.id" [class.level-three]="heading.level === 3" [class.is-active]="activeHeading() === heading.id">{{ heading.text }}</a> }</aside>
          }
          <nav class="doq-pagination" aria-label="Page navigation">
            @if (previous(); as prev) { <a [routerLink]="prev.href"><span>Previous</span><strong>← {{ prev.title }}</strong></a> }
            @if (next(); as nxt) { <a class="next" [routerLink]="nxt.href"><span>Next</span><strong>{{ nxt.title }} →</strong></a> }
          </nav>
        </article>
      </div>
      } @else { <main class="doq-not-found" role="status"><h1>Documentation page not found</h1><p>This page may have moved or does not exist.</p><a [routerLink]="config.basePath">Browse documentation</a></main> }
    } @else if (document() === undefined) { <div class="doq-loading" aria-live="polite">Loading documentation…</div> }
    @else { <main class="doq-not-found" role="status"><h1>Documentation page not found</h1><p>This page may have moved or does not exist.</p><a [routerLink]="config.basePath">Browse documentation</a></main> }
  `,
})
export class DoqDocsComponent {
  readonly config = inject(DOQ_CONFIG);
  readonly activeHeading = signal('');
  readonly mobileNavigationOpen = signal(false);
  private readonly route = inject(ActivatedRoute);
  readonly routeSlug = toSignal(this.route.paramMap.pipe(map(params => params.get(this.config.routeParam ?? 'slug') ?? '')), { initialValue: '' });
  private readonly files = injectContentFiles<DocAttributes>(file => file.filename.includes(`/content/${this.config.contentDirectory}/`));
  readonly documents = sortDoqDocuments(this.files.map(file => normalizeDoqDocument(file, this.config.contentDirectory, this.config.basePath ?? '/docs')).filter((doc): doc is NonNullable<typeof doc> => !!doc));
  private readonly contentMap = injectContentFilesMap();
  private readonly renderer = inject(ContentRenderer);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
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
      const entry = this.documents.find(doc => doc.slug === slug);
      if (!slug || !entry) return of(null);
      const contentBase = `src/content/${this.config.contentDirectory.replace(/^\/+|\/+$/g, '')}/${entry.slug}`;
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
  demoComponent(id: string): Type<unknown> | undefined { return id === 'button' ? DoqButtonDemoComponent : this.config.demos?.[id]; }
  readonly headings = computed(() => this.document()?.toc ?? []);
  readonly previous = computed(() => this.adjacent(-1));
  readonly next = computed(() => this.adjacent(1));
  private readonly titleEffect = effect(() => {
    const doc = this.document();
    if (!doc?.attributes.title) return;
    this.title.setTitle(`${doc.attributes.title} · Documentation`);
    if (doc.attributes.description) this.meta.updateTag({ name: 'description', content: doc.attributes.description });
  });
  private readonly enhancementEffect = effect(onCleanup => {
    const doc = this.document();
    this.activeHeading.set('');
    onCleanup(() => this.enhancementObserver?.disconnect());
    if (!doc || !isPlatformBrowser(this.platformId)) return;
    const timer = globalThis.setTimeout(() => this.enhanceRenderedDocument(), 0);
    onCleanup(() => globalThis.clearTimeout(timer));
  });
  toggleMobileNavigation(): void {
    this.mobileNavigationOpen.update(open => !open);
    if (this.mobileNavigationOpen()) globalThis.setTimeout(() => this.hostElement.querySelector<HTMLElement>('.doq-sidebar a')?.focus(), 0);
    else this.hostElement.querySelector<HTMLElement>('.doq-mobile-trigger')?.focus();
  }
  closeMobileNavigation(): void {
    if (!this.mobileNavigationOpen()) return;
    this.mobileNavigationOpen.set(false);
    this.hostElement.querySelector<HTMLElement>('.doq-mobile-trigger')?.focus();
  }
  onNavigationKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.closeMobileNavigation(); return; }
    if (event.key !== 'Tab') return;
    const links = this.hostElement.querySelectorAll<HTMLElement>('.doq-sidebar a');
    const first = links.item(0), last = links.item(links.length - 1);
    if (event.shiftKey && this.documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && this.documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  private canonicalFilename(filename: string): string {
    const normalized = filename.replace(/\\/g, '/');
    const marker = `src/content/${this.config.contentDirectory}/`;
    const index = normalized.lastIndexOf(marker);
    return index < 0 ? normalized : normalized.slice(index);
  }
  private get hostElement(): HTMLElement { return this.host.nativeElement as HTMLElement; }
  private enhanceRenderedDocument(): void {
    const root = this.hostElement.querySelector<HTMLElement>('.doq-root');
    const markdown = root?.querySelector<HTMLElement>('.doq-markdown');
    if (!root || !markdown) return;
    for (const pre of Array.from(markdown.querySelectorAll<HTMLElement>('pre:not([data-doq-copy])'))) {
      pre.dataset['doqCopy'] = 'true';
      const button = this.documentRef.createElement('button');
      button.type = 'button'; button.className = 'doq-code-copy'; button.setAttribute('aria-label', 'Copy code'); button.textContent = 'Copy';
      const copy = async () => {
        try {
          if (!globalThis.navigator?.clipboard) throw new Error('Clipboard unavailable');
          await globalThis.navigator.clipboard.writeText(pre.querySelector('code')?.innerText ?? pre.innerText);
          button.textContent = 'Copied'; button.setAttribute('aria-label', 'Code copied');
        } catch { button.textContent = 'Copy unavailable'; button.setAttribute('aria-label', 'Clipboard access unavailable'); }
      };
      button.addEventListener('click', copy);
      pre.appendChild(button);
    }
    const headings = this.headings();
    const nodes = headings.map(heading => this.documentRef.getElementById(heading.id)).filter((node): node is HTMLElement => !!node && markdown.contains(node));
    if (!('IntersectionObserver' in globalThis) || !nodes.length) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible?.target instanceof HTMLElement) this.activeHeading.set(visible.target.id);
    }, { rootMargin: '0px 0px -70% 0px' });
    nodes.forEach(node => observer.observe(node));
    this.enhancementObserver?.disconnect();
    this.enhancementObserver = observer;
  }
  private enhancementObserver?: IntersectionObserver;
  private adjacent(offset: number) { const items = this.navigation(); const i = items.findIndex(item => item.slug === this.routeSlug()); return items[i + offset]; }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, AfterViewChecked, PLATFORM_ID, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { injectContent, injectContentFiles, MarkdownComponent } from '@analogjs/content';
import { DOQ_CONFIG } from './doq-config';
import { DoqButtonDemoComponent } from './doq-demo.component';
import { normalizeDoqDocument, sortDoqDocuments } from './doq-document';

interface DocAttributes { title?: string; description?: string; order?: number; group?: string; slug?: string; demo?: string; }

@Component({
  selector: 'doq-docs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MarkdownComponent, DoqButtonDemoComponent, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (document(); as doc) {
      @if (doc.attributes.title) {
      <div class="doq-root" [style.--doq-content-width]="config.contentWidth" [style.--doq-sidebar-width]="config.sidebarWidth" [attr.data-sidebar]="config.sidebar">
        <nav class="doq-sidebar" aria-label="Documentation">
          <a class="doq-overview" [routerLink]="config.basePath">Overview</a>
          @for (item of navigation(); track item.href) {
            @if (item.groupStart && item.group) { <p class="doq-nav-group">{{ item.group }}</p> }
            <a class="doq-nav-link" [routerLink]="item.href" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">{{ item.title }}</a>
          }
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
            <aside class="doq-toc" aria-label="On this page"><p>On this page</p>@for (heading of headings(); track heading.id) { <a [routerLink]="[]" [fragment]="heading.id" [class.level-three]="heading.level === 3" [class.is-active]="activeHeading() === heading.id" (click)="activeHeading.set(heading.id)">{{ heading.text }}</a> }</aside>
          }
          <nav class="doq-pagination" aria-label="Page navigation">
            @if (previous(); as prev) { <a [routerLink]="prev.href"><span>Previous</span><strong>← {{ prev.title }}</strong></a> }
            @if (next(); as nxt) { <a class="next" [routerLink]="nxt.href"><span>Next</span><strong>{{ nxt.title }} →</strong></a> }
          </nav>
        </article>
      </div>
      } @else { <main class="doq-not-found" role="status"><h1>Documentation page not found</h1><p>This page may have moved or does not exist.</p><a [routerLink]="config.basePath">Browse documentation</a></main> }
    } @else { <div class="doq-loading" aria-live="polite">Loading documentation…</div> }
  `,
})
export class DoqDocsComponent implements AfterViewChecked {
  readonly config = inject(DOQ_CONFIG);
  readonly activeHeading = signal('');
  readonly document$ = injectContent<DocAttributes>({ param: this.config.routeParam ?? 'slug', subdirectory: this.config.contentDirectory }, '');
  readonly document = toSignal(this.document$, { initialValue: undefined });
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly documentRef = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly files = injectContentFiles<DocAttributes>(file => file.filename.includes(`src/content/${this.config.contentDirectory}/`));
  readonly routeSlug = toSignal(inject(ActivatedRoute).paramMap.pipe(map(params => params.get(this.config.routeParam ?? 'slug') ?? '')), { initialValue: '' });
  readonly navigation = computed(() => {
    const docs = sortDoqDocuments(this.files.map(file => normalizeDoqDocument(file, this.config.contentDirectory, this.config.basePath ?? '/docs')).filter((doc): doc is NonNullable<typeof doc> => !!doc));
    return docs.map((doc, index) => ({ ...doc, href: doc.routePath, groupStart: index === 0 || doc.group !== docs[index - 1]?.group }));
  });
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
  ngAfterViewChecked(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    for (const pre of Array.from(this.documentRef.querySelectorAll<HTMLElement>('.doq-markdown pre:not([data-doq-copy])'))) {
      pre.dataset['doqCopy'] = 'true';
      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.className = 'doq-code-copy';
      button.setAttribute('aria-label', 'Copy code');
      button.textContent = 'Copy';
      button.addEventListener('click', async () => {
        try {
          await globalThis.navigator.clipboard.writeText(pre.querySelector('code')?.innerText ?? pre.innerText);
          button.textContent = 'Copied';
          button.setAttribute('aria-label', 'Code copied');
        } catch {
          button.textContent = 'Copy unavailable';
          button.setAttribute('aria-label', 'Clipboard access unavailable');
        }
      });
      pre.appendChild(button);
    }
  }
  private adjacent(offset: number) { const items = this.navigation(); const i = items.findIndex(item => item.slug === this.routeSlug()); return items[i + offset]; }
}

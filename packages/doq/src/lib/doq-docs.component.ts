import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, AfterViewChecked, PLATFORM_ID } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { injectContent, injectContentFiles, MarkdownComponent } from '@analogjs/content';
import { DOQ_CONFIG } from './doq-config';
import { DoqButtonDemoComponent } from './doq-demo.component';

interface DocAttributes { title: string; description?: string; order?: number; group?: string; demo?: 'button'; }

@Component({
  selector: 'doq-docs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MarkdownComponent, DoqButtonDemoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (document(); as doc) {
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
          @if (doc.attributes.demo === 'button') { <doq-button-demo /> }
          @if (config.showTableOfContents && headings().length) {
            <aside class="doq-toc" aria-label="On this page"><p>On this page</p>@for (heading of headings(); track heading.id) { <a [href]="'#' + heading.id" [class.level-three]="heading.level === 3" [class.is-active]="activeHeading() === heading.id" (click)="activeHeading.set(heading.id)">{{ heading.text }}</a> }</aside>
          }
          <nav class="doq-pagination" aria-label="Page navigation">
            @if (previous(); as prev) { <a [routerLink]="prev.href"><span>Previous</span><strong>← {{ prev.title }}</strong></a> }
            @if (next(); as nxt) { <a class="next" [routerLink]="nxt.href"><span>Next</span><strong>{{ nxt.title }} →</strong></a> }
          </nav>
        </article>
      </div>
    } @else { <div class="doq-loading" aria-live="polite">Loading documentation…</div> }
  `,
})
export class DoqDocsComponent implements AfterViewChecked {
  readonly config = inject(DOQ_CONFIG);
  readonly activeHeading = signal('');
  readonly document$ = injectContent<DocAttributes>({ param: this.config.routeParam ?? 'slug', subdirectory: this.config.contentDirectory });
  readonly document = toSignal(this.document$, { initialValue: undefined });
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly documentRef = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly files = injectContentFiles<DocAttributes>(file => file.filename.includes(`src/content/${this.config.contentDirectory}/`));
  readonly routeSlug = toSignal(inject(ActivatedRoute).paramMap.pipe(map(params => params.get('slug') ?? '')), { initialValue: '' });
  readonly navigation = computed(() => {
    const sorted = this.files.map(file => {
    const path = file.filename.split(`src/content/${this.config.contentDirectory}/`).pop()?.replace(/\.md$/, '') ?? '';
    return { title: file.attributes.title || path.split('/').pop() || 'Untitled', group: file.attributes.group, order: file.attributes.order ?? 100, href: `${this.config.basePath}/${path}` };
    }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    return sorted.map((item, index) => ({ ...item, groupStart: index === 0 || item.group !== sorted[index - 1]?.group }));
  });
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
  private adjacent(offset: number) { const items = this.navigation(); const i = items.findIndex(item => item.href.endsWith(`/${this.routeSlug()}`)); return items[i + offset]; }
}

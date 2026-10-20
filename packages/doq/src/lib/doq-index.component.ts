import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectContentFiles } from '@analogjs/content';
import { DOQ_CONFIG } from './doq-config';

interface DocAttributes { title: string; description?: string; order?: number; group?: string; }

@Component({
  selector: 'doq-index',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="doq-index" [style.--doq-content-width]="config.contentWidth">
      <p class="doq-eyebrow">Documentation</p><h1>Explore the docs</h1>
      <p class="doq-description">Browse guides and references for this product.</p>
      <div class="doq-index-grid">
        @for (item of navigation; track item.href) {
          <a class="doq-index-card" [routerLink]="item.href"><span>{{ item.group || 'Guide' }}</span><strong>{{ item.title }}</strong><p>{{ item.description }}</p><span class="doq-index-arrow">Read guide →</span></a>
        }
      </div>
    </main>
  `,
})
export class DoqIndexComponent {
  readonly config = inject(DOQ_CONFIG);
  readonly navigation = injectContentFiles<DocAttributes>(file => file.filename.includes(`src/content/${this.config.contentDirectory}/`))
    .map(file => {
      const path = file.filename.split(`src/content/${this.config.contentDirectory}/`).pop()?.replace(/\.md$/, '') ?? '';
      return { title: file.attributes.title || path.split('/').pop() || 'Untitled', description: file.attributes.description || '', group: file.attributes.group, order: file.attributes.order ?? 100, href: `${this.config.basePath}/${path}` };
    }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

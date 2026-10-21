import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { injectDoqDocuments, resolveDoqCopy } from './doq-catalog';
import { DOQ_CONFIG } from './doq-config';
import { DoqPageMetadata } from './doq-metadata';

@Component({
  selector: 'doq-index',
  standalone: true,
  imports: [RouterLink, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="doq-index" [style.--doq-content-width]="config.contentWidth">
      <p class="doq-eyebrow">{{ copy.label }}</p><h1>{{ copy.indexTitle }}</h1>
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
  readonly copy = resolveDoqCopy(this.config);
  readonly navigation = injectDoqDocuments(this.config);

  constructor() {
    const metadata = inject(DoqPageMetadata);
    metadata.claim(inject(DestroyRef));
    metadata.set(this.copy.hasIndexTitle ? this.copy.indexTitle : this.copy.label, this.copy.hasIndexDescription ? this.copy.indexDescription : undefined);
  }
}

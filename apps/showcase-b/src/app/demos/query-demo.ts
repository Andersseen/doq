import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'forge-query-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="consumer-demo" aria-label="Forge query builder">
      <label>Limit <input type="range" min="1" max="100" [value]="limit()" (input)="limit.set(+$any($event.target).value)" /> <output>{{ limit() }}</output></label>
      <label><input type="checkbox" [checked]="published()" (change)="published.set($any($event.target).checked)" /> Published only</label>
      <pre aria-label="Request URL" style="white-space: pre-wrap; overflow-wrap: anywhere">{{ url() }}</pre>
    </section>
  `,
})
export class ForgeQueryDemoComponent {
  readonly limit = signal(20);
  readonly published = signal(false);
  readonly url = computed(() => `/v1/entries?collection=product-guides&limit=${this.limit()}${this.published() ? '&status=published' : ''}`);
}

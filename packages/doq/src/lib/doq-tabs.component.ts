import { ChangeDetectionStrategy, Component, ElementRef, inject, input, linkedSignal } from '@angular/core';
import { MarkdownComponent } from '@analogjs/content';
import type { DoqTab } from './doq-rich-content';

/**
 * A `:::tabs` group: WAI-ARIA tabs with automatic activation. Every panel is in the prerendered HTML (inactive
 * ones `hidden`), so the content is present without JavaScript and in the Pagefind index; only the tab strip,
 * which is chrome, is excluded from search.
 */
@Component({
  selector: 'doq-tabs',
  standalone: true,
  imports: [MarkdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="doq-tabs" [class.is-code]="codeOnly()">
      <div class="doq-tablist" role="tablist" data-pagefind-ignore [attr.aria-label]="label() || null" (keydown)="onKeydown($event)">
        @for (tab of tabs(); track $index) {
          <button type="button" role="tab" class="doq-tab" [id]="tabId($index)" [attr.aria-selected]="selected() === $index" [attr.aria-controls]="panelId($index)" [attr.tabindex]="selected() === $index ? 0 : -1" (click)="select($index)">{{ tab.label }}</button>
        }
      </div>
      @for (tab of tabs(); track $index) {
        <div class="doq-tabpanel" role="tabpanel" tabindex="0" [id]="panelId($index)" [attr.aria-labelledby]="tabId($index)" [hidden]="selected() !== $index">
          <analog-markdown class="doq-markdown" [content]="tab.html" />
        </div>
      }
    </div>
  `,
})
export class DoqTabsComponent {
  /** Stable per document position; ids are derived from it so server and browser render the same ones. */
  readonly uid = input.required<string>();
  readonly tabs = input.required<readonly DoqTab[]>();
  readonly label = input('');
  readonly codeOnly = input(false);
  /** Each group owns its selection; it returns to the first tab when the group's content changes. */
  readonly selected = linkedSignal<readonly DoqTab[], number>({ source: this.tabs, computation: () => 0 });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  tabId(index: number): string { return `${this.uid()}-tab-${index}`; }
  panelId(index: number): string { return `${this.uid()}-panel-${index}`; }
  select(index: number): void { this.selected.set(index); }

  onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const count = this.tabs().length;
    const current = this.selected();
    const next = event.key === 'ArrowRight' ? (current + 1) % count
      : event.key === 'ArrowLeft' ? (current - 1 + count) % count
      : event.key === 'Home' ? 0
      : event.key === 'End' ? count - 1
      : undefined;
    if (next === undefined) return;
    event.preventDefault();
    this.select(next);
    this.host.nativeElement.querySelector<HTMLElement>(`[id="${this.tabId(next)}"]`)?.focus();
  }
}

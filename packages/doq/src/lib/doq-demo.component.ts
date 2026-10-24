import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

/**
 * @deprecated Example component of the Doqs pilot that leaked into the public surface; it is not a Doqs feature. Register your own
 * components with `DoqConfig.demos` instead. It keeps working through 0.x and 1.x and is removed only in a major release.
 */
@Component({
  selector: 'doq-button-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="doq-demo" aria-label="Interactive button preview">
      <div class="doq-demo-controls">
        <label>Style <select [value]="variant()" (change)="variant.set($any($event.target).value)"><option value="solid">Solid</option><option value="outline">Outline</option><option value="quiet">Quiet</option></select></label>
        <label><input type="checkbox" [checked]="disabled()" (change)="disabled.set($any($event.target).checked)" /> Disabled</label>
      </div>
      <button type="button" [class]="buttonClass()" [disabled]="disabled()" (click)="clicks.update(n => n + 1)">{{ label() }}</button>
      <span class="doq-demo-count" aria-live="polite">{{ clicks() }} clicks</span>
    </section>
  `,
})
export class DoqButtonDemoComponent {
  readonly variant = signal('solid');
  readonly disabled = signal(false);
  readonly clicks = signal(0);
  readonly label = computed(() => this.clicks() ? `Clicked ${this.clicks()} times` : 'Try the button');
  readonly buttonClass = computed(() => `doq-demo-button doq-demo-button--${this.variant()}`);
}

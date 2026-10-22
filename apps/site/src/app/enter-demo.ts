import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { VoltNativeButton, VoltToggleGroup, VoltToggleGroupItem } from '@voltui/components';
import { LmnArrowPathIcon } from 'lumen-icons/arrow-path';
import { MoveEnterDirective, type MovePreset } from 'angular-movement';

const presets = ['fade-up', 'zoom-in', 'blur-in'] as const satisfies readonly MovePreset[];

/**
 * The component the Markdown example places with `::demo[enter-animation]`.
 * Animated by Angular Movement, controlled by Volt UI; Movement jumps to the end state under reduced motion.
 */
@Component({
  selector: 'app-enter-demo',
  imports: [MoveEnterDirective, VoltNativeButton, VoltToggleGroup, VoltToggleGroupItem, LmnArrowPathIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <volt-toggle-group type="single" [value]="selected()" (valueChange)="choose($event)" aria-label="Enter animation preset">
        @for (name of presets; track name) {
          <volt-toggle-group-item [value]="name" variant="outline" size="sm">{{ name }}</volt-toggle-group-item>
        }
      </volt-toggle-group>
      <button voltButton variant="outline" size="sm" type="button" (click)="replay()">
        <lmn-arrow-path [size]="16" /> Replay
      </button>
    </div>
    <div class="mt-4 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border">
      @for (run of runs(); track run) {
        <div
          class="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
          [moveEnter]="preset()"
          moveDuration="400ms"
          data-testid="enter-target"
        >
          {{ preset() }}
        </div>
      }
    </div>
    <p class="sr-only" role="status">Preview shows the {{ preset() }} animation.</p>
  `,
})
export class EnterDemo {
  protected readonly presets = presets;
  protected readonly preset = signal<MovePreset>('fade-up');
  protected readonly selected = computed(() => [this.preset()]);
  protected readonly runs = computed(() => [this.run()]);
  private readonly run = signal(0);

  protected choose(value: readonly string[]) {
    const next = presets.find((name) => name === value[0]);
    if (!next) return; // the group reports an empty selection when the active item is pressed again
    this.preset.set(next);
    this.replay();
  }

  protected replay() {
    this.run.update((n) => n + 1);
  }
}

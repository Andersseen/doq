import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { VoltNativeButton } from '@voltui/components';
import { LmnArrowPathIcon } from 'lumen-icons/arrow-path';
import { MoveEnterDirective, type MovePreset } from 'angular-movement';

/**
 * Registered with Doqs as the `movement-enter` playground. `moveEnter` is an attribute directive, so this wrapper
 * applies it to a host element and re-creates that element whenever an input changes, which replays the enter
 * animation with the new settings. Angular Movement exposes no outputs; `played` is the wrapper's own.
 */
@Component({
  selector: 'app-movement-playground',
  imports: [MoveEnterDirective, VoltNativeButton, LmnArrowPathIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex justify-end">
      <button voltButton variant="outline" size="sm" type="button" (click)="replay()"><lmn-arrow-path [size]="16" /> Play again</button>
    </div>
    <div class="mt-3 flex min-h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border">
      @for (run of runs(); track run) {
        <div
          class="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
          data-testid="movement-target"
          [moveEnter]="preset()"
          [moveDuration]="duration()"
          [moveDelay]="delay()"
          [moveEasing]="easing()"
          [moveDisabled]="disabled()"
        >
          {{ preset() }}
        </div>
      }
    </div>
  `,
})
export class MovementPlaygroundComponent {
  readonly preset = input<MovePreset>('fade-up');
  readonly duration = input(600);
  readonly delay = input(0);
  readonly easing = input('ease-out');
  readonly disabled = input(false);
  readonly played = output<{ preset: string; duration: number }>();

  private readonly replays = signal(0);
  /** One element per input combination and replay: a new element enters again. */
  protected readonly runs = computed(() => [[this.preset(), this.duration(), this.delay(), this.easing(), this.disabled(), this.replays()].join('|')]);
  private started = false;

  constructor() {
    effect(() => {
      this.runs();
      untracked(() => {
        if (this.started) this.played.emit({ preset: this.preset(), duration: this.duration() });
        this.started = true;
      });
    });
  }

  protected replay(): void {
    this.replays.update((n) => n + 1);
  }
}

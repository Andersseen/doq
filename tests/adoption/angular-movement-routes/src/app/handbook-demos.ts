import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
} from '@angular/core';
import { SmoothScrollService } from 'movement';
import { MoveEnterDirective, MovePreset } from 'movement';
import { InstallCommand } from './shared/components/install-command/install-command';
import { ApiStabilityTable } from './shared/components/api-stability-table/api-stability-table';

/** A real Angular Movement directive reacting to user input, owned by the host (not by Doqs). */
@Component({
  selector: 'app-handbook-enter-demo',
  imports: [MoveEnterDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Enter animation demo" class="border-border bg-surface rounded-xl border p-4">
      <label class="text-sm"
        >Preset
        <select
          class="bg-bg border-border ml-2 rounded border px-2 py-1"
          [value]="preset()"
          (change)="preset.set($any($event.target).value)"
        >
          <option value="fade-up">fade-up</option>
          <option value="fade-down">fade-down</option>
          <option value="scale-in">scale-in</option>
        </select>
      </label>
      <button type="button" class="bg-accent-solid ml-2 rounded px-3 py-1 text-sm text-white" (click)="replay()">
        Replay
      </button>
      <div class="mt-4 min-h-16">
        @if (show()) {
          <div [moveEnter]="preset()" class="border-accent/40 rounded-lg border p-4">
            Entered with <strong>{{ preset() }}</strong> (replayed {{ plays() }}×)
          </div>
        }
      </div>
    </section>
  `,
})
export class HandbookEnterDemo {
  readonly preset = signal<MovePreset>('fade-up');
  readonly show = signal(true);
  readonly plays = signal(0);
  replay(): void {
    this.show.set(false);
    queueMicrotask(() => {
      this.show.set(true);
      this.plays.update((n) => n + 1);
    });
  }
}

/**
 * A Doqs playground target for the real `moveEnter` directive. The directive plays once, in ngOnInit, and does not follow later
 * input changes, so the wrapper creates a new element for every input combination: the animation is replayed with the new settings.
 * Angular Movement has no outputs; `played` is this wrapper's own.
 */
@Component({
  selector: 'app-handbook-movement-playground',
  imports: [MoveEnterDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      class="border-border flex min-h-28 items-center justify-center overflow-hidden rounded-lg border border-dashed"
    >
      @for (run of runs(); track run) {
        <div
          class="border-accent/40 rounded-lg border p-4"
          data-testid="am-target"
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
export class HandbookMovementPlayground {
  readonly preset = input<MovePreset>('fade-up');
  readonly duration = input(500);
  readonly delay = input(0);
  readonly easing = input('ease-out');
  readonly disabled = input(false);
  readonly played = output<{ preset: string; duration: number }>();
  protected readonly runs = computed(() => [
    [this.preset(), this.duration(), this.delay(), this.easing(), this.disabled()].join('|'),
  ]);
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
}

export const handbookDemos = {
  'install-command': InstallCommand,
  'enter-animation': HandbookEnterDemo,
  'api-stability': ApiStabilityTable,
};

/** The host's own scroll behaviour, composed through a Doqs slot: Angular Movement smooth scrolling on the page. */
@Component({ selector: 'app-handbook-smooth-scroll', changeDetection: ChangeDetectionStrategy.OnPush, template: '' })
export class HandbookSmoothScroll implements OnInit {
  private readonly scroll = inject(SmoothScrollService);
  ngOnInit(): void {
    this.scroll.init({ lerp: 0.1 });
  }
}

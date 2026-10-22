import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
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

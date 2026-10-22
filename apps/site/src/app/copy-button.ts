import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { VoltNativeButton } from '@voltui/components';
import { LmnCheckIcon } from 'lumen-icons/check';
import { LmnCopyIcon } from 'lumen-icons/copy';

type CopyState = 'idle' | 'copied' | 'failed';

/** Copies `text` verbatim; reports success politely and failure without throwing. */
@Component({
  selector: 'app-copy-button',
  imports: [VoltNativeButton, LmnCheckIcon, LmnCopyIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex flex-col items-end gap-1' },
  template: `
    <button voltButton variant="outline" size="sm" type="button" (click)="copy()">
      @if (state() === 'copied') {
        <lmn-check [size]="16" tone="success" />
        Copied
      } @else {
        <lmn-copy [size]="16" />
        Copy
      }
      <span class="sr-only">{{ label() }}</span>
    </button>
    <span class="sr-only" role="status">{{ state() === 'copied' ? announcement() : '' }}</span>
    @if (state() === 'failed') {
      <span class="text-xs text-error">Copying is not available here. Select the text and copy it manually.</span>
    }
  `,
})
export class CopyButton {
  readonly text = input.required<string>();
  /** Visually hidden context appended to "Copy", for example "install command". */
  readonly label = input('');
  readonly announcement = input('Copied to the clipboard.');
  protected readonly state = signal<CopyState>('idle');
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy() {
    clearTimeout(this.timer);
    try {
      await navigator.clipboard.writeText(this.text());
      this.state.set('copied');
    } catch {
      this.state.set('failed');
    }
    this.timer = setTimeout(() => this.state.set('idle'), 2500);
  }
}

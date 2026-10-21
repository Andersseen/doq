import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';

type CopyState = 'idle' | 'copied' | 'failed';

@Component({
  selector: 'app-copy-command',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="command">
      <code>{{ command() }}</code>
      <button type="button" (click)="copy()">{{ state() === 'copied' ? 'Copied' : 'Copy' }}<span class="sr-only"> install command</span></button>
    </div>
    <p class="sr-only" role="status">{{ message() }}</p>
    @if (state() === 'failed') {
      <p class="command-error">Copying is not available here. Select the command and copy it manually.</p>
    }
  `,
})
export class CopyCommand {
  readonly command = input.required<string>();
  protected readonly state = signal<CopyState>('idle');
  protected readonly message = () =>
    this.state() === 'copied' ? 'Install command copied to the clipboard.' : '';
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy() {
    clearTimeout(this.timer);
    try {
      await navigator.clipboard.writeText(this.command());
      this.state.set('copied');
    } catch {
      this.state.set('failed');
    }
    this.timer = setTimeout(() => this.state.set('idle'), 2500);
  }
}

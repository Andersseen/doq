import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input, numberAttribute, output } from '@angular/core';

/** The URL the ForgeCMS delivery API would receive; `sent` reports it. Inputs use a transform and an alias on purpose. */
@Component({
  selector: 'forge-request-playground',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="consumer-demo">
      <pre aria-label="Request URL" style="white-space: pre-wrap; overflow-wrap: anywhere; margin: 0 0 .75rem">GET {{ url() }}</pre>
      <button type="button" (click)="sent.emit({ method: 'GET', url: url() })">Send request</button>
    </div>
  `,
})
export class ForgeRequestPlaygroundComponent {
  readonly collection = input.required<string>();
  readonly limit = input(20, { transform: numberAttribute });
  readonly locale = input('en');
  readonly includeDrafts = input(false, { alias: 'drafts', transform: booleanAttribute });
  readonly sent = output<{ method: string; url: string }>();
  readonly url = computed(() => `/v1/entries?collection=${encodeURIComponent(this.collection())}&limit=${this.limit()}&locale=${this.locale()}${this.includeDrafts() ? '&status=draft' : ''}`);
}

/** A retry policy rendered as a schedule; `attempted` fires for every simulated attempt. */
@Component({
  selector: 'forge-retry-playground',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="consumer-demo">
      <ol aria-label="Retry schedule" style="margin: 0 0 .75rem">
        @for (delay of schedule(); track $index) { <li>Attempt {{ $index + 2 }} after {{ delay }} ms</li> } @empty { <li>No retries: fail immediately.</li> }
      </ol>
      <button type="button" (click)="attempted.emit({ retries: retries(), backoff: backoff() })">Simulate failure</button>
    </div>
  `,
})
export class ForgeRetryPlaygroundComponent {
  readonly retries = input.required({ transform: numberAttribute });
  readonly baseDelayMs = input(200, { transform: numberAttribute });
  readonly backoff = input<'fixed' | 'exponential'>('exponential');
  readonly attempted = output<{ retries: number; backoff: string }>();
  readonly schedule = computed(() => Array.from({ length: this.retries() }, (_, i) => (this.backoff() === 'fixed' ? this.baseDelayMs() : this.baseDelayMs() * 2 ** i)));
}

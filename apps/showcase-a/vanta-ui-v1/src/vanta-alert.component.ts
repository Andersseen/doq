import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * An inline message for Vanta 1.x. Vanta 2 replaced `kind` with the required `tone` input.
 *
 * @stability deprecated
 * @since 1.0
 */
@Component({
  selector: 'vanta-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div role="alert"><strong>{{ heading() }}</strong><ng-content /></div>`,
})
export class VantaAlertComponent {
  /** Visual intent of the 1.x alert; defaults to `info`. */
  readonly kind = input<'info' | 'warning' | 'danger'>('info');
  /** Short heading shown above the message. */
  readonly heading = input('');
  /** Emits when the reader closes the alert. */
  readonly closed = output<void>();
}

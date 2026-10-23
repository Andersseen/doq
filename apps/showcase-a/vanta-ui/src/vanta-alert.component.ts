import { ChangeDetectionStrategy, Component, booleanAttribute, input, output } from '@angular/core';
import type { VantaTone } from './vanta-tone';

/**
 * An inline message that stays in the page flow and can be dismissed by the reader.
 *
 * @stability stable
 * @since 1.0
 * @example
 * <vanta-alert tone="warning" alertTitle="Unsaved changes" dismissible (dismissed)="onDismissed()">
 *   Your draft has not been saved.
 * </vanta-alert>
 */
@Component({
  selector: 'vanta-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div role="alert"><strong>{{ heading() }}</strong><ng-content /></div>`,
})
export class VantaAlertComponent {
  // #region doqs:alert-inputs
  /** Visual intent. Required so an alert never defaults to a misleading colour. */
  readonly tone = input.required<VantaTone>();
  /** Short heading shown above the message. Bound as `alertTitle`. */
  readonly heading = input('', { alias: 'alertTitle' });
  /** Shows a close button when set. Accepts the bare attribute (`dismissible`). */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Emits once, when the reader closes the alert. */
  readonly dismissed = output<void>();
  // #endregion doqs:alert-inputs

  /** Closes the alert from code, exactly as the close button does. */
  dismiss(): void {
    this.dismissed.emit();
  }
}

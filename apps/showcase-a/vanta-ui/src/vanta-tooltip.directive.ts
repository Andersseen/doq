import { Directive, input, model, numberAttribute } from '@angular/core';

/**
 * Describes an element with a short text bubble on hover and keyboard focus.
 *
 * @stability candidate
 */
@Directive({ selector: '[vantaTooltip]', exportAs: 'vantaTooltip' })
export class VantaTooltipDirective {
  /** The tooltip text. Leave empty to disable the tooltip. */
  readonly vantaTooltip = input.required<string>();
  /** Delay before the bubble opens, in milliseconds. */
  readonly vantaTooltipDelay = input(300, { transform: numberAttribute });
  /** Whether the bubble is currently shown. Two-way bindable: `[(vantaTooltipOpen)]`. */
  readonly vantaTooltipOpen = model(false);
}

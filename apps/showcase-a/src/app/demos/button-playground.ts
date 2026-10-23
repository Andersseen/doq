import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { VoltNativeButton } from '@voltui/components';

type VoltVariant = 'solid' | 'destructive' | 'outline' | 'ghost' | 'link';
type VoltSize = 'sm' | 'md' | 'lg';

/**
 * A consumer-owned wrapper that applies Volt UI's `voltButton` directive. Doqs binds the inputs by their public
 * names and reports `pressed`; the directive itself is never instantiated by Doqs.
 */
@Component({
  selector: 'vanta-button-playground',
  standalone: true,
  imports: [VoltNativeButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button voltButton type="button" [variant]="variant()" [size]="size()" [disabled]="disabled()" (click)="pressed.emit(label())">{{ label() }}</button>`,
})
export class VantaButtonPlaygroundComponent {
  readonly variant = input<VoltVariant>('solid');
  readonly size = input<VoltSize>('md');
  readonly disabled = input(false);
  readonly label = input('Save changes');
  readonly pressed = output<string>();
}

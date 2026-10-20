import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { VoltNativeButton } from '@voltui/components';

@Component({
  selector: 'vanta-button-demo',
  standalone: true,
  imports: [VoltNativeButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="consumer-demo" aria-label="Vanta button demo"><button voltButton type="button" (click)="count.update(n => n + 1)">Save changes</button><span aria-live="polite">{{ count() }} activations</span></section>`,
})
export class VantaButtonDemoComponent {
  readonly count = signal(0);
}

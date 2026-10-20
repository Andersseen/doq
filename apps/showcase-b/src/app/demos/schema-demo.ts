import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'forge-schema-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="consumer-demo" aria-label="Forge content model demo"><label>Field type <select [value]="fieldType()" (change)="fieldType.set($any($event.target).value)"><option>Rich text</option><option>Reference</option><option>Boolean</option></select></label><p>Preview: <strong>{{ fieldType() }}</strong></p></section>`,
})
export class ForgeSchemaDemoComponent {
  readonly fieldType = signal('Rich text');
}

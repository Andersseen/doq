import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { VoltToggleGroup, VoltToggleGroupItem } from '@voltui/components';
import { CopyCommand } from './copy-command';

const managers = ['pnpm', 'npm', 'yarn'] as const;
type Manager = (typeof managers)[number];

/** Registered with Doqs as `install-command`; the docs place it with `::demo[install-command]`. */
@Component({
  selector: 'app-install-demo',
  imports: [VoltToggleGroup, VoltToggleGroupItem, CopyCommand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <volt-toggle-group type="single" [value]="selected()" (valueChange)="choose($event)" aria-label="Package manager">
      @for (name of managers; track name) {
        <volt-toggle-group-item [value]="name" variant="outline" size="sm">{{ name }}</volt-toggle-group-item>
      }
    </volt-toggle-group>
    <div class="mt-3"><app-copy-command [command]="command()" /></div>
    <p class="sr-only" role="status">Showing the {{ manager() }} command.</p>
  `,
})
export class InstallDemo {
  protected readonly managers = managers;
  protected readonly manager = signal<Manager>('pnpm');
  protected readonly selected = computed(() => [this.manager()]);
  protected readonly command = computed(() => {
    switch (this.manager()) {
      case 'npm':
        return 'npm install @doqs/analog @analogjs/content @analogjs/router prismjs';
      case 'yarn':
        return 'yarn add @doqs/analog @analogjs/content @analogjs/router prismjs';
      default:
        return 'pnpm add @doqs/analog @analogjs/content @analogjs/router prismjs';
    }
  });

  protected choose(value: readonly string[]) {
    const next = managers.find((name) => name === value[0]);
    if (next) this.manager.set(next); // pressing the active item again reports an empty selection; keep the current one
  }
}

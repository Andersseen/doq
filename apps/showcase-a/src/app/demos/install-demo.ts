import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

const managers = { pnpm: 'pnpm add @voltui/components', npm: 'npm install @voltui/components', yarn: 'yarn add @voltui/components' } as const;
type Manager = keyof typeof managers;

@Component({
  selector: 'vanta-install-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="consumer-demo vanta-install" aria-label="Vanta install command">
      <div role="group" aria-label="Package manager">
        @for (name of names; track name) {
          <button type="button" [attr.aria-pressed]="manager() === name" (click)="manager.set(name)">{{ name }}</button>
        }
      </div>
      <code>{{ command() }}</code>
    </section>
  `,
})
export class VantaInstallDemoComponent {
  readonly names = Object.keys(managers) as Manager[];
  readonly manager = signal<Manager>('pnpm');
  readonly command = computed(() => managers[this.manager()]);
}

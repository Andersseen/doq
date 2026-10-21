import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

@Component({
  selector: 'vanta-contrast-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="consumer-demo vanta-contrast" aria-label="Vanta contrast checker">
      <label>Text <input type="color" [value]="foreground()" (input)="foreground.set($any($event.target).value)" /></label>
      <label>Background <input type="color" [value]="background()" (input)="background.set($any($event.target).value)" /></label>
      <p [style.color]="foreground()" [style.background]="background()">Sample text</p>
      <p aria-live="polite">Contrast <strong>{{ ratio() }}</strong> to 1 · {{ ratio() >= 4.5 ? 'passes AA' : 'fails AA' }}</p>
    </section>
  `,
})
export class VantaContrastDemoComponent {
  readonly foreground = signal('#ffffff');
  readonly background = signal('#6d28d9');
  readonly ratio = computed(() => {
    const [a, b] = [luminance(this.foreground()), luminance(this.background())].sort((x, y) => y - x);
    return (((a! + 0.05) / (b! + 0.05)) * 100 | 0) / 100;
  });
}

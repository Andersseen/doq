import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="volt-site" [attr.data-theme]="theme()">
      <header class="volt-header">
        <a class="volt-brand" routerLink="/"><span class="volt-mark">V</span><span>Vanta<span class="brand-muted"> UI</span></span></a>
        <nav aria-label="Main navigation"><a routerLink="/docs">Documentation</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
        <button class="theme-toggle" type="button" (click)="theme.set(theme() === 'dark' ? 'light' : 'dark')" [attr.aria-label]="theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">{{ theme() === 'dark' ? '☼' : '◐' }}</button>
      </header>
      <router-outlet />
      <footer class="volt-footer"><span>Vanta UI</span><span>Built for teams who ship thoughtful interfaces.</span><a routerLink="/docs">Read the docs →</a></footer>
    </div>
  `,
})
export class App {
  readonly theme = signal<'dark' | 'light'>('dark');
}

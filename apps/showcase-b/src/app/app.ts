import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root', imports: [RouterLink, RouterOutlet], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="forge-site" [attr.data-theme]="theme()">
      <div class="forge-utility"><span>FORGECMS CLOUD</span><span>API status <b></b> all systems operational</span><a href="https://github.com" target="_blank" rel="noreferrer">Community ↗</a></div>
      <header class="forge-header">
        <a class="forge-brand" routerLink="/"><span class="forge-symbol">F</span><span>forge<span>cms</span></span></a>
        <nav aria-label="Main navigation"><a href="#platform">Platform</a><a href="#solutions">Solutions</a><a routerLink="/docs" class="selected">Developers</a></nav>
        <div class="forge-actions"><a class="sign-in" href="#sign-in">Sign in</a><button type="button" (click)="theme.set(theme() === 'dark' ? 'light' : 'dark')" [attr.aria-label]="theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">{{ theme() === 'dark' ? '☼' : '◐' }}</button><a class="get-started" href="#start">Get started</a></div>
      </header>
      <router-outlet />
      <footer class="forge-footer"><div><strong>forgecms</strong><span>Structured content for the systems you build.</span></div><nav aria-label="Footer"><a routerLink="/docs">Developer guide</a><a href="#privacy">Privacy</a><a href="#terms">Terms</a></nav><small>© 2026 ForgeCMS, Inc.</small></footer>
    </div>
  `,
})
export class App { readonly theme = signal<'dark' | 'light'>('light'); }

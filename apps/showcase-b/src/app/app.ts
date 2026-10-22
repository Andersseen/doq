import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DoqShellComponent } from '@doqs/analog';

/**
 * Docs-first host: the whole application is documentation (like a Starlight or ngDoc site). Doqs owns every route
 * (`basePath: '/'`), the host only supplies the shell around it: brand, theme tokens, a theme toggle and a footer.
 * Showcase A is the opposite scenario, a product site with Doqs mounted on a single route.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DoqShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="forge-site" [attr.data-theme]="theme()">
      <doq-shell productName="ForgeCMS Developers" brandMark="F" homeUrl="/" docsPath="/">
        <button
          doq-header-extra
          class="theme-toggle"
          type="button"
          (click)="theme.set(theme() === 'dark' ? 'light' : 'dark')"
          [attr.aria-label]="theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        >{{ theme() === 'dark' ? '☼' : '◐' }}</button>
        <span doq-footer>© 2026 ForgeCMS, Inc. Developer documentation.</span>
        <router-outlet />
      </doq-shell>
    </div>
  `,
})
export class App {
  readonly theme = signal<'dark' | 'light'>('light');
}

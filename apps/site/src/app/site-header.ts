import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { siteLinks } from '../lib/site-config';

@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <header class="site-header">
      <div class="container bar">
        <a class="wordmark" href="/" aria-label="Doq, home"><span aria-hidden="true">doq</span><i aria-hidden="true"></i></a>
        <button
          type="button"
          class="menu-toggle"
          aria-controls="site-nav"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          {{ open() ? 'Close' : 'Menu' }}
        </button>
        <nav id="site-nav" aria-label="Main" [class.open]="open()">
          <a href="#features" (click)="close()">Features</a>
          <a href="#getting-started" (click)="close()">Getting started</a>
          <a [href]="links.github" rel="noopener">GitHub</a>
          <a [href]="links.npm" rel="noopener">npm</a>
        </nav>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly links = siteLinks;
  protected readonly open = signal(false);
  protected close() {
    this.open.set(false);
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteLinks } from '../lib/site-config';

@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <div class="container">
        <p><strong>doqs</strong> — documentation that lives in your Angular app.</p>
        <nav aria-label="Footer">
          <a [href]="links.github" rel="noopener">GitHub</a>
          <a [href]="links.npm" rel="noopener">npm</a>
          <a [href]="links.readme" rel="noopener">Documentation (README)</a>
          <a [href]="links.license" rel="noopener">MIT License</a>
        </nav>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly links = siteLinks;
}

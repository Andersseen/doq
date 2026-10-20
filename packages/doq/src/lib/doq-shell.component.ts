import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Optional neutral full-page shell; existing products can keep their own shell instead. */
@Component({
  selector: 'doq-shell',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="doq-shell">
      <header class="doq-shell-header">
        <a class="doq-shell-brand" [routerLink]="homeUrl()"><span class="doq-shell-mark" aria-hidden="true">{{ brandMark() }}</span>{{ productName() }}</a>
        <nav aria-label="Site navigation"><a [routerLink]="docsPath()">Documentation</a><ng-content select="[doq-header-extra]" /></nav>
      </header>
      <main class="doq-shell-main"><ng-content /></main>
      <footer class="doq-shell-footer"><ng-content select="[doq-footer]" /><span>Documentation by Doq</span></footer>
    </div>
  `,
})
export class DoqShellComponent {
  readonly productName = input('Documentation');
  readonly homeUrl = input('/');
  readonly docsPath = input('/docs');
  readonly brandMark = input('D');
}

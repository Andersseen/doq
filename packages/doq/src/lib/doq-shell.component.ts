import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOQ_CONFIG } from '@doqs/analog/config';

/**
 * Optional neutral full-page shell; existing products can keep their own shell instead.
 * It renders the page's `main` landmark unless Doqs is configured to own it (`landmark: 'document'`, the default when `provideDoq`
 * is present), in which case the projected Doqs view already is the `main` and a second one would nest.
 */
@Component({
  selector: 'doq-shell',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="doq-shell">
      <header class="doq-shell-header">
        <a class="doq-shell-brand" [routerLink]="homeUrl()"><span class="doq-shell-mark" aria-hidden="true">{{ brandMark() }}</span>{{ productName() }}</a>
        <nav aria-label="Site navigation"><a [routerLink]="docsPath()">Documentation</a><ng-content select="[doq-header-extra]" /></nav>
      </header>
      <ng-template #page><ng-content /></ng-template>
      @if (ownsMain()) { <main class="doq-shell-main"><ng-container *ngTemplateOutlet="page" /></main> }
      @else { <div class="doq-shell-main"><ng-container *ngTemplateOutlet="page" /></div> }
      <footer class="doq-shell-footer"><ng-content select="[doq-footer]" /><span>Documentation by Doq</span></footer>
    </div>
  `,
})
export class DoqShellComponent {
  private readonly config = inject(DOQ_CONFIG, { optional: true });
  /**
   * Overrides the configuration-derived choice: `true` renders the shell's `main`, `false` a plain container. Needed when
   * `provideDoq` is scoped to a route below the shell, where the shell cannot see the configuration.
   */
  readonly mainLandmark = input<boolean | undefined>(undefined);
  protected readonly ownsMain = computed(() => this.mainLandmark() ?? (!this.config || this.config.landmark === 'host'));
  readonly productName = input('Documentation');
  readonly homeUrl = input('/');
  readonly docsPath = input('/docs');
  readonly brandMark = input('D');
}

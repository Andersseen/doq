import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VoltNativeButton } from '@voltui/components';
import { LmnArrowRightIcon } from 'lumen-icons/arrow-right';

@Component({
  standalone: true,
  imports: [RouterLink, VoltNativeButton, LmnArrowRightIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="landing-a">
      <span class="landing-kicker">✦ Interface primitives for Angular</span>
      <h1>Build interfaces<br />with <em>good energy.</em></h1>
      <p>Vanta is a thoughtfully composed component system for teams who care about the details. Accessible building blocks, clear APIs, and room to make it yours.</p>
      <div class="landing-actions"><a voltButton routerLink="/docs">Explore the documentation <lmn-arrow-right [size]="16" /></a><a href="https://github.com" target="_blank" rel="noreferrer">View on GitHub</a></div>
      <section class="landing-features" aria-label="Product principles"><article class="landing-feature"><strong>Accessible by default</strong><p>Keyboard support and clear semantics are part of every component.</p></article><article class="landing-feature"><strong>Designed to adapt</strong><p>Use the tokens you already have and keep your product's visual language.</p></article><article class="landing-feature"><strong>Angular-native</strong><p>Standalone components, signals, and zoneless-ready interactions.</p></article></section>
    </main>
  `,
})
export default class HomePage {}

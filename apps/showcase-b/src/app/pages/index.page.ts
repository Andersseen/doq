import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LmnArrowRightIcon } from 'lumen-icons/arrow-right';

@Component({ standalone: true, imports: [RouterLink, LmnArrowRightIcon], changeDetection: ChangeDetectionStrategy.OnPush, template: `
  <main class="landing-b">
    <section class="hero"><div><span class="platform-tag">✳ Content infrastructure, reimagined</span><h1>Make content work <em>everywhere.</em></h1><p>ForgeCMS gives product teams a structured foundation for the content powering sites, apps, and customer experiences.</p><div class="hero-links"><a routerLink="/docs">Read the developer guide <lmn-arrow-right [size]="16" /></a><a href="#platform">Explore the platform</a></div></div>
      <aside class="hero-panel" aria-label="Example content model"><div class="hero-panel-header"><span>CONTENT MODEL</span><span>Draft · Updated now</span></div><div class="schema-card"><small>Collection · 12 entries</small><strong>Product documentation</strong><p>Reusable structured content for every channel.</p></div><div class="schema-card"><small>Field · Rich text</small><strong>Release highlights</strong><p>Validated, localized, and ready for delivery.</p></div><div class="platform-stats"><div><strong>3.2×</strong><span>faster publishing</span></div><div><strong>99.99%</strong><span>delivery uptime</span></div><div><strong>12</strong><span>connected channels</span></div></div></aside></section>
    <section class="capabilities" id="platform"><article><span>01 · MODEL</span><h2>Structure with intent</h2><p>Build content types with clear fields, relationships, and reusable components.</p></article><article><span>02 · DELIVER</span><h2>Publish on your terms</h2><p>Bring content into every application through an API designed for developers.</p></article><article><span>03 · GOVERN</span><h2>Keep teams aligned</h2><p>Manage environments, access, and publishing workflows from one place.</p></article></section>
  </main>
` })
export default class HomePage {}

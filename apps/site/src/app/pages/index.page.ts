import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CopyCommand } from '../copy-command';
import { installCommand, siteLinks } from '../../lib/site-config';

const features = [
  ['Native Angular and Analog.js', 'Routes come from doqRoutes() and content from Analog’s own content files. Your router and providers stay yours.'],
  ['Markdown-driven pages', 'Write docs as Markdown with title, group, order and slug in frontmatter, in nested folders.'],
  ['SSR and SSG', 'doqPrerenderRoutes() feeds Analog’s prerenderer, so every page ships as static HTML and hydrates cleanly.'],
  ['Sidebar and table of contents', 'Grouped navigation, an “On this page” index, previous and next links and a mobile drawer.'],
  ['Pagefind full-text search', 'Optional and static: an index built from your prerendered output. No backend, off by default.'],
  ['Host-owned themes and layout', 'Restyle with --host-docs-* CSS tokens. Doqs sets no global html or body styles.'],
  ['Angular components inside Markdown', 'Register your own standalone components once, then place them between paragraphs with a one-line ::demo[id] directive. Interactive, server-rendered and hydrated.'],
  ['Consumer-owned demos', 'Components belong to your app. A demo frontmatter key still attaches one to the end of a page.'],
  ['Composition slots', 'Add your own standalone components after the docs index intro or after every document.'],
] as const;

const steps = [
  ['Install Doqs', 'Add the package next to Analog’s content packages.'],
  ['Configure the documentation region', 'Share the paths, prerender with Analog and register Doqs in your app config.'],
  ['Write Markdown', 'Drop files into src/content/docs. Routes, sidebar and table of contents follow. Add ::demo[id] lines where a live component belongs.'],
  ['Build and deploy', 'vite build prerenders everything to static files you can host anywhere.'],
] as const;

const pathsCode = `// src/doq.paths.ts — shared by vite.config.ts, so no Angular components here
export const doqPaths = { contentDirectory: 'docs', basePath: '/docs' } as const;`;

const viteCode = `// vite.config.ts — Analog configuration: prerender routes
import { doqPrerenderRoutes } from '@doqs/analog';
import { doqPaths } from './src/doq.paths';

analog({
  ssr: true,
  static: true,
  content: { highlighter: 'prism' },
  prerender: { routes: async () => ['/', ...doqPrerenderRoutes(doqPaths)] },
});`;

const markdownCode = `---
title: Getting started
---

## Installation

Pick a package manager and copy the command:

::demo[install-command]

## Try it

::demo[enter-animation]

The text after a demo is still ordinary, searchable Markdown.`;

const demosCode = `// src/app/app.config.ts — one registry for inline and frontmatter demos
const doqConfig = defineDoqConfig({
  ...doqPaths,
  demos: {
    'install-command': InstallCommandComponent,
    'enter-animation': EnterAnimationDemoComponent,
  },
});`;

const appCode = `// src/app/app.config.ts — Doqs configuration next to Analog's providers
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { defineDoqConfig, doqRoutes, provideDoq } from '@doqs/analog';
import { doqPaths } from '../doq.paths';

const doqConfig = defineDoqConfig({ ...doqPaths, sidebar: 'left', showTableOfContents: true });

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),
    provideContent(withMarkdownRenderer()),
    provideDoq(doqConfig),
  ],
};`;

@Component({
  imports: [CopyCommand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main">
      <section class="hero container" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">Angular · Analog.js · Markdown</p>
          <h1 id="hero-title">Documentation that belongs in your app.</h1>
          <p class="lead">
            Doqs adds a Markdown-driven documentation region to the Angular and Analog.js application you already have.
            Server-rendered and statically generated, with your branding, your routes and your Angular components left exactly where they are.
          </p>
          <p class="actions">
            <a class="button primary" href="#getting-started">Get Started</a>
            <a class="button" [href]="links.github" rel="noopener">View on GitHub</a>
          </p>
        </div>
        <figure class="anatomy">
          <div class="frame" aria-hidden="true">
            <div class="host-part">Your header, navigation and brand</div>
            <div class="doq-part">
              <div class="doq-side"><b>Sidebar</b><span></span><span></span><span></span></div>
              <div class="doq-article"><b>Markdown page</b><span></span><span></span><span class="short"></span></div>
              <div class="doq-toc"><b>On this page</b><span></span><span></span></div>
            </div>
            <div class="host-part">Your footer and routes</div>
          </div>
          <figcaption>Doqs renders only the documentation region. Everything around it is your application.</figcaption>
        </figure>
      </section>

      <section id="features" class="container section" aria-labelledby="features-title">
        <h2 id="features-title">What Doqs 0.3 does</h2>
        <ul class="features">
          @for (feature of features; track feature[0]) {
            <li>
              <h3>{{ feature[0] }}</h3>
              <p>{{ feature[1] }}</p>
            </li>
          }
        </ul>
      </section>

      <section id="getting-started" class="container section" aria-labelledby="start-title">
        <h2 id="start-title">Getting started</h2>
        <p class="section-lead">
          Doqs plugs into an Analog app. Analog keeps its own configuration; Doqs adds its own. The two are separate on purpose.
        </p>
        <app-copy-command [command]="installCommand" />
        <div class="code-grid">
          <figure class="code"><figcaption>1 · Shared paths</figcaption><pre tabindex="0"><code>{{ pathsCode }}</code></pre></figure>
          <figure class="code"><figcaption>2 · Analog configuration</figcaption><pre tabindex="0"><code>{{ viteCode }}</code></pre></figure>
          <figure class="code wide"><figcaption>3 · Doqs configuration</figcaption><pre tabindex="0"><code>{{ appCode }}</code></pre></figure>
        </div>
        <p class="note">
          Import <code>&#64;doqs/analog/styles.css</code> once in your global stylesheet. The complete guide lives in the
          <a [href]="links.readme" rel="noopener">package README</a>.
        </p>
      </section>

      <section class="container section" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol class="steps">
          @for (step of steps; track step[0]) {
            <li>
              <h3>{{ step[0] }}</h3>
              <p>{{ step[1] }}</p>
            </li>
          }
        </ol>
        <p class="note">Doqs is not MDX: there is no JavaScript in Markdown and no template compilation. A directive only names a component your application registered.</p>
      </section>

      <section id="interactive-markdown" class="container section" aria-labelledby="interactive-title">
        <h2 id="interactive-title">Interactive components in Markdown</h2>
        <p class="section-lead">
          Put a line containing only <code>::demo[id]</code> where a live Angular component belongs. Directives inside code fences, lists and quotes stay literal text,
          an unknown id shows a short notice instead of breaking the page, and headings, the table of contents and search keep working around every component.
        </p>
        <div class="code-grid">
          <figure class="code"><figcaption>Markdown</figcaption><pre tabindex="0"><code>{{ markdownCode }}</code></pre></figure>
          <figure class="code"><figcaption>Registration</figcaption><pre tabindex="0"><code>{{ demosCode }}</code></pre></figure>
        </div>
      </section>
    </main>
  `,
})
export default class HomePage {
  protected readonly links = siteLinks;
  protected readonly installCommand = installCommand;
  protected readonly features = features;
  protected readonly steps = steps;
  protected readonly pathsCode = pathsCode;
  protected readonly viteCode = viteCode;
  protected readonly appCode = appCode;
  protected readonly markdownCode = markdownCode;
  protected readonly demosCode = demosCode;
}

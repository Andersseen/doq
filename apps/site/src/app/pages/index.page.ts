import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, type Type } from '@angular/core';
import {
  VoltBadge,
  VoltCard,
  VoltCardContent,
  VoltCardDescription,
  VoltCardHeader,
  VoltCardTitle,
  VoltNativeButton,
  VoltSeparator,
} from '@voltui/components';
import { MoveEnterDirective, MoveHoverDirective, MoveInViewDirective, MoveStaggerDirective, MoveTapDirective } from 'angular-movement';
import { LmnArrowRightIcon } from 'lumen-icons/arrow-right';
import { LmnCodeBracketIcon } from 'lumen-icons/code-bracket';
import { LmnDocumentTextIcon } from 'lumen-icons/document-text';
import { LmnGithubIcon } from 'lumen-icons/github';
import { LmnMagnifyingGlassIcon } from 'lumen-icons/magnifying-glass';
import { LmnPackageIcon } from 'lumen-icons/package';
import { LmnPuzzlePieceIcon } from 'lumen-icons/puzzle-piece';
import { LmnServerStackIcon } from 'lumen-icons/server-stack';
import { LmnSquaresPlusIcon } from 'lumen-icons/squares-plus';
import { LmnSwatchIcon } from 'lumen-icons/swatch';
import { LmnViewColumnsIcon } from 'lumen-icons/view-columns';
import { CodeTabs, type CodeExample } from '../code-tabs';
import { CopyCommand } from '../copy-command';
import { EnterDemo } from '../enter-demo';
import { installCommand, siteLinks } from '../../lib/site-config';

interface Feature {
  readonly icon: Type<unknown>;
  readonly title: string;
  readonly text: string;
  readonly featured?: boolean;
}

const features: readonly Feature[] = [
  {
    icon: LmnPuzzlePieceIcon,
    title: 'Angular components inside Markdown',
    text: 'Register your own standalone components once, then place them between paragraphs with a one-line ::demo[id] directive. Interactive, server-rendered and hydrated.',
    featured: true,
  },
  { icon: LmnCodeBracketIcon, title: 'Native Angular and Analog.js', text: 'Routes come from doqRoutes() and content from Analog’s own content files. Your router and providers stay yours.' },
  { icon: LmnDocumentTextIcon, title: 'Markdown-driven pages', text: 'Write docs as Markdown with title, group, order and slug in frontmatter, in nested folders.' },
  { icon: LmnServerStackIcon, title: 'SSR and SSG', text: 'doqPrerenderRoutes() feeds Analog’s prerenderer, so every page ships as static HTML and hydrates cleanly.' },
  { icon: LmnViewColumnsIcon, title: 'Sidebar and table of contents', text: 'Grouped navigation, an “On this page” index, previous and next links and a mobile drawer.' },
  { icon: LmnMagnifyingGlassIcon, title: 'Pagefind full-text search', text: 'Optional and static: an index built from your prerendered output. No backend, off by default.' },
  { icon: LmnSwatchIcon, title: 'Host-owned themes and layout', text: 'Restyle with --host-docs-* CSS tokens. Doqs sets no global html or body styles.' },
  { icon: LmnPuzzlePieceIcon, title: 'Consumer-owned demos', text: 'Components belong to your app. A demo frontmatter key still attaches one to the end of a page.' },
  { icon: LmnSquaresPlusIcon, title: 'Composition slots', text: 'Add your own standalone components after the docs index intro or after every document.' },
];

const steps = [
  ['Install Doqs', 'Add the package next to Analog’s content packages.'],
  ['Configure the documentation region', 'Share the paths, prerender with Analog and register Doqs in your app config.'],
  ['Write Markdown', 'Drop files into src/content/docs. Routes, sidebar and table of contents follow. Add ::demo[id] lines where a live component belongs.'],
  ['Build and deploy', 'vite build prerenders everything to static files you can host anywhere.'],
] as const;

const examples: readonly CodeExample[] = [
  {
    id: 'paths',
    tab: 'Shared paths',
    file: 'src/doq.paths.ts',
    code: `// shared by vite.config.ts, so no Angular components here
export const doqPaths = { contentDirectory: 'docs', basePath: '/docs' } as const;`,
  },
  {
    id: 'analog',
    tab: 'Analog prerender',
    file: 'vite.config.ts',
    code: `// Analog configuration: prerender routes
import { doqPrerenderRoutes } from '@doqs/analog';
import { doqPaths } from './src/doq.paths';

analog({
  ssr: true,
  static: true,
  content: { highlighter: 'prism' },
  prerender: { routes: async () => ['/', ...doqPrerenderRoutes(doqPaths)] },
});`,
  },
  {
    id: 'providers',
    tab: 'Angular providers',
    file: 'src/app/app.config.ts',
    code: `// Doqs configuration next to Analog's providers
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
};`,
  },
  {
    id: 'demos',
    tab: 'Demo registration',
    file: 'src/app/app.config.ts',
    code: `// one registry for inline and frontmatter demos
const doqConfig = defineDoqConfig({
  ...doqPaths,
  demos: {
    'install-command': InstallCommandComponent,
    'enter-animation': EnterAnimationDemoComponent,
  },
});`,
  },
];

const markdownCode = `---
title: Getting started
---

## Installation

Pick a package manager and copy the command:

::demo[install-command]

## Try it

::demo[enter-animation]

The text after a demo is still ordinary, searchable Markdown.`;

@Component({
  imports: [
    NgComponentOutlet,
    VoltBadge,
    VoltCard,
    VoltCardContent,
    VoltCardDescription,
    VoltCardHeader,
    VoltCardTitle,
    VoltNativeButton,
    VoltSeparator,
    MoveEnterDirective,
    MoveHoverDirective,
    MoveInViewDirective,
    MoveStaggerDirective,
    MoveTapDirective,
    LmnArrowRightIcon,
    LmnGithubIcon,
    LmnPackageIcon,
    CodeTabs,
    CopyCommand,
    EnterDemo,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main">
      <section class="relative" aria-labelledby="hero-title">
        <div class="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true"></div>
        <div class="mx-auto grid w-[min(100%-2rem,70rem)] items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <volt-badge variant="secondary" class="font-mono text-[0.7rem] tracking-wider uppercase">Angular · Analog.js · Markdown</volt-badge>
            <h1 id="hero-title" class="mt-5 text-[clamp(2.5rem,7vw,4.6rem)] leading-[1.05] font-bold text-balance">
              Documentation that belongs in your app.
            </h1>
            <p class="mt-6 max-w-xl text-lg text-muted-foreground">
              Doqs adds a Markdown-driven documentation region to the Angular and Analog.js application you already have.
              Server-rendered and statically generated, with your branding, your routes and your Angular components left exactly where they are.
            </p>
            <p class="mt-8 flex flex-wrap gap-3">
              <a voltButton size="lg" href="#getting-started" moveWhileHover="lift" moveWhileTap="press">
                Get Started <lmn-arrow-right [size]="16" />
              </a>
              <a voltButton size="lg" variant="outline" [href]="links.github" rel="noopener" moveWhileHover="lift" moveWhileTap="press">
                <lmn-github [size]="16" /> View on GitHub
              </a>
              <a voltButton size="lg" variant="ghost" [href]="links.npm" rel="noopener">
                <lmn-package [size]="16" /> npm package
              </a>
            </p>
          </div>
          <figure class="m-0" [moveEnter]="{ y: [16, 0] }" moveDuration="500ms">
            <volt-card>
              <volt-card-content class="grid gap-2 p-3" aria-hidden="true">
                <div class="rounded-md border border-dashed border-border p-3 text-center font-mono text-xs text-muted-foreground">Your header, navigation and brand</div>
                <div class="grid grid-cols-[1fr_2.2fr_1fr] gap-2 rounded-lg border-2 border-primary p-2.5 text-[0.7rem]">
                  @for (part of anatomy; track part) {
                    <div class="grid content-start gap-1.5">
                      <b class="font-mono font-semibold text-primary">{{ part }}</b>
                      <span class="h-2 rounded bg-border"></span>
                      <span class="h-2 rounded bg-border"></span>
                      <span class="h-2 w-3/5 rounded bg-border"></span>
                    </div>
                  }
                </div>
                <div class="rounded-md border border-dashed border-border p-3 text-center font-mono text-xs text-muted-foreground">Your footer and routes</div>
              </volt-card-content>
            </volt-card>
            <figcaption class="mt-3 text-sm text-muted-foreground">
              Doqs renders only the documentation region. Everything around it is your application.
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="features" class="mx-auto w-[min(100%-2rem,70rem)] border-t border-border py-14 sm:py-20" aria-labelledby="features-title">
        <h2 id="features-title" class="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">What Doqs 0.3 does</h2>
        <ul class="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4" moveStagger moveStaggerStep="60ms">
          @for (feature of features; track feature.title) {
            <li [class]="feature.featured ? 'sm:col-span-2 lg:row-span-2' : ''" moveInView="fade-up">
              <volt-card [class]="'h-full ' + (feature.featured ? 'border-primary/40 bg-muted' : '')">
                <volt-card-header>
                  <span class="flex self-start"><ng-container *ngComponentOutlet="feature.icon; inputs: { size: 24, tone: 'primary' }" /></span>
                  <volt-card-title class="mt-3">
                    <h3 [class]="feature.featured ? 'text-2xl' : 'text-lg'">{{ feature.title }}</h3>
                  </volt-card-title>
                  @if (feature.featured) {
                    <volt-badge variant="solid" class="mt-2 w-fit">New in 0.3</volt-badge>
                  }
                </volt-card-header>
                <volt-card-content>
                  <p class="m-0 text-sm text-muted-foreground" [class.text-base]="feature.featured">{{ feature.text }}</p>
                @if (feature.featured) {
                    <pre class="mt-6 mb-0 overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-sm" aria-hidden="true"><code>## Try it

::demo[enter-animation]</code></pre>
                  }
                </volt-card-content>
              </volt-card>
            </li>
          }
        </ul>
      </section>

      <section id="getting-started" class="mx-auto w-[min(100%-2rem,70rem)] border-t border-border py-14 sm:py-20" aria-labelledby="start-title">
        <h2 id="start-title" class="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">Getting started</h2>
        <p class="mt-4 mb-6 max-w-2xl text-muted-foreground">
          Doqs plugs into an Analog app. Analog keeps its own configuration; Doqs adds its own. The two are separate on purpose.
        </p>
        <app-copy-command [command]="installCommand" />
        <div class="mt-6">
          <app-code-tabs [examples]="examples" />
        </div>
        <p class="mt-6 max-w-3xl text-muted-foreground">
          Import <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">&#64;doqs/analog/styles.css</code> once in your global stylesheet.
          The complete guide lives in the
          <a class="text-primary underline underline-offset-4" [href]="links.readme" rel="noopener">package README</a>.
        </p>
      </section>

      <section class="mx-auto w-[min(100%-2rem,70rem)] border-t border-border py-14 sm:py-20" aria-labelledby="how-title">
        <h2 id="how-title" class="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">How it works</h2>
        <ol class="mt-8 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-4" moveStagger moveStaggerStep="60ms">
          @for (step of steps; track step[0]; let i = $index) {
            <li moveInView="fade-up">
              <volt-card class="h-full">
                <volt-card-header>
                  <volt-badge variant="outline" class="w-fit font-mono" aria-hidden="true">{{ i + 1 }}</volt-badge>
                  <volt-card-title class="mt-2"><h3 class="text-lg">{{ step[0] }}</h3></volt-card-title>
                </volt-card-header>
                <volt-card-content>
                  <p class="m-0 text-sm text-muted-foreground">{{ step[1] }}</p>
                </volt-card-content>
              </volt-card>
            </li>
          }
        </ol>
        <volt-separator class="mt-10" />
        <p class="mt-6 max-w-3xl text-muted-foreground">
          Doqs is not MDX: there is no JavaScript in Markdown and no template compilation. A directive only names a component your application registered.
        </p>
      </section>

      <section id="interactive-markdown" class="mx-auto w-[min(100%-2rem,70rem)] border-t border-border py-14 sm:py-20" aria-labelledby="interactive-title">
        <h2 id="interactive-title" class="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">Interactive components in Markdown</h2>
        <p class="mt-4 mb-8 max-w-3xl text-muted-foreground">
          Put a line containing only <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">::demo[id]</code> where a live Angular component belongs.
          Directives inside code fences, lists and quotes stay literal text, an unknown id shows a short notice instead of breaking the page,
          and headings, the table of contents and search keep working around every component.
          The component is yours: you register it, Doqs only places it.
        </p>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <volt-card>
            <volt-card-header>
              <volt-card-title><h3 class="text-lg">Markdown</h3></volt-card-title>
              <volt-card-description>What you write in <span class="font-mono">src/content/docs</span></volt-card-description>
            </volt-card-header>
            <volt-card-content>
              <pre class="m-0 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-[0.82rem] leading-relaxed" tabindex="0"><code>{{ markdownCode }}</code></pre>
            </volt-card-content>
          </volt-card>
          <volt-card>
            <volt-card-header>
              <volt-card-title><h3 class="text-lg">Rendered</h3></volt-card-title>
              <volt-card-description>
                A real Angular component, <span class="font-mono">::demo[enter-animation]</span>, animated with Angular Movement
              </volt-card-description>
            </volt-card-header>
            <volt-card-content>
              <app-enter-demo />
            </volt-card-content>
          </volt-card>
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
  protected readonly examples = examples;
  protected readonly markdownCode = markdownCode;
  protected readonly anatomy = ['Sidebar', 'Markdown page', 'On this page'] as const;
}

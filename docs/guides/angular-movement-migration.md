# Angular Movement — migration readiness for `@doqs/analog` 0.3

Status: **readiness only**. Angular Movement has not been migrated and its repository was not modified. This guide records what was verified against a disposable checkout of <https://github.com/Andersseen/angular-movement> (commit `113fc5e`, "Merge pull request #85 … feat/1.3-adoption-dx-site"), built by `pnpm verify:adoption` (`scripts/adoption.ts`, overlay in `tests/adoption/angular-movement/`). Re-run that command to refresh these facts.

## What the checkout actually uses

| Item      | Found in the checkout                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| Angular   | 22.2.x (`@angular/core ^22.2.2`), zoneless (`provideZonelessChangeDetection()`), TypeScript ~6.0                   |
| Analog    | `@analogjs/content`, `platform`, `router` `^2.9.1` (the earlier note of Analog `^2.4.4` is out of date)            |
| Build     | Vite 8, Tailwind 4.3, `analog({ ssr: true })`, no `highlighter` set, no prerender list                             |
| Routes    | `/`, `/docs/*` (Angular components under `src/app/pages/docs/`), `/demos/*`, `/templates`, `[...404]`              |
| Docs UI   | hand-written Angular pages: `InstallCommand`, `CodeBlock`, `ApiStabilityTable`, `HeadingAnchors`                   |
| Scrolling | `SmoothScrollService` (root singleton; initialised only where `init()` is called; skips users with reduced motion) |
| Deploy    | `wrangler pages deploy dist/analog/public --project-name=angular-movement`                                         |

`@doqs/analog` 0.3 peers (`@analogjs/content ^2.9.0`, Angular `^21.2.2 || ^22.0.0`) are satisfied by this stack, so **no peer range was widened**. `pnpm add` also printed unmet-peer warnings for Angular `^21` from other dependencies in that tree; none of them are Doqs peers.

## Verified result

In the checkout, with `@doqs/analog@0.3.0` installed **from the packed tarball**, a `/handbook` region with three Markdown pages renders next to the unchanged `/`, `/docs/*` and `/demos/*`: the real `InstallCommand` and `ApiStabilityTable` components and a new `moveEnter` demo sit between Markdown sections, respond to input, are prerendered and hydrate without console warnings; duplicate headings keep `usage`/`usage-1`; the table of contents, Pagefind search (text after a demo found, demo controls not indexed), Back/Forward, light/dark through the host's tokens and 320/390 px layouts work; and with `SmoothScrollService` initialised by the host, wheel scrolling stays interpolated while fragments, TOC links and next/previous navigation still land on the right heading. `e2e/adoption.spec.ts` holds these checks (E2E-050). No extension point for scrolling was needed.

## Migration steps

1. **Install.** `pnpm add @doqs/analog pagefind` (Pagefind is an optional peer; only needed for search).
2. **Let Analog render Markdown.** Add `content: { highlighter: 'prism', prismOptions: { additionalLangs: [...] } }` to `analog()`. Without `highlighter`, Analog does not transform `.md` at build time and Doqs has nothing to render. (Angular Movement currently sets only `prismOptions`.)
3. **Pick a mount point.** Create `src/doq.paths.ts` with `{ contentDirectory: 'handbook', basePath: '/handbook' }` and put Markdown in `src/content/handbook/`. Doqs only serves routes under `basePath`; `/docs` stays an Angular route.
4. **Prerender.** `prerender: { routes: async () => [...existingRoutes, ...doqPrerenderRoutes(doqPaths)] }`, then `doq-search index dist/analog/public` after `vite build` (the checkout's `build` script was extended this way).
5. **Providers.** `provideFileRouter(withExtraRoutes(doqRoutes(config)))`, `provideContent(withMarkdownRenderer())`, `provideDoq(config)` next to the existing `provideZonelessChangeDetection()` and `provideClientHydration(withEventReplay())`.
6. **Styles.** `@import '@doqs/analog/styles.css';` and map the host's tokens: `--host-docs-background: var(--color-bg)` and so on (see `tests/adoption/angular-movement/styles.append.css`). Set `--host-docs-scroll-offset` to the sticky navbar height (the navbar is `pt-16`, so `5rem` was used).
7. **Convert docs pages.** Each `src/app/pages/docs/*.page.ts` becomes `src/content/handbook/<name>.md`: prose and headings as Markdown, code samples as fenced blocks (Doqs adds Copy buttons), and every interactive island as a `::demo[id]` line.
8. **Register existing components.** `demos: { 'install-command': InstallCommand, 'api-stability': ApiStabilityTable, 'enter-animation': … }`. Components are created without inputs, so give configurable ones a default or inject host services. They keep their Tailwind classes; Doqs adds no styles inside them.
9. **Keep the separate demos section.** `/demos/*` is unaffected. If a demo page should also appear in the handbook, register the same component under an id and place it inline.
10. **Smooth scrolling.** If the host initialises `SmoothScrollService`, do it from a host component (the proof uses `slots.documentAfterContent`) or the app root. Doqs uses native `scrollIntoView`/`scrollTo`, which the service resynchronises to.
11. **Preserve public URLs.** Do not switch `basePath` from `/handbook` to `/docs` until the Angular `/docs/*` pages are removed. Then either set `basePath: '/docs'` and keep slugs identical to the old paths (`slug:` frontmatter, nested folders), or keep `/handbook` and add redirects from the old paths (a Cloudflare `_redirects` file in `public/`). Prerender both lists during the transition.
12. **Deploy.** The existing `wrangler pages deploy dist/analog/public --project-name=angular-movement` publishes the Pagefind bundle with the rest of the output; serve `/pagefind/*` as static files.
13. **Check before switching.** Run the host's own checks plus: one `<h1>` per page, canonical heading ids, Back/Forward, keyboard path through the drawer and search, 320 px width, light and dark, and `view-source:` shows the Markdown text and the demos' server-rendered markup.

## Known limits

- **Upstream heading-id race (intermittent, Angular Movement checkout only).** Analog 2.9 parses Markdown with a shared `marked-gfm-heading-id` slugger. In that checkout about one build in three produced heading ids with a spurious numeric suffix (for example `usage-2`/`usage-3` for the first `Usage` headings) in the client or the server bundle while the other bundle was correct; then prerendered HTML, Pagefind anchors and the client DOM disagree. It was not seen in the showcases' repeated builds, is independent of `::demo[...]` (Doqs never rewrites heading HTML) and was not worked around here. Compare `dist/client/assets/<page>-*.js` with the prerendered HTML after a build, rebuild if they differ, and treat it as an Analog issue to report upstream before migrating; `E2E-050` fails on a bad build rather than hiding it, except that the search anchor accepts an optional numeric suffix.

- Demos receive no inputs; per-page configuration means separate registered components or a host service keyed by route.
- A directive must be a top-level paragraph. A demo inside a list item or blockquote is not supported (it stays literal).
- Angular Movement's real `main` was not built with Doqs; only the disposable copy was. Its dependency set (Vite 8, TypeScript 6, Angular 22) built and ran with the 0.3.0 tarball, but the maintainers' own CI, lint and API-snapshot checks were not run against the overlay.

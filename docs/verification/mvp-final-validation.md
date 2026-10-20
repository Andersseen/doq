# Doq MVP final validation

**Verdict: REWORK — VALIDATION INCOMPLETE**

The current architecture and packed package passed the checks completed here. The architecture pilot cannot be closed under the stated acceptance rule because six mandatory criteria still lack the required direct evidence. No confirmed product bug was found and no implementation code was changed.

## Run details

- Date: 2026-10-20 (Europe/Madrid)
- Repository: `main`, commit `bbab6d436f8195b69e627e292f3cb43bdcb8e484` (matches the requested PR #3 merge)
- Initial working tree: clean
- OS: macOS 26.7.1, Darwin arm64
- Node: v22.23.1
- pnpm: 10.18.3
- Angular CLI: 21.0.3; installed Angular core: 21.2.25
- Analog platform: 2.9.0 in the workspace; independent install resolved 2.9.1
- Browser: Google Chrome controlled through the available computer-use browser interface
- Browser automation available: Chrome tab navigation, accessibility tree, screenshot and UI interaction. The available interface did not expose a viewport override, page JavaScript evaluation, DevTools console, network log or browser clipboard reader. No Chromium/Firefox command was found on `PATH`, and no Playwright/Puppeteer dependency was found in the workspace.

## Commands and build results

| Command | Result |
| --- | --- |
| `pnpm install` | Exit 0; lockfile current. pnpm warned that esbuild and lmdb build scripts are ignored. |
| `pnpm build` | Exit 0; initially replayed Turbo cache. |
| `pnpm exec turbo run build --force` | Exit 0; fresh Angular package, Showcase A and Showcase B production builds all passed; both Analog prerenders completed. |
| `pnpm pack:doq` | Exit 0; produced `artifacts/getdoq-analog-0.0.0-pilot.tgz`. |
| Independent consumer `pnpm install --offline` | Exit 0; generated its own lockfile and installed Doq from the local tarball. |
| Independent consumer `pnpm build` | Exit 0; Analog client and SSR builds plus prerender completed. |

ng-packagr emitted two warnings that its generated `exports["."]` conditions override the source package's `types` and `default` conditions. The generated manifest has valid paths, and its build and consumer installation succeeded. The tarball contains `package.json`, `README.md`, `styles.css`, `fesm2022/getdoq-analog.mjs` (and source map), and `types/getdoq-analog.d.ts`. Both `.` and `./styles.css` export targets exist. Angular is declared as a peer dependency and remains external in the FESM imports; the bundle imports `@angular/core`, `@angular/common`, `@angular/router`, `@angular/platform-browser`, and `rxjs`. No showcase or workspace source path was found in the packed bundle. The artifact is under the ignored `artifacts/` output directory.

The independent consumer was assembled under `/private/tmp/doq-external-consumer` with its own `package.json`, pnpm lockfile, application shell, header/footer, theme, root landing route, Markdown, and app-owned Forge demo. Its Doq dependency is `file:/Volumes/WorkStation/projects/doq/artifacts/getdoq-analog-0.0.0-pilot.tgz`; no `workspace:` dependency, Doq source alias, showcase import, or symlink into `packages/doq/src` was found. In Chrome, its root route loaded, its host link navigated client-side to `/docs`, the canonical custom-slug page loaded, and reloading that route rendered the same document. The external prerender was served using Python's standard static server because the copied showcase `preview` script refers to a monorepo-relative helper not present in the independent directory. This is a limitation of the copied preview command, not the package build.

## Static output and HTTP evidence

The production outputs are under `apps/showcase-a/dist/analog/public` and `apps/showcase-b/dist/analog/public`. Both contain a rendered root and `/docs/index.html`; A has its expected guide/component pages and B has nested content including `docs/onboarding/first-application/index.html`. The custom-slug HTML includes the page title, description, article, and “Create a workspace” body text. The source-name route `/docs/getting-started` is not generated.

The repository preview server was run on localhost ports 4173 (A) and 4174 (B). Observed `curl` status and body sizes:

| Route | A :4173 | B :4174 |
| --- | ---: | ---: |
| `/` | 200, 5810 bytes | 200, 6347 bytes |
| `/docs` | 200, 4329 bytes | 200, 4218 bytes |
| `/docs/overview` | 200, 7478 bytes | 404, 9 bytes |
| `/docs/components/button` | 200, 8946 bytes | 404, 9 bytes |
| `/docs/onboarding/first-application` | 404, 9 bytes | 200, 8373 bytes |
| `/docs/getting-started` | 404, 9 bytes | 404, 9 bytes |
| `/missing` | 404, 9 bytes | 404, 9 bytes |

For the independent consumer, Python's static server returned 200 for `/`, redirected `/docs` and the custom document path without trailing slashes (301) to directory URLs, and returned 404 for `/docs/getting-started` and `/missing`. Chrome rendered the root, docs index and custom document from those generated files. A static 404 is observed for unknown files; the Doq client-side unknown-slug status view was not separately exercised.

## Browser observations

Real Chrome pages were opened from the production static previews for Showcase A (`/docs/components/button`) and Showcase B (`/docs/onboarding/first-application`), and from the independent consumer. Direct loading showed the prerendered content, host shell, article/navigation landmarks, title, description and consumer demo markup. The custom-slug browser page included “Create a workspace” and exposed a sidebar link using `/docs/onboarding/first-application`.

Observed interactions:

- Showcase A's `Save changes` Angular demo changed its displayed activation count from 0 to 1.
- Showcase B's field selector changed from “Rich text” to “Reference” and its preview changed to “Reference”.
- Both host theme controls changed their accessible action labels to the opposite theme, in place and without a reload.
- Showcase A's TOC link for “Choose a style” changed the URL fragment to `#choose-a-style`.
- Showcase A's hierarchical sidebar expanded its Guides group and exposed its nested document links; selecting Forms navigated to `/docs/components/forms`.
- Showcase B's right-side hierarchical sidebar expanded Concepts and exposed Content models. Its screenshot showed the sidebar at the right of the article, with Forge header and footer intact.
- Showcase A's code-copy control changed its label to “Code copied”. The copied payload was not read back, so content equality and clipboard failure behavior are not established.
- The independent consumer's root host route navigated client-side into Doq, then direct navigation and refresh of the custom-slug document succeeded.

The browser viewport was the existing Chrome window size, which was not programmatically measured or changed. None of the five required dimensions (375×812, 768×1024, 1280×800, 1440×900, 1920×1080), dynamic resize sequences, horizontal overflow measurements, or small-screen drawer states are claimed as tested. Console, hydration diagnostic and network-failure logs were unavailable through the browser-control surface. Absence of visible runtime failure during the exercised interactions is not a substitute for those diagnostics.

Accessibility observations were limited to Chrome's accessibility tree: the documentation navigation had an accessible “Documentation” name, theme controls had descriptive names, demo controls and headings were exposed, and sidebar group buttons reported expanded/collapsed state. A full keyboard-only pass, focus-return checks, closed-drawer tab exclusion, Escape behavior, touch-target measurement and reduced-motion check were not completed.

## M1–M24 acceptance matrix

| ID | Status | Evidence and limitations |
| --- | --- | --- |
| M1 — Independent Doq package build | **PASS** | Fresh `pnpm exec turbo run build --force`; ng-packagr Angular partial compilation, FESM and declarations completed. |
| M2 — Correct packed artifact and public exports | **PASS** | Tarball contents listed by `pnpm pack:doq`; generated package exports point to existing FESM, declaration and CSS files; Angular remains external. |
| M3 — Clean external package-manager installation | **PASS** | Separate manifest and lockfile; `pnpm install --offline` installed the generated `.tgz`, no workspace references or Doq source links. |
| M4 — External consumer production build | **PASS** | Independent Analog `pnpm build` passed client, SSR and prerender phases. |
| M5 — Both showcase production builds | **PASS** | Fresh forced Turbo build completed for A and B. |
| M6 — Correct Markdown document rendering | **PASS** | Production Chrome pages showed Markdown article body and headings; B custom page included “Create a workspace”; A Button document rendered. |
| M7 — Nested documentation routing | **PASS** | B custom nested URL and A `/docs/components/button` loaded directly; generated nested HTML exists. |
| M8 — Custom slug consistency | **PASS** | `/docs/onboarding/first-application` rendered and refreshed in production Chrome and external consumer; generated HTML exists; `/docs/getting-started` returned 404. |
| M9 — Duplicate route validation | **UNVERIFIED** | Source includes duplicate-route detection, but no duplicate-content fixture was run to observe the diagnostic. |
| M10 — Preservation of existing host routes | **PASS** | Independent consumer root landing route retained its Forge header/content/footer and navigated client-side into `/docs`; application shell remained present on docs. |
| M11 — Real prerendered document HTML | **PASS** | Generated custom-slug HTML contains title, meta description, article markup and document text; not an empty output. |
| M12 — Direct static route accessibility | **PASS** | `curl` returned 200 for existing generated pages; Chrome loaded direct deep paths and refreshed the external custom route. |
| M13 — Correct missing-route behavior | **PASS** | Both repository preview servers returned HTTP 404 for absent source-slug and unrelated missing paths; external static server returned 404 for unknown paths. Doq's client not-found status view was not separately reached. |
| M14 — Functional hierarchical sidebar | **PASS** | In Chrome, A Guides and B Concepts expanded to expose child links; A sidebar navigation changed routes. The B screenshot showed the configured right-side layout. |
| M15 — Functional accessible mobile navigation | **UNVERIFIED** | No actual mobile viewport was set; drawer closed/open, Escape, focus movement/return, hidden-link tab order, scroll and resize interactions remain untested. |
| M16 — Functional TOC anchors and active heading | **UNVERIFIED** | A TOC link was followed and `#choose-a-style` appeared in the URL. Active-heading-on-scroll, duplicate headings, direct fragment reload and route lifecycle were not tested. |
| M17 — Correct code copy behavior and lifecycle | **UNVERIFIED** | Copy feedback appeared on A. Clipboard payload comparison, multiple/long code blocks, failure path, keyboard activation and handler lifecycle were not tested. |
| M18 — Functional consumer-owned Angular demos | **PASS** | A activation counter changed 0→1; B field selection and displayed preview changed in Chrome after page interaction. Both demo markup and host composition were visible. Unknown-demo fallback was not exercised. |
| M19 — Working light/dark themes | **PASS** | Both showcases' theme controls changed their accessible action labels in place. Theme-specific styling is present in host CSS; no exhaustive computed-style contrast audit was performed. |
| M20 — Independent host branding and layouts | **PASS** | Chrome trees/screens showed distinct Vanta and Forge headers/footers, with A left navigation and B right navigation. |
| M21 — No private workspace source dependency | **PASS** | External consumer installed from generated tarball with a separate lockfile; no `workspace:` reference, source alias, showcase import or symlink found. Tarball listing contains only public package files. |
| M22 — Accurate public documentation | **PASS** | Root and package READMEs describe the observed package install, public API, routing/prerender configuration, host-owned shell and preview semantics; documentation agrees with the generated package manifest and exercised external install. |
| M23 — No blocking SSR/hydration regressions | **UNVERIFIED** | Production prerender and post-load demo/theme interactions succeeded. Browser console, hydration warnings, page errors and network failures were not inspectable in this interface. |
| M24 — Complete responsive browser inspection | **UNVERIFIED** | Required five viewport sizes, route-by-viewport coverage, overflow measurements, responsive transition sequences and both themes at all sizes were not completed. |

## Defects, remaining work and verdict

No confirmed blocking regression was found; no code fix was warranted. The build warnings are non-blocking given successful package generation and external installation. The preview helper works from each app inside the repository; a copied showcase's preview command is monorepo-relative, so the external consumer was served with Python's standard static server for the browser checks.

**Acceptance totals: 18 PASS / 0 FAIL / 6 UNVERIFIED.** The six outstanding criteria are M9, M15, M16, M17, M23 and M24. The main unresolved acceptance blocker is the required real responsive browser matrix and mobile drawer interaction sequence; browser console/hydration logs and the specified clipboard and diagnostics checks also remain outstanding.

**Final verdict: REWORK — VALIDATION INCOMPLETE.** The checks completed support the viability of the Angular/Analog package architecture, but the rule for GO requires all 24 criteria to be directly verified. Do not close the architecture pilot yet. No recommendation or implementation work for Doq 0.1 is included.

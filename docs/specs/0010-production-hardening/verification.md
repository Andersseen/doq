# Verification — 0010 production hardening

Written from real runs on macOS (Apple silicon), Node 22.23.1, pnpm 10.18.3, Playwright 1.64.1 (Chromium through installed Google Chrome, `PW_CHANNEL=chrome`: the downloaded headless Chromium never produces animation frames on this machine, which makes every click time out, including in the untouched baseline suite), Firefox and WebKit builds from `playwright install`. A row is PASS only when it was executed and the result read.

## Findings and baselines

**Heading-id race (DET-01, DET-02).** Owner: `@analogjs/platform` `content-plugin.js`, the `load` hook of the `analogjs-content-file` plugin. It calls `getMarkedSetup(...).getMarkedInstance().parse(body)` for each Markdown file; Vite runs load hooks concurrently; `getMarkedSetup` is a process-wide singleton; `marked-gfm-heading-id@4.1.4` keeps `slugger` and `headings` in module variables and resets them in `preprocess`; `markedHighlight({ async: true })` (Prism, Shiki) makes `parse` asynchronous, so renders interleave. `@analogjs/content`'s runtime `MarkdownContentRendererService` has a second, independent window (`await parse(); getHeadingList()`), but `withMarkdownRenderer()` provides `NoopContentRenderer` in 2.9, so Doqs never uses it. Versions: `@analogjs/platform` 2.9.0 (also 2.9.2 and 3.0.0-beta.8, same code path), `marked` 15.0.12, `marked-gfm-heading-id` 4.1.4 (latest). Upstream fix: none found. Configuration dependent: only with an asynchronous marked step; the showcases' plain Prism setup did not show it in a 40-document build, the stress consumer (asynchronous step, 60+30 documents) shows it in 3 of 3 control builds. Server/client difference: ids are baked into the bundle, so SSR, hydration and static HTML agree with each other but not with a sequential render; TOC and Pagefind inherit the corrupted ids.

**Bundle baselines (PERF-01), gzip.** origin/main `f55fa70` versus this branch, production builds:

| Artifact                             | main                     | 0.7.0          | Change      |
| ------------------------------------ | ------------------------ | -------------- | ----------- |
| Showcase A first-loaded JS           | 202,166                  | 202,274        | +108        |
| Showcase B first-loaded JS           | 185,023                  | 185,103        | +80         |
| Showcase A all JS                    | 218,223                  | 218,346        | +123        |
| Showcase B all JS                    | 198,993                  | 199,073        | +80         |
| Showcase A / B stylesheet            | 14,154 / 6,245           | 14,224 / 6,308 | +70 / +63   |
| `packages/doq/styles.css` (raw/gzip) | 24,168 / 4,811           | 24,705 / 4,952 | +537 / +141 |
| Search index bytes, pages (A / B)    | 22,203 / 18,911, 21 / 25 | same           | 0           |

**Scaling (PERF-02), showcase B sources, generated documents in the current version plus half as many archived, `pnpm perf:scale`.** Build is `vite build` (prerender included); latency is the median of 8 client navigations in Chrome.

| Documents (+archive) | Static pages | `vite build` | `doq-search` | First-loaded JS gzip | All JS gzip | Search index | Median navigation |
| -------------------- | ------------ | ------------ | ------------ | -------------------- | ----------- | ------------ | ----------------- |
| 20 (+10)             | 55           | 7.9 s        | 1.4 s        | 186,786              | 223,309     | 38,152 B     | 17 ms             |
| 200 (+100)           | 325          | 12.5 s       | 1.5 s        | 200,799              | 441,269     | 200,635 B    | 14 ms             |
| 1,000 (+500)         | 1,525        | 86.1 s       | 2.7 s        | 254,921              | 1,403,592   | 921,404 B    | 39 ms             |

First-loaded JavaScript grows 52 B (20 to 200) and 46 B (20 to 1,000) per document. No Doqs code is per-document in the bundle: Analog bundles each file's frontmatter and loader; a supported way to defer them does not exist, so the growth is guarded (`perf:scale --check`, budget 70 B) rather than optimised. Navigation is not a bottleneck (14-39 ms), so no rendering change was made; observers and listeners are already disconnected per document (copy buttons: one per block after repeated navigation, `E2E-005`).

**Browser-specific findings.** WebKit restored scroll before `popstate`, breaking Forward to a fragment entry (fixed, `E2E-004`/`E2E-011` in three engines). Forced colors gave the selected tab and current links no non-colour cue (fixed in CSS). Safari's default Tab skips links and many buttons (test helper). Firefox and WebKit cannot grant `clipboard-read` (annotated). Engines word a legitimate 404 differently (accepted, nothing else).

## Test cases

| Case         | Acceptance | Checks                                                                                                                                    | Result |
| ------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| UNIT-130     | AC-001     | Real marked + gfm-heading-id through a stand-in of Analog's plugin: concurrent loads corrupt ids; through the guard they equal sequential | PASS   |
| UNIT-140     | AC-003     | docs:check rules: correct page accepted; race output, foreign suffixes, empty page, h1, TOC, canonical rejected                           | PASS   |
| UNIT-141     | AC-003     | Link classification, scope, route expectations, frontmatter slug                                                                          | PASS   |
| UNIT-142     | AC-004     | docs:check route rule equals `doqPrerenderRoute`                                                                                          | PASS   |
| UNIT-150     | AC-010     | Budget measurement (assets, gzip, index, pages) and budget file invariants                                                                | PASS   |
| UNIT-151     | AC-010     | Generated fixtures are deterministic and rich                                                                                             | PASS   |
| UNIT-152     | AC-010     | 1,000-document catalogs normalise, order and map to prerender routes deterministically                                                    | PASS   |
| COMP-120     | AC-011     | Title, description and canonical lifecycle across documents, host routes, missing documents                                               | PASS   |
| CONTRACT-080 | AC-013     | `./vite` export shipped, Node-only, no dependencies, not in the browser entry                                                             | PASS   |
| CONTRACT-081 | AC-013     | No private sources or tests in the tarball                                                                                                | PASS   |
| CONTRACT-082 | AC-004     | Over HTTP: unique heading ids and resolving TOC fragments on both showcases                                                               | PASS   |
| CONTRACT-083 | AC-004     | Over HTTP: every same-site link answers 200 and its fragment exists                                                                       | PASS   |
| E2E-132      | AC-005     | Packed tarball on Angular 21.2 and 22.2 (+TS 6), zoneless: version, hydration, history, tabs, search, versions, API pages                 | PASS   |
| E2E-133      | AC-002     | Prerendered ids = hydrated DOM ids, TOC links resolve, search anchors name real headings (Chromium, Firefox, WebKit)                      | PASS   |
| E2E-130      | AC-008     | Reduced motion, 200% text at 320/1280, forced colors, consumer tokens + axe contrast (three engines)                                      | PASS   |
| E2E-131      | AC-009     | Drawer by keyboard, no hidden tab stop, focus after Back (three engines)                                                                  | PASS   |
| E2E-011      | AC-007     | Back/Forward between fragment positions, Chromium + Firefox + WebKit                                                                      | PASS   |
| E2E-003      | AC-006     | Mobile drawer open/navigate/close in Firefox and WebKit                                                                                   | PASS   |
| E2E-012      | AC-006     | Search, keyboard, version filter in Firefox and WebKit                                                                                    | PASS   |
| E2E-061      | AC-006     | Tabs keyboard pattern in Firefox and WebKit                                                                                               | PASS   |
| E2E-110      | AC-006     | Version switching, selector keyboard, overflow and axe in Firefox and WebKit                                                              | PASS   |
| E2E-050      | AC-012     | Angular Movement adoption proof, built once, 19 tests                                                                                     | PASS   |
| MANUAL-130   | AC-002     | `pnpm verify:determinism --builds=5` one fingerprint; `--control` detected                                                                | PASS   |
| MANUAL-131   | AC-010     | `pnpm perf:check` and `pnpm perf:scale` 20/200/1000                                                                                       | PASS   |
| MANUAL-132   | AC-012     | Complete `pnpm quality:gate` on the final code: 24 of 24 stages PASS                                                                      | PASS   |

## Executed commands

Final `pnpm quality:gate` (PW_CHANNEL=chrome), all 24 stages PASS: format:check, typecheck:scripts, sdd:check, api:check, agentyx:check, test:unit (365 tests), test:components (134 library + 14 site), build, docs:check, perf:check, pack:doq, verify:package (22/22), test:contract (81), verify:negative-controls, consumer:build, test:contract with unversioned consumers, test:e2e (Chromium, 182), test:e2e:browsers (Firefox + WebKit, 233 passed, 1 skipped: WebKit cannot emulate forced colors), perf:scale --check (52 B/document), verify:determinism (5 builds, one fingerprint `483ce21248826721`), verify:determinism --control (detected), verify:compat 21 and 22 (6/6 each; Angular 22.2.3, TypeScript 6.0.3), verify:mvp (17/17 browser checks). Also `pnpm verify:adoption` (Angular Movement, one build, 19/19). Two earlier gate attempts stopped at transient failures (a test spawning the CLI timed out at 5 s under machine load, fixed with an explicit 30 s timeout; a legacy-consumer directory was reported missing once and did not reproduce) and are not counted.

## Remaining limitations

- The heading race is contained, not fixed upstream; hosts must add `doqDeterministicMarkdown()` (opt-in) and run `docs:check`.
- Zone.js applications, Analog above 2.9.x, Vite below 8, real screen readers, real Windows high-contrast themes and WCAG conformance are unverified. Clipboard read-back is verified in Chromium only. WebKit forced colors cannot be emulated.
- Angular 22 has the focused smoke suite only, on a docs-first consumer; the embedded showcase depends on `lumen-icons`, whose peer range is Angular 21 only.
- First-loaded JavaScript grows about 46-52 B gzip per document; no supported Analog API defers it.
- The 0.6.0 release was not confirmed: the main CI run for #18 (39797201252) had its acceptance-harness job in progress for about an hour, and npm and GitHub still show 0.5.0. It was not cancelled or re-run from here. CI jobs now have `timeout-minutes`.
- Nothing was deployed from this branch; the official site was not changed (it makes no Angular or browser compatibility claim).
- GitHub Actions for this branch have not run yet; the new CI jobs were validated locally only.

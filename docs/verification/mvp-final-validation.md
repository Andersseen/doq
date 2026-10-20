# Doq MVP final validation

**Verdict: GO — DOQ MVP COMPLETE**

**Totals: 24 PASS / 0 FAIL / 0 UNVERIFIED.** Every criterion was executed against the final code in this iteration, and the full browser suite passed twice in a row (`14 PASS / 0 FAIL` each run).

## Run details

- Date: 2026-10-20 (Europe/Madrid)
- Base: `main` at `3944361` (merge of PR #5), branch `verification/final-mvp-completion`
- Validated source: commit `ccd93c9` (the report commit that follows only records results)
- OS: macOS 26.7.1, Apple Silicon; Node v22.23.1; pnpm 10.18.3
- Browser: Google Chrome 155.0.8059.85, isolated headless profile driven over the Chrome DevTools Protocol by `scripts/verification/mvp.mjs` (no browser-testing dependency)
- Evidence: run logs and 30 screenshots are kept outside the repository (`<os tmpdir>/doq-mvp-evidence`, override with `MVP_ARTIFACT_DIR`)

## Browser startup recovery

The previous iteration could not start Chrome. Chrome's main thread blocked in AppKit initialization on a synchronous XPC call to the user-session pasteboard service, `/usr/libexec/pboard` (PID 1016, running since 2026-10-10), and `pbpaste` hung as well.

Recovery in this iteration: `launchctl kickstart -k gui/$(id -u)/com.apple.pboard` was refused (`Operation not permitted while System Integrity Protection is engaged`). Terminating the user-owned `pboard` process (`kill 1016`, no `sudo`) made launchd respawn it (new PID 91710). `pbpaste` then returned with exit 0 and headless Chrome wrote `DevToolsActivePort` on the next launch. The current clipboard contents could not be saved beforehand because `pbpaste` was hung. The user's normal Chrome session was not touched.

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm install` | Exit 0 |
| `pnpm build` (Turbo, Doq package + both showcases) | Exit 0 |
| `pnpm pack:doq` | Exit 0; tarball holds `package.json`, `README.md`, `styles.css`, `fesm2022/getdoq-analog.mjs` (+ map), `types/getdoq-analog.d.ts` |
| Consumer `pnpm install --force` + `pnpm build` in `/private/tmp/doq-external-consumer` | Exit 0 both; client, SSR and prerender completed |
| `MVP_CONSUMER_ROOT=/private/tmp/doq-external-consumer/dist/analog/public pnpm verify:mvp` (final code, run twice) | Exit 0 both runs; 14 PASS / 0 FAIL |

HTTP status from the repository preview server (A on 4173, B on 4174) and the consumer (4175): `/`, `/docs`, the canonical and custom-slug document routes return 200; `/docs/getting-started` and `/missing` return 404 on all three. `first-application` HTML in B and in the consumer contains the document body text. The consumer's `package.json` and lockfile contain no `workspace:` reference or `packages/doq/src` path, and its `@getdoq/analog` resolves into its own `.pnpm` copy of the tarball.

## Browser coverage

Viewports (applied and measured through `innerWidth`/`innerHeight` before each check): 375×812, 768×1024, 1280×800, 1440×900, 1920×1080, for both showcases, on the landing page, docs index, a normal document, a nested document and the custom-slug/demo document, in both themes. Each page is checked for document-level horizontal overflow, article bounds, drawer-trigger visibility per breakpoint, host header and footer, and content presence. Dynamic transitions on one page without reload: 375→768→1280→375, open drawer→1280→375, open drawer→768→375 and open drawer→navigate→1440 (including the right-side drawer of B).

- **M15:** closed state (trigger, `aria-expanded=false`, drawer hidden, Tab skips it), open state (focus enters, drawer inside the viewport, correct side: left in A, right in B), nested group expansion, visible focus ring, Escape, selecting a document, three open/close cycles through the Close control, focus return.
- **M16:** TOC hrefs match real heading IDs (H2 and H3), click updates the fragment and scrolls, active heading changes on scroll, duplicate headings get unique IDs, direct fragment load, route round trip, a page without headings has no TOC, B has TOC disabled.
- **M17:** `navigator.clipboard.readText()` equals each code block's source for every block on the tested pages, keyboard activation, one button per block after navigation, and the unavailable-clipboard fallback shows `Copy unavailable`.
- **M23:** `Runtime.exceptionThrown`, console errors and warnings, `Log.entryAdded` and `Network.loadingFailed` were subscribed before navigation. For A, B and the external consumer: 0 exceptions, 0 console errors, 0 failed requests, 0 warnings (0 hydration-related), across direct load, demo interaction, theme toggle, drawer open/Escape, client navigation, viewport resize and reload.

## Bugs found and fixed in this iteration

1. **Harness, order-dependent M16 failure.** After M15, headless Chrome left the page with `visibilityState: "hidden"`, which stops `IntersectionObserver` callbacks (a probe observer also received none). Fixed with focus emulation and `Page.bringToFront` on each navigation.
2. **Harness, wrong M16 precondition.** It expected an active TOC heading at scroll 0, but the first heading sits at 406 px and the observed zone is the top 30 % of the viewport, so none is active by design. It now waits for the rendered TOC; observer behavior is asserted by the scroll, fragment and route-lifecycle steps.
3. Failures now print TOC hashes, heading positions, visibility and a probe observer result.

The product fixes from PR #5 (drawer closes on selection, Close control, drawer stacking, pixel root margin, rendered-Markdown gate, single observer and resize listener) were verified by this run. No further product defect was found.

## M1–M24 acceptance matrix

All rows were executed in this iteration on the final code unless noted.

| ID | Status | Method and evidence |
| --- | --- | --- |
| M1 — Independent Doq package build | **PASS** | `pnpm build`, ng-packagr, exit 0 |
| M2 — Correct packed artifact and public exports | **PASS** | `pnpm pack:doq`; tarball listing above; consumer imports the package successfully |
| M3 — Clean external package-manager installation | **PASS** | Consumer `pnpm install --force` from the tarball with its own manifest and lockfile |
| M4 — External consumer production build | **PASS** | Consumer `pnpm build`, exit 0 |
| M5 — Both showcase production builds | **PASS** | `pnpm build` |
| M6 — Correct Markdown document rendering | **PASS** | Prerendered body text present; browser M17/M24 load the rendered documents |
| M7 — Nested documentation routing | **PASS** | 200 on nested routes; nested pages loaded in M15/M24 |
| M8 — Custom slug consistency | **PASS** | `/docs/onboarding/first-application` 200 in B and consumer; `/docs/getting-started` 404 |
| M9 — Duplicate route validation | **PASS** | `duplicate-routes.mjs` through `verify:mvp`: two temporary files with one slug throw naming both paths and `/docs/duplicated-route`; invalid, ordinary and nested slugs checked |
| M10 — Preservation of existing host routes | **PASS** | Consumer `/` returns 200; host header/footer asserted at every viewport |
| M11 — Real prerendered document HTML | **PASS** | Body text, drawer and TOC markup in generated HTML |
| M12 — Direct static route accessibility | **PASS** | HTTP 200 table above; direct loads in browser |
| M13 — Correct missing-route behavior | **PASS** | HTTP 404 for `/missing` and the source-name route on all three servers |
| M14 — Functional hierarchical sidebar | **PASS** | Nested groups expand and navigate (M15 and dynamic checks, A left and B right) |
| M15 — Accessible mobile navigation | **PASS** | `pnpm verify:mvp`, 375×812, A and B, twice |
| M16 — TOC anchors and active heading | **PASS** | `pnpm verify:mvp`, 1440×900, A (TOC enabled) and B (disabled), twice |
| M17 — Code copy and clipboard lifecycle | **PASS** | `pnpm verify:mvp`, clipboard payload compared with source, A and B, twice |
| M18 — Consumer-owned Angular demos | **PASS** | Demo interaction in the M23 flow for A, B and the consumer without errors |
| M19 — Working light/dark themes | **PASS** | Theme toggle changes `data-theme` at every viewport |
| M20 — Independent host branding and layouts | **PASS** | Vanta and Forge headers/footers asserted; left and right sidebar sides asserted |
| M21 — No private workspace source dependency | **PASS** | Consumer manifest/lockfile have no workspace or source-path references; installs from the tarball |
| M22 — Accurate public documentation | **PASS** | README drawer text matches the verified behavior; harness README matches the commands run |
| M23 — No blocking SSR/hydration regressions | **PASS** | Zero errors and warnings on A, B and the consumer (see coverage) |
| M24 — Complete responsive browser inspection | **PASS** | Five exact viewports, both showcases and dynamic transitions, twice |

## Limitations

- M6–M8, M10 and M12–M14 are covered through the HTTP table plus the browser suite's direct loads, not by a separate dedicated script.
- Overflow, bounds and visibility are DOM measurements; screenshots are saved as local evidence and were not compared pixel by pixel.
- A plain `pnpm verify:mvp` without `MVP_CONSUMER_ROOT` reports the external-consumer M23 scenario as failed by design.

**Final verdict: GO — DOQ MVP COMPLETE.** The Doq architecture pilot is complete; the project is ready to begin Doq 0.1 development, which is not part of this task.

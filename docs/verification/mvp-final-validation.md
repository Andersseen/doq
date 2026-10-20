# Doq MVP final validation

**Verdict: REWORK — VALIDATION INCOMPLETE**

**Totals: 19 PASS / 0 FAIL / 5 UNVERIFIED.** The unverified criteria are M15, M16, M17, M23 and M24. They need a browser run that this environment could not start (see [Browser automation and the current blocker](#browser-automation-and-the-current-blocker)). No browser criterion is marked PASS on the basis of code reading alone.

This iteration added a reusable acceptance harness (`pnpm verify:mvp`), executed M9 against Doq's real normalization and sorting source, and fixed mobile-drawer, TOC-observer and enhancement-lifecycle defects in `packages/doq`. The browser checks for those fixes have not been re-executed on the final code.

## Run details

- Date: 2026-10-20 (Europe/Madrid)
- Base: `main` at `7d87ccb`, branch `verification/complete-mvp-acceptance`
- Validated source: the product and harness commits on this branch. The report commit only records results; its parent is the validated source.
- OS: macOS 26.7.1, Darwin arm64
- Node: v22.23.1; pnpm: 10.18.3
- Chrome binary: Google Chrome 155.0.8059.85 (`--version` exit 0)

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm build` (`turbo run build`, fresh, 0 cached) | Exit 0. Doq package, Showcase A and Showcase B production builds, both Analog prerenders completed. |
| `node scripts/verification/duplicate-routes.mjs` | Exit 0. Prints `PASS M9`. |
| `pnpm verify:mvp` | Exit 1 before any browser check ran: `FAIL HARNESS — Timed out waiting for Chrome DevToolsActivePort`. Temporary TOC fixtures were removed and Showcase A rebuilt without them. |
| `pnpm pack:doq` | Exit 0. Produced `artifacts/getdoq-analog-0.0.0-pilot.tgz`; listing contains `package.json`, `README.md`, `styles.css`, `fesm2022/getdoq-analog.mjs` (and map), and `types/getdoq-analog.d.ts`. |
| External consumer `pnpm install --force` in `/private/tmp/doq-external-consumer` | Exit 0. The installed `@getdoq/analog` is `0.0.0-pilot` from the regenerated tarball; the new drawer-close markup is present in its FESM. |
| External consumer `pnpm build` | Exit 0. Client, SSR and prerender completed. |

Static markup in the regenerated output: `apps/showcase-a/dist/analog/public/docs/components/button/index.html` contains the drawer trigger, the drawer close control, and the TOC. `apps/showcase-b/...first-application/index.html` and the external consumer's `first-application/index.html` contain the trigger and close control. Copy buttons are added client-side, so they are absent from static HTML by design.

## Browser automation and the current blocker

The harness drives an isolated headless Chrome over the Chrome DevTools Protocol using Node's built-in WebSocket client. It launches Chrome with `--remote-debugging-port=0` and a temporary `--user-data-dir`, reads the port from `DevToolsActivePort`, sets viewports with `Emulation.setDeviceMetricsOverride` and verifies `innerWidth`/`innerHeight`, grants clipboard permissions and reads `navigator.clipboard`, and captures `Runtime`, `Log` and `Network` events and screenshots. It adds no npm dependency. The browser can be pointed at with `CHROME_BIN`.

On this machine every Chrome launch hangs before it writes `DevToolsActivePort`. Commands run in this iteration:

1. `pnpm verify:mvp` (harness default launch, `--headless=new`) — timed out.
2. Direct launch of the Chrome binary with `--headless=new --remote-debugging-port=0`, an isolated profile and `--no-sandbox`, also with `--use-mock-keychain --password-store=basic`, and with `--dump-dom` — no port file, process alive, no output.
3. The Playwright-cached `chromium_headless_shell-1223` under `~/Library/Caches/ms-playwright`, with `--no-sandbox` — same result.
4. `open -n -g -a "Google Chrome" --args --headless=new ...` through LaunchServices, without `--no-sandbox` — same result.
5. `sample` of the stuck processes: the main thread is blocked in an Objective-C `+initialize`, which in the headless shell reaches `NSApplication` → `NSPasteboard` → a synchronous XPC `mach_msg` wait for the pasteboard service.
6. `pbpaste` does not return within 5 seconds, and retrying after a pause does not help. The owning process is `/usr/libexec/pboard` (PID 1016, user `andrii`, LaunchAgent `gui/501/com.apple.pboard`, running since 2026-10-10).

The probe processes were killed by PID or by their profile path. The user's normal Chrome instance was not touched, and `pboard` was not restarted: restarting it is a user-session change that can drop the current clipboard, so it needs the user's decision. The harness documents this failure mode in [scripts/verification/README.md](../../scripts/verification/README.md). Once the pasteboard service answers, `pnpm verify:mvp` should be rerun.

The earlier interactive runs in a previous session reported passing M15, M17 (both showcases) and a zero-error console for Showcase A, and then a failing ordered M16 sequence. Those runs used code from before the final TOC observer, drawer and enhancement edits. Their logs were not saved in the repository, so they are not counted here.

## Product changes in this iteration

- **Drawer closes on document selection.** Selecting a documentation link (through `doq-nav-tree` and the Overview link) or completing any router navigation closes the mobile drawer. If focus was inside the navigation, it moves to the menu trigger.
- **Explicit close control.** A `Close navigation` button inside the mobile drawer closes it; it is hidden at desktop widths.
- **Drawer stacking.** The mobile drawer `z-index` is raised from 20 to 100. In an earlier run the host header covered the drawer's close control, and a click landed on the brand link.
- **TOC observer root margin.** The percentage `rootMargin` was replaced by a pixel margin derived from the viewport height. In an earlier run at 1440 px the percentage margin left the active region empty.
- **Enhancement waits for rendered Markdown.** Copy buttons and TOC observers are attached once the Markdown element has rendered content, through a `MutationObserver` with a zero-delay fallback. Earlier, a one-shot query could run before Angular inserted the headings, so no observer was attached. The observer covers the headings that resolve in the DOM; a TOC entry that does not resolve no longer blocks observation of the others or keeps the `MutationObserver` alive.
- **One heading observer and resize listener per document.** Because enhancement can succeed from both the observer and the timer, a second success could register another resize listener and leave a stale observer on detached headings. Each success now disconnects the previous observer and listener first. Found by code review this iteration; not yet exercised in a browser.
- **Removed a dead field.** The unused `enhancementDomObserver` member was removed.

Each product change reached the build and the external consumer. Only the M9 check and the static markup above have been executed on the final code.

## M1–M24 acceptance matrix

Status key: **Fresh** = executed in this iteration; **Inherited** = evidence from the earlier report, not repeated; **Unverified** = not executed on the final code.

| ID | Status | Method and evidence | Limitations |
| --- | --- | --- | --- |
| M1 — Independent Doq package build | **PASS** (fresh) | `pnpm build`, ng-packagr partial compilation, FESM and declarations. | Angular `exports` override warnings remain non-blocking. |
| M2 — Correct packed artifact and public exports | **PASS** (fresh tarball, export check inherited) | `pnpm pack:doq`; tarball listing above. | Export map checked in the earlier run. |
| M3 — Clean external package-manager installation | **PASS** (inherited) | Earlier offline install from a separate lockfile. This iteration refreshed the consumer with `pnpm install --force`. | Not repeated from a clean lockfile this iteration. |
| M4 — External consumer production build | **PASS** (fresh) | Consumer `pnpm build` after reinstall from the regenerated tarball. | — |
| M5 — Both showcase production builds | **PASS** (fresh) | `pnpm build`, both showcases. | — |
| M6 — Correct Markdown document rendering | **PASS** (inherited) | Earlier Chrome observation of article body and headings. | Browser re-run deferred with M15–M17. |
| M7 — Nested documentation routing | **PASS** (inherited) | Earlier direct loads of nested routes; nested HTML generated. | Browser re-run deferred. |
| M8 — Custom slug consistency | **PASS** (inherited) | Earlier direct loads and refresh of `/docs/onboarding/first-application`; `/docs/getting-started` returned 404. | Browser re-run deferred. |
| M9 — Duplicate route validation | **PASS** (fresh) | `node scripts/verification/duplicate-routes.mjs` exit 0. Uses the transpiled `normalizeDoqDocument` and `sortDoqDocuments` from `packages/doq/src/lib/doq-document.ts`. Two temporary Markdown files with `slug: duplicated-route` throw an error that names `duplicated-route` as `/docs/duplicated-route` and both source paths. Invalid slugs (`''`, `bad slug`, `nested//empty`, `../escape`) are rejected; two ordinary documents do not collide; `/nested/custom-path/` resolves to `/docs/nested/custom-path`. The fixtures are removed in a `finally` block. | Checks the document model's diagnostics, not a full `pnpm build` with a conflicting content tree. |
| M10 — Preservation of existing host routes | **PASS** (inherited) | Earlier consumer root route and client-side navigation into `/docs`. | Browser re-run deferred. |
| M11 — Real prerendered document HTML | **PASS** (inherited; regenerated markup checked) | Earlier check of the custom-slug HTML title, description and body text. This iteration confirmed the regenerated pages still contain the drawer and TOC markup described above. | Body text not re-grepped on the regenerated output. |
| M12 — Direct static route accessibility | **PASS** (inherited) | Earlier HTTP 200 for generated pages and direct browser loads. | Not re-run against the rebuilt output. |
| M13 — Correct missing-route behavior | **PASS** (inherited) | Earlier HTTP 404 for absent source-slug and unrelated paths. | Doq's client-side not-found view was not separately reached. |
| M14 — Functional hierarchical sidebar | **PASS** (inherited) | Earlier Chrome checks of the A and B nested groups and right-side layout. The CSS changes in this iteration only affect the mobile breakpoint; the new close control is hidden by default. | Browser re-run deferred. |
| M15 — Functional accessible mobile navigation | **UNVERIFIED** | Harness `mobileNavigation()` covers the closed and open states at 375×812 for A and B, expansion of nested groups, Escape, selection closing, three open/close cycles through the close control, focus return, and Tab skipping closed descendants. Not executed (Chrome blocked). | Previous interactive runs are not counted. |
| M16 — Functional TOC anchors and active heading | **UNVERIFIED** | Harness `toc()` checks heading IDs and TOC hashes, a click and fragment update, duplicate-heading IDs, no-heading pages, active-state changes on scroll, direct fragment reload, and route lifecycle. Last observed failure: the ordered route sequence, before the enhancement-timing fix. The observer changes above are not re-executed. | Blocked. Fixture headings are created and removed by the harness. |
| M17 — Correct code copy behavior and lifecycle | **UNVERIFIED** | Harness `clipboard()` compares `navigator.clipboard.readText()` with the rendered code for each block, keyboard activation, a route round trip with one button per block, and the unavailable-clipboard fallback. Not executed. | Blocked. |
| M18 — Functional consumer-owned Angular demos | **PASS** (inherited) | Earlier interaction with the A activation count and B field selector. | Unknown-demo fallback not exercised. |
| M19 — Working light/dark themes | **PASS** (inherited) | Earlier theme toggle checks on both showcases. | No computed-style contrast audit. |
| M20 — Independent host branding and layouts | **PASS** (inherited) | Earlier Chrome screens of the Vanta and Forge shells with A left and B right navigation. | — |
| M21 — No private workspace source dependency | **PASS** (inherited, reinstalled) | Consumer installed from the regenerated tarball with `file:` dependency; no workspace reference. | — |
| M22 — Accurate public documentation | **PASS** (inherited, drawer text updated) | The root README drawer paragraph was updated to the implemented behavior (Close control, Escape, link selection). It no longer says that link selection is a failing check. | Browser behavior is M15. |
| M23 — No blocking SSR/hydration regressions | **UNVERIFIED** | Harness `diagnostics()` captures `Runtime.exceptionThrown`, `Runtime.consoleAPICalled` errors and warnings, `Log.entryAdded`, and `Network.loadingFailed` through a demo interaction, a theme toggle, drawer open and Escape, a route change, and a reload, for both showcases and the external consumer when `MVP_CONSUMER_ROOT` is set. Not executed. | Blocked. The consumer needs `MVP_CONSUMER_ROOT=/private/tmp/doq-external-consumer/dist/analog/public`. |
| M24 — Complete responsive browser inspection | **UNVERIFIED** | Harness `responsive()` and `dynamic()` cover 375×812, 768×1024, 1280×800, 1440×900 and 1920×1080 with measured viewport checks and document overflow, article bounds, drawer trigger visibility per breakpoint, host header and footer, and themes, plus the dynamic transition sequences. Not executed. | Blocked. |

## Remaining work

1. Restore a responsive user-session pasteboard service (see the blocker section), or run the harness on a machine where Chrome starts.
2. Run `pnpm build`, then `MVP_CONSUMER_ROOT=/private/tmp/doq-external-consumer/dist/analog/public pnpm verify:mvp`. Fix any real failure, rebuild, and rerun.
3. Update M15, M16, M17, M23 and M24 from that run, including screenshots under the temporary evidence directory, and re-check M6–M8, M10 and M14 if the browser run touches them.

**Final verdict: REWORK — VALIDATION INCOMPLETE.** GO requires all 24 criteria to be PASS in one run on the final code. This report must not be read as GO.

# Verification — 0011 integration DX and stabilization

## Test cases

| Case         | Acceptance             | Checks                                                                                                                                                            | Result |
| ------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| UNIT-070     | AC-006                 | Argument parsing: defaults per mode, custom paths, invalid options exit 2                                                                                         | PASS   |
| UNIT-071     | AC-005                 | Semver range evaluation for the peer ranges                                                                                                                       | PASS   |
| UNIT-072     | AC-001                 | Node range guard (20.18/22.11/23 refused) and comment stripping                                                                                                   | PASS   |
| UNIT-073     | AC-002, AC-003, AC-004 | doq init: both modes, custom values, determinism, dry run, idempotence, conflicts, traversal, symlink, integration verdicts                                       | PASS   |
| UNIT-074     | AC-005                 | doq doctor negative controls: peers, slugs, frontmatter, deterministic plugin, stylesheet, providers, Pagefind only when search is on, UNKNOWN, archives, --build | PASS   |
| UNIT-075     | AC-006                 | Binary: one JSON document on stdout, usage errors on stderr with exit 2, help, version                                                                            | PASS   |
| UNIT-080     | AC-008                 | Public API report: declarations listed without internals or comments                                                                                              | PASS   |
| UNIT-081     | AC-008                 | Baseline comparison negative controls: removed export, retyped member, signature, required member, binary, kind                                                   | PASS   |
| UNIT-090     | AC-007                 | Official documentation routes follow Doqs's URL rule and match the site content                                                                                   | PASS   |
| COMP-100     | AC-007                 | The site is a Doqs consumer: config, providers, header/footer, skip link focuses the routed content                                                               | PASS   |
| COMP-101     | AC-007                 | Per-route canonical link and og:url without duplicates                                                                                                            | PASS   |
| COMP-102     | AC-007                 | Consumer-owned install demo is operable and announces its state                                                                                                   | PASS   |
| COMP-103     | AC-007                 | The documentation region is a lazy route limited to the mount path                                                                                                | PASS   |
| E2E-100      | AC-007                 | Official docs journeys DX-001..015 and DX-018, axe in both themes (Chromium, Firefox, WebKit)                                                                     | PASS   |
| E2E-101      | AC-009                 | Newly initialized embedded and docs-first consumers (DX-016)                                                                                                      | PASS   |
| CONTRACT-080 | AC-007                 | Every Markdown file is a prerendered page with content                                                                                                            | PASS   |
| CONTRACT-081 | AC-007                 | Per-page metadata, canonical only with an origin                                                                                                                  | PASS   |
| CONTRACT-082 | AC-007                 | Pagefind indexes exactly the documentation pages                                                                                                                  | PASS   |
| CONTRACT-083 | AC-007                 | Unknown documentation URLs answer 404                                                                                                                             | PASS   |
| CONTRACT-084 | AC-007                 | Sitemap lists landing and every document when generated                                                                                                           | PASS   |
| CONTRACT-085 | AC-007                 | No private paths or secrets in documentation output                                                                                                               | PASS   |
| CONTRACT-086 | AC-007                 | The landing loads none of the documentation UI                                                                                                                    | PASS   |
| CONTRACT-090 | AC-001                 | Tarball ships three binaries with shebang and executable bit                                                                                                      | PASS   |
| CONTRACT-091 | AC-001                 | CLI runs from the unpacked tarball; imports only Node and itself                                                                                                  | PASS   |
| CONTRACT-092 | AC-002                 | init generates valid onboarding files and is repeatable (from the tarball)                                                                                        | PASS   |
| CONTRACT-093 | AC-003                 | dry run and conflicts never write (from the tarball)                                                                                                              | PASS   |
| CONTRACT-094 | AC-006                 | doctor --json is one document with actionable findings                                                                                                            | PASS   |
| CONTRACT-095 | AC-006                 | Usage errors go to stderr with exit 2                                                                                                                             | PASS   |
| MANUAL-001   | AC-007                 | The table of contents sits beside the content at 1500, 1800, 2200 and 2560 px (measured bounding boxes and screenshot)                                            | PASS   |
| MANUAL-002   | AC-010                 | README, changelog and docs reviewed for stale versions, anchors and snippets                                                                                      | PASS   |

## Executed commands

All run locally on the final branch code (commit before this report), Chrome via `PW_CHANNEL=chrome`, from the log of `pnpm quality:gate` (exit 0, 25 stages PASS):

- `pnpm install --frozen-lockfile` (CI), `pnpm format:check`, `pnpm typecheck:scripts`, `pnpm sdd:check`, `pnpm api:check`, `pnpm agentyx:check`: PASS.
- `pnpm test:unit`: 22 files, 438 tests PASS. `pnpm test:components`: library 134 tests + site 21 tests PASS.
- `pnpm build`, `pnpm docs:check` (showcase A, B and the official site), `pnpm perf:check` (all budgets, including the new `site` ones): PASS.
- `pnpm pack:doq`, `pnpm verify:package artifacts/doqs-analog-0.8.0.tgz` (25 checks), `pnpm verify:public-api` (63 exports, 4 entry points, compatible with 0.7.0): PASS.
- `pnpm test:contract`: 94 tests PASS, also with the unversioned consumers (94). `pnpm verify:negative-controls`: all 9 mutations detected.
- `pnpm consumer:build`, `pnpm verify:init` (Angular 21 embedded, Angular 21 docs-first, Angular 22 embedded): PASS.
- `pnpm test:e2e` (Chromium): 196 passed. `pnpm test:e2e:browsers` (Firefox + WebKit): 257 passed, 1 skipped.
- `pnpm perf:scale --check`, `pnpm verify:determinism` (5 builds) and `--control`, `pnpm verify:compat --angular=21` and `--angular=22`, `pnpm verify:mvp`: PASS.
- `pnpm verify:adoption` (disposable Angular Movement checkout, Angular 22, packed 0.8.0): exit 0. `doq doctor` before integration: 5 FAIL, 2 WARN, 13 PASS (every FAIL with a fix); after: 0 FAIL, 0 WARN, 34 PASS; `doq init --dry-run` changed nothing; `doq init` touched only `src/doq.paths.ts` and `src/content/handbook/`; `doctor --build` PASS; adoption E2E 19 passed.
- GitHub Actions on PR #20: all 11 jobs PASS after the CI fix (the unit job now builds the library first).

Landing first-loaded JS (gzip): 139,600 B on `main`, 153,034 B now (260,194 B with an eager import of the documentation region); landing CSS 11,160 -> 15,538 B; Pagefind index of the site 41,765 B (18 pages); 20 static pages.

Fixed during verification: a 5 s cold-start timeout in one component spec (suite timeout now 20 s); a wrong docs-first expectation (Doqs at `/` owns every route); two cross-browser test artifacts (reload while a lazy chunk downloads; Firefox's harness-only layout warning, filtered by exact text).

## Remaining limitations

- Not verified: applications that load Zone.js, Vite below 8, Analog above 2.9, real screen readers, full WCAG conformance. The E2E accessibility checks are axe with `wcag2a`/`wcag2aa` tags in both themes.
- Firefox and WebKit run the engine-dependent journeys (including the official docs), not the whole suite.
- `MANUAL-001`: measured bounding boxes and a screenshot at 1500, 1800, 2200 and 2560 px; no automated regression test pins the table-of-contents position beyond the existing TOC and responsive specs. `MANUAL-002`: a read-through of README, changelog and docs.
- 0.8.0 is not published: npm is still 0.7.0 and the site is not deployed from the branch; both stay with the existing release and deploy workflows after merge.
- 1.0 blockers are listed in `docs/roadmap/1.0-readiness.md`: no `main` landmark in the document view, config helpers cannot be imported without the UI, leaked exports, unverified environments. Doqs is not declared 1.0-ready.

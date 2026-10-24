# Verification — 0014 real world adoption readiness

## Test cases

| Case         | Acceptance                     | Checks                                                                                       | Result |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------------- | ------ |
| COMP-140     | AC-007                         | index, document and not-found views render one main by default and none with landmark host   | PASS   |
| COMP-141     | AC-007                         | DoqShellComponent never nests main, keeps header/footer outside, mainLandmark override       | PASS   |
| COMP-142     | AC-011                         | unmatched continue: documents render, host routes win below the prefix, default still claims | PASS   |
| UNIT-140     | AC-012                         | every export has a stability tier, the deprecated example keeps its tag                      | PASS   |
| UNIT-141     | AC-009                         | root keeps every config export unchanged; documented entry points                            | PASS   |
| UNIT-142     | AC-013                         | CRLF copies of generated pages and manifests are unchanged, real edits still conflict        | PASS   |
| UNIT-143     | AC-013                         | CRLF API sources render the same pages as LF                                                 | PASS   |
| CONTRACT-110 | AC-009                         | config entry exported, shipped and declared                                                  | PASS   |
| CONTRACT-111 | AC-009                         | config entry imports only @angular/core                                                      | PASS   |
| CONTRACT-112 | AC-009                         | root entry re-exports the configuration surface                                              | PASS   |
| CONTRACT-113 | AC-009                         | Node-only entries never import browser entries                                               | PASS   |
| CONTRACT-114 | AC-008                         | one main per prerendered documentation page on showcase A, B and the site                    | PASS   |
| CONTRACT-115 | AC-012                         | tarball ships no inventory or test files                                                     | PASS   |
| E2E-140      | AC-014                         | Zone.js application journey                                                                  | PASS   |
| E2E-141      | AC-001, AC-002, AC-003, AC-008 | Angular Movement at original URLs                                                            | PASS   |
| E2E-142      | AC-004, AC-005, AC-006, AC-008 | Volt UI at original URLs, playgrounds, overlays, themes                                      | PASS   |
| E2E-143      | AC-003                         | Angular Movement cross-browser subset                                                        | PASS   |
| E2E-144      | AC-005                         | Volt UI cross-browser subset                                                                 | PASS   |
| MANUAL-001   | AC-010                         | pnpm bundle:impact --check output recorded                                                   | PASS   |
| MANUAL-002   | AC-015                         | overlay, localization and screen-reader assessment recorded                                  | PASS   |
| MANUAL-003   | AC-016                         | consumer-parity.md and migration-findings.md cite evidence                                   | PASS   |
| MANUAL-004   | AC-017                         | version, changelog, readiness, release workflows untouched                                   | PASS   |

## Executed commands

Environment: macOS (Darwin 25.6), Node 22.23.1, installed Google Chrome 156 (`PW_CHANNEL=chrome`), Playwright Firefox and WebKit, `CI=true` (one retry per test, as in CI). Starting main: `a8ada63`; 0.10.0 verified published on npm and the site deployed before work started.

`CI=true PW_CHANNEL=chrome node scripts/verify.ts full --adoption` (that is `pnpm quality:gate --adoption`): **32 of 32 stages PASS**, in this order: format:check, typecheck:scripts, sdd:check, api:check, content:check, agentyx:check, test:unit (**508** tests, 26 files), test:components (**185**, 17 files), build, docs:check, perf:check, pack:doq, verify:package (26/26), verify:public-api (174 exports, compatible with 0.7.0), test:contract (**127**), verify:negative-controls (all mutations detected), consumer:build (includes the new Zone.js consumer), verify:init, test:contract with unversioned consumers (127), test:e2e (**230 passed**, 1 flaky `toc.spec.ts` that passed on retry), test:e2e:browsers (**327 passed**, 1 skipped as before), perf:scale --check, verify:determinism, verify:determinism --control, verify:compat --angular=21 and --angular=22, verify:mvp (17/17), verify:portable (6 checks, macOS), bundle:impact --check, verify:adoption (26 tests), verify:adoption:routes (14 tests), verify:adoption:volt (18 tests).

Earlier runs of the same gate failed and were fixed, not skipped: perf budgets (Showcase B initial JavaScript +959 B, site +1 page and +5.7 KB of search index; budgets raised with the measured reason), `verify:package` and negative controls and four contract tests that assumed every declaration lived in the root file, `doqRoutes` signature (kept identical to 0.7), the stability inventory (`DoqUnmatched`), a unit timeout and a theme test that flaked under machine load (both pass in isolation and on retry), and a foreign process holding port 4173 (stopped with the user's approval) that broke the CDP harness only for Showcase A.

Separately executed: `e2e/consumer-zone.spec.ts` (5 tests, Chromium, Firefox, WebKit), `e2e/adoption-*-browsers.spec.ts` on Firefox and WebKit, `pnpm bundle:impact -- --check` (landing page 104,812 B and documentation page 104,812 B gzip with either entry, all JavaScript 229,757 B; plain Node import: main entry fails with the missing-compiler error, config entry loads in about 360 ms).

## Remaining limitations

- **Windows:** the `tooling-windows` CI job ran on `windows-latest` (win32, Node 22): `verify:portable` (6 checks), `api:check` and `content:check` passed on its first run, and its unit subset found one defect (`doq-api` printed `src\content\…`), fixed in the next commit; the job then passed. Browsers on Windows are untested.
- **Screen readers were not tested**; no assistive-technology environment was available. WCAG conformance is not claimed.
- Zone.js is verified on Angular 21 only.
- Localization is a verified blocker for localized sites (Volt UI), not solved.
- Overlays appended to `<body>` render beneath the expanded playground (verified with the Volt UI select); inline previews work.
- The configuration entry does not reduce the production bundle of a lazily loaded documentation host (measured, identical); its value is Node tooling contexts and non-tree-shaking builders.
- The real-site proofs are disposable clones at Angular Movement `4e71e2f` and Volt UI `7c76ef3`, Node preset prerender for Volt UI; the Cloudflare worker path was not exercised. They need network access.
- Nothing was published or deployed; release and deployment workflows are unchanged.

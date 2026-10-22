# Verification — 0007 rich documentation authoring

## Test cases

| Case         | Acceptance             | Checks                                                                                                          | Result  |
| ------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------- | ------- |
| UNIT-070     | AC-013                 | `npmPublishArgs` builds an absolute path, rejects the old relative spec and non-tarballs                        | PASS    |
| UNIT-080     | AC-001, AC-005         | callout kinds and case, alone-marker form, nested quotes, non-callout inputs byte for byte, heading/HTML safety | PASS    |
| UNIT-081     | AC-002, AC-005         | tab group parsing, labels, several groups, rich panels, malformed groups literal, code/list directives literal  | PASS    |
| UNIT-082     | AC-003, AC-004, AC-005 | steps wrapper, titled-code figure and escaping, missing title/fence literal                                     | PASS    |
| UNIT-083     | AC-003, AC-006, AC-007 | language labels, plain-Markdown identity, demo order and literal demos, heading ids and duplicate suffixes      | PASS    |
| COMP-080     | AC-001                 | callout note role, nested list/link/code, ordinary quote untouched                                              | PASS    |
| COMP-081     | AC-009                 | callout title excluded from search, body not                                                                    | PASS    |
| COMP-082     | AC-001, AC-005         | unknown marker shown as written                                                                                 | PASS    |
| COMP-083     | AC-002                 | tablist/tab/tabpanel roles, aria relationships, roving tabindex, hidden panels                                  | PASS    |
| COMP-084     | AC-002                 | pointer selection                                                                                               | PASS    |
| COMP-085     | AC-002                 | Arrow/Home/End with focus and wrap-around                                                                       | PASS    |
| COMP-086     | AC-002                 | independent groups, unique ids                                                                                  | PASS    |
| COMP-087     | AC-002, AC-009         | Markdown and callout inside a panel; tab strip excluded from search                                             | PASS    |
| COMP-088     | AC-005                 | malformed tab syntax shown literally                                                                            | PASS    |
| COMP-089     | AC-003                 | copy payload is the active panel's exact code                                                                   | PASS    |
| COMP-090     | AC-002                 | clean teardown and reset across route changes                                                                   | PASS    |
| COMP-091     | AC-004                 | native `<ol>`, nested code and callout                                                                          | PASS    |
| COMP-092     | AC-003                 | titled code figure, caption, copy control                                                                       | PASS    |
| COMP-093     | AC-006                 | demos live around callouts and tabs with independent state                                                      | PASS    |
| COMP-094     | AC-006                 | plain Markdown unchanged                                                                                        | PASS    |
| COMP-095     | AC-007                 | a fragment pointing into an inactive tab activates it                                                           | PASS    |
| CONTRACT-050 | AC-012                 | tarball exports, runtime markers, styles and tokens; no private strings                                         | PASS    |
| CONTRACT-051 | AC-008                 | prerendered callouts as notes with body; no directive text                                                      | PASS    |
| CONTRACT-052 | AC-008                 | all tab panels in static HTML with ARIA relationships                                                           | PASS    |
| CONTRACT-053 | AC-003, AC-008         | language labels and caption in static HTML                                                                      | PASS    |
| CONTRACT-054 | AC-004                 | steps are one real `<ol>` with nested code and callout                                                          | PASS    |
| CONTRACT-055 | AC-009                 | Pagefind fragments hold callout, step, inactive-tab text and not the tab strip                                  | PASS    |
| CONTRACT-056 | AC-007                 | every prerendered heading id equals the canonical id sequence from the Markdown                                 | PASS    |
| E2E-060      | AC-011                 | page with callout, tabs, steps, code (Showcase A)                                                               | PASS    |
| E2E-061      | AC-002                 | keyboard pattern and one tab stop                                                                               | PASS    |
| E2E-062      | AC-003                 | copy after a tab switch                                                                                         | PASS    |
| E2E-063      | AC-001                 | callout nested Markdown                                                                                         | PASS    |
| E2E-064      | AC-004                 | steps and code at 375 px                                                                                        | PASS    |
| E2E-065      | AC-006                 | callouts, code tabs and inline demos together                                                                   | PASS    |
| E2E-066      | AC-007                 | TOC across rich content                                                                                         | PASS    |
| E2E-067      | AC-007                 | fragments on load, after client navigation and Back, duplicate ids                                              | PASS    |
| E2E-068      | AC-009                 | search finds callout text                                                                                       | PASS    |
| E2E-069      | AC-009                 | search finds inactive-tab and step text                                                                         | PASS    |
| E2E-070      | AC-011                 | nested/custom slugs, source path 404                                                                            | PASS    |
| E2E-071      | AC-011                 | docs-first root mount, right sidebar, titled code, demo                                                         | PASS    |
| E2E-072      | AC-011                 | embedded mode keeps host chrome; landing free of Doqs markup                                                    | PASS    |
| E2E-073      | AC-010                 | light and dark in both showcases, axe                                                                           | PASS    |
| E2E-074      | AC-002, AC-010         | keyboard operation, focus indicator, axe                                                                        | PASS    |
| E2E-075      | AC-008, AC-010         | no overflow, hydration errors or exceptions at three widths                                                     | PASS    |
| E2E-076      | AC-010                 | reduced motion                                                                                                  | PASS    |
| E2E-077      | AC-012, AC-011         | both packed consumers: rich blocks, keyboard, copy, demos, search                                               | PASS    |
| MANUAL-084   | AC-014                 | `pnpm sdd:check`                                                                                                | NOT RUN |
| MANUAL-080   | AC-007                 | four clean builds: identical heading ids; upstream concurrency reproduction                                     | PASS    |
| MANUAL-081   | AC-013                 | `npm publish --dry-run`: absolute path accepted, relative path reproduces the CI git error                      | PASS    |
| MANUAL-082   | AC-014                 | README, package README, changelog, operations notes                                                             | PASS    |
| MANUAL-083   | AC-010                 | visual check of both showcases at 1280 px (dark A, light B)                                                     | PASS    |

## Executed commands

- `PW_CHANNEL=chrome pnpm quality:gate`: see the final result below.
- First gate run: 13 of 14 steps PASS; `pnpm verify:mvp` failed M17 (clipboard) for both showcases because `scripts/verification/checks/clipboard.ts` addressed code blocks as `.doq-markdown pre:nth-of-type(n)` and clicked every block, which no longer holds once code lives in tab panels (inactive panels are not rendered). The check now numbers the _visible_ blocks, still requires a copy button on every block, and still asserts the exact clipboard text. Rerun: 17 PASS / 0 FAIL.
- Other failures found and fixed while building: axe color-contrast on an inactive tab label (now derived from the foreground token); host resets removed list markers (lists now restore them); `e2e/responsive.spec.ts` dereferenced the bounding box of hidden code (now skips unrendered blocks).
- Repeated builds: `rm -rf dist; pnpm build` three times plus the first build, sha of all heading ids across both showcases identical (`68ecc48c108d`) every time.
- `node docs/repro/heading-id-concurrency.mjs` (imports resolved to the repo's marked 15.0.12 and marked-gfm-heading-id 4.1.4): sequential parses give `usage` / `usage`; two concurrent parses give `usage` / `usage-1`.
- `npm publish --dry-run artifacts/doqs-analog-0.4.0.tgz` (npm 10.9.8): fails with the CI error (git ls-remote); the same with the absolute path succeeds (`+ @doqs/analog@0.4.0`, dry run).
- Registry: `npm view @doqs/analog versions` lists `0.0.0-stage`, `0.2.0`. Release run 39749811460 and Deploy run 39749811377 (both for 33bbb8f) failed as described in `docs/operations/release-and-deployment.md`.
- Measurements (0.3.0 vs 0.4.0 tarball): ESM bundle 72.2 kB / 16.8 kB gzip to 90.8 kB / 21.5 kB gzip (parser, tabs component, template); `styles.css` 16.2 kB / 3.5 kB gzip to 22.3 kB / 4.5 kB gzip. Tabs are the only new runtime component; callouts, steps, titled code and labels are static HTML. Showcase A's Pagefind directory is 280 kB with the new content; a before/after delta was not measured.

## Remaining limitations

- npm: `@doqs/analog@0.4.0` is **not published** and this branch does not publish. Publication happens only through `release.yml` after the merge, CI on `main`, the `npm-publish` environment approval and the configured Trusted Publisher. `0.3.0` stays absent from the registry unless the maintainer backfills it deliberately.
- Cloudflare Pages: the `doq-site` project still does not exist in the configured account; the site is not deployed and nothing was deployed from here. Maintainer action is documented.
- The real fix for the heading-suffix issue is upstream (`marked-gfm-heading-id` module-level state). Doqs adds no workaround. The Angular Movement occurrence was not re-run.
- Not built by design: demos inside tabs/steps, nested tab groups, a cross-group package-manager preference, `:::code` inside list items.
- Dark Showcase B and light Showcase A were covered by the E2E theme toggle and axe, not by separate screenshots.
- A search result for text in an inactive tab opens the page at the nearest heading; it does not pre-select the tab.

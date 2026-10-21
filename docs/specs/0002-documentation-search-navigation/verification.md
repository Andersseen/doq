# Verification — 0002 documentation search navigation

## Test cases

| Case         | Acceptance                                             | Checks                                                                                                                                                             | Result |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| UNIT-010     | AC-001                                                 | search config defaults, normalization, rejected values, defineDoqConfig wiring                                                                                     | PASS   |
| COMP-010     | AC-002, AC-005                                         | no search control, dialog or request unless enabled; Pagefind annotations on the article and ignores on chrome                                                     | PASS   |
| E2E-015      | AC-002                                                 | search-disabled production build: no UI, shortcut or index requests; docs experience intact; no index request before interaction when enabled                      | PASS   |
| CONTRACT-015 | AC-002                                                 | search-disabled build has the same documents, no bundle and no search markup                                                                                       | PASS   |
| UNIT-014     | AC-003, AC-004, AC-005                                 | indexDoqSearch: preconditions, refuses sites without Doq article markup, indexes only marked content, lean bundle, replaces stale output                           | PASS   |
| CONTRACT-012 | AC-004, AC-020                                         | every document is indexed at its canonical/custom route with its title, nothing else                                                                               | PASS   |
| CONTRACT-013 | AC-005                                                 | no host pages, docs index, sidebar, TOC or pagination text in the index                                                                                            | PASS   |
| COMP-011     | AC-006, AC-010                                         | dialog name, labelled field, status, loading, results, empty and unavailable states                                                                                | PASS   |
| E2E-012      | AC-004, AC-006, AC-008, AC-009, AC-010, AC-012, AC-018 | body-only phrase search, nested slug result, keyboard, missing index, plain-text results, shortcut scope, axe scan, section navigation with active TOC and sidebar | PASS   |
| UNIT-013     | AC-007                                                 | latest-query gate                                                                                                                                                  | PASS   |
| COMP-012     | AC-007, AC-008                                         | stale responses ignored; markup in results rendered as text                                                                                                        | PASS   |
| UNIT-012     | AC-008                                                 | excerpt segments and result mapping                                                                                                                                | PASS   |
| COMP-013     | AC-009                                                 | arrow keys, Enter, Escape, Ctrl/Meta+K scope and listener cleanup                                                                                                  | PASS   |
| UNIT-011     | AC-011                                                 | result URL normalization for /docs and custom base paths                                                                                                           | PASS   |
| E2E-013      | AC-018                                                 | mobile 375px search in both showcases and both host themes                                                                                                         | PASS   |
| E2E-004      | AC-013                                                 | TOC click scrolls the heading (former expected failure now passes)                                                                                                 | PASS   |
| COMP-015     | AC-013, AC-014                                         | fragment scrolling on load, TOC click and missing fragments                                                                                                        | PASS   |
| E2E-011      | AC-014                                                 | direct, reload, client-side, duplicate-heading, Back/Forward and missing fragment on a long document                                                               | PASS   |
| E2E-003      | AC-015, AC-017                                         | mobile drawer navigation focus, Escape and Close, hidden drawer not tabbable, both sides                                                                           | PASS   |
| COMP-016     | AC-015, AC-016, AC-017                                 | drawer, previous/next, search-result and index-arrival focus; no tab stop; Escape/Close                                                                            | PASS   |
| E2E-014      | AC-016                                                 | previous/next from the top with focus on the heading, history Back/Forward                                                                                         | PASS   |
| E2E-008      | AC-019                                                 | tarball-installed consumer: packaged doq-search bundle, search to the custom slug, direct fragment                                                                 | PASS   |
| MANUAL-002   | AC-019                                                 | consumer built from the packed tarball and indexed by the packaged binary                                                                                          | PASS   |
| CONTRACT-011 | AC-020                                                 | bundle files served over HTTP with sensible types; Pagefind default UI not shipped                                                                                 | PASS   |
| CONTRACT-014 | AC-020                                                 | custom slug indexed under the public URL with section anchors                                                                                                      | PASS   |
| CONTRACT-016 | AC-021                                                 | tarball ships bin and ./search-index, optional peer only, browser entry free of Node imports                                                                       | PASS   |
| MANUAL-003   | AC-021                                                 | pnpm verify:package against the tarball and the installed consumer                                                                                                 | PASS   |
| MANUAL-004   | AC-022                                                 | pnpm verify:mvp with the tarball consumer                                                                                                                          | PASS   |
| MANUAL-005   | AC-022                                                 | pnpm quality:gate on the final tree                                                                                                                                | PASS   |
| MANUAL-001   | AC-023                                                 | pnpm sdd:check                                                                                                                                                     | PASS   |

## Executed commands

Run on the final code (commit before the rebase onto `origin/main`, which only changed `.github/workflows/ci.yml`; the merged workflow was re-checked with `prettier --check` and `agentyx:check`). Playwright used the installed Google Chrome (`PW_CHANNEL=chrome`); CDP harness used Chrome too.

```sh
PW_CHANNEL=chrome pnpm quality:gate     # exit 0, 14 steps, all PASS (~150 s)
```

| Step                                                                                                                         | Result                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`, `pnpm typecheck:scripts`, `pnpm sdd:check`, `pnpm agentyx:check`                                        | PASS                                                                                                                    |
| `pnpm test:unit`                                                                                                             | 160 passed in 6 files (baseline before this change: 111)                                                                |
| `pnpm test:components`                                                                                                       | 58 passed in 6 files (baseline: 32)                                                                                     |
| `pnpm build` (library, Showcase A, Showcase B + `doq-search index` after each prerender, plus the `--mode nosearch` variant) | PASS; A indexed 8 pages, B 6 pages                                                                                      |
| `pnpm pack:doq`                                                                                                              | `artifacts/getdoq-analog-0.2.0.tgz`                                                                                     |
| `pnpm verify:package artifacts/getdoq-analog-0.2.0.tgz`                                                                      | PASS                                                                                                                    |
| `pnpm test:contract`                                                                                                         | 28 passed (baseline: 19)                                                                                                |
| `pnpm verify:negative-controls`                                                                                              | all 5 mutations detected (3 existing, 2 new: search URL scope, fragment scrolling)                                      |
| `pnpm consumer:build`                                                                                                        | consumer installed from the tarball outside the workspace, built, indexed by the packaged `doq-search` binary (6 pages) |
| `pnpm test:e2e`                                                                                                              | 73 passed including the tarball consumer (baseline: 42); the former `test.fail()` TOC test now passes without it        |
| `pnpm verify:mvp` with `MVP_CONSUMER_ROOT`                                                                                   | 17 PASS / 0 FAIL (includes the temporary TOC-fixture rebuild)                                                           |

Separately: `pnpm verify:package artifacts/getdoq-analog-0.2.0.tgz /private/tmp/doq-consumer-020` reported 27 PASS / 0 FAIL, including the installed `./search-index` entry, the linked `doq-search` binary and the consumer's search bundle.

Bundle evidence (unminified published `fesm2022/getdoq-analog.mjs`): 0.1.0 43,173 B (9,450 B gzip), 0.2.0 67,285 B (15,297 B gzip); search is therefore not free: about +5.8 KB gzip in the library, and a search-disabled app still ships the component code. Lazy, fetched only on the first query: `pagefind.js` 12.9 KB gzip, `pagefind-worker.js` 11.9 KB, one WebAssembly module about 72 KB, plus the index fragments; Showcase A's whole bundle directory is 280 KB. A search-enabled page makes no `pagefind` request before the reader interacts (E2E-015).

## Remaining limitations

- GitHub Actions on PR #10 (run 39614714730): all six jobs passed, including Playwright on CI's Chromium and the CDP harness with the tarball consumer. Firefox and WebKit were not exercised.
- Search quality is Pagefind's (stemming and ranking). Only English content was indexed in the showcases; multilingual search is a non-goal.
- `vite dev` does not serve a generated index, so search shows its "unavailable" state there (documented); run the build or preview the static output.
- A search-disabled app still ships the search component (about 6 KB gzip with the new navigation code); it is not code-split. Showcase B builds twice so the disabled variant can be tested.
- Back/Forward scroll restoration is kept per mounted documentation view; returning to the docs from a host page does not restore the earlier position (browser behavior applies there). The TOC is still not sticky on long documents (unchanged from 0.1).
- Keyboard shortcut behavior was verified with synthesized Control+K and Meta+K in Chrome; real macOS ⌘K in other browsers was not tested.

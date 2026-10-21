# Verification — 0002 documentation search navigation

## Test cases

| Case         | Acceptance                                             | Checks                                                                                                                                                             | Result  |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| UNIT-010     | AC-001                                                 | search config defaults, normalization, rejected values, defineDoqConfig wiring                                                                                     | NOT RUN |
| COMP-010     | AC-002, AC-005                                         | no search control, dialog or request unless enabled; Pagefind annotations on the article and ignores on chrome                                                     | NOT RUN |
| E2E-015      | AC-002                                                 | search-disabled production build: no UI, shortcut or index requests; docs experience intact; no index request before interaction when enabled                      | NOT RUN |
| CONTRACT-015 | AC-002                                                 | search-disabled build has the same documents, no bundle and no search markup                                                                                       | NOT RUN |
| UNIT-014     | AC-003, AC-004, AC-005                                 | indexDoqSearch: preconditions, refuses sites without Doq article markup, indexes only marked content, lean bundle, replaces stale output                           | NOT RUN |
| CONTRACT-012 | AC-004, AC-020                                         | every document is indexed at its canonical/custom route with its title, nothing else                                                                               | NOT RUN |
| CONTRACT-013 | AC-005                                                 | no host pages, docs index, sidebar, TOC or pagination text in the index                                                                                            | NOT RUN |
| COMP-011     | AC-006, AC-010                                         | dialog name, labelled field, status, loading, results, empty and unavailable states                                                                                | NOT RUN |
| E2E-012      | AC-004, AC-006, AC-008, AC-009, AC-010, AC-012, AC-018 | body-only phrase search, nested slug result, keyboard, missing index, plain-text results, shortcut scope, axe scan, section navigation with active TOC and sidebar | NOT RUN |
| UNIT-013     | AC-007                                                 | latest-query gate                                                                                                                                                  | NOT RUN |
| COMP-012     | AC-007, AC-008                                         | stale responses ignored; markup in results rendered as text                                                                                                        | NOT RUN |
| UNIT-012     | AC-008                                                 | excerpt segments and result mapping                                                                                                                                | NOT RUN |
| COMP-013     | AC-009                                                 | arrow keys, Enter, Escape, Ctrl/Meta+K scope and listener cleanup                                                                                                  | NOT RUN |
| UNIT-011     | AC-011                                                 | result URL normalization for /docs and custom base paths                                                                                                           | NOT RUN |
| E2E-013      | AC-018                                                 | mobile 375px search in both showcases and both host themes                                                                                                         | NOT RUN |
| E2E-004      | AC-013                                                 | TOC click scrolls the heading (former expected failure now passes)                                                                                                 | NOT RUN |
| COMP-015     | AC-013, AC-014                                         | fragment scrolling on load, TOC click and missing fragments                                                                                                        | NOT RUN |
| E2E-011      | AC-014                                                 | direct, reload, client-side, duplicate-heading, Back/Forward and missing fragment on a long document                                                               | NOT RUN |
| E2E-003      | AC-015, AC-017                                         | mobile drawer navigation focus, Escape and Close, hidden drawer not tabbable, both sides                                                                           | NOT RUN |
| COMP-016     | AC-015, AC-016, AC-017                                 | drawer, previous/next, search-result and index-arrival focus; no tab stop; Escape/Close                                                                            | NOT RUN |
| E2E-014      | AC-016                                                 | previous/next from the top with focus on the heading, history Back/Forward                                                                                         | NOT RUN |
| E2E-008      | AC-019                                                 | tarball-installed consumer: packaged doq-search bundle, search to the custom slug, direct fragment                                                                 | NOT RUN |
| MANUAL-002   | AC-019                                                 | consumer built from the packed tarball and indexed by the packaged binary                                                                                          | NOT RUN |
| CONTRACT-011 | AC-020                                                 | bundle files served over HTTP with sensible types; Pagefind default UI not shipped                                                                                 | NOT RUN |
| CONTRACT-014 | AC-020                                                 | custom slug indexed under the public URL with section anchors                                                                                                      | NOT RUN |
| CONTRACT-016 | AC-021                                                 | tarball ships bin and ./search-index, optional peer only, browser entry free of Node imports                                                                       | NOT RUN |
| MANUAL-003   | AC-021                                                 | pnpm verify:package against the tarball and the installed consumer                                                                                                 | NOT RUN |
| MANUAL-004   | AC-022                                                 | pnpm verify:mvp with the tarball consumer                                                                                                                          | NOT RUN |
| MANUAL-005   | AC-022                                                 | pnpm quality:gate on the final tree                                                                                                                                | NOT RUN |
| MANUAL-001   | AC-023                                                 | pnpm sdd:check                                                                                                                                                     | NOT RUN |

## Executed commands

Pending the final run on the last commit.

## Remaining limitations

Pending the final run on the last commit.

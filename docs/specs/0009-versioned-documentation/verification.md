# Verification — 0009 Versioned documentation

## Test cases

| Case         | Acceptance                                                     | Checks                                                                                                                                            | Result |
| ------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| UNIT-110     | AC-001, AC-002                                                 | versioning validation table (ids, duplicates, directories, segment, origin, labels), idempotence, unversioned shape unchanged                     | PASS   |
| UNIT-111     | AC-003, AC-013                                                 | current/archive base paths for prefixed, root and custom segment; canonical URL construction                                                      | PASS   |
| UNIT-112     | AC-010                                                         | switch destinations: shared slug kept, missing slug falls back to the index, root mount                                                           | PASS   |
| UNIT-113     | AC-005, AC-008                                                 | prerender routes for prefixed and root mounts, custom slugs, reserved prefix, invalid archive config                                              | PASS   |
| UNIT-114     | AC-004                                                         | same slug in two versions allowed, sibling directory not leaked, duplicates in one version rejected                                               | PASS   |
| COMP-090     | AC-004, AC-007, AC-011                                         | version-aware sidebar, content by version and slug, custom slugs, pagination, breadcrumbs, archive index and notice                               | PASS   |
| COMP-091     | AC-005, AC-006                                                 | missing document, unknown versions and bare prefix, reserved slug, empty archive                                                                  | PASS   |
| COMP-092     | AC-009, AC-010                                                 | selector name, links, aria-current, switching, fallback, Escape/focus, hidden/left/right sidebar, index, mobile drawer                            | PASS   |
| COMP-093     | AC-003                                                         | root-mounted versioned documentation                                                                                                              | PASS   |
| COMP-094     | AC-001, AC-012                                                 | search receives the active version; filter markup only on versioned sites; unversioned search unchanged; not-indexed message                      | PASS   |
| COMP-095     | AC-013                                                         | self-canonical with origin, none without, host canonical never replaced                                                                           | PASS   |
| COMP-096     | AC-012                                                         | search service passes the Pagefind filter, detects missing version, sends no options when unversioned                                             | PASS   |
| E2E-110      | AC-003, AC-006, AC-009, AC-010, AC-011, AC-012, AC-014, AC-017 | Showcase A embedded: switching, fallback, history, reload, 404s, filtered search, keyboard, mobile, five widths with axe, themes, per-version API | PASS   |
| E2E-111      | AC-003, AC-006, AC-012, AC-014, AC-017                         | Showcase B root: switching with custom slug, filtered search, per-version API, 404s, hydration                                                    | PASS   |
| E2E-112      | AC-016                                                         | versioned tarball consumers (embedded and root)                                                                                                   | PASS   |
| E2E-113      | AC-001, AC-016                                                 | 0.5-style tarball consumers (embedded and root): no version markup, archive routes 404, unfiltered search                                         | PASS   |
| E2E-114      | AC-014, AC-015                                                 | Angular Movement adoption: archive from the real v0.9.0 tag, switching, demos, filtered search                                                    | PASS   |
| CONTRACT-070 | AC-008, AC-017                                                 | every archived page and index prerendered with its filter and version title                                                                       | PASS   |
| CONTRACT-071 | AC-003, AC-017                                                 | current URLs unchanged, no alias pages                                                                                                            | PASS   |
| CONTRACT-072 | AC-006, AC-017                                                 | unknown versions and missing archive documents are 404                                                                                            | PASS   |
| CONTRACT-073 | AC-013                                                         | no cross-version canonical, no hard-coded origin                                                                                                  | PASS   |
| CONTRACT-074 | AC-012                                                         | Pagefind indexes both versions with filter metadata and versioned URLs                                                                            | PASS   |
| CONTRACT-075 | AC-014                                                         | independent manifests, hashes and links of generated references                                                                                   | PASS   |
| CONTRACT-076 | AC-014, AC-015                                                 | same symbol, different content per version                                                                                                        | PASS   |
| CONTRACT-077 | AC-018                                                         | tarball version 0.6.0, exported versioning names, no new dependency                                                                               | PASS   |
| CONTRACT-078 | AC-017                                                         | no archive fixtures in the tarball                                                                                                                | PASS   |
| CONTRACT-079 | AC-001, AC-016                                                 | 0.5-style consumer output has no version markup or archive routes                                                                                 | PASS   |
| MANUAL-001   | AC-018                                                         | release, CI and deploy workflows are untouched (git diff of .github)                                                                              | PASS   |

## Executed commands

All run on the final tree, with `PW_CHANNEL=chrome` (installed Chrome) on macOS:

- `PW_CHANNEL=chrome pnpm quality:gate`: all 16 steps PASS (format, script types, `sdd:check`, `api:check`, Agentyx, `test:unit` 341 tests, `test:components` 130 library + 14 site tests, `build`, `pack:doq`, `verify:package` 21/21, `test:contract` 75 tests, `verify:negative-controls`, `consumer:build` of four tarball consumers, `test:contract` again with the unversioned consumers required, `test:e2e` 166 tests, `verify:mvp` with the tarball consumer).
- `PW_CHANNEL=chrome pnpm verify:adoption`: Angular Movement checkout `4e71e2f`, archive built from the real upstream tag `v0.9.0`; 19 Playwright tests PASS (six rebuilds were needed to get past the documented upstream heading-id race before the tests ran).
- Earlier iterations found and fixed three real defects: a contrast failure of the selector label (axe), a changed search idle message that broke an existing assertion, and `preview-static` crashing on a directory without `index.html`.
- Performance (unversioned Showcase B consumer, same app): Doqs 0.5.0 main chunk 624,595 B (181,114 B gzip) versus 0.6.0 634,497 B (184,068 B gzip), +9.9 KB (+3.0 KB gzip) from the added selector and version code. Enabling versioning with one archive added 3.2 KB raw (+0.5 KB gzip), 8 static pages (17 to 25), and 32 KB of Pagefind index (312 to 344 KB). The library tarball grew from 103,633 B to 118,115 B. Build time of the showcases is about 15 s for the whole `pnpm build`.
- `MANUAL-001`: `git diff -- .github` is empty; release, CI and deploy workflows are unchanged.

## Remaining limitations

- `@doqs/analog@0.6.0` is not published; publishing happens only through the existing Trusted Publishing workflow after merge. Cloudflare deployment of the site likewise follows the merge.
- Frontmatter of every version is in the browser bundle (Analog's content list); bodies load lazily.
- Analog's heading-id race (documented in the Angular Movement notes) is upstream and intermittent; it made the adoption build need several rebuilds. Identical headings across versions can make it likelier in affected checkouts.
- The Angular Movement archive pages are a small labeled fixture; its generated reference is real (tag `v0.9.0`). Angular Movement itself was not modified or migrated.
- Chrome-only Playwright run; Firefox and WebKit were not run. Axe is a smoke check, not a conformance claim.
- No build-time measurement was made separately from the overall `pnpm build`.

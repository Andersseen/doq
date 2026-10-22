# Verification — 0004 real world adoption

## Test cases

| Case         | Acceptance             | Checks                                                                                                                | Result |
| ------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| UNIT-040     | AC-001                 | splitter: no directive is one untouched segment; cuts at top-level directives in order; repeated and adjacent ids     | PASS   |
| UNIT-041     | AC-002                 | splitter: code, inline code, list, quote, table, running text, invalid ids and raw containers stay literal            | PASS   |
| UNIT-042     | AC-001, AC-002         | splitter never changes heading ids or text                                                                            | PASS   |
| COMP-040     | AC-003                 | component mounts between the surrounding Markdown sections, no directive text                                         | PASS   |
| COMP-041     | AC-003                 | several instances and a repeated id keep independent state                                                            | PASS   |
| COMP-042     | AC-003                 | unknown id gives an accessible status and the rest renders                                                            | PASS   |
| COMP-043     | AC-002, AC-003         | directives in code, lists and quotes are not instantiated                                                             | PASS   |
| COMP-044     | AC-003, AC-015         | a document without directives has one Markdown region and no inline wrapper                                           | PASS   |
| COMP-045     | AC-003, AC-015         | frontmatter demo renders once when also inline; still appended otherwise; document slot unchanged                     | PASS   |
| COMP-046     | AC-004                 | navigation destroys instances, return starts fresh ones                                                               | PASS   |
| COMP-047     | AC-004                 | copy button only on Markdown code; demo wrapper is `data-pagefind-ignore`                                             | PASS   |
| COMP-050     | AC-013                 | landing explains inline components with the real directive and registration, no MDX claim                             | PASS   |
| E2E-040      | AC-005, AC-006, AC-008 | production showcases: position, input, reuse, reload, navigation, TOC/duplicate ids, keyboard, search, overflow, axe  | PASS   |
| E2E-050      | AC-009                 | Angular Movement checkout: coexistence, basePath, real components, smooth scroll, search, themes, mobile              | PASS   |
| CONTRACT-040 | AC-011                 | tarball declares and ships the new API and no showcase or reference-consumer code                                     | PASS   |
| CONTRACT-041 | AC-007                 | static HTML places demos between sections with no raw directive text                                                  | PASS   |
| CONTRACT-042 | AC-007, AC-015         | plain documents are unchanged in structure                                                                            | PASS   |
| CONTRACT-043 | AC-007, AC-008         | Pagefind index holds text before and after a demo, no demo control text                                               | PASS   |
| CONTRACT-044 | AC-007                 | duplicate heading ids and search anchors match                                                                        | PASS   |
| MANUAL-040   | AC-010                 | `docs/guides/angular-movement-migration.md` states the real versions, steps, limits and that nothing was migrated     | PASS   |
| MANUAL-041   | AC-011, AC-012         | independent tarball consumer (`consumer:build`) and E2E consumer spec; `verify:package`; release unit tests unchanged | PASS   |
| MANUAL-042   | AC-014                 | Cloudflare check recorded in the runbook with evidence and the maintainer action                                      | PASS   |
| MANUAL-043   | AC-015                 | `pnpm verify:mvp` (24-criterion harness)                                                                              | PASS   |
| MANUAL-044   | AC-015                 | existing unit, component, E2E and contract suites                                                                     | PASS   |
| MANUAL-045   | AC-011, AC-015         | `pnpm quality:gate`                                                                                                   | PASS   |

## Executed commands

- `PW_CHANNEL=chrome pnpm quality:gate` (final run, exit 0): format:check, typecheck:scripts, sdd:check, agentyx:check, test:unit (211 tests), test:components (67 library + 10 site), build, pack:doq, verify:package (19 PASS / 0 FAIL), test:contract (38), verify:negative-controls, consumer:build (tarball consumer), test:e2e (92 passed), verify:mvp (17 browser checks PASS / 0 FAIL). A first gate run failed in `test:contract` (my leak scan flagged the CHANGELOG) and a second in `test:e2e` (the site spec counted three h2 headings; the new section makes four); both were test fixes and the gate was rerun in full.
- `node scripts/adoption.ts /tmp/.../am2 --test` cloned Angular Movement `113fc5e`, installed the 0.3.0 tarball and built it (Angular 22, zoneless, Vite 8, TS 6); `e2e/adoption.spec.ts`: 11 passed on a consistent build.
- `wrangler pages project list` (read-only, maintainer's local login) listed no project containing `doq`; the GitHub runs failed with `The Pages project "doq-site" does not exist`.

## Remaining limitations

- `pnpm verify:adoption` is opt-in (network, large install) and not in `quality:gate`. Angular Movement's own CI, lint and API checks were not run against the overlay; its `main` was not modified.
- Heading-id race in Analog 2.9 (see the migration guide): in the Angular Movement checkout roughly one build in three had spurious `-N` heading suffixes in one bundle, making the adoption E2E fail until rebuilt; not reproduced in the showcases and not caused by this change, but unfixed.
- Cloudflare: the Pages project does not exist, so the site is NOT deployed; maintainer action in the runbook.
- Nothing was published, tagged or released from this branch: npm publication, GitHub release and deployment are unconfirmed until merge and the existing workflows run.
- Directives work only as top-level paragraphs; demos receive no inputs.

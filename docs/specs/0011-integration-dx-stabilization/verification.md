# Verification — 0011 integration DX and stabilization

## Test cases

| Case         | Acceptance             | Checks                                                                                                                                                            | Result  |
| ------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| UNIT-070     | AC-006                 | Argument parsing: defaults per mode, custom paths, invalid options exit 2                                                                                         | NOT RUN |
| UNIT-071     | AC-005                 | Semver range evaluation for the peer ranges                                                                                                                       | NOT RUN |
| UNIT-072     | AC-001                 | Node range guard (20.18/22.11/23 refused) and comment stripping                                                                                                   | NOT RUN |
| UNIT-073     | AC-002, AC-003, AC-004 | doq init: both modes, custom values, determinism, dry run, idempotence, conflicts, traversal, symlink, integration verdicts                                       | NOT RUN |
| UNIT-074     | AC-005                 | doq doctor negative controls: peers, slugs, frontmatter, deterministic plugin, stylesheet, providers, Pagefind only when search is on, UNKNOWN, archives, --build | NOT RUN |
| UNIT-075     | AC-006                 | Binary: one JSON document on stdout, usage errors on stderr with exit 2, help, version                                                                            | NOT RUN |
| UNIT-080     | AC-008                 | Public API report: declarations listed without internals or comments                                                                                              | NOT RUN |
| UNIT-081     | AC-008                 | Baseline comparison negative controls: removed export, retyped member, signature, required member, binary, kind                                                   | NOT RUN |
| UNIT-090     | AC-007                 | Official documentation routes follow Doqs's URL rule and match the site content                                                                                   | NOT RUN |
| COMP-100     | AC-007                 | The site is a Doqs consumer: config, providers, header/footer, skip link focuses the routed content                                                               | NOT RUN |
| COMP-101     | AC-007                 | Per-route canonical link and og:url without duplicates                                                                                                            | NOT RUN |
| COMP-102     | AC-007                 | Consumer-owned install demo is operable and announces its state                                                                                                   | NOT RUN |
| COMP-103     | AC-007                 | The documentation region is a lazy route limited to the mount path                                                                                                | NOT RUN |
| E2E-100      | AC-007                 | Official docs journeys DX-001..015 and DX-018, axe in both themes (Chromium, Firefox, WebKit)                                                                     | NOT RUN |
| E2E-101      | AC-009                 | Newly initialized embedded and docs-first consumers (DX-016)                                                                                                      | NOT RUN |
| CONTRACT-080 | AC-007                 | Every Markdown file is a prerendered page with content                                                                                                            | NOT RUN |
| CONTRACT-081 | AC-007                 | Per-page metadata, canonical only with an origin                                                                                                                  | NOT RUN |
| CONTRACT-082 | AC-007                 | Pagefind indexes exactly the documentation pages                                                                                                                  | NOT RUN |
| CONTRACT-083 | AC-007                 | Unknown documentation URLs answer 404                                                                                                                             | NOT RUN |
| CONTRACT-084 | AC-007                 | Sitemap lists landing and every document when generated                                                                                                           | NOT RUN |
| CONTRACT-085 | AC-007                 | No private paths or secrets in documentation output                                                                                                               | NOT RUN |
| CONTRACT-086 | AC-007                 | The landing loads none of the documentation UI                                                                                                                    | NOT RUN |
| CONTRACT-090 | AC-001                 | Tarball ships three binaries with shebang and executable bit                                                                                                      | NOT RUN |
| CONTRACT-091 | AC-001                 | CLI runs from the unpacked tarball; imports only Node and itself                                                                                                  | NOT RUN |
| CONTRACT-092 | AC-002                 | init generates valid onboarding files and is repeatable (from the tarball)                                                                                        | NOT RUN |
| CONTRACT-093 | AC-003                 | dry run and conflicts never write (from the tarball)                                                                                                              | NOT RUN |
| CONTRACT-094 | AC-006                 | doctor --json is one document with actionable findings                                                                                                            | NOT RUN |
| CONTRACT-095 | AC-006                 | Usage errors go to stderr with exit 2                                                                                                                             | NOT RUN |
| MANUAL-001   | AC-007                 | The table of contents sits beside the content at 1500, 1800, 2200 and 2560 px (measured bounding boxes and screenshot)                                            | NOT RUN |
| MANUAL-002   | AC-010                 | README, changelog and docs reviewed for stale versions, anchors and snippets                                                                                      | NOT RUN |

## Executed commands

Not yet recorded.

## Remaining limitations

Not yet recorded.

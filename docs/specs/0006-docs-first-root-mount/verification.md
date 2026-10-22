# Verification — 0006 docs-first root mount

## Test cases

| Case         | Acceptance     | Checks                                                                                          | Result |
| ------------ | -------------- | ----------------------------------------------------------------------------------------------- | ------ |
| UNIT-051     | AC-001, AC-002 | root base path: accepted, prerender routes, document routes, search URLs without double slashes | PASS   |
| COMP-070     | AC-002         | index at `/`, root-level document and overview links rendered by the real components            | PASS   |
| CONTRACT-006 | AC-003, AC-004 | every Markdown document of both showcases is prerendered at its public route                    | PASS   |
| CONTRACT-007 | AC-003         | custom slug served at the root, source paths 404                                                | PASS   |
| CONTRACT-012 | AC-003         | Pagefind keyed by public URLs per scenario                                                      | PASS   |
| CONTRACT-013 | AC-003, AC-004 | host/landing text not indexed (Showcase A); chrome never indexed (both)                         | PASS   |
| CONTRACT-014 | AC-003         | custom-slug page indexed under the root URL only                                                | PASS   |
| CONTRACT-015 | AC-003         | search-disabled build of the docs-first app                                                     | PASS   |
| E2E-007      | AC-003, AC-004 | docs-first theme toggle and navigation; Showcase A host isolation unchanged                     | PASS   |
| E2E-008      | AC-005         | packed-tarball consumer on the root mount                                                       | PASS   |
| MANUAL-060   | AC-006         | `pnpm verify:mvp` (24-criterion harness) with per-showcase expectations                         | PASS   |
| MANUAL-061   | AC-004         | READMEs and changelog describe both scenarios                                                   | PASS   |

## Executed commands

- `PW_CHANNEL=chrome pnpm quality:gate` (exit 0, 14 steps PASS): test:unit 220, test:components 69 library + 14 site, verify:package 19 PASS, test:contract 38, verify:negative-controls (all mutations detected, after updating two mutation targets for `joinDoqPath`), consumer:build, test:e2e 106 passed, verify:mvp 17 PASS / 0 FAIL (Showcase B and the tarball consumer now root-mounted).
- Earlier runs failed and were fixed: `CONTRACT-010` requested `/docs` from Showcase B; three E2E cases kept a `/docs` URL for Showcase B (mobile navigation target, search result href, mobile search expectation).
- Visual check of Showcase B at `/` and `/concepts/models` (1280 px, light) in the production build: Starlight-style shell, index cards, right sidebar, search, no console errors.
- MANUAL-061: `packages/doq/README.md`, `packages/doq/CHANGELOG.md` (Unreleased) and `apps/showcase-b/README.md` describe the two scenarios.

## Remaining limitations

- No version bump: the root mount is under "Unreleased"; publishing it is a separate maintainer decision (merging does not publish because the version equals the npm one).
- Showcase B at dark theme and mobile widths was covered by the E2E/harness suites (theme, mobile navigation, responsive, axe), not by separate manual screenshots.
- A root mount shadows other file routes by design; this is documented but not enforced by a diagnostic.

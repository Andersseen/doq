# Verification — 0003 npm release and website

## Test cases

| Case         | Acceptance             | Checks                                                                                               | Result |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| UNIT-024     | AC-001                 | manifest: public scoped package, repository, engines, bin, files, single version source              | PASS   |
| UNIT-021     | AC-002                 | registry state from mocked responses, no credentials, malformed/unexpected responses fail            | PASS   |
| MANUAL-010   | AC-002                 | real unauthenticated registry read                                                                   | PASS   |
| UNIT-020     | AC-003, AC-005, AC-006 | release plan: publish, skip, repair and every refusal                                                | PASS   |
| MANUAL-011   | AC-003                 | runbook lists bootstrap commands and owner steps                                                     | PASS   |
| UNIT-022     | AC-004, AC-005         | OIDC prerequisites, npm version comparison, post-publication check, changelog notes                  | PASS   |
| UNIT-023     | AC-004, AC-006, AC-011 | workflow permissions, triggers, token absence, SHA pinning, deploy separation, pinned Wrangler       | PASS   |
| COMP-020     | AC-007                 | landing content, one h1, real API names, no MDX claim, primary links                                 | PASS   |
| COMP-022     | AC-008                 | copy writes the exact command, announces, falls back                                                 | PASS   |
| CONTRACT-030 | AC-007                 | prerendered HTML has content and landmarks                                                           | PASS   |
| COMP-021     | AC-009                 | named navigation, external links, mobile menu keyboard behavior                                      | PASS   |
| E2E-030      | AC-007, AC-008, AC-009 | production build: hero, nav, links, clipboard, mobile menu, overflow 320–1280, axe light/dark, focus | PASS   |
| UNIT-025     | AC-010                 | origin normalization, canonical, robots, sitemap, XML escaping                                       | PASS   |
| CONTRACT-031 | AC-010                 | metadata complete; canonical/sitemap only with an origin                                             | PASS   |
| CONTRACT-032 | AC-010                 | sitemap well-formed when generated                                                                   | PASS   |
| CONTRACT-033 | AC-011                 | static artifact, no worker/functions/server files                                                    | PASS   |
| CONTRACT-034 | AC-011                 | no credential names or token-shaped strings in the output                                            | PASS   |
| MANUAL-012   | AC-012                 | `pnpm quality:gate`                                                                                  | PASS   |
| MANUAL-013   | AC-012                 | `pnpm sdd:check`                                                                                     | PASS   |

## Executed commands

Playwright and the CDP harness used the installed Google Chrome (`PW_CHANNEL=chrome`).

- `curl https://registry.npmjs.org/@getdoq%2Fanalog` → HTTP 404 `Not found` (MANUAL-010): the package is **not published**, 0.2.0 included. The organization page returned 403 to a script and `…/-/org/getdoq/package` returned `{}` without credentials, so organization membership, 2FA and any Trusted Publisher configuration are **not verified**. Local npm is 10.9.8; the workflow installs npm 11.21.1 and checks ≥ 11.5.1 at runtime.
- `PW_CHANNEL=chrome pnpm quality:gate` → exit 0: format:check, typecheck:scripts, sdd:check, agentyx:check, test:unit (204 tests), test:components (58 + 10 site), build (showcases and `apps/site`), pack:doq, verify:package, test:contract (33), verify:negative-controls, consumer:build, test:e2e (81), verify:mvp (17 browser checks PASS, 0 FAIL).
- Extra: `DOQ_SITE_ORIGIN=https://docs.example.com pnpm --filter site build` emitted canonical, `og:url`, a `Sitemap:` line and a valid `sitemap.xml`; the default build emits none of them.
- An `NG0950` prerender error appeared once in a build log early in development and did not reproduce in five further clean and incremental builds or in the gate (no NG0950 in the gate log); watch for it in CI.

## Remaining limitations

Playwright and the CDP harness used the installed Google Chrome (`PW_CHANNEL=chrome`).

- `curl https://registry.npmjs.org/@getdoq%2Fanalog` → HTTP 404 `Not found` (MANUAL-010): the package is **not published**, 0.2.0 included. The organization page returned 403 to a script and `…/-/org/getdoq/package` returned `{}` without credentials, so organization membership, 2FA and any Trusted Publisher configuration are **not verified**. Local npm is 10.9.8; the workflow installs npm 11.21.1 and checks ≥ 11.5.1 at runtime.
- `PW_CHANNEL=chrome pnpm quality:gate` → exit 0: format:check, typecheck:scripts, sdd:check, agentyx:check, test:unit (204 tests), test:components (58 + 10 site), build (showcases and `apps/site`), pack:doq, verify:package, test:contract (33), verify:negative-controls, consumer:build, test:e2e (81), verify:mvp (17 browser checks PASS, 0 FAIL).
- Extra: `DOQ_SITE_ORIGIN=https://docs.example.com pnpm --filter site build` emitted canonical, `og:url`, a `Sitemap:` line and a valid `sitemap.xml`; the default build emits none of them.
- An `NG0950` prerender error appeared once in a build log early in development and did not reproduce in five further clean and incremental builds or in the gate (no NG0950 in the gate log); watch for it in CI.

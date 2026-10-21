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

- `curl https://registry.npmjs.org/@doqs%2Fanalog` and the former `@getdoq` name both returned HTTP 404 (MANUAL-010): the package is **not published**. Organization membership, 2FA and any Trusted Publisher configuration cannot be read without the maintainer's login and are **not verified**. Local npm is 10.9.8; the workflow installs npm 11.21.1 and checks ≥ 11.5.1 at runtime.
- `PW_CHANNEL=chrome pnpm quality:gate` (before the scope rename, then again after it, see the PR) → exit 0: format:check, typecheck:scripts, sdd:check, agentyx:check, test:unit (204 tests), test:components (58 + 10 site), build (showcases and `apps/site`), pack:doq, verify:package, test:contract (33), verify:negative-controls, consumer:build, test:e2e (81), verify:mvp (17 browser checks PASS, 0 FAIL).
- Extra: `DOQ_SITE_ORIGIN=https://docs.example.com pnpm --filter site build` emitted canonical, `og:url`, a `Sitemap:` line and a valid `sitemap.xml`; the default build emits none of them.
- An `NG0950` prerender error appeared once in a build log early in development and did not reproduce in five further builds or in the gate.

## Remaining limitations

Status per criterion: REL-01 PASS; REL-02 PASS (registry read; org/permissions UNVERIFIED); REL-03 PASS (documented); REL-04 PASS in code, AWAITING EXTERNAL ACTIVATION (package must exist and the Trusted Publisher be configured); REL-05 PASS; REL-06 to REL-09 PASS by unit tests and workflow invariants, never exercised by a real run; WEB-01 to WEB-08 PASS; CF-01 to CF-05 PASS in code, AWAITING EXTERNAL ACTIVATION (no Cloudflare project, token or secrets were available); CF-06 PASS (runbook); QA-01 to QA-06 PASS.

- The workflows (`release.yml`, `deploy-site.yml`) have not run on GitHub; they are validated by static invariants only. The `workflow_run` artifact download, `npm publish <tarball> --provenance` with OIDC and `gh release create` are unverified until the first real run.
- Nothing was published or deployed by this change. The npm link on the site resolves only after the bootstrap publication.
- Lighthouse was not measured. Axe is an automated smoke test, not a conformance claim.
- The README still says "Not yet published"; update it after npm confirms the package.

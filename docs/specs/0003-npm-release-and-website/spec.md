# 0003 — npm release and website

## Problem

`@doqs/analog` (0.2.0) cannot be installed by anyone: the registry returns 404 for the package, there is no release automation, and the project has no public website. A manual `npm publish` with a long-lived token would be the obvious shortcut and is the thing to avoid. This change is the distribution and website foundation of the 0.2.x product; it is not the 0.3.0 feature milestone.

## Consumer impact

None for the library API or behavior. Once the maintainer bootstraps the package, consumers can `pnpm add @doqs/analog` and get provenance-attested releases. Package metadata gains `engines` and `publishConfig.access: public`. A new static website (`apps/site`) presents the product.

## Scope

- npm release workflow (`release.yml`) using Trusted Publishing, a release-eligibility library with negative controls, GitHub tag and Release creation.
- Official landing page `apps/site` (Analog, static prerender), SEO files and metadata.
- Cloudflare Pages deployment through Wrangler (`deploy-site.yml`, `apps/site/wrangler.jsonc`).
- Operations runbook, CI additions, site tests, contract tests.

## Non-goals

No version bump, no 0.3.0 work, no documentation site or fake docs routes, no Angular Movement changes. No npm publication, public release or deployment is performed by this change. No Cloudflare project or account setting is created from code.

## Requirements

- **REQ-001** Package metadata is correct for a public scoped npm package: name `@doqs/analog`, `publishConfig.access: public`, repository/provenance fields, engines, bin, exports, file allowlist, license.
- **REQ-002** The npm registry state is read without credentials and the release logic distinguishes "package missing", "version missing" and "version published", failing on unexpected responses.
- **REQ-003** The first publication is documented as a manual, authorized bootstrap, and the automation stays inactive (skips, does not fail) while the package does not exist.
- **REQ-004** Publication uses npm Trusted Publishing (OIDC) from a dedicated job with minimal permissions, an npm that supports it, provenance, and no persistent npm token anywhere.
- **REQ-005** A release publishes exactly the tarball CI built and verified for the commit, never republishes or overwrites an existing version, and keeps the git tag, GitHub Release and npm version consistent, including safe repair after a partial failure.
- **REQ-006** No publication or deployment secret is reachable from pull requests, forks, feature branches, failed or cancelled CI, or an out-of-date commit.
- **REQ-007** The official site is a statically prerendered Angular/Analog app that states Doq's real value, uses the real public API in its example, offers a working install-command copy, links only to existing destinations, and is independent of the showcases.
- **REQ-008** The site is accessible and responsive: landmarks, one h1, keyboard-operable menu, visible focus, reduced motion, no horizontal overflow, no serious axe violations in light and dark.
- **REQ-009** Site SEO: title, description, Open Graph/Twitter metadata, favicon, robots.txt; canonical URL, `og:url` and sitemap only from a configured origin, never an invented domain.
- **REQ-010** Cloudflare Pages deployment uses a pinned Wrangler, Direct Upload, scoped secrets, requires validated CI, serves previews separately from production, and never exposes credentials to fork code; the deployable output is purely static and secret-free.
- **REQ-011** The existing quality gates keep passing and cover the site; the runbook states every manual external step and no external state is claimed verified from code alone.

## Acceptance cases

- **AC-001** [REQ-001] `packages/doq/package.json` declares the scoped name, public access, git repository with `directory`, MIT license, engines, bin and file allowlist, and the packed tarball verifier passes.
- **AC-002** [REQ-002] With mocked registry responses: 404 → package missing (no `authorization` header sent), versions map → missing/published with integrity, other statuses and malformed metadata → error.
- **AC-003** [REQ-003] While the package is absent the plan is `skip` with a bootstrap instruction; the runbook lists the exact bootstrap commands and owner steps.
- **AC-004** [REQ-004] `release.yml` grants `id-token: write` to one job only, uses `npm publish --provenance` after the publish prerequisites (npm ≥ 11.5.1, OIDC token, hosted runner, no token variable) hold, and contains no npm token, `registry-url` or `secrets.`.
- **AC-005** [REQ-005] The plan is `publish` only for a validated, unpublished, untagged, not-lower version; an existing version with different content is `skip`; identical content without release is `repair-github-release`; a mismatched tag or tarball version is `refuse`; post-publication verification requires identical integrity and provenance; the tarball hash is re-checked in the publish job.
- **AC-006** [REQ-006] The plan refuses pull-request, feature-branch, fork and non-success CI runs and skips a stale commit; workflow triggers are `workflow_run` only; CI has no write or OIDC permission; privileged actions are pinned to commit SHAs.
- **AC-007** [REQ-007] The prerendered HTML contains the h1, hero, features, install command and setup code naming the real API; links go to the repository, the package, README and license; the page claims no MDX support.
- **AC-008** [REQ-007] The copy button writes the exact command to the clipboard, announces it, and explains manual copying when the clipboard fails.
- **AC-009** [REQ-008] In a real browser the mobile menu opens/closes by keyboard and Escape, focus is visible, there is no horizontal overflow from 320 to 1280 px, and axe reports no serious/critical violations in both colour schemes.
- **AC-010** [REQ-009] Metadata tags exist; canonical, `og:url` and sitemap appear only for a configured https origin and are absent otherwise; origin normalization rejects non-https or credentialed values; the sitemap is valid XML.
- **AC-011** [REQ-010] Production deploys only after a successful push CI run on main with `--branch=main`; previews only for same-repository non-main branches with `--branch=<branch>`, from default-branch code; Wrangler is pinned; the output has no worker/functions/server files or secret-like strings.
- **AC-012** [REQ-011] The full quality gate passes, the SDD check passes, the runbook marks every owner step, and each external activation is reported as awaiting rather than verified.

## Public API impact

None. Package manifest metadata only (`engines`, `publishConfig`); no exports, config options, frontmatter keys, routes or CSS tokens change. No CHANGELOG entry because the package contents are unchanged.

## Compatibility

Node `^20.19 || ^22.12 || >=24` declared as the package engines (the Angular 21 range); CI and the repository use Node 22.22.3. Angular 21 and Analog 2.9 for the site. The site is static and needs no SSR server. Existing showcases, tests, harness and consumer flow are unchanged.

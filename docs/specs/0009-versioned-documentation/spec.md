# 0009 — Versioned documentation

## Problem

Doqs 0.5 serves exactly one documentation catalog per application. A library that releases a new major version loses the documentation matching its older releases, or has to host a second application: readers of an older installed version cannot read their docs, old links break, and search mixes versions. Angular Movement, the reference consumer, is in this position as soon as it publishes a new major.

Doqs needs optional, build-time versioning that keeps the existing router, content pipeline, search, SSR/SSG and API reference generation: current documentation at its existing URLs, archived snapshots at stable URLs, a version selector, version-aware navigation and search, and no backend.

## Consumer impact

Additive and opt-in. A project without `versioning` gets the same routes, markup, search calls and prerendered files as in 0.5 (proved with a 0.5-style consumer built from the tarball). A project that adds `versioning` to its shared paths object, plus one content folder per archive, gets archive URLs under `<basePath>/v/<id>`, a version selector, per-version sidebar, index, pagination and search, and per-version prerendering. Package version `0.6.0`.

## Scope

- A typed, validated `versioning` setting in `DoqPaths` (shared by Angular runtime and Analog build config): current id/label, archives with explicit content directories, URL segment, optional canonical origin.
- Isolated catalogs per version, version-aware routes (`doqRoutes`), prerender routes (`doqPrerenderRoutes`) and content resolution.
- An accessible version selector in the sidebar/drawer, top bar (hidden sidebar) and index pages; context-preserving switching with an index fallback.
- Pagefind version filtering at search time; scoped canonical-link handling; archive titles.
- Compatibility of `doq-api` with per-version output folders (no generator change expected).
- Both showcases (embedded and docs-first) with real archive fixtures, the Angular Movement adoption proof with a genuine historical tag, tarball consumers (versioned and 0.5-style), documentation, website copy, package version.

## Non-goals

Remote or runtime-fetched documentation, Git-tag synchronization, automatic snapshots per release, a CMS, localization, a multi-tenant framework, a new search engine or router, semantic API diffing or migration hints, per-version themes, changing the Angular Movement repository, publishing or deploying from this branch.

## Requirements

- **REQ-001** Versioning is optional: a configuration without `versioning` renders the same routes, markup (no selector, no filter attribute, no version data attribute), search calls and prerendered files as Doqs 0.5, and `normalizeDoqPaths()` returns the same object shape.
- **REQ-002** `versioning` is validated with actionable errors: version ids (syntax, uniqueness case-insensitively), labels, archive content directories (present, safe, not equal to or nested in another version's), `pathSegment`, `canonicalOrigin`. Normalization is idempotent.
- **REQ-003** The current version keeps `contentDirectory` and `basePath` and its existing URLs (no alias, no duplicate pages); archives are mounted at `<basePath>/<pathSegment>/<id>` for prefixed and root-mounted documentation, in configured order.
- **REQ-004** Each version has an independent catalog. The same slug or title may exist in several versions; duplicate public routes within one version still throw; a sibling directory (`docs-v1` vs `docs`) never leaks into another version.
- **REQ-005** The URL segment is reserved: a current document using it throws (runtime and prerender); an archive may use it freely; an archive without Markdown throws.
- **REQ-006** `doqRoutes()` serves, per archive, an index and a nested document route with the existing component contract, before the current routes; unknown versions and the bare prefix never resolve as current documents; unrelated host routes are not captured.
- **REQ-007** Markdown is loaded by version and public slug: an archived or custom-slug document never loads another version's content, and nothing is fetched at runtime.
- **REQ-008** `doqPrerenderRoutes()` emits an index and a content route per version with correct root/prefixed URLs and custom slugs; invalid configuration fails the build.
- **REQ-009** An accessible version selector (native disclosure of links, accessible name, `aria-current`, labels for current/archived, Escape restores focus) appears in the sidebar and mobile drawer, in the top bar when the sidebar is hidden, and on index pages; it is SSR-safe and appears once.
- **REQ-010** Switching versions keeps the public slug when the target version has it and opens the target version's index otherwise; nothing is guessed, no current content is shown under an archive URL; focus and history behave like other in-app navigation.
- **REQ-011** Sidebar, index cards, breadcrumbs, previous/next, active state and the document title belong to the active version; archived pages say which version they belong to and link to the latest.
- **REQ-012** On a versioned site indexed pages carry `data-pagefind-filter="doqsVersion:<id>"`; search is filtered by Pagefind to the version being read, keeps correct URLs and fragments, stays lazy, reports a version that is not indexed, and never filters on an unversioned site.
- **REQ-013** SEO: archive titles carry the version label, no duplicate current pages exist, no cross-version canonical is emitted; `canonicalOrigin` makes each page declare its own canonical URL in a scoped, SSR-safe way that never replaces a host-authored canonical; no domain is hard-coded.
- **REQ-014** `doq-api` output for an archive is independent of the current output (own manifest, own base path, own links) and `doq-api check` stays non-mutating; regenerating the current reference never touches an archive.
- **REQ-015** Both showcases and the Angular Movement adoption proof use the same public versioning API with genuinely different archive content, including generated references; the adoption archive is built from a real upstream tag.
- **REQ-016** The packed `0.6.0` tarball, installed outside the workspace, works with versioning (prefixed and root-mounted) and with a 0.5-style configuration, for SSR/SSG, Pagefind, navigation, switching, demos and generated references.
- **REQ-017** Static output has valid versioned HTML, 404 for versions and pages that do not exist, no archive leakage into the package, and hydrates without console errors at 320–1920 px.
- **REQ-018** Package version `0.6.0`, changelog, README, package README, CONTRIBUTING and website describe versioning accurately; the release workflow, Trusted Publishing and CI checks are unchanged.

## Acceptance cases

- **AC-001** [REQ-001] Without `versioning`, the component tests find no selector, notice, version data attribute or `data-pagefind-filter`, search is called without a version, `normalizeDoqPaths` keeps its two-key shape, and the 0.5-style tarball consumers have no version markup, no archive routes and unfiltered search.
- **AC-002** [REQ-002] Table-driven unit cases accept valid configurations and reject each invalid one (id, duplicates, directories, segment, origin, label) with a specific message; normalizing a normalized configuration is the identity.
- **AC-003** [REQ-003] Unit and component cases show `/docs` and `/` current URLs unchanged and archives at `/docs/v/<id>` and `/v/<id>`, a custom segment, and static output with no `/latest` alias.
- **AC-004** [REQ-004] Component cases render the same slug in two versions with different content and titles, a sibling-directory unit case returns nothing, and duplicates in one version still throw.
- **AC-005** [REQ-005] Unit and component cases reject a current slug starting with the reserved segment, allow it inside an archive, and fail loudly for an empty archive.
- **AC-006** [REQ-006] Component cases open archive index, document, nested and custom-slug routes, and show not-found for an unknown version, the bare prefix and a document missing in a valid version; the static host answers 404 for them.
- **AC-007** [REQ-007] A component case proves each version's body text and TOC come from its own directory, including custom slugs.
- **AC-008** [REQ-008] Unit cases list the prerender routes for prefixed and root mounts, custom slugs, and invalid archive configuration; contract tests request every archived page and index from the production output.
- **AC-009** [REQ-009] Component and E2E cases check the selector's role, name, `aria-current`, labels, Escape and focus return, keyboard operation, mobile drawer, hidden sidebar and index placement, and axe at five widths.
- **AC-010** [REQ-010] Unit, component and E2E cases switch with a shared slug, a custom slug, a missing document and an index page, with Back/Forward and reload, and show focus on the new heading.
- **AC-011** [REQ-011] Component and E2E cases check sidebar links, index cards, breadcrumbs, previous/next, notice and titles in archive and current.
- **AC-012** [REQ-012] Unit, component, E2E and contract cases check the filter markup, the Pagefind call with the filter, results for a phrase present in both versions and for an archive-only phrase, fragments and TOC after opening a result, not-indexed reporting, and that unversioned search is unchanged.
- **AC-013** [REQ-013] Component and contract cases check titles, absence of canonical links by default, self-canonical links with an origin, restoration, and no replacement of a host canonical.
- **AC-014** [REQ-014] Contract tests check independent manifests, hashes and link targets for both showcases; the adoption run checks that regeneration leaves the archive manifest untouched; `pnpm api:check` passes for both versions.
- **AC-015** [REQ-015] E2E cases cover both showcases and the Angular Movement archive (shared and version-only reference pages, switching, real demos, version-filtered search).
- **AC-016** [REQ-016] E2E cases run against consumers built from the tarball outside the workspace (versioned embedded and root, and 0.5-style embedded and root).
- **AC-017** [REQ-017] Contract and E2E cases check 200/404 behavior, absence of fixtures in the tarball, no console errors and no horizontal overflow at 320, 375, 768, 1280 and 1920 px.
- **AC-018** [REQ-018] Contract tests check the manifest version and exported names; the SDD and repository checks pass; the release workflow is untouched.

## Public API impact

Additive. New: `versioning` in `DoqPaths`/`DoqConfig`; types `DoqVersioning`, `DoqVersionConfig`, `DoqArchiveConfig`, `DoqResolvedVersioning`, `DoqVersion`, `DoqVersionLink`; `doqVersionLinks`, `DOQ_VERSION_FILTER`, `DoqVersionSwitcherComponent`; `injectDoqDocuments(config, versionId?)`; `doqRoutes` accepts `versioning`; `normalizeDoqPaths` may return `versioning`; CSS selectors `.doq-version*`; no CSS token added or changed. `DoqSearchService.search` gains an optional version argument.

## Compatibility

Angular 21/22 and Analog 2.9 peer ranges unchanged; Node ranges unchanged; no new dependency. Existing 0.5 configurations, URLs, frontmatter and tokens keep working. SSR/SSG: selector and notices are static markup; version data comes from route data; metadata and canonical handling are SSR-safe and scoped. Pagefind 1.5.x filters are used as documented.

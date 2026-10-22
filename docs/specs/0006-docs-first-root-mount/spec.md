# 0006 — docs-first root mount

## Problem

Both showcases mount Doqs on `/docs` inside a product site with its own landing page, so only one usage scenario is exercised. Teams also build documentation-only applications (a Starlight or ngDoc style site) where Doqs must own every route, including `/`. Doqs rejected `basePath: '/'`, and joined paths with `${prefix}/${slug}`, which would produce `//slug` at the root.

## Consumer impact

Additive. `basePath: '/'` (previously a thrown error) is now valid and mounts the documentation at the application root. Every other value, including `'/docs'`, behaves exactly as before; `basePath: ''` is still rejected. New export `joinDoqPath`. The package version is not changed here (release is a separate decision), so the change is recorded under "Unreleased".

## Scope

- Library: accept `basePath: '/'` in `normalizeDoqPaths`, build document URLs, prerender routes, search result URLs and routes consistently through one helper (`joinDoqPath`).
- Showcase B becomes the docs-first scenario: Doqs at `/`, no host landing page, `DoqShellComponent` as the only shell, theme toggle, custom slugs, slots, demos and search kept. Showcase A stays the one-route scenario at `/docs`.
- The tarball consumer (a copy of Showcase B) therefore verifies the root mount from the packed package.
- Tests, contract checks and the CDP harness are adapted per scenario; README and changelog are updated.

## Non-goals

A version bump or publication; changing Showcase A; new library features other than the root mount; any redirect or 404 page behaviour beyond what static hosting does today.

## Requirements

- **REQ-001** `basePath: '/'` is accepted and normalised to `/`; empty, traversal and dot values are still rejected.
- **REQ-002** With the root mount, document routes, prerender routes, pagination, breadcrumb/overview links and search results are root-level (`/guides/routing`), never `//…`, and the index is `/`.
- **REQ-003** Showcase B serves its index at `/` and every document at its canonical or custom-slug root URL, prerendered, hydrated without console errors, with search, custom slugs, slots and demos working; source paths of custom-slug documents return 404.
- **REQ-004** Showcase A keeps `/docs` and its host landing page; the two showcases are documented as the two scenarios.
- **REQ-005** The packed tarball works as a root-mounted consumer outside the workspace.
- **REQ-006** The existing contract, E2E and 24-criterion harness expectations are preserved per scenario (host-route checks apply only where a host route exists).

## Acceptance cases

- **AC-001** [REQ-001] `normalizeDoqPaths` returns `/` for `/` and `///`; `''`, `/..`, `/./docs` throw.
- **AC-002** [REQ-002] Prerender routes and normalised documents at the root have no double slash; search URLs map below `/`; the rendered index links and overview link point at root URLs.
- **AC-003** [REQ-003] The static output of Showcase B has `/index.html` as the docs index, each document at its root URL, a 404 for `/getting-started`, and the Pagefind index keyed by root URLs; E2E covers navigation, search, slugs, theme, mobile, accessibility.
- **AC-004** [REQ-004] Showcase A E2E and contract checks still pass unchanged at `/docs`.
- **AC-005** [REQ-005] `consumer:build` and the consumer E2E pass against the root-mounted copy.
- **AC-006** [REQ-006] `verify:mvp` passes with `docsBase`/`hostRoute` expectations per showcase.

## Public API impact

Additive: `basePath: '/'`, export `joinDoqPath`. No removal, no config key renamed, no route shape change for existing mounts.

## Compatibility

Angular 21+/22, Analog 2.9. A root mount must not coexist with other file-based routes (they would be shadowed by the greedy document matcher); this is documented in the README.

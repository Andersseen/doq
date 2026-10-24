# 0014 — real world adoption readiness

## Problem

Doqs 0.10 has many features and a large test suite, but no real documentation site has used it to replace its own custom
infrastructure at its own URLs. Adopting it in two real Angular libraries (Angular Movement, Volt UI) is the evidence 1.0 needs, and
reading their current source showed generic blockers that the synthetic showcases could not:

- Both application shells already wrap the router outlet in `<main>`, while Doqs renders its own `main` (index) or none (document),
  so landmarks are nested or missing depending on the integration style (documented 1.0 blocker).
- Doqs claims every URL below its base path. A site that migrates pages one by one and keeps other pages under the same prefix
  (`/docs/introduction` stays host-owned) gets a Doqs "not found" page, prerendered with status 200, for the host's pages.
- `defineDoqConfig` and `provideDoq` live in the same module as the components; a Node-side import of the main entry fails
  without `@angular/compiler`.
- Public exports mix stable contract, tooling helpers and an accidental example component (`DoqButtonDemoComponent`).
- The Node tooling was never run with Windows line endings: sources and generated pages checked out with `core.autocrlf`
  made `doq content check` report "edited after it was generated" and leaked `\r` into API pages.
- Zone.js applications, localization needs and overlay behavior inside the expanded playground were unverified.

## Consumer impact

Additive for every 0.10 configuration. New optional configuration: `landmark: 'document' | 'host'` and
`unmatched: 'not-found' | 'continue'`; a new entry point `@doqs/analog/config`; `DoqShellComponent` input `mainLandmark`.
One behavior change in the default configuration: `DoqShellComponent` no longer renders its own `main` when `provideDoq` is
present (Doqs views already are the `main`), which removes the nested landmark the shell produced for the index view.

## Scope

1. Adoption evidence: a route-preserving Angular Movement proof and a Volt UI proof, both built from the packed tarball in
   disposable checkouts of the real repositories, with Playwright journeys.
2. Landmark ownership (`landmark`), shell behavior, component tests, E2E.
3. `@doqs/analog/config` entry point and a measured bundle comparison.
4. `unmatched: 'continue'` for incremental migration below a shared prefix.
5. Public API inventory with stability tiers, deprecation of `DoqButtonDemoComponent`, regression test.
6. Zone.js consumer, portable (Windows line endings, junction, path) tooling smoke and CI job, two portability fixes.
7. Overlay and localization assessments, accessibility review, documentation, 1.0 readiness update, version 0.11.0.

## Non-goals

A localization framework, an overlay framework, redirects beyond what a demonstrated need requires, removing any export,
changing Markdown directive semantics, widening peer ranges, publishing from the branch, declaring 1.0.

## Requirements

- **REQ-001** The Angular Movement site renders migrated documentation pages through the packed Doqs package at their original public URLs, with host-owned `/`, `/demos/*` and non-migrated `/docs/*` pages unchanged.
- **REQ-002** The Volt UI site renders migrated component, guide and recipe pages through the packed Doqs package at their original URLs, with real Volt UI components in playgrounds and host-owned gallery, Theme Studio and localized routes unchanged.
- **REQ-003** Exactly one `main` landmark exists in every tested integration; ownership is decided by configuration, never by client-side DOM inspection.
- **REQ-004** `@doqs/analog/config` exports the configuration surface without importing anything but `@angular/core`; the root entry keeps exporting every 0.10 name unchanged.
- **REQ-005** The impact of the config entry is measured on built output and recorded.
- **REQ-006** `unmatched: 'continue'` lets host routes below the Doqs base path keep working and never serves a Doqs page for a URL without a document.
- **REQ-007** Every export of the browser entries has a recorded stability tier; the accidental example export is deprecated, not removed.
- **REQ-008** Generated output and checks do not depend on the platform's line endings.
- **REQ-009** A Zone.js application with the packed package routes, hydrates, drives playgrounds, searches and switches versions.
- **REQ-010** The behavior of overlays inside the expanded playground, the localization needs of Volt UI and the screen-reader state are assessed and recorded without claiming more than was tested.
- **REQ-011** The parity between Doqs and both sites' documentation infrastructure is recorded per capability with evidence.
- **REQ-012** Version 0.11.0 is prepared, 1.0 readiness updated with evidence, release infrastructure untouched.

## Acceptance cases

- **AC-001** [REQ-001] Given the Angular Movement checkout with get-started, api-selection, accessibility and reference replaced, then each URL answers 200 from Doqs, `/demos/enter` and `/docs/introduction` are the host's pages, and unknown documentation URLs answer 404.
- **AC-002** [REQ-001] The generated API reference lists exactly the inputs declared in the source, the source-backed example shows the real provider, and a playground drives the real `moveEnter` directive.
- **AC-003** [REQ-001] Pagefind finds migrated text, Back/Forward cross the Doqs/host boundary, direct refresh works, the host `SmoothScrollService` still drives scrolling.
- **AC-004** [REQ-002] Given the Volt UI checkout, the button, dialog, popover and select pages answer from Doqs at their original URLs while a non-migrated component page, a gallery page and Theme Studio are host pages.
- **AC-005** [REQ-002] A Volt UI button playground changes variant, size, label and disabled state on the real component and records the pressed output; the dialog and popover playgrounds open real overlays.
- **AC-006** [REQ-002] Light and dark follow the host's `dark` class, the mobile drawer works and axe finds nothing serious.
- **AC-007** [REQ-003] Component tests: index, document and not-found views render one `main` by default and none with `landmark: 'host'`; `DoqShellComponent` never nests.
- **AC-008** [REQ-003] Built AM and Volt pages contain exactly one `main` in prerendered HTML and in the hydrated DOM.
- **AC-009** [REQ-004] The packed config entry's compiled file imports only `@angular/core`, loads in plain Node, and the public API report shows no removed or retyped root export.
- **AC-010** [REQ-005] `pnpm bundle:impact --check` prints the sizes of both variants, the import closure and the Node import result.
- **AC-011** [REQ-006] Component tests: with `unmatched: 'continue'` a document renders, a host route below the prefix renders, an unknown URL reaches the host 404; by default Doqs still claims it.
- **AC-012** [REQ-007] A unit test fails if an export lacks a tier, a tiered name does not exist, or the deprecated example loses its `@deprecated` tag.
- **AC-013** [REQ-008] Unit and smoke tests: CRLF copies of generated pages and CRLF sources give the same output and no conflict.
- **AC-014** [REQ-009] The Zone.js consumer passes its browser journey.
- **AC-015** [REQ-010] Overlay, localization and screen-reader findings are written down with the evidence that supports each.
- **AC-016** [REQ-011] `docs/adoption/consumer-parity.md` classifies each capability and cites a test or a source file.
- **AC-017** [REQ-012] `package.json` is 0.11.0, the changelog, readiness document and official documentation describe 0.11, `release.yml` and `deploy-site.yml` are unchanged.

## Public API impact

Additive. New: entry `@doqs/analog/config`; type `DoqLandmark`, `DoqUnmatched`; optional `DoqConfig.landmark`,
`DoqConfig.unmatched`; optional `DoqShellComponent.mainLandmark` input; `doqRoutes()` accepts `unmatched`. Deprecated (not removed):
`DoqButtonDemoComponent`. `pnpm verify:public-api` passes against the 0.7.0 baseline.

## Compatibility

Angular `^21.2.2 || ^22.0.0`, Analog `@analogjs/content ^2.9.0`, Node `^20.19.0 || ^22.12.0 || >=24.0.0` unchanged. Zone.js is verified on Angular 21 only.
Existing 0.10 configurations keep working; the only observable change for them is the shell landmark described above.

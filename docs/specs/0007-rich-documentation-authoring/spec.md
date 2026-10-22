# 0007 — rich documentation authoring

## Problem

Doqs 0.3 lets an author place a consumer-owned Angular component in Markdown with `::demo[id]`. Common documentation patterns (a note, installation commands per package manager, a numbered setup guide, a named code sample) still require either a registered Angular component or plain Markdown that cannot express them. Real component-library and developer-platform documentation uses these patterns on nearly every page.

A separate release defect blocks publication: the `0.3.0` release run failed because `npm publish artifacts/<file>.tgz` was read by npm 11 as a GitHub repository shorthand. `@doqs/analog@0.3.0` is not on npm.

## Consumer impact

Additive. A 0.3 document renders exactly as before; rich blocks activate only on the exact syntax below, so existing Markdown is not rewritten. One visible change for hosts that reset list styles (for example Tailwind preflight): Markdown lists inside `.doq-markdown` now keep bullets and numbers. Package version `0.4.0`.

## Scope

- Library: built-in **callouts**, **tabs / code groups**, **steps**, **titled code** and **language labels**, authored in Markdown, server-rendered, searchable, themed with the existing `--host-docs-*` model.
- Both showcases use the blocks in real pages; the packed tarball is verified in two independent consumers (embedded under `/docs`, docs-first at `/`).
- Release workflow: the publish step passes npm an unambiguous absolute tarball path, with a regression test.
- Records: npm registry state (0.3.0 gap), Cloudflare Pages state, the heading-suffix investigation.

## Non-goals

MDX, template compilation, evaluating Markdown-authored code, a code editor or sandbox, nested tab groups, demos inside tabs/steps, a global (cross-group) package-manager preference, new configuration switches, a rebuild of `apps/site`, any publication or deployment from this branch.

## Requirements

- **REQ-001** Callouts: a blockquote whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` (any case) renders as an accessible note with a visible title and a kind-specific glyph, with its Markdown intact. Ordinary blockquotes, unknown kinds, a marker followed by text on its line, and markers in code are unchanged.
- **REQ-002** Tabs: `:::tabs [label]` / `:::tab Label` / `:::` renders WAI-ARIA tabs (tablist, tab, tabpanel, `aria-selected`, `aria-controls`, `aria-labelledby`, roving tabindex) with Arrow, Home and End keys, independent state per group, stable ids, and Markdown (including code, callouts, steps) in every panel.
- **REQ-003** Code groups reuse the tabs component (code-only tabs render flush); titled code (`:::code name`) and language labels are static HTML; copy copies the exact code of the active block.
- **REQ-004** Steps: `:::steps` around an ordered list renders a native `<ol>` with styled numbering; nested code, links and callouts work.
- **REQ-005** Safety and degradation: only exact syntax is recognised; directives in code, lists or running text, unclosed groups, stray `:::tab`, nested `:::tabs`, text glued to a marker, or a steps group without an ordered list leave the author's text on the page. Nothing is evaluated and no HTML is injected beyond escaped titles and labels.
- **REQ-006** `::demo[id]` keeps working unchanged before, between and after rich blocks, including repeated ids; the demo registry, `splitDoqInlineDemos` and the frontmatter `demo` key are unchanged.
- **REQ-007** Heading ids (including duplicate suffixes), order, the table of contents, fragment navigation and syntax highlighting are unchanged; a fragment in an inactive tab activates that tab. Static output is deterministic across builds.
- **REQ-008** SSR/SSG: callouts, steps, titled code and every tab panel are in the prerendered HTML with no hydration or console errors.
- **REQ-009** Search policy: callout bodies, steps, code and inactive-tab content are indexed; tab strips and callout titles are not (`data-pagefind-ignore`); language labels are CSS-generated.
- **REQ-010** Theming and layout: scoped CSS from the existing tokens plus optional `--host-docs-callout-*`; correct in light and dark host themes, narrow and wide layouts, reduced motion; no UI-framework dependency.
- **REQ-011** Showcase A (embedded, `/docs`) and Showcase B (docs-first, `/`) demonstrate the blocks in real content, keeping their scenarios distinct.
- **REQ-012** The tarball is `@doqs/analog@0.4.0`, ships the additive exports and styles and no showcase code, and works from two clean consumers (embedded and root-mounted) built from the packed file.
- **REQ-013** Release: the publish step passes npm an absolute tarball path; Trusted Publishing, provenance, checksum, eligibility and GitHub Release recovery are preserved; a regression test fails for the old command.
- **REQ-014** README, package README, changelog and operations notes describe the syntax, limits, search policy, theming, migration, the 0.3.0 registry gap and the Cloudflare state.

## Acceptance cases

- **AC-001** [REQ-001, REQ-005] Table-driven unit cases cover every kind, case-insensitivity, a marker alone on its line, nested quotes, and each non-callout input byte-for-byte; the component renders a labelled note with nested list, link and code.
- **AC-002** [REQ-002] Unit parsing of groups (labels with inline Markdown and entities, several groups, rich content in panels); component tests for roles, relationships, pointer and keyboard selection, wrap-around, independent groups, route change reset; E2E keyboard journey and one-tab-stop behaviour.
- **AC-003** [REQ-003] Unit/COMP/E2E: code-only detection, titled figure with escaped caption, language label on fenced code only, exact clipboard payload after a tab switch.
- **AC-004** [REQ-004] Unit wrapping, COMP native `<ol>` with nested code and callout, contract check of the static `<ol>`, E2E at 375 px.
- **AC-005** [REQ-005] Malformed-syntax table and code/list literal cases pass unchanged; HTML-significant text and heading ids survive byte for byte.
- **AC-006** [REQ-006] Unit order test and component test with demos around callouts and tabs; existing inline-demo suites still pass.
- **AC-007** [REQ-007] Unit heading-id order test, contract comparison of every prerendered heading id with the canonical GitHub-style ids derived from the Markdown, repeated clean builds produce identical ids, E2E TOC, fragment, Back/Forward and duplicate-id journeys; the upstream concurrency cause is reproduced in `docs/repro`.
- **AC-008** [REQ-008] Contract tests on prerendered HTML (notes, tab ARIA with all panels, steps, figure); every E2E test fails on console warnings/errors, so hydration problems fail it.
- **AC-009** [REQ-009] Contract tests on the Pagefind fragments; E2E search for callout text and inactive-tab text.
- **AC-010** [REQ-010] E2E theme toggle in both showcases changes callout and tab colours and passes axe in both themes; reduced motion; no horizontal overflow at 375/768/1280.
- **AC-011** [REQ-011] E2E on both showcases (embedded host chrome, root mount, custom slug source path 404, right sidebar).
- **AC-012** [REQ-012] Contract checks of exports, CSS and absence of private strings; E2E-077 against both packed consumers.
- **AC-013** [REQ-013] `UNIT-070` and the workflow assertions; `npm publish --dry-run` with the absolute path succeeds where the relative path reproduces the CI error.
- **AC-014** [REQ-014] The documents above exist and agree with the behaviour; `pnpm sdd:check` passes.

## Public API impact

Additive exports: `parseDoqContent`, `DOQ_CALLOUT_TYPES`, `DoqRichSegment`, `DoqTab`, `DoqCalloutType`, `DoqTabsComponent`. No change to `provideDoq`, `defineDoqConfig`, `doqRoutes`, `doqPrerenderRoutes`, `DoqConfig.demos`, `.slots`, `.search`, or to `splitDoqInlineDemos` / `DoqContentSegment`. New optional CSS tokens `--host-docs-callout-{note,tip,important,warning,caution}`.

## Compatibility

Angular 21.2 / Analog 2.9 (`@analogjs/content` marked pipeline unchanged). Authoring syntax is plain Markdown that degrades to readable text where unsupported.

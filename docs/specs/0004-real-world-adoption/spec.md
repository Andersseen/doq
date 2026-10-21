# 0004 — real world adoption (Doqs 0.3.0 interactive Markdown)

## Problem

A Doqs document can attach only one consumer component, at the very end (`demo:` frontmatter), or the same component to every page (slots). Real Angular documentation, such as Angular Movement's, alternates prose with live examples: an install command between two paragraphs, an animation playground under a heading, an API table after an explanation. That forces consumers to keep writing documentation as Angular templates. We know it from the reference consumer (Angular Movement documents `/docs/*` as hand-written Angular components with embedded `InstallCommand`, `CodeBlock` and `ApiStabilityTable`) and from the 0.2 landing copy, which said components cannot be embedded in Markdown.

## Consumer impact

Additive. Consumers who register components in `demos` can write `::demo[id]` on its own line in any Markdown file. Documents without the directive render exactly as in 0.2. The visible product brand on the official site becomes "Doqs"; no API identifier changes.

## Scope

- The `::demo[id]` directive, parsed from Analog's already-rendered HTML and rendered with Angular (`NgComponentOutlet`), reusing `DoqConfig.demos`.
- Showcase A and B examples; Angular Movement adoption proof; route coexistence on a custom `basePath`; smooth-scroll interoperability check.
- Official site (`apps/site`) copy and example for 0.3; Cloudflare status check; docs, migration-readiness guide, changelog, version 0.3.0.

## Non-goals

MDX, Angular template compilation, a second registry, a new router, search backend, theme engine, test runner, release or deployment workflow, documentation versioning, modifying Angular Movement's repository, publishing, tagging or deploying from the branch.

## Requirements

- **REQ-001** `::demo[id]` on its own line places the registered component at that position; several directives, repeated ids and different ids each create an independent instance; documents without a directive are unchanged.
- **REQ-002** Only a top-level paragraph that is exactly a directive is recognised; directives in fenced/indented code, inline code, lists, blockquotes, tables or text stay literal; nothing is evaluated or injected as HTML.
- **REQ-003** The existing `demos` registry and `demo:` frontmatter keep working; a frontmatter demo that is also placed inline renders once; slots are unchanged.
- **REQ-004** An unknown id renders an accessible notice and the rest of the page; components are destroyed on navigation and recreated fresh on return; reload does not duplicate them.
- **REQ-005** Heading ids (including duplicate suffixes), the table of contents, fragments, history navigation, highlighting, copy buttons and pagination are unaffected by directives; copy buttons and heading logic never touch consumer demo markup.
- **REQ-006** The static output contains the demo's server-rendered markup and Markdown on both sides; the page hydrates without console errors or warnings.
- **REQ-007** Pagefind indexes Markdown before and after a demo under canonical URLs and excludes demo controls.
- **REQ-008** Doqs can be mounted at a custom `basePath` next to unrelated host routes, with a host that manages scrolling itself, in light and dark, and with no horizontal overflow at 320 px.
- **REQ-009** A real Angular Movement checkout (outside this repository) renders three Markdown pages with its own interactive components using the packed tarball; compatibility requirements and a migration guide are documented.
- **REQ-010** The package is `@doqs/analog@0.3.0`; the tarball installs and works in an independent consumer; existing release infrastructure needs no change.
- **REQ-011** The official site describes the capability accurately with the real syntax, keeps SEO and accessibility, and presents the brand as Doqs.
- **REQ-012** The Cloudflare deployment failure is checked against the account and reported without guessing.

## Acceptance cases

- **AC-001** [REQ-001, REQ-002] `splitDoqInlineDemos` cuts only at top-level directive paragraphs, keeps order and repeated ids, and returns an untouched single segment when there is no directive.
- **AC-002** [REQ-002] Directives in code blocks, inline code, lists, quotes, tables and running text, invalid ids, and `:::demo[x]` stay literal.
- **AC-003** [REQ-001, REQ-003, REQ-004] A rendered document mounts components between its sections, keeps instances independent, shows a status notice for an unknown id, renders a frontmatter demo once when also inline, still appends an unused frontmatter demo and the document slot, and a document without directives has one Markdown region.
- **AC-004** [REQ-004] Navigating away destroys the component (`ngOnDestroy`), returning creates a fresh instance, and demo markup receives no copy button and is `data-pagefind-ignore`.
- **AC-005** [REQ-001, REQ-004, REQ-005] In production builds of both showcases the components appear at the right position, react to input, survive client navigation and reload without duplication, and the table of contents, duplicate heading ids and fragments work around them.
- **AC-006** [REQ-005, REQ-008] Keyboard operation of embedded controls, copy buttons only on Markdown code, no horizontal overflow at 320/390 px, no serious axe violation in the demo regions, reduced motion and light scheme.
- **AC-007** [REQ-006, REQ-007] Static HTML places demos between sections with no raw directive text; the Pagefind index contains text before and after a demo, no demo control text, and heading anchors with the same ids as the HTML.
- **AC-008** [REQ-005, REQ-007] Search finds text that follows a demo and opens its section; it finds none of the demo's control text.
- **AC-009** [REQ-008, REQ-009] In the Angular Movement checkout: host routes `/`, `/docs/introduction` and `/demos/enter` still work next to `/handbook`; custom-slug page; real `InstallCommand`, `ApiStabilityTable` and a `moveEnter` demo respond to input; directive in a fence stays literal; unknown id degrades; duplicate headings and TOC under active `SmoothScrollService`; search; theme tokens in light/dark; 320/390 px.
- **AC-010** [REQ-009] `docs/guides/angular-movement-migration.md` records the actual Angular/Analog versions, steps and limits, and states that Angular Movement was not migrated.
- **AC-011** [REQ-010] The tarball ships and types the new exports, no showcase or reference-consumer code, and is version 0.3.0; an independent consumer built from it passes the E2E suite; the package verifier passes.
- **AC-012** [REQ-010] Release planning code accepts 0.3.0 unchanged (existing release tests pass; no workflow file changed).
- **AC-013** [REQ-011] The landing page names Doqs 0.3 features, shows the `::demo[id]` Markdown and registration example, no longer claims components cannot be embedded, and keeps its prior structure and checks.
- **AC-014** [REQ-012] The Cloudflare check is recorded with its evidence and the required maintainer action; the site is reported as not deployed.
- **AC-015** [REQ-001, REQ-003] Existing 0.2 behavior (MVP/0.1/0.2 acceptance, demos, slots, search, navigation) still passes.

## Public API impact

Additive: exports `splitDoqInlineDemos`, `DOQ_INLINE_DEMO_PATTERN`, `DoqContentSegment`; new directive syntax `::demo[id]` in Markdown; documented DOM additions `.doq-content`, `.doq-inline-demo`, `data-doq-demo`. No config key, frontmatter key, route shape or `--host-docs-*` token changes. Peer ranges are unchanged.

## Compatibility

Angular `^21.2.2 || ^22.0.0` and `@analogjs/content ^2.9.0` as before; verified building and running on Angular 21 (workspace) and Angular 22, zoneless, TypeScript 6, Vite 8 (Angular Movement checkout). SSR/SSG: demos render on the server and hydrate. Requires `content: { highlighter }` in `analog()` (already required by 0.2). 0.2 configuration objects work unchanged.

# 0012 — interactive playgrounds

## Problem

Since 0.3 a consumer can place a standalone Angular component in Markdown with `::demo[id]`. To make that component _explorable_ (change its inputs, watch its outputs, resize it, copy usage code) the consumer must hand-build the same surrounding interface for every component: controls, state, reset, event list, code panel, clipboard, responsive frame, accessibility. Library authors (Angular Movement, Volt UI) repeat that work per component, and each copy has its own accessibility and SSR bugs.

Separately, the 0.8.0 release never reached npm: the _Release eligibility_ job of `release.yml` ran `scripts/verification/package.ts`, which imports `typescript`, on a checkout with no installed dependencies (`ERR_MODULE_NOT_FOUND`, run 39940547089 on main). `npm view @doqs/analog` still answers 0.7.0.

## Consumer impact

A consumer registers real components under `playgrounds`, describes the inputs worth changing (boolean, string, number, select) and the outputs worth watching, and writes `::playground[id]` in Markdown. Existing configurations, `::demo[id]`, frontmatter `demo`, routes, tokens and exports are unchanged. The stylesheet grows by about 0.9 KB gzip; documents without a playground load no extra component instance.

## Scope

- `::playground[id]` directive and a `playgrounds` registry in `DoqConfig`, validated by `defineDoqConfig`.
- `DoqPlaygroundComponent`: controls bound to inputs with Angular's `createComponent({ bindings })`, output inspector, reset, preview widths, expanded preview, code panel with copy.
- Helpers `formatDoqUsage`, `formatDoqEventPayload`, `validateDoqPlaygrounds`, `parseDoqDocument`.
- Fixtures: Showcase A (real Volt UI button), Showcase B (two independent SDK playgrounds), the official site (real Angular Movement), the Angular Movement adoption proof.
- Fix of the release-eligibility defect above; version 0.9.0; budgets, report, changelog and documentation.

## Non-goals

MDX, JSX, inline Angular templates, a browser compiler, Monaco/CodeMirror, importing source files into Markdown (0.10), inferring controls from `doq-api` metadata, object-graph controls, persistence or telemetry of playground state, publishing from the feature branch.

## Requirements

- **REQ-001** `::playground[id]` is recognised exactly like `::demo[id]` (a paragraph of its own, literal inside code, lists, quotes, tables and tab bodies), preserves surrounding Markdown, heading ids and TOC, and an unregistered id renders an accessible notice.
- **REQ-002** `DoqConfig.playgrounds` is an additive, typed registry; `defineDoqConfig` rejects an invalid registry with one readable error and accepts every existing configuration.
- **REQ-003** Controls update the real component through Angular's public input bindings, by public (alias) name, for signal inputs, required inputs, transforms and legacy `@Input`, without recreating the component.
- **REQ-004** Boolean, string, number (with min, max and step) and select controls exist; invalid, non-finite, out-of-range or missing values are rejected with accessible feedback and never bound.
- **REQ-005** Selected outputs (`output()`, `EventEmitter`, aliases, `model` changes) are shown in a bounded, per-instance list with safely formatted payloads; subscriptions end when the preview is destroyed.
- **REQ-006** Reset restores every control, clears the events and recreates the component; each instance owns its state.
- **REQ-007** Preview width presets (customisable, or hidden) resize the container without recreating the component, stay inside the viewport and are announced.
- **REQ-008** An expanded preview uses a native modal dialog, keeps the same component instance, closes with Escape and returns focus.
- **REQ-009** Code tabs show consumer-provided text or a formatter of the current values; what is shown is exactly what is copied; escaping is correct; copy failure is reported.
- **REQ-010** The shell is accessible by keyboard and assistive technology, honours reduced motion and forced colors, and follows host themes through `--host-docs-*` tokens.
- **REQ-011** The preview is prerendered with the real component at its initial state, hydrates in place, with stable per-instance ids and no console errors.
- **REQ-012** The playground chrome is excluded from Pagefind; surrounding Markdown stays indexed; archived and unversioned documents are unaffected.
- **REQ-013** The public API stays compatible with the 0.7 baseline; `parseDoqContent`, `DoqRichSegment` and `DoqDocsComponent.segments` keep their exact types.
- **REQ-014** The feature works for real consumers: Showcase A, Showcase B, the official documentation, the Angular Movement checkout and tarball-installed Angular 21 and 22 consumers.
- **REQ-015** No consumer-specific dependency, no private Angular API, no new runtime dependency; budgets are raised only with measured evidence.
- **REQ-016** The release workflow can verify the tarball CI built (dependencies installed before the structural check), and the package is prepared as 0.9.0.

## Acceptance cases

<!-- Format: - **AC-001** [REQ-001] observable behavior that proves the requirement. -->

- **AC-001** [REQ-001] Given a document with `::playground[a]` between headings, callouts and a `::demo[b]`, the segments keep their order, the TOC lists every heading, a directive in a fence, inline code, quote, list, table or tab stays literal and an unknown id shows a notice.
- **AC-002** [REQ-002] Duplicate controls, bad ids, select initial outside the options, an invalid range or a required control without an initial value are reported together; a registry-free config and a `demos` config are unchanged.
- **AC-003** [REQ-003] Changing each control changes the rendered signal, required, aliased, transformed and `@Input` fixtures, and the component instance is not recreated.
- **AC-004** [REQ-004] Typing `5000` into a 0–1000 number control, `abc` or an empty required field shows an error linked by `aria-describedby`, marks the field `aria-invalid` and keeps the last valid value bound.
- **AC-005** [REQ-005] Pressing the previewed button lists the event with its label and a bounded payload; circular, function, DOM and sensitive payloads are summarised; at most 20 events are kept; destroying the view runs the component's cleanup.
- **AC-006** [REQ-006] Reset returns controls to their initial values, empties the events, recreates a stateful component and announces it; two instances never share state.
- **AC-007** [REQ-007] Mobile and Tablet resize the frame to at most 320 and 768 px, the active preset is `aria-pressed` and announced, the page does not overflow at 320 px, and the component keeps its state.
- **AC-008** [REQ-008] Expand opens a modal dialog named after the playground holding the same component, Escape closes it, focus returns to Expand and the instance state survives.
- **AC-009** [REQ-009] The code panel reflects the current values with quotes, angle brackets and interpolation escaped, copy writes exactly the displayed text, and a missing clipboard shows "Copy unavailable".
- **AC-010** [REQ-010] Every control has an accessible name, axe finds no violation in light and dark themes, the controls are operable by keyboard alone, and contrast of secondary text is at least 4.5:1.
- **AC-011** [REQ-011] The static HTML of a page contains the real component at its initial state (including the selected option), unique stable ids, and the browser reports no console error or warning after hydration.
- **AC-012** [REQ-012] The indexed content of a page contains its prose and none of the playground chrome; an archived page and a plain page contain no playground markup.
- **AC-013** [REQ-013] `pnpm verify:public-api` passes against the 0.7 baseline and the committed report lists only additions; `parseDoqContent` never returns a playground segment.
- **AC-014** [REQ-014] The Volt UI button, the Forge request and retry playgrounds, the official Angular Movement playground and the adoption proof work in a production build; the Firefox and WebKit matrix passes.
- **AC-015** [REQ-015] The packed manifest depends only on `tslib`, ships no showcase or ecosystem code, and `pnpm perf:check` passes with every raised budget justified in `perf-budgets.json`.
- **AC-016** [REQ-016] The plan job installs dependencies before the structural check (a test fails without it), `release.yml` keeps pinned actions and no token, and the package version is 0.9.0.

## Public API impact

Additive. New exports: `DoqPlaygroundComponent` (its outlet directive is internal); `DOQ_DEFAULT_PREVIEW_SIZES`, `DOQ_PLAYGROUND_EVENT_LIMIT`, `DOQ_INLINE_PLAYGROUND_PATTERN`, `formatDoqUsage`, `formatDoqEventPayload`, `validateDoqPlaygrounds`, `parseDoqDocument`; types `DoqPlaygroundDefinition`, `DoqPlaygroundRegistry`, `DoqPlaygroundControl` (+ the four control kinds), `DoqSelectOption`, `DoqPlaygroundOutput`, `DoqPlaygroundCode`, `DoqPreviewSize`, `DoqControlValue`, `DoqPlaygroundValues`, `DoqDocumentSegment`, `DoqPlaygroundSegment`. New optional member `DoqConfig.playgrounds`; `DoqDocsComponent.parts`. New optional tokens `--host-docs-playground-surface` and `--host-docs-playground-preview`. `DoqRichSegment`, `parseDoqContent` and `DoqDocsComponent.segments` are unchanged on purpose.

## Compatibility

Angular `^21.2.2 || ^22.0.0` (the `bindings` option of `createComponent` is public since Angular 20), Analog `^2.9`, Node `^20.19 || ^22.12 || >=24`. Zoneless change detection and hydration with event replay are supported. A component that cannot render on the server must guard browser APIs like any SSR component; Doqs does not silently make previews client-only. Every 0.8 configuration builds and renders unchanged.

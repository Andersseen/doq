# Tasks — 0008 Angular API reference generation

- [x] T-001 [REQ-001, AC-010] `bin/doq-api.mjs`, `bin/api-reference.mjs` (+ `.d.mts`), `bin/api-reference/{typescript,errors}.mjs`; package `bin`, `exports["./api-reference"]`, optional `typescript` peer; `verify:package` and contract checks that no browser bundle or declaration carries compiler code.
- [x] T-002 [REQ-002, AC-001] `extract.mjs`: one program per run, `getExportsOfModule`, alias following, external/namespace/default skipping, `@internal`/`@ignore`, member visibility, dedup of several export names.
- [x] T-003 [REQ-003, AC-002] Angular decorators (resolved to `@angular/core`), selector/exportAs/pipe name/providedIn from literals and `const`s, warnings for computed metadata, lifecycle/DI/query members hidden.
- [x] T-004 [REQ-004, REQ-005, AC-003, AC-004] Signal `input`/`input.required`/`model`/`output`, accepted-versus-read types, transforms, aliases, defaults, change output; legacy `@Input`/`@Output`.
- [x] T-005 [REQ-006, REQ-007, AC-005, AC-006] Signatures, overloads, aliases, enums, constants, JSDoc tags, stability, deprecation, `{@link}`, prose neutralisation, type links and "Related types".
- [x] T-006 [REQ-008, REQ-009, AC-007] `render.mjs`: frontmatter, sections, tables, slugs and collisions, `--order-start`, determinism.
- [x] T-007 [REQ-010, AC-008] `output.mjs`: output validation, manifest, ownership plan, atomic writes, conflict handling.
- [x] T-008 [REQ-011, REQ-012, AC-009] `check` mode, exit codes, strict mode, configuration diagnostics, CLI tests through the real binary.
- [x] T-009 [REQ-013, REQ-015, AC-011, AC-012] Showcase A fixture `vanta-ui`, committed pages, guide link, E2E-080..089, COMP-100..107 (incl. the keyboard-focusable scrolling table fix found by the Angular Movement proof).
- [x] T-010 [REQ-014, REQ-015, AC-011, AC-013] Showcase B fixture `forge-sdk` at the root mount, committed pages, E2E-090..093.
- [x] T-011 [REQ-015, AC-011] Contract tests CONTRACT-060..066 (tarball, generated Markdown, packed-CLI determinism, prerendered routes, Pagefind fragments, black-box exit codes).
- [x] T-012 [REQ-016, AC-014] Adoption: generate from the real Angular Movement entry with its TypeScript 6, stale probe, heading-id race guard, E2E-100..103 comparing pages with source declarations.
- [x] T-013 [REQ-017, AC-015] `consumer.ts` runs the installed binary (check, stale, generate) before building both packed consumers; E2E-094.
- [x] T-014 [REQ-018, AC-016] Version 0.5.0, changelog, `PUBLISH_VISIBILITY` window and `UNIT-100`, operations notes on 0.4.0.
- [x] T-015 [REQ-019, AC-017] README, package README, AGENTS/CONTRIBUTING, CI step, official site copy and tests.
- [x] T-016 [REQ-020, AC-018] Timings, sizes and TypeScript 5.9/6.0 comparison recorded in `verification.md`.

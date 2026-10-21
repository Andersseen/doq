# 0001 — Open-source, SDD and testing foundation

## Problem

Doq 0.1.0 shipped without a license, community files, a repeatable agent setup, a specification workflow or day-to-day automated tests. Its only regression net was a single CDP acceptance harness. Future minors need a contract that humans and coding agents share and tests that fail when the public contract breaks.

## Consumer impact

No runtime change. Consumers gain a license (MIT) and license metadata in the npm artifact. Contributors gain governance files, a spec workflow and layered tests.

## Scope

Community and governance files; pinned Agentyx configuration for Codex, Claude Code and Kimi Code with a project-owned SDD skill; SDD scaffolding and validation commands; Vitest, Angular Testing Library, Playwright and pytest suites; negative controls; updated CI; one-command gates.

## Non-goals

No Doq 0.2 features, no version bump, no npm publication, no change to the Agentyx repository, no replacement of the CDP harness, no new CI system.

## Requirements

- **REQ-001** The repository and the npm artifact carry an MIT license with consistent metadata.
- **REQ-002** Community files, issue forms, a PR template and dependency automation exist, contain no invented contacts or channels, and route vulnerability reports away from public issues.
- **REQ-003** Agentyx is pinned exactly, locked, and generates configuration for Codex, Claude Code and Kimi Code, including the project-owned SDD skill and credential-free, version-pinned MCP definitions.
- **REQ-004** One canonical set of agent instructions exists and names the mandatory verification commands.
- **REQ-005** SDD commands scaffold specs without overwriting and reject malformed, incomplete or untraceable specs.
- **REQ-006** Domain logic (paths, slugs, ordering, configuration) is unit tested including negative cases.
- **REQ-007** Rendered component behavior (index, documents, navigation, shell, slots, drawer, TOC, demos) is tested through user-facing queries.
- **REQ-008** Core user journeys are tested in a real browser against production builds, including a tarball-installed consumer.
- **REQ-009** The packed artifact and the generated static HTTP output are validated independently of the TypeScript toolchain.
- **REQ-010** The tests demonstrably detect real contract breaks.
- **REQ-011** The existing MVP and 0.1 acceptance verification keeps passing.
- **REQ-012** One local command and CI run the mandatory gates.

## Acceptance cases

- **AC-001** [REQ-001] The tarball contains a LICENSE identical to the repository's and a manifest declaring MIT.
- **AC-002** [REQ-002] LICENSE-adjacent community files, templates and workflows exist; no email address or chat channel is invented; SECURITY.md forbids public vulnerability reports.
- **AC-003** [REQ-003] `@agentyx/cli` is an exact version; targets are codex, claude, kimi; generated files exist and MCP definitions are pinned and secret-free.
- **AC-004** [REQ-003] The locked state passes `agentyx doctor --locked --check` and a frozen install reproduces the committed files.
- **AC-005** [REQ-004] CLAUDE.md only imports AGENTS.md, and AGENTS.md names every mandatory command that exists as a script.
- **AC-006** [REQ-005] Naming rules, traceability rules and unfinished-content rules reject invalid specs and accept a complete one.
- **AC-007** [REQ-005] `sdd:new` creates the four files, refuses existing ids and invalid names, and `sdd:check` rejects the fresh template.
- **AC-008** [REQ-006] Path normalization, prerender routes, document normalization, ordering and config defaults behave as specified, with explicit rejection of empty, invalid, duplicate and traversal inputs.
- **AC-009** [REQ-007] Index, document, navigation, shell, slot, TOC, demo, drawer and presentation behavior is observable through roles, labels and text.
- **AC-010** [REQ-008] Opening documents, nested and custom slugs, the mobile drawer, the TOC, code copy, demos, theme isolation and responsive layouts work in a real browser without console errors.
- **AC-011** [REQ-008] The tarball-installed consumer builds, hydrates and serves documentation with consumer-owned composition.
- **AC-012** [REQ-008] Keyboard operation, accessible names and an automated axe scan show no serious violations in Doq markup.
- **AC-013** [REQ-009] The tarball ships only distributable files, resolvable exports, declarations, styles and license, with no private references.
- **AC-014** [REQ-009] Generated static output serves every document at its public route, 404s unknown and source-filename routes, and contains traversal attempts.
- **AC-015** [REQ-010] Representative disposable mutations make the unit, component and contract suites fail.
- **AC-016** [REQ-011] `pnpm verify:mvp` with the tarball consumer reports no failures and `pnpm verify:package` passes.
- **AC-017** [REQ-012] `pnpm quality:gate` runs every mandatory layer; CI defines the same gates with read-only permissions.

## Public API impact

None. Package metadata gains `license`, `author`, `repository`, `bugs`, `homepage`, `keywords` and ships a `LICENSE` file.

## Compatibility

Runtime behavior, Angular 21.2 / Analog 2.9 support, SSR/SSG output and existing configuration are unchanged. Tooling needs Node 22.22.3+; contract tests need Python 3.11+.

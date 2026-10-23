# 0011 — Integration DX and 1.0 API stabilization (Doqs 0.8.0)

## Problem

Doqs 0.7 is functionally complete but hard to adopt and hard to diagnose, and its public surface is not guarded:

1. **Integration is four hand-made edits** (paths module, `vite.config.ts`, Angular providers, stylesheet) plus an easily forgotten fifth (`doqDeterministicMarkdown()`, whose absence only shows up as wrong heading ids after a build). Nothing tells a new consumer which of them is missing.
2. **No consumer diagnostics.** Wrong peer versions, duplicate slugs, a missing highlighter or a missing Pagefind step surface as build errors or silent misbehaviour.
3. **The official site is a landing page**, not a Doqs consumer, and `packages/doq/README.md` still opened with "Version 0.3.0" and carried snippets that omit `provideContent()` and the highlighter.
4. **The public API is unguarded.** The 0.7 declarations expose pilot leftovers (`DoqButtonDemoComponent`) and helper internals, and nothing fails when a signature changes while the export stays present.

## Consumer impact

Additive. No exported type, function, config key, frontmatter key, route or `--host-docs-*` token changes. New binary `doq` (`init`, `doctor`); all three binaries refuse unsupported Node versions with exit code 2. One CSS rule moves: the "On this page" index is anchored beside the content column (it overflowed the viewport on wide screens). Package version `0.8.0`.

## Scope

- **A. Onboarding.** `doq init` (embedded and docs-first; custom content directory and base path; dry run; JSON; non-destructive; idempotent; reports scaffold and integration separately; prints exact snippets, never edits host configuration).
- **B. Diagnostics.** `doq doctor` (PASS/WARN/FAIL/UNKNOWN with check, found, why, fix, path; `--build`, `--strict`, `--json`; static analysis only).
- **C. Official documentation.** `apps/site` renders 18 Doqs-powered pages at `/docs` as a lazy region with Pagefind, `doqDeterministicMarkdown()`, a consumer-owned demo, per-route canonical metadata and host-owned theming; the landing is preserved.
- **D. API and package.** Public API audit, an automated report-and-baseline check on the packed package, declaration validity, README and changelog corrections, `docs/roadmap/1.0-readiness.md`.

## Non-goals

No new Markdown syntax, framework, search engine, CMS, localization or CLI framework; no project generation; no automatic edits of `vite.config.ts` or `app.config.ts`; no Angular Movement migration; no new deployment or release pipeline; no publication of 0.8.0 from the branch and no 1.0.

## Requirements

- **REQ-001** `doq` is a Node-only, dependency-free binary shipped in `@doqs/analog`; every Node-only binary exits 2 with one message on an unsupported Node.js.
- **REQ-002** `doq init` creates `src/doq.paths.ts` and two valid Markdown pages for embedded (`/docs`) and docs-first (`/`) modes, honouring `--content-dir` and `--base-path`, deterministically.
- **REQ-003** `doq init` never overwrites, writes nothing on `--dry-run` or on a conflict, rejects traversal and symlink escapes, and is idempotent.
- **REQ-004** `doq init` reports scaffold and integration separately and lists, with snippets, every required step it cannot find; it recommends the deterministic plugin.
- **REQ-005** `doq doctor` diagnoses environment, peers, paths, content, slugs, versions, wiring, search and (with `--build`) static output, never reports a guessed PASS, never demands Pagefind while search is off, and exits 1 only on FAIL (or with `--strict` on WARN/UNKNOWN).
- **REQ-006** `--json` output is exactly one document on stdout; usage errors go to stderr with exit code 2.
- **REQ-007** The official site documents Doqs with Doqs at `/docs` (statically prerendered, searchable, accessible, themed by the host) without enlarging the landing's first-loaded JavaScript beyond a stated budget.
- **REQ-008** The packed package's public API is compared with a committed report and the 0.7.0 baseline; removals and incompatible changes fail.
- **REQ-009** Newly initialized consumers (Angular 21 embedded, Angular 21 docs-first, Angular 22) and existing 0.7-style consumers build and work from the tarball; the Angular Movement proof exercises doctor and init.
- **REQ-010** User-facing documents are accurate (no stale version, broken anchor or invalid snippet) and the 1.0 readiness document records contracts, evidence and blockers.

## Acceptance cases

- **AC-001** [REQ-001] The unpacked tarball runs `doq --version/--help` with no node_modules; the CLI imports only Node and itself; Node 20.18, 22.11 and 23 are refused.
- **AC-002** [REQ-002] `init` in a project creates the paths file and two pages with the documented frontmatter, in both modes, with custom values, identically on two runs.
- **AC-003** [REQ-003] Dry run leaves the tree unchanged; a differing paths file blocks all writes (exit 1); `../x`, absolute and symlinked targets are rejected; a rerun reports unchanged and edited pages are kept.
- **AC-004** [REQ-004] A bare project reports "Scaffold complete" and "Integration incomplete" with snippets; a connected project reports "Integration complete"; commented-out configuration does not count.
- **AC-005** [REQ-005] Negative controls: wrong or missing Angular, duplicate and invalid slugs, bad frontmatter, missing prerender, deterministic plugin, stylesheet, providers, computed paths (UNKNOWN), overlapping archives and missing build output are detected; Pagefind is demanded only with search enabled.
- **AC-006** [REQ-006] `doctor --json` prints one JSON document with empty stderr and exit 1 on failures; invalid options print JSON to stderr with exit 2.
- **AC-007** [REQ-007] Every Markdown file is a prerendered page with one h1, its title, indexed article text and metadata; Pagefind finds a body-only phrase and opens its canonical URL; sidebar, TOC, demo, theme, mobile, keyboard and direct refresh work; the landing loads none of the documentation UI.
- **AC-008** [REQ-008] The check passes on the packed 0.8.0 and fails for a removed export, retyped member, changed signature, new required member and removed binary.
- **AC-009** [REQ-009] The three initialized consumers pass doctor before (real FAILs with fixes) and after, and build; the legacy and showcase consumers still pass their suites; the Angular Movement proof passes.
- **AC-010** [REQ-010] No stale README claim or broken anchor remains; `1.0-readiness.md` lists the exports, blockers and evidence.

## Public API impact

Additive: new binary `doq`; no change to `public-api.report.json` besides what 0.7.0 already exported (verified against the baseline). Audit findings (leaked exports, landmark inconsistency, eager-import cost) are recorded in `docs/roadmap/1.0-readiness.md`, none removed.

## Compatibility

Angular `^21.2.2 || ^22.0.0` unchanged (no widening), Node `^20.19.0 || ^22.12.0 || >=24.0.0`, Analog 2.9. Existing 0.7 configurations must build unchanged (`consumer:build`, legacy consumers).

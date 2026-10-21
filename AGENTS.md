# AGENTS.md — Doq

Shared instructions for coding agents (Codex, Claude Code, Kimi Code) and humans. `CLAUDE.md` only points here. Showcase directories keep their own, more specific `AGENTS.md`.

## What this repository is

`@doqs/analog` (`packages/doq`) is an Angular 21 / Analog.js library that adds Markdown documentation to an existing host app. Two independent showcase hosts (`apps/showcase-a`, `apps/showcase-b`) consume it; `apps/site` is the official static website. Publishing (npm Trusted Publishing, `release.yml`) and Cloudflare Pages deployment (`deploy-site.yml`) are described in `docs/operations/release-and-deployment.md`; never add npm tokens, never publish or deploy by hand without the maintainer's authorization. `scripts/` holds Node-run TypeScript tooling (preview server, CDP verification harness, SDD commands). `e2e/` (Playwright), `packages/doq/test/` (Vitest) and `tests/contract/` (pytest) hold the tests.

## Rules that matter

- **Public contract first.** Exports of `packages/doq/src/public-api.ts`, the config object, frontmatter keys, route shapes and `--host-docs-*` CSS tokens are public. Do not break them without an explicit, documented decision. Update `packages/doq/README.md` and `packages/doq/CHANGELOG.md` for any public change.
- **Consumer independence.** The library must not import showcase code; showcases share only the package. The packed tarball must work in a project outside this workspace (`pnpm consumer:build`).
- **Angular / Analog.** Standalone components, signals, `OnPush`, no NgModules. Content comes from Analog's `injectContentFiles`; routes through `doqRoutes()`. `defineDoqConfig()`/`doqPrerenderRoutes()` stay build-safe (no Angular components in `doq.paths.ts`).
- **Search.** Optional and static (Pagefind). `pagefind` stays an optional peer dependency; the Node-only indexer lives in `packages/doq/bin` (`doq-search`, `@doqs/analog/search-index`) and must never be imported by the browser entry. Each app indexes its own prerendered output after `vite build`; keep `data-pagefind-body`/`data-pagefind-ignore` on Doq markup in step with what should be searchable.
- **SSR/SSG.** Every user-visible page must render correctly prerendered and after hydration, with no console errors or warnings. Do not touch `window`/`document` outside browser-guarded code.
- **Accessibility.** Native elements first, accessible names on landmarks and controls, keyboard operation, visible focus, one `<h1>` per page.
- **Node scripts** run `.ts` directly (erasable syntax only: no `enum`, parameter properties, `namespace`).
- Never commit secrets, `.venv`, test output, or Agentyx runtime state. Never run installers that write under `$HOME`.

## Spec-driven development (required for meaningful changes)

1. `git fetch origin`; branch from `origin/main`.
2. `pnpm sdd:new <four-digit-id> <slug>` → fill `docs/specs/<id>-<slug>/` (requirements `REQ-nnn`, acceptance `AC-nnn`, tasks, verification). Small fixes may use an abbreviated spec in the PR description, but a bug fix still needs a regression test that fails without the fix.
3. Pick test layers per acceptance case (below), implement, run the tests, fix real failures.
4. Record real commands and results in `verification.md`; `pnpm sdd:check` must pass.
5. Open one cohesive PR using the template. The project skill `doq-sdd-development` (`.agentyx/skills/`) describes the same flow.

## Tests: which layer proves what

| Layer                   | Command                | Use it for                                                                                        |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| Vitest unit             | `pnpm test:unit`       | Pure logic: paths, slugs, ordering, config defaults, SDD checker                                  |
| Angular Testing Library | `pnpm test:components` | Rendered component behavior by role/label/text: index, docs, nav tree, shell, slots, drawer       |
| Playwright E2E          | `pnpm test:e2e`        | Real-browser journeys on production builds: routing, mobile drawer, TOC, copy, demos, theme, a11y |
| pytest contract         | `pnpm test:contract`   | The packed tarball and generated static HTTP output, checked from outside                         |
| CDP harness (legacy)    | `pnpm verify:mvp`      | The 24-criterion MVP + 0.1 acceptance run; keep passing, do not duplicate it                      |

Test observable contracts, not private methods. No large HTML snapshots. Mock only external boundaries (the Analog content glob in component tests).

## Verify before opening a PR

- Iterating: `pnpm verify:change` (format, types, SDD, Agentyx lock, unit, components, builds, package, contract).
- Before the PR is ready: `pnpm quality:gate` (adds the tarball consumer, Playwright E2E and the CDP harness). Report real results; mark anything not run as NOT RUN.
- Playwright needs a browser: see `CONTRIBUTING.md` (`PW_CHANNEL=chrome` uses installed Chrome).

## Agent tooling

Configured by Agentyx 0.20.0 (`.agentyx.json`, `.agentyx.lock.json`): skills under `.agents/skills` (Codex, Kimi) and `.claude/skills` (Claude Code); MCP servers `context7` (current Angular/Analog docs) and `playwright` (browser inspection) in `.codex/config.toml`, `.mcp.json`, `.kimi-code/mcp.json`. Configuration present does not mean a provider has activated it. Change it with `pnpm exec agentyx configure …` + `pnpm exec agentyx sync`, then `pnpm agentyx:check`; never edit generated provider files by hand.

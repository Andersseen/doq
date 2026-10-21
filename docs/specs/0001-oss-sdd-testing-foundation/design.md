# Design — 0001 open-source, SDD and testing foundation

## Existing implementation

A single CI workflow built, packed and ran a subset of the CDP harness. `scripts/verification` holds the harness and package verifier. No tests ran against library sources, no license existed, and agent guidance lived only inside the showcases.

## Proposed implementation

- **Governance:** MIT `LICENSE` (copied into `packages/doq` so ng-packagr ships it), CODE_OF_CONDUCT (Contributor Covenant 2.1), SECURITY, SUPPORT, issue forms, PR template, Dependabot (npm, Actions, pip; no automatic majors). No CODEOWNERS/FUNDING: a single maintainer and no funding destination would make them noise.
- **Agentyx 0.20.0**, exact, local. Packs: technical, typescript, angular, testing, accessibility, documentation, agentic, git, efficiency, and local pack `doq-workflow`. Excluded skills `api-design`, `subagent-driven-development`, `parallel-work`; excluded the efficiency pack's four session-observer hooks (they write Codex hooks that need trust and Kimi cannot receive them). MCP: `context7` (angular pack default) and `playwright` (enabled explicitly, version pinned by Agentyx). Not enabled: GitHub MCP (per-provider auth), Chrome DevTools MCP (duplicate browser tool), codebase-memory (needs a local executable). Provider files are only produced by `agentyx sync`.
- **SDD:** `scripts/sdd` (pure `lib.ts` + `new.ts` + `check.ts` + templates). Traceability is Markdown ids; the checker also requires non-manual case ids to appear in test sources, never that tests pass.
- **Tests:** Vitest root config for pure TypeScript (library domain + scripts); `packages/doq` component config compiles sources ahead-of-time through `@analogjs/vite-plugin-angular` (its JIT transform does not register signal inputs) and mocks only Analog's build-time content glob. Playwright (`e2e/`) serves production builds with the existing static preview on ports 4273–4275. pytest (stdlib HTTP, pinned pytest only) checks the tarball and the HTTP output of the same preview server.
- **Gates:** `scripts/verify.ts` runs ordered steps; `verify:change` is fast, `quality:gate` adds consumer, E2E, CDP harness. `scripts/consumer.ts` builds an out-of-workspace consumer from the tarball (a copy of Showcase B). `scripts/negative-controls.ts` runs disposable mutations.
- **CI:** one workflow with jobs static, unit, build (artifact producer), contract, e2e, acceptance; permissions `contents: read`.

## Tradeoffs and alternatives

- `@angular/build:unit-test` was rejected: it needs an Angular workspace for a library built by ng-packagr and constrains mocking of the content glob.
- JIT component compilation was rejected: signal inputs were not registered, so tests would not match published behavior.
- Replacing the CDP harness was rejected; its 24 criteria stay as regression infrastructure and Playwright covers faster, readable journeys.
- Python tests use stdlib HTTP and the repository preview server instead of `requests`/`pytest-httpserver`.
- A real finding is recorded instead of fixed: TOC links update the URL fragment but nothing scrolls to the heading (no router `anchorScrolling`). Fixing it would be a product change outside this milestone; a `test.fail` case documents it.

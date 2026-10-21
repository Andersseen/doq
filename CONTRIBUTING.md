# Contributing

## Setup

Node 22.22.3 or newer (`.nvmrc` pins the version used in CI) and pnpm 10 (`corepack enable` picks the version from `package.json`).

```sh
pnpm install
pnpm build
```

## Layout

- `packages/doq` — the `@getdoq/analog` library.
- `apps/showcase-a`, `apps/showcase-b` — two independent host applications that consume the library through the workspace.
- `scripts` — TypeScript tooling (preview server and verification harness). Node runs the `.ts` files directly, so there is no build step; keep to erasable syntax (no `enum`, parameter properties or `namespace`), which `tsconfig.json` enforces.

## Before opening a pull request

```sh
pnpm format:check          # Prettier for scripts, docs and config (`pnpm format` fixes)
pnpm typecheck:scripts
pnpm build
pnpm pack:doq && pnpm verify:package artifacts/getdoq-analog-0.1.0.tgz
pnpm verify:mvp --check=m15,m16,m17,m24,dynamic,v01
```

The full acceptance run, including the tarball-installed external consumer, is described in [scripts/verification/README.md](scripts/verification/README.md). Changes to the public API need a README and `packages/doq/CHANGELOG.md` update, and behavior changes need executable coverage in the harness.

Library and showcase sources are not yet covered by Prettier; keep the style of the surrounding code and do not reformat unrelated lines.

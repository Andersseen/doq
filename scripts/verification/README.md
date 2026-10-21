# MVP verification harness

Run the production browser checks after building the package and showcases:

```sh
pnpm install
pnpm build
pnpm verify:mvp
```

The command starts temporary static preview servers for both showcase builds, launches an isolated headless Chrome profile with an ephemeral DevTools port, and runs a duplicate-route API fixture made from two temporary Markdown files. For M16, it briefly writes two unusual-heading Markdown fixtures into Showcase A, rebuilds that showcase, checks them in Chrome, removes the files, and rebuilds Showcase A cleanly even if a browser assertion fails. It then removes the browser profile and preview processes. It uses Node's built-in WebSocket client and adds no test-framework dependency. Chrome is discovered in standard macOS/Linux locations; set `CHROME_BIN` to select another executable.

The browser matrix uses exact CSS viewports of 375×812, 768×1024, 1280×800, 1440×900, and 1920×1080. Screenshots are written to the OS temporary directory under `doq-mvp-evidence`; set `MVP_ARTIFACT_DIR` to choose another local evidence directory. The harness verifies measured viewport dimensions before each check.

To run one showcase or one focused suite:

```sh
pnpm verify:mvp --app=a --check=m15
pnpm verify:mvp --app=b --check=m24
```

`--app` accepts `a`, `b`, or `both`; `--check` accepts `m15`, `m16`, `m17`, `m23`, `m24`, `dynamic`, or `v01`. With no selection, both showcases and all checks run. The M9 assertion exercises the actual `normalizeDoqDocument` and `sortDoqDocuments` source after TypeScript transpilation and covers route collision diagnostics, invalid slugs, ordinary slugs, and nested custom slugs.

To add external-consumer production diagnostics, build the separate consumer first and pass its `dist/analog/public` directory:

```sh
MVP_CONSUMER_ROOT=/path/to/consumer/dist/analog/public pnpm verify:mvp
```

If the directory is omitted, M23 reports the external consumer scenario as failed rather than silently treating it as verified. A missing browser or production output also returns a nonzero exit code. Browser execution needs permission to bind local preview ports 4173–4175 and Chrome's loopback DevTools port.

If the run fails with `Timed out waiting for Chrome DevToolsActivePort`, Chrome did not finish starting. On macOS, check that the pasteboard service answers: `pbpaste > /dev/null` must return promptly. A hung user-session `com.apple.pboard` blocks Chrome during AppKit initialization before it writes the DevTools port. `launchctl kickstart -k gui/$(id -u)/com.apple.pboard` restarts that service, but macOS with System Integrity Protection may refuse it; terminating your own `pboard` process (`kill $(pgrep -u $(id -u) pboard)`) makes launchd respawn it. Either way the current clipboard contents can be cleared. Treat this as an environment failure, not a product result.

## Doq 0.1 additions

`v01` (run per showcase and, when `MVP_CONSUMER_ROOT` is set, against the external consumer) checks at desktop and 375px: direct-load document title with the configured suffix and exactly one `<h1>`; the document slot renders once after the Markdown; the index shows the configured title/description, renders its slot before the cards and keeps the cards; client navigation (index card → sidebar link → overview → host route) keeps `document.title` and the meta description correct, never stale; a document without a description falls back to the host description; leaving the docs restores the host title and description (after both client-side and hydrated direct loads); an unknown docs route gets the not-found title. For the consumer, pass its expectations as JSON in `MVP_CONSUMER_V01` (when unset, Showcase B's expectations are used, which matches the consumer produced by `pnpm consumer:build`) (`hostTitle`, `hostDescription`, `suffix`, `indexTitle`, `indexSlot`, `docSlot`, optional `noDescriptionPath`).

`pnpm verify:package <tarball> [consumer-dir]` inspects the packed manifest, exports and type declarations, and — given an installed consumer — its lockfile (no `workspace:` links), the installed version, and the runtime behavior of `defineDoqConfig()`, `doqPrerenderRoutes()` and `doqRoutes()`.

## Structure

The harness is TypeScript, run directly by Node 22 (`node scripts/verification/mvp.ts`) and type-checked with `pnpm typecheck:scripts`.

- `mvp.ts` — entry point: selects apps and checks, starts previews and Chrome, runs checks, reports, cleans up.
- `checks/` — one module per check (`mobile-navigation`, `responsive`, `dynamic-resize`, `toc`, `clipboard`, `diagnostics`, `v01`), each taking a `Page` and the app under test.
- `lib/` — `cdp.ts` (DevTools Protocol client), `page.ts` (viewport, navigation, click, key, wait helpers), `chrome.ts`, `servers.ts`, `fixtures.ts` (temporary TOC fixtures), `config.ts` (apps, viewports, CLI/env selection), `report.ts`.
- `duplicate-routes.ts` (M9) imports Doq's real `doq-document.ts` source; `package.ts` checks the packed tarball.

## Relationship to the other test layers

This harness remains the 24-criterion MVP and 0.1 acceptance run. Vitest (`pnpm test:unit`, `pnpm test:components`), Playwright (`pnpm test:e2e`) and pytest (`pnpm test:contract`) cover day-to-day regression with faster, more readable tests; see [CONTRIBUTING.md](../../CONTRIBUTING.md#tests-what-each-layer-is-for). `pnpm consumer:build` creates the tarball-installed consumer used by both this harness (`MVP_CONSUMER_ROOT`) and the Playwright suite.

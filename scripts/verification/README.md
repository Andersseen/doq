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

`v01` (run per showcase and, when `MVP_CONSUMER_ROOT` is set, against the external consumer) checks at desktop and 375px: direct-load document title with the configured suffix and exactly one `<h1>`; the document slot renders once after the Markdown; the index shows the configured title/description, renders its slot before the cards and keeps the cards; client navigation (index card → sidebar link → overview → host route) keeps `document.title` and the meta description correct, never stale; a document without a description falls back to the host description; leaving the docs restores the host title and description (after both client-side and hydrated direct loads); an unknown docs route gets the not-found title. For the consumer, pass its expectations as JSON in `MVP_CONSUMER_V01` (`hostTitle`, `hostDescription`, `suffix`, `indexTitle`, `indexSlot`, `docSlot`, optional `noDescriptionPath`).

`pnpm verify:package <tarball> [consumer-dir]` inspects the packed manifest, exports and type declarations, and — given an installed consumer — its lockfile (no `workspace:` links), the installed version, and the runtime behavior of `defineDoqConfig()`, `doqPrerenderRoutes()` and `doqRoutes()`.

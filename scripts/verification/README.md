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

`--app` accepts `a`, `b`, or `both`; `--check` accepts `m15`, `m16`, `m17`, `m23`, `m24`, or `dynamic`. With no selection, both showcases and all checks run. The M9 assertion exercises the actual `normalizeDoqDocument` and `sortDoqDocuments` source after TypeScript transpilation and covers route collision diagnostics, invalid slugs, ordinary slugs, and nested custom slugs.

To add external-consumer production diagnostics, build the separate consumer first and pass its `dist/analog/public` directory:

```sh
MVP_CONSUMER_ROOT=/path/to/consumer/dist/analog/public pnpm verify:mvp
```

If the directory is omitted, M23 reports the external consumer scenario as failed rather than silently treating it as verified. A missing browser or production output also returns a nonzero exit code. Browser execution needs permission to bind local preview ports 4173–4175 and Chrome's loopback DevTools port.

If the run fails with `Timed out waiting for Chrome DevToolsActivePort`, Chrome did not finish starting. On macOS, check that the pasteboard service answers: `pbpaste > /dev/null` must return promptly. A hung user-session `com.apple.pboard` blocks Chrome during AppKit initialization before it writes the DevTools port. `launchctl kickstart -k gui/$(id -u)/com.apple.pboard` restarts that service, but it can clear the current clipboard contents. Treat this as an environment failure, not a product result.

# Design — 0003 npm release and website

## Existing implementation

`ci.yml` builds, packs and verifies the tarball (`pnpm pack:doq`, `verify:package`) and uploads artifacts. Showcase apps show the Analog app shape. `scripts/` already holds Node-run TypeScript tooling, Vitest unit tests, a Playwright suite and a pytest contract suite, all reused here.

## Proposed implementation

**Release.** `scripts/release/lib.ts` holds pure decisions (`planRelease`, `publishPrerequisites`, `checkPublished`, registry parsing) tested with mocked responses; `cli.ts` binds them to files, env and step outputs. `release.yml` is a separate workflow started by `workflow_run` of CI on main (permissions `{}` at top level, concurrency without cancellation) with three jobs: `plan` (read-only; structural tarball check, decision), `publish` (environment `npm-publish`, the only `id-token: write`, no dependency installation, SHA-256 check, `npm publish <tarball> --access public --provenance` with an npm ≥ 11.5.1 installed at a pinned version), and `github-release` (only `contents: write` job; verifies npm serves the identical artifact with provenance, then tags the validated commit and creates the Release from the changelog section). CI now uploads the verified tarball as artifact `package-tarball`; the release downloads it by run id, so there is no second build. The bootstrap publication is manual because Trusted Publishing needs an existing package; until then the plan is `skip`.

**Site.** `apps/site` is an Analog app (`ssr: true, static: true`, prerender `/`) without Tailwind or UI libraries: standalone OnPush components, signals for the menu and copy state, plain CSS with light/dark via `prefers-color-scheme`, system fonts. A small Vite plugin injects origin-dependent head tags and emits `robots.txt` and (with an origin) `sitemap.xml`; the origin comes only from `DOQ_SITE_ORIGIN`. Output: `apps/site/dist/analog/public`. Browser APIs are used only inside the click handler.

**Deploy.** `deploy-site.yml` downloads CI's `site-dist` artifact for the exact run and uploads it with the pinned Wrangler using `apps/site/wrangler.jsonc` (project name in one place). Production is branch `main`; previews use the PR branch and run default-branch scripts, rejecting worker/routing files in the artifact. Missing credentials produce an explicit "NOT DEPLOYED" summary instead of a false success.

## Tradeoffs and alternatives

- A release job inside `ci.yml` would put publishing config next to PR-triggered jobs; a separate `workflow_run` workflow isolates permissions and guarantees tests ran first. Cost: the npm trusted publisher must name `release.yml`, and artifacts expire (14 days) — a release re-run later needs a fresh CI run.
- Rebuilding in the release job was rejected: it could produce a different artifact than the one verified.
- Auto-creating the GitHub Release for a manually bootstrapped version was rejected unless the registry integrity matches CI's tarball; otherwise the tag could point at the wrong commit.
- Git-integrated Cloudflare builds were rejected to keep a single deployer and keep credentials out of Cloudflare's build environment.
- Tailwind, a docs framework or theme toggles were left out to keep the landing light.

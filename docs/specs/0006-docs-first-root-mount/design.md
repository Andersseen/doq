# Design — 0006 docs-first root mount

## Existing implementation

`doqRoutes` already works with an empty base segment list (`indexMatcher` matches zero segments, `documentMatcher` any non-empty path). Three places blocked or broke the root: `normalizeDoqPaths` threw on no segments, and `normalizeDoqDocument`/`doqPrerenderRoute` built `${prefix}/${slug}` (giving `//slug`), and `normalizeSearchResultUrl` required a non-root prefix.

## Proposed implementation

- `joinDoqPath(basePath, slug)` in `doq-document.ts` is the only URL builder (`/docs` + `a` → `/docs/a`, `/` + `a` → `/a`); `normalizeDoqPaths` accepts an explicit all-slash value as the root; `normalizeSearchResultUrl` treats `/` as "everything below the root".
- Showcase B: `basePath: '/'`, `pages/` removed (no file route may shadow or compete with the matchers), `DoqShellComponent` with `docsPath="/"`, theme toggle in `doq-header-extra`, footer in `doq-footer`; `prerender.routes` no longer adds `'/'` separately (`doqPrerenderRoutes` already returns it). The marketing landing and utility bar are removed with their CSS.
- Tests: contract helpers take a per-app base (`BASE_PATH`); the host-text leak check runs only where a landing exists; the CDP harness gets `docsBase` and `hostRoute` expectations and skips "return to the host route" for the docs-first app.

## Tradeoffs and alternatives

- A third showcase would keep every existing test untouched but would not reduce the maintenance of two scenarios into the two the maintainer asked for; converting Showcase B also makes the tarball consumer a root-mount consumer for free.
- Treating `''` as the root was rejected: an empty `basePath` is far more likely to be a mistake, and `'/'` states the intent.
- A catch-all root matcher shadows other routes by design; documenting it is cheaper than a precedence mechanism that no consumer has asked for.

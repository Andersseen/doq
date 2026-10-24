# Design — 0014 real world adoption readiness

## Existing implementation

`doq-docs.component.ts` rendered `div.doq-root > article`, `doq-index.component.ts` rendered `main`, `doq-shell.component.ts` wrapped
content in `main`. `doq-routes.ts` returned catch-all matchers per version. `packages/doq/src/lib` held configuration and UI in one
ng-packagr entry. `scripts/adoption.ts` proves a separate `/handbook` region on Angular Movement.

## Proposed implementation

- **Landmarks.** `DoqConfig.landmark` (`'document'` default, `'host'`). Docs and index views render `main.doq-root`/`main.doq-index`
  or a `div` through a shared `ng-template`, so server HTML and hydrated DOM match without touching the DOM. The shell injects the
  optional `DOQ_CONFIG`: with a Doqs configuration in `'document'` mode it renders a `div`, otherwise a `main`; an input
  `mainLandmark` overrides it for route-scoped `provideDoq`. The not-found view uses the same switch and no longer replaces the
  `main` role with `role="status"`.
- **Entry point.** `packages/doq/config` is an ng-packagr secondary entry holding `doq-config`, `doq-paths`, `doq-document`,
  `doq-versions`, `doq-search` and `doq-playground-model` (plain functions, types and the injection token). The root entry imports it by
  package name and re-exports exactly the names it exported before. `scripts/public-api.ts` resolves sibling-entry re-exports so the
  report keeps listing every root export with its declaration.
- **Coexistence.** `DoqConfig.unmatched` (`'not-found'` default, `'continue'`). Document routes get a `canMatch` guard that asks the
  injected content catalog for the slug; the current version's index is not registered, so the bare base path stays with the host.
- **Stability.** `packages/doq/public-api.stability.json` lists every export in a tier; a unit test compares it with the report.
- **Portability.** Output readers normalize CRLF; API pages are normalized after rendering; `scripts/portable-smoke.ts` covers paths
  with spaces/non-ASCII, CRLF, junctions and JSON output, and runs in a Windows CI job.
- **Proofs.** `scripts/adoption-routes.ts` and `scripts/adoption-volt.ts` clone, overlay and build the real sites from the tarball;
  Playwright specs `adoption-routes*.spec.ts`, `adoption-volt*.spec.ts`. `scripts/consumer.ts --zone` builds the Zone.js consumer.
  `scripts/bundle-impact.ts` builds one host twice and measures.

## Tradeoffs and alternatives

- A client-side check for an enclosing `main` was rejected: SSR and hydration would disagree. Configuration is the single source.
- Making the shell always a `div` would break shell users with non-Doqs pages; the optional-config rule keeps them working.
- A side-effect annotation of the compiled classes instead of a new entry point was rejected: measurement shows Vite 8 already
  drops unused compiled classes, so the real gain is tooling contexts and builders that do not tree-shake; a separate entry is the
  only guarantee and costs nothing at runtime.
- A generic redirect framework was not added: both sites could keep every migrated URL.
- Overlay containment and localization are recorded as findings; neither is solvable safely inside this minor.

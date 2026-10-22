# Design — 0008 Angular API reference generation

## Existing implementation

- `packages/doq/bin/` already holds one Node-only tool, `doq-search` / `@doqs/analog/search-index` (plain `.mjs` plus `.d.mts`, shipped through the `bin` asset glob of `ng-package.json`, absent from the browser entry). The API generator follows the same split.
- Documents are Markdown files under `src/content/<contentDirectory>/`; `normalizeDoqDocument` turns `title`, `description`, `group`, `order`, `slug` into the route, navigation and metadata (`doq-document.ts`). Rich Markdown (callouts, tabs, code) is applied at render time (`doq-rich-content.ts`). Pagefind indexes `data-pagefind-body`.
- `scripts/adoption.ts` builds a disposable checkout of Angular Movement with the packed tarball (`tests/adoption/angular-movement`, `e2e/adoption.spec.ts`).

## Proposed implementation

### Architecture

```text
consumer TypeScript (resolved from the project, not from Doqs)
        │  createProgram({ rootNames: [entry], options from --project })
        ▼
extract.mjs   public exports → symbol model (plain JSON-able objects)
        ▼
render.mjs    model → Map<file name, Markdown>   (pure: no fs, no clock)
        ▼
output.mjs    plan (added/modified/removed/conflicts) → apply | report
        ▼
src/content/<docs>/…/generated/*.md + .doq-api.json      → existing Doqs/Analog/Pagefind pipeline
```

Files: `bin/doq-api.mjs` (CLI), `bin/api-reference.mjs` (+ `.d.mts`, public Node API), `bin/api-reference/{typescript,extract,render,output,errors}.mjs`. No dependency is added: `node:util` `parseArgs`, `node:crypto`, `node:fs/promises`. TypeScript is an **optional peer** (`^5.5.0 || ^6.0.0`) loaded with a walk-up `node_modules` lookup from `--cwd`, ignoring global folders and `NODE_PATH`, so under pnpm the project's own declared compiler is used and a missing one produces an install instruction.

### Public export discovery

`checker.getExportsOfModule(entryModule)` yields every export of the entry, with `export *`, renames and type-only exports already resolved. Alias symbols are followed with `getAliasedSymbol`. Targets whose declarations are all in `.d.ts` files, `node_modules` or external libraries are skipped (`info` diagnostic); `default` and namespace exports are skipped. Several export names for one target collapse to one entry: the declaration's own name wins if it is exported, otherwise the first name in code-point order; the rest are listed as "Also exported as". Declarations are classified by priority class > function > enum > interface > type alias > variable (a variable holding an arrow function is a function). `@internal` and `@ignore` JSDoc remove a symbol or member.

### Angular metadata support matrix

| Source pattern                                                                                                                      | Extracted                             | Notes                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@Component/@Directive({ selector, exportAs })`                                                                                     | selector, exportAs                    | string literal, no-substitution template, or `const` the checker resolves; otherwise warning + omitted |
| `@Pipe({ name })`                                                                                                                   | pipe name, `transform` overloads      | other members hidden                                                                                   |
| `@Injectable({ providedIn })`                                                                                                       | providedIn, public members            | literal only                                                                                           |
| `x = input<T>(d, { alias, transform })`                                                                                             | name, alias, type, default, transform | `InputSignalWithTransform<T, U>`: accepted type `U`, read type `T`                                     |
| `x = input.required<T>({ alias })`                                                                                                  | required                              |                                                                                                        |
| `x = model<T>(d, { alias })`                                                                                                        | model + `<name>Change`                | change output not listed under Outputs                                                                 |
| `x = output<T>({ alias })`, `outputFromObservable`                                                                                  | payload `T`, alias                    |                                                                                                        |
| `@Input()`, `@Input('a')`, `@Input({ alias, required, transform })`                                                                 | same fields                           | setters: written parameter type; transform: first parameter of its signature                           |
| `@Output()`, `@Output('a')` with `EventEmitter<T>`/`OutputEmitterRef<T>`                                                            | payload                               |                                                                                                        |
| `inject()`, `viewChild()`, `contentChild()`…, `@HostBinding/@HostListener/@ViewChild…`, lifecycle hooks, `private`/`protected`/`#x` | hidden                                | not API                                                                                                |
| decorators/functions not resolving to `@angular/core`                                                                               | ignored                               | a local `function input()` is not Angular                                                              |

When Angular's types cannot be resolved (not installed) the explicit call type arguments are used and a warning notes the gap; nothing is invented.

### Types

Types come from the checker (`typeToString` with `NoTruncation | UseAliasDefinedOutsideCurrentScope`) except where the author wrote an annotation, in which case the annotation text is kept (so `MovePreset | MoveKeyframes` and `readonly string[]` appear as written). `import("…")` qualifiers are stripped, so no absolute path can enter a page. Interfaces and object-literal aliases are shown as member tables rather than expanded source; other aliases show their source text re-indented; constants show their type, shortened at 300 characters at a comma boundary. A type cell whose entire text is one documented name links to its page; every documented name mentioned in a page's signatures is listed under "Related types".

### Output format

```text
<out>/index.md           overview tables per category
<out>/<slug>.md          one page per symbol, slug = kebab-case of the name (category suffix, then number, on collision)
<out>/.doq-api.json      { generator, files: { name: sha256 } }  (ownership manifest)
```

Frontmatter (plain YAML scalars when unambiguous, JSON-quoted otherwise): a comment line "Generated by doq-api. Do not edit…", `title`, `description` (first sentence of the JSDoc, else a generated one), `group` (`--group`), `order` (index 1, then category rank and name), `generated: doq-api`, `category`. No `slug` key: the file name is the canonical slug, so moving `--out` moves the URLs consistently. Sections appear only when they have content. Deprecation uses a Doqs callout (`> [!WARNING]`), examples use fenced code, descriptions in cells are single-line with `|` escaped and `<` neutralised, `:::`/`::demo` at a line start are backslash-escaped.

### Configuration (CLI flags, mirrored by the Node API)

`--entry` (required), `--project`, `--out` (default `src/content/docs/reference/generated`), `--content-dir` (default `src/content/docs`), `--base-path` (default `/docs`, `/` for docs-first), `--group`, `--title`, `--source-url` (`{path}`, `{line}`), `--include`, `--exclude`, `--strict`, `--cwd`. Cross-link routes are `basePath + relative(contentDir, out) + slug`. No config file, no plugin API.

### Ownership and check

`planOutput` compares expected files with the directory and the manifest: a file is _owned_ when it is in the manifest and its hash equals the recorded one (or is byte-identical to the expected output). A pre-existing file that is not owned, an edited generated file and a changed obsolete file are **conflicts**: `generate` aborts before writing; `check` reports them and fails. Writes go through a temporary file and rename; removal is limited to owned, unchanged files; the manifest is rewritten only when it differs. `resolveOutput` rejects outputs outside or equal to the content directory, outside the project, inside `node_modules`/`.git`, or reached through a symlink that leaves the real project root, and a non-directory target.

### Exit codes

`0` success (check: up to date); `1` failed run or stale/conflicting output or strict violation; `2` usage or configuration error.

### Performance

One `ts.createProgram` per run rooted at the entry point only (not every file of the tsconfig); symbols are extracted once and rendered from the model. Measured numbers are in `verification.md`.

### Hosts

- Showcase A: `apps/showcase-a/vanta-ui` (tsconfig + standalone component, directive with model, type alias). `pnpm --filter showcase-a api` / `api:check`; output committed under `src/content/docs/reference/generated`; linked from `guides/accessibility.md`.
- Showcase B: `apps/showcase-b/forge-sdk` (non-Angular SDK). `--base-path /`, group and title "SDK reference" (so the generated index does not collide with the hand-written "API reference" page); linked from `reference/api.md`.
- `pnpm verify:change` gains a stage that runs `api:check` in both showcases, so a PR that changes a fixture's public API without regenerating fails.
- Adoption: the disposable Angular Movement checkout runs the packed `doq-api` against `projects/movement/src/public-api.ts`, with the checkout's own TypeScript 6.

## Tradeoffs and alternatives

- **TypeDoc as engine / JSON input**: rejected; it does not understand signal inputs, models or transforms, and would add a large runtime. The checker plus ~700 lines of Angular-aware extraction is smaller and keeps the Angular semantics explicit.
- **Angular compiler (`ngtsc`) metadata**: rejected for this release; it needs a full compilation, ties Doqs to an Angular version and fails on code that does not compile in isolation. The checker reads declarations only. Consequence: decorator metadata that is not statically resolvable is reported, not computed.
- **Bundling TypeScript**: rejected; the consumer's compiler is what understands its source and tsconfig; Doqs stays small and free of a second compiler. Consequence: the project must install `typescript` (it already does).
- **A new renderer component for API pages**: rejected; ordinary Markdown reuses routing, TOC, Pagefind, highlighting and theming and stays readable without Doqs.
- **A `slug` frontmatter key per page**: rejected; it would hard-code the route prefix into every generated file.
- **Hand-edit protection by marker only**: rejected; the manifest hash detects edits and strangers precisely and lets obsolete files be removed safely.
- **Regenerating during `vite build`**: rejected; builds must not mutate source. Generation is an explicit step and `check` guards drift in CI.
- **Linking inside union/generic types**: not done; Markdown code spans cannot contain links. Names are linked in "Related types" and where a cell is one name.

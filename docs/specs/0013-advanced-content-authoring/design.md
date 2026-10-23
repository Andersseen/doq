# Design — 0013 advanced content authoring

## Existing implementation

Analog renders `src/content/**/*.md` in its Vite plugin; Doqs cuts the rendered HTML into segments (`parseDoqDocument`) and understands `:::code`, tabs, steps, callouts, `::demo` and `::playground`. `doq-api` (Node-only) writes pages below `--out`, owned through a manifest of hashes (`.doq-api.json`), with `generate` and `check`. `doq` (`bin/cli`) is a dependency-free Node CLI. `doqDeterministicMarkdown()` wraps Analog's content `load` hook.

## Proposed implementation

Author-written Markdown → **Node-only processor** (reads source files, fragments and the API symbol index) → ordinary Markdown in the content directory → the unchanged Analog + Doqs pipeline → SSG → Pagefind. No second Markdown parser, nothing in the browser entry, no change to Analog.

- `bin/content.mjs` (entry, config, build/generate/check, Vite plugin) with `bin/content/{paths,regions,markdown,compose,output,errors}.mjs`. `bin/cli/content.mjs` is the `doq content` command; `bin/content.d.mts` the strict declarations. The `package.json` `exports["./content"]` is the only new entry.
- **Syntax.** Leaf directives `::source{…}` and `::include{…}` mirror `::demo[id]`: one line, no closing marker, so they cannot collide with the closing `:::` of tabs or steps. Attributes are double-quoted `key="value"` pairs parsed by a small tokenizer (no regex chain). API links are `[[api:Name|Label@target]]`.
- **Scanning.** `markdown.mjs` tracks CommonMark fences and inline code per line; directives are recognised only on a line of their own, outside fences, indented at most three spaces. Anything else is literal. A line that starts `::source`/`::include` but does not parse is an error rather than silently literal. Inserted text is appended after scanning and never rescanned.
- **Regions.** `regions.mjs` scans comment lines `#region doqs:name`/`#endregion doqs:name` in four comment styles over the whole file, so any broken file fails even if the requested region is intact. No AST. JSON uses `lines`.
- **Safety.** `paths.mjs` is the only reader: lexical containment, a deny list of names and directories, an extension allow list, `lstat` + `realpath` containment (symlinks), size, NUL and UTF-8 checks. Roots are real paths computed once. Fragments use the same reader limited to the authoring root and `.md`.
- **Fragments.** Must have a `_` path segment so the page walker (which skips `_` and dotfiles) never emits them. Stack of real paths for cycles; depth 5; frontmatter rejected.
- **API index.** `renderReference`'s ordering and `assignSlugs` are factored into `symbolRoutes()`, so the index uses the exact slugs the pages are linked with. The routes are stored in the manifest (already owned, already validated by `check`, already ignored by the Analog glob in its sub-directory); no new file and no new page. A target's `api` directories are merged; a name present in two is ambiguous.
- **Versions.** A target is `{ name, authoring, out, sourceRoots, api, sourceUrl?, revision?, … }`. Links resolve against the page's own target; `@name` selects another configured target explicitly.
- **Ownership.** `output.mjs` follows `doq-api`'s `planOutput`/`applyOutput` with nested relative paths. The manifest sits in the authoring directory because Analog's prerender enumerates every file below the content directory (a manifest there produced an empty slug and failed the build; found during integration). All targets are planned before any is written.
- **Integration.** `doqContent()` runs `generateContent` in `buildStart` and on Vite watcher events for files read by the last run (and new `.md` files in an authoring directory); `doq content watch` uses `fs.watch` on the directories involved with a 150 ms debounce. Repository scripts: `content`, `content:check` per app, `content:check` in `verify:change`.
- **Diagnostics.** Collected, sorted by file and line, printed together; `DoqContentError.kind` and `exitCode` (1/2/3/4).
- **Extractor.** `isExternal` treats a declaration file as a dependency except the entry itself, so a library shipping a `.d.mts` (as `@doqs/analog/content` does) can be documented by `doq-api`.

## Tradeoffs and alternatives

- A Vite `transform`/`load` plugin that rewrites Markdown in memory: rejected, it would sit in Analog's private load hook (the very race `doqDeterministicMarkdown` contains), make `check`/CI impossible and hide the result from review. Generated Markdown is diffable and committed like `doq-api` output.
- `:::source … :::` with a closing marker (the brief's illustration): rejected, it collides with the `:::` that closes tabs and steps.
- Fragment links/headings rewritten: rejected; the documented rule (author's responsibility) avoids a hidden transformation.
- A separate symbol-index file: rejected; the manifest already has ownership, hashing and validation, and an extra file in the content directory risks a route (the same Analog behaviour that moved the content manifest).
- Parsing TypeScript for regions: rejected; comment markers cover TS, JS, HTML, CSS, SCSS, shell and YAML and keep the tool dependency-free.
- Generating the official site's API reference from the repository's real `.d.mts`: costs 20 pages and measured budget growth; chosen because it is the real reference of the new entry and a live proof of `[[api:]]`.

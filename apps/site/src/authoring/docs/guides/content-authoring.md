---
title: Content authoring
description: Show code read from your real source files, reuse Markdown fragments and link guides to the generated API reference, resolved at build time into ordinary Markdown.
group: Guides
order: 19
---

Documentation drifts when examples are pasted. Doqs 0.10 resolves three authoring directives **before** Analog renders the page, so the output is ordinary Markdown for the renderer you already use: no JSX, no runtime compiler, nothing new in the browser bundle.

| You write                    | You get                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `::source{file="…"}`         | a highlighted code block read from a real file                |
| `::include{file="…"}`        | the text of a shared Markdown fragment                        |
| `[[api:Name]]`               | a link to the generated API page of a public symbol           |

This page is itself written that way. Its examples below are not copies: they are read from the Doqs source when the site is built.

## Authored pages and generated pages

Put authored pages in their own directory, for example `src/authoring/docs`, and describe where they resolve to in `doq.content.json`:

```json
{
  "targets": [
    {
      "name": "latest",
      "authoring": "src/authoring/docs",
      "out": "src/content/docs",
      "sourceRoots": ["projects/lib/src"],
      "api": ["src/content/docs/reference/generated"]
    }
  ]
}
```

`doq content generate` writes the resolved pages below `out`, mixed with your hand-written pages; a manifest (`.doq-content.json`, kept in the authoring directory so Analog never treats it as a document) records the files it owns, with their hashes. The exact options of one target are:

::source{file="packages/doq/bin/content.d.mts" region="target-config" title="DoqContentTarget"}

The same shape is documented as [[api:DoqContentTarget]], and the programmatic entry points are [[api:generateContent]] and [[api:checkContent]].

## Source-backed code

```md
::source{file="projects/lib/src/button.ts" region="usage" title="button.ts"}
```

A directive sits alone on a line, outside code fences and quotes. Attributes:

- `file` (required): path relative to the project, inside one of the `sourceRoots`.
- `region`: the name of a region, or `lines`: a range such as `3-9` (never both). Without either the whole file is shown.
- `lang`: a language name; otherwise it comes from the extension (`ts`, `js`, `html`, `css`, `scss`, `json`, `sh`, `yaml`).
- `title`: a caption shown above the block.
- `link="false"`: hide the "View source" link when the target configures one.

### Regions

Mark the code you want to show with comments. The markers are removed from the output, never change what the source does and work in every format that has comments:

```ts
// #region doqs:basic-usage
const config = provideMovement({ reducedMotion: 'system' });
// #endregion doqs:basic-usage
```

Use `# #region doqs:name` in shell, YAML and similar files, `/* #region doqs:name */` in CSS and `<!-- #region doqs:name -->` in HTML. Regions can nest, names are unique per file, and an unterminated, misnested, duplicate or empty region fails the build with the page and line. JSON has no comments, so use `lines`. The editor-folding markers `#region name` without the `doqs:` prefix are ordinary code. This is the exact pattern Doqs uses:

::source{file="packages/doq/bin/content/regions.mjs" region="region-marker" title="regions.mjs"}

### Source links

When a target sets `sourceUrl` and `revision`, each block gets a "View source" link to the file and line range at that revision. Nothing is guessed: without configuration there is no link, and an archived version should name its own tag. See the [source link template](/docs/operations/content-tooling#source-links).

## Reusable fragments

```md
::include{file="/_partials/prerequisites.md"}
```

A fragment is a Markdown file inside the authoring directory whose path has a segment starting with `_`, so it is never a page or a route. A path starting with `/` is relative to the authoring directory; any other path is relative to the including file. Fragments may include other fragments up to five levels deep, a cycle is an error, and a fragment cannot have frontmatter. Heading levels are kept exactly as written, so choose them for the place you include the fragment. Links inside a fragment are not rewritten: use absolute routes.

The paragraph below is the shared fragment that this page and [Content tooling](/docs/operations/content-tooling) both include:

::include{file="/_partials/regenerate.md"}

A fragment may contain `::demo[id]` and `::playground[id]`; after resolution they behave as if you had typed them in the page.

## API links

```md
See [[api:generateContent]], [[api:generateContent|the generator]] or [[api:OldThing@v1]].
```

`[[api:Name]]` resolves against the symbol index that `doq-api generate` records in `.doq-api.json`, so the URL is the one the generator linked, including collisions and the configured `basePath`. The default label is the symbol name in code font; `|Label` replaces it. An unknown or ambiguous symbol is an error, never a guessed URL.

Each target resolves against its own `api` directories. A page of an archived version therefore links to the archived reference, and a symbol missing from that version fails instead of silently pointing at the current one. A deliberate cross-version link names the target: `[[api:Name@v1]]`.

## What is not interpreted

Directives inside code fences, inline code, block quotes, list items or the middle of a paragraph stay literal text. Source snippets are inserted after scanning and are never scanned again, so a snippet containing `::playground[x]`, a backtick fence or HTML cannot become a directive or end its own code block.

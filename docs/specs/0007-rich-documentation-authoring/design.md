# Design — 0007 rich documentation authoring

## Existing implementation

`DoqDocsComponent` loads a document with Analog's `injectContentFilesMap`, parses frontmatter and hands the rendered HTML to `<analog-markdown>` (Analog's `MarkdownContentRendererService`: `marked` with `marked-gfm-heading-id` and the Prism highlighter; the HTML is mounted with `bypassSecurityTrustHtml`). 0.3 cuts that HTML at top-level `::demo[id]` paragraphs (`splitDoqInlineDemos`) and mounts consumer components in between. Only already-final HTML is cut, so heading ids and TOC entries stay those of the whole document.

Inspection of the pipeline fixed three constraints. (1) Analog's fence renderer keeps only the language (`sanitizeLanguage`) and drops the rest of the info string, so a code title cannot ride on the fence. (2) `marked` emits `:::` lines as plain paragraphs and lets fenced code interrupt a paragraph, so a directive grammar built from standalone paragraphs is parsed identically for every author. (3) The SSR output must contain the same DOM the browser hydrates, and Pagefind indexes the static HTML.

## Proposed implementation

`doq-rich-content.ts` (pure, no Angular) is a small HTML block parser built on a tag tokenizer, not on regular expressions over free text:

- `rewriteInline` finds `<blockquote>` elements whose first paragraph begins `[!KIND]` at the tokenizer level and rewrites them to `div.doq-callout[role=note]` (closing tag matched by a stack, any nesting depth); it adds `data-language` to `<pre><code class="language-x">`. Everything else is copied byte for byte. Code is escaped by Markdown, so markers and tags inside it can never be seen as tags.
- `topLevelBlocks` lists top-level elements; `parse` walks them and recognises paragraphs consisting only of `:::` lines. Groups are read by `readGroup` (tabs, steps) and `readCode`; a group that does not parse exactly is not consumed, so its original paragraphs remain. A group body is parsed again with tabs and demos disabled (`nested`), which gives steps, titled code and callouts inside tabs without nesting groups.
- Output is `DoqRichSegment[]`: `html`, `demo`, `tabs`. Steps and titled code become `html` (`div.doq-steps`, `figure.doq-code`), so they need no component and no hydration.

`DoqTabsComponent` (standalone, OnPush, signals) renders one group: tab buttons (`role=tab`, roving tabindex), panels (`role=tabpanel`, `hidden` when inactive) each holding an `<analog-markdown>`. `selected` is a `linkedSignal` reset when the group's content changes; ids derive from the segment index, so server and browser agree. Keyboard: Arrow/Home/End with automatic activation (panels are local and instant, so no manual activation is needed). `DoqDocsComponent` mounts it for `tabs` segments, and `reveal()` activates the tab that owns a fragment target. The copy button now reads `textContent`.

CSS (`styles.css`): callout/tab/steps/code rules scoped under `.doq-markdown` and `.doq-tabs`, colours from existing tokens via `color-mix`, plus five optional `--host-docs-callout-*` tokens. Lists restore `list-style` so a host reset cannot erase numbering that carries meaning. Language labels are CSS `attr()` text (not in the DOM, so not searchable).

Search: the article keeps `data-pagefind-body`; the tab strip and callout titles carry `data-pagefind-ignore`; panels are real DOM in the prerendered HTML (inactive ones `hidden`, which Pagefind still indexes, proven by CONTRACT-055).

Performance: the parser runs once per document (`computed`), linear in the HTML size. Callouts, steps, titled code and labels add no JavaScript; only the tabs component is runtime code. Measurements are in verification.md.

Release fix: `npmPublishArgs` (scripts/release/lib.ts) returns `['publish', <absolute path>, '--access', 'public', '--provenance']`; `cli.ts publish` runs it inside the existing gated job. The workflow keeps every other step and permission.

## Tradeoffs and alternatives

- **marked extension / custom renderer.** Rejected: Doqs does not own Analog's marked instance (it is created inside `MarkedSetupService`), build-time rendering happens in Analog's Vite plugin, and an extension would couple Doqs to those internals and to the highlighter choice.
- **Regex substitution of rendered HTML.** Rejected for nesting and escaping; a tokenizer with a stack is the same size and correct for nested quotes and code.
- **Callouts as Angular components.** Rejected: they would force hydration for static content and cannot sit inside a list item that is part of an `analog-markdown` string. An in-place rewrite handles every depth.
- **Tabs as DOM enhancement after hydration** (like the copy button). Rejected: no SSR for the strip, layout shift and no typed tests. A component keeps state in a signal and ids stable.
- **Code titles in the fence info string.** Impossible: Analog drops the metadata (see above), hence `:::code`.
- **Shared package-manager preference across groups.** Not built: needs storage, complicates SSR predictability, and the spec asked for independent groups.
- **`::demo` inside tabs/steps.** Not built: it would need the segment machinery inside the tab component and the demo registry lookup duplicated; documented as a limit.
- **Heading suffix bug.** Cause identified by code inspection and reproduced (`docs/repro/heading-id-concurrency.mjs`): `marked-gfm-heading-id` keeps a module-level slugger, so two documents rendered concurrently through an async hook share it. Doqs does not create ids and added no workaround; its output is verified deterministic (four clean builds, identical ids; ids equal the canonical ones).

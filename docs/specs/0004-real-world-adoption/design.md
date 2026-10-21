# Design — 0004 real world adoption

## Existing implementation

Analog's platform plugin renders each `.md` to HTML at build time with `marked` (heading ids from `marked-gfm-heading-id`, highlighting) and the app receives that HTML as the document `content`. `DoqDocsComponent` binds it to `<analog-markdown>` and derives the table of contents from the same HTML. Frontmatter `demo:` renders a registered component after the content.

## Proposed implementation

**Parsing.** A build-time `marked` extension would give a true token-level directive but would require every consumer to change `vite.config.ts` and would not help the many apps already building. The HTML Analog already produced is well formed and escapes code, so `splitDoqInlineDemos()` scans its tags with a depth counter and cuts only at a depth-0 `<p>` whose entire text is `::demo[id]`. Code blocks are escaped text in `<pre>`, inline code is in `<code>` inside a larger paragraph, and lists, quotes and tables are depth ≥ 1, so none can match. The HTML is never rewritten, only sliced between top-level elements, which is why heading ids and duplicate suffixes cannot change. A document without `::demo[` skips the scanner.

**Rendering.** The template loops over the segments: HTML segments use `<analog-markdown class="doq-markdown">` exactly as before; demo segments use `*ngComponentOutlet` inside `.doq-region.doq-inline-demo[data-pagefind-ignore]`. Angular owns the views, so SSR, hydration, zoneless, DI and destruction come from the framework. A frontmatter demo is rendered after the content unless an inline directive already uses that id.

**Fixing assumptions.** The component used to treat `.doq-markdown` as the whole body. Fragment lookup, copy buttons and the heading observer now work from `.doq-content` but only consider nodes inside `.doq-markdown`, so a consumer demo with a colliding `id` or its own `<pre>` is left alone.

**Registry.** The existing `DoqConfig.demos` map is the only registry; nothing new in the config.

**Adoption proof.** `scripts/adoption.ts` clones the public Angular Movement repository to a temp directory, copies the overlay in `tests/adoption/angular-movement`, patches `vite.config.ts`, `styles.css` and the build script, installs the packed tarball and builds. `e2e/adoption.spec.ts` runs against it (served on 4278 only when `DOQ_ADOPTION_DIR` is set). It is opt-in (`pnpm verify:adoption`) because it needs the network and a large install, and is not part of `quality:gate`; the gate's tarball consumer (Showcase B copy) covers the independent-install requirement.

## Tradeoffs and alternatives

- Marked extension: stricter in theory, but consumer build changes, plus a second place that knows heading numbering. Rejected for 0.3; the segment model stays valid if a token-based path is added later.
- Replacing the directive with a custom element in the HTML and mounting with `createComponent`: needs post-render DOM work, a MutationObserver on the server-side path and manual destruction. Rejected.
- Rendering each segment through a separate Markdown pass would break duplicate heading suffixes; avoided by slicing finished HTML.
- Restricting the directive to top-level paragraphs means no demos inside lists or quotes. Accepted and documented.
- `overflow-x: auto` on the wrapper contains stray overflow from consumer components at the cost of a small padding/negative-margin to keep focus rings visible.

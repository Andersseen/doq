// Reproduction of the heading-ID race behind Doqs 0.6's intermittent "usage-1" fragments.
//
// Owner of the defect: marked-gfm-heading-id (used by @analogjs/content's MarkedSetupService). The extension keeps its
// slugger and heading list in MODULE state, resets both in a `preprocess` hook, and the heading renderer reads them
// later. Anything that lets two renders interleave therefore corrupts both:
//
//   A. An async marked extension (any async highlighter's walkTokens) suspends a parse between preprocess and the
//      heading renderer; a second parse resets/uses the same slugger, so heading ids get "-1" suffixes.
//   B. Analog's MarkdownContentRendererService does `content: await parse(...)` then `toc: getHeadingList()`.
//      The await yields to the event loop, so a concurrent render can replace the list before it is read:
//      the table of contents of one document is the one of another. (Reproduces even with a synchronous parse.)
//
// Run from a directory whose node_modules contain marked and marked-gfm-heading-id (for example apps/showcase-a):
//   cd apps/showcase-a && node ../../docs/repro/heading-id-concurrency.mjs
import { createRequire } from 'node:module';

// Resolve from the working directory, not from this file.
const here = createRequire(`${process.cwd()}/`);
const { Marked } = here('marked');
const { getHeadingList, gfmHeadingId } = here('marked-gfm-heading-id');

const ids = (html) => [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const docA = '## Usage\n\n## Usage\n\ntext\n';
const docB = '## Other\n\ntext\n';

// A: async extension.
const asyncMarked = new Marked({ async: true, walkTokens: () => sleep(5) }, gfmHeadingId());
console.log('A sequential:', ids(await asyncMarked.parse(docA)), ids(await asyncMarked.parse(docA)));
const [a1, a2] = await Promise.all([asyncMarked.parse(docA), asyncMarked.parse(docA)]);
console.log('A concurrent:', ids(a1), ids(a2), '(expected usage, usage-1 for both)');

// B: Analog's render(): await parse, then read the shared heading list.
const syncMarked = new Marked(gfmHeadingId());
const analogRender = async (content) => ({ content: await syncMarked.parse(content), toc: getHeadingList() });
const [b1, b2] = await Promise.all([analogRender(docA), analogRender(docB)]);
console.log(
  'B toc of docA:',
  b1.toc.map((h) => h.id),
  'toc of docB:',
  b2.toc.map((h) => h.id),
  '(expected [usage, usage-1] and [other])',
);

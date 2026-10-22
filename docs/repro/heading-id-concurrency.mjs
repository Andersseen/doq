// Minimal reproduction: marked-gfm-heading-id (used by @analogjs/content) keeps its slugger in module state and resets it in a
// preprocess hook. Two documents rendered concurrently through an async extension share that state, so one document's
// headings receive "-1" suffixes caused by the other. Run: node docs/repro/heading-id-concurrency.mjs
// (resolve the two imports from a project that has marked and marked-gfm-heading-id installed)
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';

const marked = new Marked(
  {
    async: true,
    walkTokens: async () => {
      await new Promise((done) => setTimeout(done, 5));
    },
  },
  gfmHeadingId(),
);
const doc = '## Usage\n\ntext\n';
const ids = (html) => [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

console.log('sequential:', ids(await marked.parse(doc)), ids(await marked.parse(doc)));
const [first, second] = await Promise.all([marked.parse(doc), marked.parse(doc)]);
console.log('concurrent:', ids(first), ids(second), '(expected usage and usage for both)');

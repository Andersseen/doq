// Node-only Vite helper (@doqs/analog/vite). Never imported by the browser entry.
//
// Why: @analogjs/platform renders each Markdown file in the `load` hook of its `analogjs-content-file` plugin, and Vite
// runs load hooks for different files concurrently. Every render shares one `marked` instance, and marked-gfm-heading-id
// keeps its heading slugger in module state that it resets per render. When a render is asynchronous (every async
// highlighter, such as Shiki or Prism's async marked-highlight wiring), two files interleave and receive each other's
// duplicate-heading suffixes ("usage-1" in one build, "usage-2" in the next). The ids are baked into the bundle, so the
// prerendered HTML, the table of contents and the search anchors then disagree between builds.
// See docs/repro/heading-id-concurrency.mjs and docs/specs/0010-production-hardening.

/** @typedef {{ name?: string, load?: unknown }} PluginLike */

const CONTENT_FILE_PLUGIN = 'analogjs-content-file';
const CONTENT_FILE_MARKER = 'analog-content-file=true';

/** The callable `load` of a Vite plugin, whether declared as a function or as `{ handler }`. */
function loadHandler(plugin) {
  const hook = plugin?.load;
  if (typeof hook === 'function') return hook;
  if (hook && typeof hook === 'object' && typeof hook.handler === 'function') return hook.handler;
  return undefined;
}

/**
 * Runs Analog's Markdown `load` hook for one file at a time, in the order Vite requests the files.
 *
 * The hook itself is Analog's own, called through the resolved plugin list; nothing is patched or copied and the output
 * of each render is identical to a sequential build. Place it anywhere in `plugins`.
 *
 * @param {{ contentPlugin?: string }} [options] `contentPlugin` overrides the name of Analog's plugin if a future release renames it.
 */
export function doqDeterministicMarkdown(options = {}) {
  const pluginName = options.contentPlugin ?? CONTENT_FILE_PLUGIN;
  let analogLoad;
  let analogPlugin;
  let tail = Promise.resolve();
  return {
    name: 'doq-deterministic-markdown',
    enforce: 'pre',
    configResolved(config) {
      analogPlugin = config.plugins.find(plugin => plugin.name === pluginName);
      analogLoad = loadHandler(analogPlugin);
      if (!analogLoad) {
        throw new Error(
          `doqDeterministicMarkdown: no "${pluginName}" plugin with a load hook was found. Add it after analog() in vite.config.ts, ` +
            'or remove doqDeterministicMarkdown() if the project does not render Markdown through @analogjs/platform.',
        );
      }
    },
    load(id) {
      if (!analogLoad || typeof id !== 'string' || !id.includes(CONTENT_FILE_MARKER)) return null;
      const result = tail.then(() => analogLoad.call(this, id));
      // A failing file must not block the files queued behind it; its error still reaches Vite through `result`.
      tail = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}

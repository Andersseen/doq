import { describe, expect, it } from 'vitest';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { doqDeterministicMarkdown } from '../../bin/vite.mjs';

const sleep = (ms: number) => new Promise<void>(done => setTimeout(done, ms));
const ids = (html: string) => [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
const usage = '## Usage\n\ntext\n\n## Usage\n\n```ts\nconst a = 1;\n```\n';
const other = '## Other\n\n### Usage\n\ntext\n';

/**
 * A stand-in for @analogjs/platform's `analogjs-content-file` plugin with the same structure: ONE shared marked instance
 * with gfmHeadingId (module-level slugger), an async highlight step, and a `load` hook that parses the file.
 */
function analogContentPlugin() {
  const marked = new Marked({ async: true, walkTokens: async () => { await sleep(2); } }, gfmHeadingId());
  return {
    name: 'analogjs-content-file',
    enforce: 'post',
    async load(id: string) {
      if (!id.includes('analog-content-file=true')) return;
      const body = id.startsWith('usage') ? usage : other;
      return await marked.parse(body);
    },
  };
}

const pluginContext = {};
const setup = (plugin = analogContentPlugin()) => {
  const guard = doqDeterministicMarkdown();
  guard.configResolved({ plugins: [guard, plugin] });
  return { guard, plugin };
};

describe('UNIT-130 deterministic Markdown rendering (DET-01, DET-02)', () => {
  it('reproduces the upstream race: concurrent loads of the real renderer corrupt heading ids', async () => {
    const { plugin } = setup();
    const results = await Promise.all(['usage-1', 'usage-2'].map(name => plugin.load(`${name}?analog-content-file=true`)));
    expect(results.map(html => ids(html as string))).not.toEqual([['usage', 'usage-1'], ['usage', 'usage-1']]);
  });

  it('gives every file its own ids when loads go through the guard, whatever the request order', async () => {
    const { guard } = setup();
    const load = (name: string) => guard.load.call(pluginContext, `${name}?analog-content-file=true`) as Promise<string>;
    for (let round = 0; round < 5; round++) {
      const names = ['usage-a', 'other-a', 'usage-b', 'other-b', 'usage-c'];
      const html = await Promise.all(names.map(load));
      html.forEach((page, index) => expect(ids(page)).toEqual(names[index]!.startsWith('usage') ? ['usage', 'usage-1'] : ['other', 'usage']));
    }
  });

  it('produces exactly the HTML of a strictly sequential build', async () => {
    const sequential = setup().plugin;
    const expected = [await sequential.load('usage?analog-content-file=true'), await sequential.load('other?analog-content-file=true')];
    const { guard } = setup();
    const actual = await Promise.all(['usage', 'other'].map(name => guard.load.call(pluginContext, `${name}?analog-content-file=true`)));
    expect(actual).toEqual(expected);
  });

  it('leaves every other module to the rest of the pipeline', () => {
    const { guard } = setup();
    expect(guard.load.call(pluginContext, '/src/app/app.ts')).toBeNull();
    expect(guard.load.call(pluginContext, '/src/content/a.md?analog-content-list=true')).toBeNull();
  });

  it('keeps going after a file fails and reports that failure to its own request only', async () => {
    const plugin = analogContentPlugin();
    const original = plugin.load;
    plugin.load = async (id: string) => { if (id.startsWith('broken')) throw new Error('bad file'); return original(id); };
    const { guard } = setup(plugin);
    const [broken, fine] = await Promise.allSettled(['broken', 'usage'].map(name => guard.load.call(pluginContext, `${name}?analog-content-file=true`)));
    expect(broken.status).toBe('rejected');
    expect(fine.status === 'fulfilled' && ids(fine.value as string)).toEqual(['usage', 'usage-1']);
  });

  it('accepts a hook declared as { handler } and fails loudly when Analog is not installed', () => {
    const plugin = analogContentPlugin();
    const guard = doqDeterministicMarkdown();
    expect(() => guard.configResolved({ plugins: [{ name: 'analogjs-content-file', load: { handler: plugin.load } } as never] })).not.toThrow();
    expect(() => doqDeterministicMarkdown().configResolved({ plugins: [] })).toThrow(/analogjs-content-file/);
  });
});

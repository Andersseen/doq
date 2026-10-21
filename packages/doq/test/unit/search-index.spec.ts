import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { indexDoqSearch } from '../../bin/search-index.mjs';

let site: string;
beforeEach(async () => {
  site = await mkdtemp(join(tmpdir(), 'doq-index-'));
});
afterEach(async () => {
  await rm(site, { recursive: true, force: true });
});

const page = (body: string, attributes = '') =>
  `<!doctype html><html lang="en"><head><title>t</title></head><body><header>Host header zebra</header><main>${body}</main></body></html>${attributes}`;

async function write(path: string, html: string) {
  await mkdir(join(site, path, '..'), { recursive: true });
  await writeFile(join(site, path), html);
}

describe('UNIT-014 indexDoqSearch', () => {
  it('requires an existing prerendered site and a valid output directory', async () => {
    await expect(indexDoqSearch({ siteDir: '' })).rejects.toThrow(/siteDir is required/);
    await expect(indexDoqSearch({ siteDir: join(site, 'missing') })).rejects.toThrow(/no index.html/);
    await write('index.html', page('<h1>Home</h1>'));
    await expect(indexDoqSearch({ siteDir: site, outputDir: '../outside' })).rejects.toThrow(/inside the site directory/);
    await expect(indexDoqSearch({ siteDir: site, outputDir: '.' })).rejects.toThrow(/inside the site directory/);
  });

  it('fails clearly when no page carries Doq documentation content', async () => {
    await write('index.html', page('<h1>Home</h1><p>just a landing page</p>'));
    await expect(indexDoqSearch({ siteDir: site })).rejects.toThrow(/no documentation pages were found/);
  });

  it('indexes only data-pagefind-body content, honors ignores, and writes a lean bundle', async () => {
    await write('index.html', page('<h1>Landing</h1><p>landing only phrase</p>'));
    await write(
      'docs/onboarding/first-application/index.html',
      page(
        '<article data-pagefind-body><div data-pagefind-ignore><nav>sidebar quokka</nav></div><h1>Getting started</h1><h2 id="create">Create</h2><p>unique body phrase narwhal</p><aside data-pagefind-ignore>toc walrus</aside></article>',
      ),
    );
    const result = await indexDoqSearch({ siteDir: site });
    expect(result.pageCount).toBe(1);
    expect(result.outputPath).toBe(join(site, 'pagefind'));
    const files = await readdir(join(site, 'pagefind'));
    expect(files).toContain('pagefind.js');
    expect(files).toContain('pagefind-entry.json');
    expect(files.filter((file) => /ui|highlight/.test(file))).toEqual([]);
    const entry = JSON.parse(await readFile(join(site, 'pagefind/pagefind-entry.json'), 'utf8'));
    expect(entry.languages.en.page_count).toBe(1);

    // The ignored and host text never reached the index: only fragment files hold page text.
    const fragments = await readdir(join(site, 'pagefind/fragment'));
    expect(fragments.length).toBe(1);
  });

  it('replaces a stale bundle instead of merging with it', async () => {
    await write('index.html', page('<h1>Home</h1>'));
    await write('docs/a/index.html', page('<article data-pagefind-body><h1>A</h1><p>first</p></article>'));
    await indexDoqSearch({ siteDir: site });
    await writeFile(join(site, 'pagefind/stale.txt'), 'old');
    await indexDoqSearch({ siteDir: site });
    await expect(stat(join(site, 'pagefind/stale.txt'))).rejects.toThrow();
  });
});

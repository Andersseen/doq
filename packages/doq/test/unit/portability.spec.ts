import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { planOutput as planContent, sha256 } from '../../bin/content/output.mjs';
import { planOutput as planApi } from '../../bin/api-reference/output.mjs';
import { buildManifest as apiManifest } from '../../bin/api-reference/output.mjs';
import { buildManifest as contentManifest } from '../../bin/content/output.mjs';

// COMPAT-02: Git on Windows (core.autocrlf) checks generated text files out with CRLF. A page that differs only by line endings
// must be unchanged, never "edited after it was generated".
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'doq-portable-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
const crlf = (text: string) => text.replace(/\n/g, '\r\n');

describe('UNIT-142 COMPAT-02 line endings of generated output', () => {
  it('doq content: CRLF copies of its pages and manifest are unchanged, not conflicts', async () => {
    const files = new Map([['guides/a.md', '---\ntitle: A\n---\n\nBody\n']]);
    await mkdir(join(dir, 'out/guides'), { recursive: true });
    await writeFile(join(dir, 'out/guides/a.md'), crlf(files.get('guides/a.md')!));
    await mkdir(join(dir, 'authoring'), { recursive: true });
    await writeFile(join(dir, 'authoring/.doq-content.json'), crlf(contentManifest(files)));
    const plan = await planContent(join(dir, 'out'), files, join(dir, 'authoring/.doq-content.json'));
    expect(plan).toMatchObject({ added: [], modified: [], removed: [], conflicts: [], manifestChanged: false });
  });

  it('doq content: a real edit is still a conflict', async () => {
    const files = new Map([['guides/a.md', 'one\n']]);
    await mkdir(join(dir, 'out/guides'), { recursive: true });
    await writeFile(join(dir, 'out/guides/a.md'), crlf('edited\n'));
    await mkdir(join(dir, 'authoring'), { recursive: true });
    await writeFile(join(dir, 'authoring/.doq-content.json'), contentManifest(new Map([['guides/a.md', 'original\n']])));
    const plan = await planContent(join(dir, 'out'), files, join(dir, 'authoring/.doq-content.json'));
    expect(plan.conflicts).toEqual(['guides/a.md: was edited after it was generated']);
  });

  it('doq-api: CRLF copies of its pages and manifest are unchanged', async () => {
    const files = new Map([['index.md', '---\ntitle: API\n---\n\nIndex\n']]);
    await writeFile(join(dir, 'index.md'), crlf(files.get('index.md')!));
    await writeFile(join(dir, '.doq-api.json'), crlf(apiManifest(files)));
    expect(await planApi(dir, files)).toMatchObject({ added: [], modified: [], removed: [], conflicts: [], manifestChanged: false });
  });

  it('hashes are over LF text, so a manifest written on one platform verifies on another', () => {
    expect(sha256('a\nb\n')).toBe(sha256('a\nb\n'));
  });
});

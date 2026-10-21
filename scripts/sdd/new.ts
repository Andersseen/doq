/** Scaffold a spec: `pnpm sdd:new <four-digit-id> <slug>`, e.g. `pnpm sdd:new 0002 search-index`. */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { render, SPEC_FILES, validateSpecName } from './lib.ts';

const repo = resolve(import.meta.dirname, '../..');
const [id = '', slug = ''] = process.argv.slice(2);
const errors = validateSpecName(id, slug);
if (errors.length) {
  console.error(errors.map((error) => `error: ${error}`).join('\n'));
  console.error('usage: pnpm sdd:new <four-digit-id> <slug>');
  process.exit(2);
}

const specsRoot = resolve(process.env['DOQ_SPECS_ROOT'] ?? resolve(repo, 'docs/specs'));
await mkdir(specsRoot, { recursive: true });
const existing = (await readdir(specsRoot)).filter((name) => name.startsWith(`${id}-`) || name === `${id}-${slug}`);
if (existing.length) {
  console.error(`error: milestone id ${id} already exists (${existing.join(', ')}); refusing to overwrite.`);
  process.exit(1);
}

const directory = resolve(specsRoot, `${id}-${slug}`);
await mkdir(directory);
const title = slug.replace(/-/g, ' ');
for (const file of SPEC_FILES) {
  const template = await readFile(resolve(import.meta.dirname, 'templates', file), 'utf8');
  await writeFile(resolve(directory, file), render(template, { id, slug, title }), { flag: 'wx' });
}
console.log(`Created docs/specs/${id}-${slug}/ (${SPEC_FILES.join(', ')}).`);
console.log('Fill in every TODO(sdd) marker, then run: pnpm sdd:check');

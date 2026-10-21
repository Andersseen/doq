/** Validate every spec under docs/specs (or the given spec directories): `pnpm sdd:check [docs/specs/0002-name ...]`. */
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { checkSpec, SPEC_DIR, SPEC_FILES, type Spec } from './lib.ts';

const repo = resolve(import.meta.dirname, '../..');
const specsRoot = resolve(process.env['DOQ_SPECS_ROOT'] ?? resolve(repo, 'docs/specs'));
const testRoots = ['e2e', 'packages/doq/test', 'tests/contract', 'scripts', 'apps/site/test', 'apps/site/src'].map(
  (path) => resolve(repo, path),
);

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.name !== 'node_modules' && entry.name !== '__pycache__' && !entry.name.startsWith('.'))
      .map((entry) =>
        entry.isDirectory() ? walk(resolve(dir, entry.name)) : Promise.resolve([resolve(dir, entry.name)]),
      ),
  );
  return nested.flat();
}

const sources = (await Promise.all(testRoots.map(walk)))
  .flat()
  .filter((file) => /\.(ts|py)$/.test(file) && !file.includes('/scripts/sdd/templates/'));
const sourceText = (await Promise.all(sources.map((file) => readFile(file, 'utf8')))).join('\n');
const testExists = (id: string) => new RegExp(`\\b${id}\\b`).test(sourceText);

const requested = process.argv.slice(2).map((path) => resolve(path));
const directories = requested.length
  ? requested
  : (await readdir(specsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(specsRoot, entry.name));

let failures = 0;
for (const directory of directories) {
  const name = directory.split('/').pop()!;
  const spec: Spec = { name, files: {} };
  for (const file of SPEC_FILES) {
    const text = await readFile(resolve(directory, file), 'utf8').catch(() => undefined);
    if (text !== undefined) spec.files[file] = text;
  }
  const errors = checkSpec(spec, { testExists });
  if (errors.length) {
    failures += errors.length;
    console.error(`FAIL ${name}`);
    for (const error of errors) console.error(`  - ${error}`);
  } else console.log(`ok   ${name}`);
}
if (!directories.length) {
  console.error('No specs found under docs/specs. Create one with: pnpm sdd:new <four-digit-id> <slug>');
  failures++;
}
if (failures) {
  console.error(
    `\nsdd:check found ${failures} problem(s). This command checks structure and traceability only; tests still have to run.`,
  );
  process.exit(1);
}
console.log(
  `\n${directories.length} spec(s) structurally valid (${SPEC_DIR.source}). Behavior is only verified by running the tests.`,
);

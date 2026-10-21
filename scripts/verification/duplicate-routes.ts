import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  normalizeDoqDocument,
  sortDoqDocuments,
  type DoqDocumentAttributes,
} from '../../packages/doq/src/lib/doq-document.ts';

const doc = (filename: string, attributes: DoqDocumentAttributes = {}) =>
  normalizeDoqDocument({ filename, attributes }, 'docs', '/docs');
const fixtureRoot = await mkdtemp(join(tmpdir(), 'doq-duplicate-route-'));
try {
  const contentDir = join(fixtureRoot, 'src/content/docs');
  await mkdir(contentDir, { recursive: true });
  const firstPath = join(contentDir, 'first.md'),
    secondPath = join(contentDir, 'second.md');
  await writeFile(firstPath, '---\ntitle: First\nslug: duplicated-route\n---\nFirst fixture.\n');
  await writeFile(secondPath, '---\ntitle: Second\nslug: duplicated-route\n---\nSecond fixture.\n');
  const parse = async (path: string) => {
    const source = await readFile(path, 'utf8');
    return { title: /^title:\s*(.+)$/m.exec(source)?.[1], slug: /^slug:\s*(.+)$/m.exec(source)?.[1] };
  };
  const first = doc(firstPath, await parse(firstPath)),
    second = doc(secondPath, await parse(secondPath));
  assert.ok(first && second, 'fixture documents should normalize');
  assert.throws(
    () => sortDoqDocuments([first, second]),
    (error: Error) => {
      assert.match(error.message, /duplicate public route "\/docs\/duplicated-route"/);
      assert.ok(error.message.includes(firstPath), 'diagnostic must name the first source file');
      assert.ok(error.message.includes(secondPath), 'diagnostic must name the second source file');
      return true;
    },
    'duplicate public routes must fail',
  );

  for (const slug of ['', 'bad slug', 'nested//empty', '../escape'])
    assert.throws(() => doc(firstPath, { slug }), /Doq: invalid/);
  const normal = [doc(join(contentDir, 'a.md')), doc(join(contentDir, 'b.md'))].filter((entry) => entry !== null);
  assert.equal(normal.length, 2, 'ordinary documents should normalize');
  assert.equal(sortDoqDocuments(normal).length, 2, 'distinct normal documents must not collide');
  assert.equal(doc(firstPath, { slug: '/nested/custom-path/' })?.routePath, '/docs/nested/custom-path');
  console.log(
    'PASS M9 — two temporary Markdown files collide at /docs/duplicated-route; diagnostic names both sources. Invalid, ordinary, and nested custom slugs verified.',
  );
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}

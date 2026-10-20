import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
const packageRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)), 'packages/doq');
const require = createRequire(resolve(packageRoot, 'package.json'));
const ts = require('typescript');
const source = await (await import('node:fs/promises')).readFile(resolve(packageRoot, 'src/lib/doq-document.ts'), 'utf8');
const { outputText, diagnostics } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, strict: true }, reportDiagnostics: true });
assert.equal(diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error).length ?? 0, 0, 'Doq document source should transpile');
const { normalizeDoqDocument, sortDoqDocuments } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const doc = (filename, attributes = {}) => normalizeDoqDocument({ filename, attributes }, 'docs', '/docs');
const fixtureRoot = await mkdtemp(join(tmpdir(), 'doq-duplicate-route-'));
try {
  const contentDir=join(fixtureRoot,'src/content/docs');await mkdir(contentDir,{recursive:true});
  const firstPath=join(contentDir,'first.md'),secondPath=join(contentDir,'second.md');
  await writeFile(firstPath,'---\ntitle: First\nslug: duplicated-route\n---\nFirst fixture.\n');
  await writeFile(secondPath,'---\ntitle: Second\nslug: duplicated-route\n---\nSecond fixture.\n');
  const parse=async path=>{const source=await readFile(path,'utf8');return{title:/^title:\s*(.+)$/m.exec(source)?.[1],slug:/^slug:\s*(.+)$/m.exec(source)?.[1]};};
  const first=doc(firstPath,await parse(firstPath)),second=doc(secondPath,await parse(secondPath));
  assert.ok(first&&second,'fixture documents should normalize');
  assert.throws(()=>sortDoqDocuments([first,second]),error=>{
    assert.match(error.message,/duplicate public route "\/docs\/duplicated-route"/);
    assert.ok(error.message.includes(firstPath),'diagnostic must name the first source file');
    assert.ok(error.message.includes(secondPath),'diagnostic must name the second source file');
    return true;
  },'duplicate public routes must fail');

  for(const slug of ['','bad slug','nested//empty','../escape'])assert.throws(()=>doc(firstPath,{slug}),/Doq: invalid/);
  const normal=[doc(join(contentDir,'a.md')),doc(join(contentDir,'b.md'))];
  assert.ok(normal.every(Boolean));assert.equal(sortDoqDocuments(normal).length,2,'distinct normal documents must not collide');
  assert.equal(doc(firstPath,{slug:'/nested/custom-path/'}).routePath,'/docs/nested/custom-path');
  console.log('PASS M9 — two temporary Markdown files collide at /docs/duplicated-route; diagnostic names both sources. Invalid, ordinary, and nested custom slugs verified.');
} finally { await rm(fixtureRoot,{recursive:true,force:true}); }

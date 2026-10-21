/**
 * Negative controls: prove the tests notice real contract breaks.
 *
 *   pnpm verify:negative-controls
 *
 * Each control breaks one contract in a disposable copy (library sources + tests in the OS temp dir, or a copy of the
 * packed tarball), runs the relevant suite there, and requires it to FAIL. The working tree is never modified.
 * Needs `pnpm pack:doq` for the tarball control.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
  version: string;
};

interface Control {
  name: string;
  breaks: string;
  expect: RegExp;
  run: (workspace: string) => Promise<{ status: number; output: string }>;
}

const sh = (command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env, CI: 'true' } });
  return { status: result.status ?? 1, output: `${result.stdout}\n${result.stderr}` };
};

/** Disposable copy of the library, its tests and the root configs; dependencies are symlinked, not copied. */
async function libraryCopy(workspace: string) {
  await cp(resolve(repo, 'packages/doq'), resolve(workspace, 'packages/doq'), {
    recursive: true,
    filter: (path) => !/\/(node_modules|dist)$/.test(path),
  });
  for (const file of ['package.json', 'vitest.unit.config.ts']) await cp(resolve(repo, file), resolve(workspace, file));
  await symlink(resolve(repo, 'node_modules'), resolve(workspace, 'node_modules'));
  await symlink(resolve(repo, 'packages/doq/node_modules'), resolve(workspace, 'packages/doq/node_modules'));
}

async function mutate(file: string, from: string, to: string) {
  const text = await readFile(file, 'utf8');
  if (!text.includes(from)) throw new Error(`mutation target not found in ${file}: ${from}`);
  await writeFile(file, text.replace(from, to));
}

const controls: Control[] = [
  {
    name: 'canonical route',
    breaks: 'normalizeDoqDocument builds routes from the source path instead of the custom slug',
    expect: /UNIT-004 normalizeDoqDocument/,
    run: async (workspace) => {
      await libraryCopy(workspace);
      await mutate(
        resolve(workspace, 'packages/doq/src/lib/doq-document.ts'),
        'const routePath = `${prefix}/${slug}`;',
        'const routePath = `${prefix}/${sourceSlug}`;',
      );
      return sh('pnpm', ['exec', 'vitest', 'run', '-c', 'vitest.unit.config.ts', 'packages/doq/test/unit'], workspace);
    },
  },
  {
    name: 'accessible name',
    breaks: 'the documentation navigation loses its aria-label',
    expect: /COMP-00[238]/,
    run: async (workspace) => {
      await libraryCopy(workspace);
      await mutate(
        resolve(workspace, 'packages/doq/src/lib/doq-docs.component.ts'),
        '[attr.aria-label]="copy.label" (keydown.escape)',
        '(keydown.escape)',
      );
      return sh(
        'pnpm',
        ['exec', 'vitest', 'run', '-c', 'vitest.components.config.ts'],
        resolve(workspace, 'packages/doq'),
      );
    },
  },
  {
    name: 'package export',
    breaks: 'the packed tarball ships without styles.css although exports still reference it',
    expect: /test_contract_00[13]/,
    run: async (workspace) => {
      const tarball = resolve(repo, `artifacts/getdoq-analog-${version}.tgz`);
      const extracted = resolve(workspace, 'extracted');
      await cp(tarball, resolve(workspace, 'original.tgz'));
      sh('mkdir', ['-p', extracted], workspace);
      if (sh('tar', ['-xzf', 'original.tgz', '-C', 'extracted'], workspace).status !== 0)
        throw new Error('tar extract failed');
      await rm(resolve(extracted, 'package/styles.css'));
      const broken = resolve(workspace, 'broken.tgz');
      if (sh('tar', ['-czf', broken, '-C', extracted, 'package'], workspace, { COPYFILE_DISABLE: '1' }).status !== 0)
        throw new Error('tar create failed');
      return sh('pnpm', ['test:contract', '-k', 'test_contract_00', '--no-header', '-q'], repo, {
        DOQ_TARBALL: broken,
      });
    },
  },
];

let escaped = 0;
for (const control of controls) {
  const workspace = await mkdtemp(resolve(tmpdir(), 'doq-negative-'));
  try {
    const { status, output } = await control.run(workspace);
    const failedNames = [...output.matchAll(/(?:FAIL|FAILED)[^\n]*/g)].map((m) => m[0]);
    const detected = status !== 0 && control.expect.test(output);
    console.log(`${detected ? 'DETECTED' : 'ESCAPED '}  ${control.name}: ${control.breaks}`);
    for (const line of failedNames.slice(0, 4)) console.log(`            ${line.trim().slice(0, 150)}`);
    if (!detected) {
      escaped++;
      console.log(output.slice(-1500));
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
console.log(
  escaped
    ? `\n${escaped} mutation(s) escaped: the tests did not catch a real regression.`
    : '\nAll mutations were detected; the working tree was not modified.',
);
process.exit(escaped ? 1 : 0);

import { spawn } from 'node:child_process';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { repo, tocFixtureDir } from './config.ts';

async function run(command: string, args: string[]): Promise<void> {
  const child = spawn(command, args, { cwd: repo, stdio: 'inherit' });
  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', resolve);
  });
  if (code !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${code}`);
}

export const rebuildShowcaseA = () =>
  run('pnpm', ['exec', 'turbo', 'run', 'build', '--force', '--filter=showcase-a...']);

/** Write temporary TOC edge-case documents into Showcase A; callers rebuild it and later call `restoreTocFixtures`. */
export async function createTocFixtures(): Promise<void> {
  const exists = await access(tocFixtureDir).then(
    () => true,
    () => false,
  );
  if (exists) throw new Error(`Refusing to overwrite existing fixture directory ${tocFixtureDir}`);
  await mkdir(tocFixtureDir, { recursive: true });
  const filler = Array.from(
    { length: 12 },
    (_, index) => `Verification paragraph ${index + 1}. ${'This sentence adds enough scrolling space. '.repeat(8)}\n\n`,
  ).join('');
  await writeFile(
    join(tocFixtureDir, 'toc-fixture.md'),
    `---\ntitle: Temporary TOC verification fixture\ndescription: Temporary acceptance fixture.\ngroup: Verification\norder: 999\n---\n\n## Repeated heading\n\nFirst occurrence.\n\n${filler}### Nested heading\n\nNested occurrence.\n\n## Repeated heading\n\nSecond occurrence.\n`,
  );
  await writeFile(
    join(tocFixtureDir, 'no-headings.md'),
    '---\ntitle: Temporary no-heading verification fixture\ndescription: Temporary acceptance fixture.\ngroup: Verification\norder: 1000\n---\n\nThis document intentionally has no headings.\n',
  );
}

export async function restoreTocFixtures(): Promise<void> {
  await rm(tocFixtureDir, { recursive: true, force: true });
  await rebuildShowcaseA();
}

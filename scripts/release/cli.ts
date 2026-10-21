/**
 * Release workflow commands (see .github/workflows/release.yml and docs/operations/release-and-deployment.md).
 *
 *   node scripts/release/cli.ts plan <tarball>               decide publish / repair / skip / refuse; writes step outputs
 *   node scripts/release/cli.ts preflight-publish            check OIDC prerequisites inside the publishing job
 *   node scripts/release/cli.ts assert-unpublished           output publish=false when the version is already on npm (safe re-runs)
 *   node scripts/release/cli.ts verify-published <tarball>   confirm npm serves exactly the validated artifact
 *   node scripts/release/cli.ts notes <version> <file>       write GitHub Release notes from CHANGELOG.md
 *
 * Reads no secrets and never publishes: `npm publish` is a separate, explicit workflow step.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  PACKAGE_NAME,
  changelogSection,
  checkPublished,
  fetchRegistryState,
  integrityOf,
  planRelease,
  publishPrerequisites,
  sha256Of,
  tagFor,
  type FetchLike,
} from './lib.ts';

const repo = resolve(import.meta.dirname, '../..');
const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};
const output = (name: string, value: string) => {
  if (process.env['GITHUB_OUTPUT']) appendFileSync(process.env['GITHUB_OUTPUT'], `${name}=${value}\n`);
  console.log(`${name}=${value}`);
};
const summary = (markdown: string) => {
  if (process.env['GITHUB_STEP_SUMMARY']) appendFileSync(process.env['GITHUB_STEP_SUMMARY'], `${markdown}\n`);
};
const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, { cwd: repo, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout.trim() };
};
const packageVersion = (): string =>
  JSON.parse(readFileSync(resolve(repo, 'packages/doq/package.json'), 'utf8')).version;
const fetchJson = ((url, init) => fetch(url, init)) as FetchLike;

function tarballManifest(tarball: string): { name: string; version: string } {
  const result = run('tar', ['-xzOf', tarball, 'package/package.json']);
  if (result.status !== 0) throw new Error(`Cannot read package/package.json from ${tarball}`);
  return JSON.parse(result.stdout);
}

async function plan(tarball: string) {
  const bytes = readFileSync(tarball);
  const manifest = tarballManifest(tarball);
  if (manifest.name !== PACKAGE_NAME) throw new Error(`Tarball is ${manifest.name}, expected ${PACKAGE_NAME}`);
  const version = packageVersion();
  const tag = tagFor(version);
  const remote = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`]);
  const lines = remote.stdout.split('\n').filter(Boolean);
  // An annotated tag lists the tag object and, peeled with ^{}, its commit; the commit is the last line.
  const sha = lines.at(-1)?.split(/\s+/)[0];
  const releaseExists = run('gh', ['release', 'view', tag]).status === 0;
  const registry = await fetchRegistryState(PACKAGE_NAME, version, fetchJson);
  const decision = planRelease({
    ci: {
      event: env('CI_EVENT'),
      conclusion: env('CI_CONCLUSION'),
      headBranch: env('CI_HEAD_BRANCH'),
      headRepository: env('CI_HEAD_REPOSITORY'),
      headSha: env('CI_HEAD_SHA'),
    },
    repository: env('GITHUB_REPOSITORY'),
    workflowSha: env('GITHUB_SHA'),
    defaultBranch: env('DEFAULT_BRANCH'),
    packageVersion: version,
    tarballName: tarball,
    tarballVersion: manifest.version,
    tarballIntegrity: integrityOf(bytes),
    registry,
    tag: { exists: lines.length > 0, ...(sha ? { sha } : {}) },
    releaseExists,
  });
  output('action', decision.action);
  output('version', version);
  output('tag', tag);
  output('tarball_sha256', sha256Of(bytes));
  summary(
    `### Release plan\n\n- Package: \`${PACKAGE_NAME}@${version}\`\n- Decision: **${decision.action}**\n- Reason: ${decision.reason}`,
  );
  if (decision.action === 'refuse') {
    console.error(`::error::Release refused: ${decision.reason}`);
    process.exit(1);
  }
  if (decision.action === 'skip') console.log(`::notice::Nothing published: ${decision.reason}`);
}

function preflight() {
  const npm = run('npm', ['--version']);
  const problems = publishPrerequisites({
    npmVersion: npm.stdout,
    idTokenRequestUrl: process.env['ACTIONS_ID_TOKEN_REQUEST_URL'],
    npmTokenPresent: Boolean(process.env['NODE_AUTH_TOKEN'] || process.env['NPM_TOKEN']),
    runnerHosted: process.env['RUNNER_ENVIRONMENT'] === 'github-hosted',
  });
  console.log(`npm ${npm.stdout}`);
  if (problems.length) {
    for (const problem of problems) console.error(`::error::${problem}`);
    process.exit(1);
  }
  console.log('Trusted Publishing prerequisites are met.');
}

async function assertUnpublished() {
  const version = packageVersion();
  const state = await fetchRegistryState(PACKAGE_NAME, version, fetchJson);
  if (state.kind === 'version-published')
    console.log(`::notice::${PACKAGE_NAME}@${version} is already on npm; not publishing again.`);
  output('publish', state.kind === 'version-published' ? 'false' : 'true');
}

async function verifyPublished(tarball: string) {
  const version = packageVersion();
  const integrity = integrityOf(readFileSync(tarball));
  let result = { ok: false, problems: ['not checked'] as string[] };
  // The registry can lag a few seconds behind a successful publish.
  for (let attempt = 1; attempt <= 12 && !result.ok; attempt++) {
    result = checkPublished(await fetchRegistryState(PACKAGE_NAME, version, fetchJson), integrity, true);
    if (!result.ok) await new Promise((done) => setTimeout(done, 10_000));
  }
  if (!result.ok) {
    console.error(`::error::${PACKAGE_NAME}@${version} is not verifiable on npm: ${result.problems.join('; ')}`);
    process.exit(1);
  }
  const state = await fetchRegistryState(PACKAGE_NAME, version, fetchJson);
  if (state.kind === 'version-published') {
    const download = await fetch(state.tarballUrl);
    if (download.status !== 200) throw new Error(`Public tarball download returned ${download.status}`);
  }
  summary(
    `### Published\n\n\`${PACKAGE_NAME}@${version}\` is public on npm, matches the validated tarball and has provenance.`,
  );
  console.log(`${PACKAGE_NAME}@${version} verified on npm.`);
}

function notes(version: string, file: string) {
  const section = changelogSection(readFileSync(resolve(repo, 'packages/doq/CHANGELOG.md'), 'utf8'), version);
  writeFileSync(
    file,
    `${section ?? `Release ${version}.`}\n\nnpm: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${version}\n`,
  );
}

const [command, first, second] = process.argv.slice(2);
if (command === 'plan' && first) await plan(first);
else if (command === 'preflight-publish') preflight();
else if (command === 'assert-unpublished') await assertUnpublished();
else if (command === 'verify-published' && first) await verifyPublished(first);
else if (command === 'notes' && first && second) notes(first, second);
else {
  console.error(
    'usage: cli.ts plan <tarball> | preflight-publish | assert-unpublished | verify-published <tarball> | notes <version> <file>',
  );
  process.exit(2);
}

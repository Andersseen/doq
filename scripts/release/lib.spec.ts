import { describe, expect, it } from 'vitest';
import {
  changelogSection,
  checkPublished,
  compareVersions,
  fetchRegistryState,
  integrityOf,
  planRelease,
  publishPrerequisites,
  npmPublishArgs,
  type FetchLike,
  type PlanInput,
  type RegistryState,
} from './lib.ts';

const SHA = 'a'.repeat(40);
const tarball = new TextEncoder().encode('validated tarball');
const INTEGRITY = integrityOf(tarball);

const missing: RegistryState = { kind: 'version-missing', latest: '0.1.0' };
const published = (integrity = INTEGRITY): RegistryState => ({
  kind: 'version-published',
  integrity,
  tarballUrl: 'https://registry.npmjs.org/@doqs/analog/-/analog-0.2.0.tgz',
  hasAttestations: true,
});

const base = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  ci: { event: 'push', conclusion: 'success', headBranch: 'main', headRepository: 'Andersseen/doqs', headSha: SHA },
  repository: 'Andersseen/doqs',
  workflowSha: SHA,
  defaultBranch: 'main',
  packageVersion: '0.2.0',
  tarballName: 'doqs-analog-0.2.0.tgz',
  tarballVersion: '0.2.0',
  tarballIntegrity: INTEGRITY,
  registry: missing,
  tag: { exists: false },
  releaseExists: false,
  ...overrides,
});

describe('UNIT-020 release eligibility', () => {
  it('publishes a new version from a validated push to main', () => {
    expect(planRelease(base())).toMatchObject({ action: 'publish' });
  });

  it.each([
    ['a pull request CI run', { event: 'pull_request' }],
    ['a feature branch', { headBranch: 'feature/x' }],
    ['a fork', { headRepository: 'mallory/doq' }],
    ['failed tests', { conclusion: 'failure' }],
    ['cancelled tests', { conclusion: 'cancelled' }],
  ] as const)('refuses %s', (_name, ci) => {
    const plan = planRelease(base({ ci: { ...base().ci, ...ci } }));
    expect(plan.action).toBe('refuse');
  });

  it('skips, never publishes, when main moved past the validated commit', () => {
    expect(planRelease(base({ workflowSha: 'b'.repeat(40) })).action).toBe('skip');
  });

  it('refuses a tarball whose version disagrees with package.json', () => {
    const plan = planRelease(base({ tarballVersion: '0.1.9' }));
    expect(plan).toMatchObject({ action: 'refuse' });
    expect(plan.reason).toMatch(/0\.1\.9.*0\.2\.0/);
  });

  it.each(['0.3.0-rc.1', '1.0', 'latest', '^0.2.0', ''])('refuses the non-stable version %j', (version) => {
    expect(planRelease(base({ packageVersion: version, tarballVersion: version })).action).toBe('refuse');
  });

  it('skips with the bootstrap instruction while the package does not exist on npm', () => {
    const plan = planRelease(base({ registry: { kind: 'package-missing' } }));
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/bootstrap/);
  });

  it('never republishes a version that already exists with different content', () => {
    const plan = planRelease(base({ registry: published('sha512-other') }));
    expect(plan.action).toBe('skip');
    expect(plan.reason).toMatch(/immutable/);
  });

  it('skips a completed release and repairs only the GitHub Release when it is missing', () => {
    const done = base({ registry: published(), tag: { exists: true, sha: SHA }, releaseExists: true });
    expect(planRelease(done).action).toBe('skip');
    expect(planRelease({ ...done, releaseExists: false }).action).toBe('repair-github-release');
    expect(planRelease({ ...done, tag: { exists: false }, releaseExists: false }).action).toBe('repair-github-release');
  });

  it('refuses when the tag points at another commit than the published artifact', () => {
    const plan = planRelease(base({ registry: published(), tag: { exists: true, sha: 'c'.repeat(40) } }));
    expect(plan.action).toBe('refuse');
  });

  it('refuses a tag or release that exists for an unpublished version', () => {
    expect(planRelease(base({ tag: { exists: true, sha: SHA } })).action).toBe('refuse');
    expect(planRelease(base({ releaseExists: true })).action).toBe('refuse');
  });

  it('refuses a version lower than the latest published one', () => {
    expect(planRelease(base({ registry: { kind: 'version-missing', latest: '0.3.0' } })).action).toBe('refuse');
  });
});

describe('UNIT-021 registry state with mocked responses', () => {
  const respond =
    (status: number, body: unknown = {}): FetchLike =>
    async () => ({ status, json: async () => body });

  it('reads a missing package as package-missing without credentials', async () => {
    let headers: Record<string, string> | undefined;
    const spy: FetchLike = async (_url, init) => {
      headers = init?.headers;
      return { status: 404, json: async () => ({ error: 'Not found' }) };
    };
    expect(await fetchRegistryState('@doqs/analog', '0.2.0', spy)).toEqual({ kind: 'package-missing' });
    expect(Object.keys(headers ?? {}).map((key) => key.toLowerCase())).not.toContain('authorization');
  });

  it('requests the scoped packument with an encoded slash', async () => {
    let requested = '';
    await fetchRegistryState('@doqs/analog', '0.2.0', async (url) => {
      requested = url;
      return { status: 404, json: async () => ({}) };
    });
    expect(requested).toBe('https://registry.npmjs.org/@doqs%2fanalog');
  });

  it('distinguishes an unpublished version from a published one', async () => {
    const body = {
      'dist-tags': { latest: '0.1.0' },
      versions: { '0.1.0': { dist: { integrity: 'sha512-a', tarball: 'https://x/a.tgz' } } },
    };
    expect(await fetchRegistryState('@doqs/analog', '0.2.0', respond(200, body))).toEqual({
      kind: 'version-missing',
      latest: '0.1.0',
    });
    expect(await fetchRegistryState('@doqs/analog', '0.1.0', respond(200, body))).toMatchObject({
      kind: 'version-published',
      integrity: 'sha512-a',
      hasAttestations: false,
    });
  });

  it('fails on unexpected statuses and malformed metadata instead of guessing', async () => {
    await expect(fetchRegistryState('@doqs/analog', '0.2.0', respond(503))).rejects.toThrow(/503/);
    const bad = { versions: { '0.2.0': { dist: {} } } };
    await expect(fetchRegistryState('@doqs/analog', '0.2.0', respond(200, bad))).rejects.toThrow(/integrity/);
  });
});

describe('UNIT-022 publishing prerequisites and verification', () => {
  const ready = {
    npmVersion: '11.6.0',
    idTokenRequestUrl: 'https://token',
    npmTokenPresent: false,
    runnerHosted: true,
  };

  it('accepts a hosted runner with OIDC, a recent npm and no token', () => {
    expect(publishPrerequisites(ready)).toEqual([]);
  });

  it('refuses when configuration for Trusted Publishing is unavailable', () => {
    expect(publishPrerequisites({ ...ready, idTokenRequestUrl: undefined })[0]).toMatch(/id-token/);
    expect(publishPrerequisites({ ...ready, npmVersion: '10.9.8' })[0]).toMatch(/11\.5\.1/);
    expect(publishPrerequisites({ ...ready, npmTokenPresent: true })[0]).toMatch(/persistent npm token/);
    expect(publishPrerequisites({ ...ready, runnerHosted: false })[0]).toMatch(/GitHub-hosted/);
  });

  it('compares npm versions numerically', () => {
    expect(compareVersions('11.10.0', '11.5.1')).toBe(1);
    expect(compareVersions('11.5.1', '11.5.1')).toBe(0);
    expect(compareVersions('10.9.8', '11.5.1')).toBe(-1);
  });

  it('accepts only the validated artifact with provenance after publication', () => {
    expect(checkPublished(published(), INTEGRITY, true).ok).toBe(true);
    expect(checkPublished(published('sha512-other'), INTEGRITY, true).problems[0]).toMatch(/differs/);
    expect(
      checkPublished(
        { ...(published() as Extract<RegistryState, { kind: 'version-published' }>), hasAttestations: false },
        INTEGRITY,
        true,
      ).ok,
    ).toBe(false);
    expect(checkPublished(missing, INTEGRITY, true).ok).toBe(false);
  });

  it('extracts one changelog section for the GitHub Release', () => {
    const changelog = '# Changelog\n\n## 0.2.0\n\nSearch.\n\n### Added\n- a\n\n## 0.1.0\n\nFirst.\n';
    expect(changelogSection(changelog, '0.2.0')).toBe('Search.\n\n### Added\n- a');
    expect(changelogSection(changelog, '0.1.0')).toBe('First.');
    expect(changelogSection(changelog, '9.9.9')).toBeUndefined();
  });
});

describe('UNIT-070 npm publish command construction (0.3.0 release regression)', () => {
  it('passes npm an absolute file path, never a bare relative spec', () => {
    const args = npmPublishArgs('artifacts/doqs-analog-0.3.0.tgz', '/work/repo');
    expect(args).toEqual([
      'publish',
      '/work/repo/artifacts/doqs-analog-0.3.0.tgz',
      '--access',
      'public',
      '--provenance',
    ]);
    // The broken command passed `artifacts/<file>.tgz`, which npm 11 resolved as the GitHub repository artifacts/<file>.tgz.
    expect(args[1]).not.toBe('artifacts/doqs-analog-0.3.0.tgz');
    expect(args[1]).toMatch(/^\//);
  });

  it('keeps an already absolute path and refuses anything that is not a tarball', () => {
    expect(npmPublishArgs('/tmp/x/doqs-analog-0.4.0.tgz', '/work')[1]).toBe('/tmp/x/doqs-analog-0.4.0.tgz');
    expect(() => npmPublishArgs('artifacts/pkg', '/work')).toThrow(/Not a package tarball/);
  });
});

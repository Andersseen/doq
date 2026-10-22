/**
 * Release safety logic for @doqs/analog. Pure functions, no I/O except the injected `fetch`, so every refusal is
 * unit-tested with mocked registry responses. `cli.ts` wires this to files, env and GitHub Actions outputs.
 */
import { createHash } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';

export const PACKAGE_NAME = '@doqs/analog';
export const REGISTRY = 'https://registry.npmjs.org';
/** First npm release that supports Trusted Publishing (OIDC) from GitHub Actions. */
export const MIN_NPM_FOR_OIDC = '11.5.1';

export type RegistryState =
  | { kind: 'package-missing' }
  | { kind: 'version-missing'; latest: string | undefined }
  | { kind: 'version-published'; integrity: string; tarballUrl: string; hasAttestations: boolean };

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{
  status: number;
  json(): Promise<unknown>;
}>;

interface Packument {
  'dist-tags'?: { latest?: string };
  versions?: Record<string, { dist?: { integrity?: string; tarball?: string; attestations?: unknown } }>;
}

/** Unauthenticated read of the public packument: works without credentials and cannot see private packages. */
export async function fetchRegistryState(name: string, version: string, fetchImpl: FetchLike): Promise<RegistryState> {
  const response = await fetchImpl(`${REGISTRY}/${name.replace('/', '%2f')}`, {
    headers: { accept: 'application/json' },
  });
  if (response.status === 404) return { kind: 'package-missing' };
  if (response.status !== 200) throw new Error(`Unexpected registry status ${response.status} for ${name}`);
  const packument = (await response.json()) as Packument;
  const entry = packument.versions?.[version];
  if (!entry) return { kind: 'version-missing', latest: packument['dist-tags']?.latest };
  const { integrity, tarball, attestations } = entry.dist ?? {};
  if (!integrity || !tarball) throw new Error(`Registry metadata for ${name}@${version} lacks dist.integrity/tarball`);
  return { kind: 'version-published', integrity, tarballUrl: tarball, hasAttestations: Boolean(attestations) };
}

/** npm's `dist.integrity` format for a tarball: `sha512-<base64>`. */
export const integrityOf = (data: Uint8Array): string => `sha512-${createHash('sha512').update(data).digest('base64')}`;
export const sha256Of = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex');

const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const isStableVersion = (version: string): boolean => STABLE.test(version);
export const tagFor = (version: string): string => `v${version}`;

export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta) return Math.sign(delta);
  }
  return 0;
}

export interface TagState {
  exists: boolean;
  /** Commit the tag resolves to, when it exists. */
  sha?: string;
}

export interface PlanInput {
  /** `github.event.workflow_run` of the CI run that this release run was started by. */
  ci: { event: string; conclusion: string; headBranch: string; headRepository: string; headSha: string };
  /** `github.repository` and `github.sha` of the release workflow run itself. */
  repository: string;
  workflowSha: string;
  defaultBranch: string;
  packageVersion: string;
  tarballName: string;
  tarballVersion: string;
  tarballIntegrity: string;
  registry: RegistryState;
  tag: TagState;
  releaseExists: boolean;
}

export type PlanAction = 'publish' | 'repair-github-release' | 'skip' | 'refuse';
export interface Plan {
  action: PlanAction;
  reason: string;
}

/**
 * Decide what a release run may do. `refuse` fails the run (something is inconsistent or untrusted); `skip` ends it
 * successfully without publishing, with the reason shown in the job summary (never reported as "published").
 */
export function planRelease(input: PlanInput): Plan {
  const refuse = (reason: string): Plan => ({ action: 'refuse', reason });
  const skip = (reason: string): Plan => ({ action: 'skip', reason });
  const { ci, registry, tag } = input;

  // Trust boundary: only a successful push CI run of this repository's default branch, at the commit being released.
  if (ci.event !== 'push') return refuse(`CI run was triggered by "${ci.event}", not a push to ${input.defaultBranch}`);
  if (ci.headBranch !== input.defaultBranch)
    return refuse(`CI run branch "${ci.headBranch}" is not ${input.defaultBranch}`);
  if (ci.headRepository !== input.repository) return refuse(`CI run comes from "${ci.headRepository}", a fork`);
  if (ci.conclusion !== 'success') return refuse(`CI conclusion is "${ci.conclusion}", not success`);
  if (ci.headSha !== input.workflowSha)
    return skip(
      `${input.defaultBranch} moved past the validated commit ${ci.headSha.slice(0, 7)}; the newer CI run decides`,
    );

  if (!isStableVersion(input.packageVersion))
    return refuse(`package.json version "${input.packageVersion}" is not a stable x.y.z version`);
  if (input.tarballVersion !== input.packageVersion)
    return refuse(
      `tarball ${input.tarballName} is ${input.tarballVersion} but package.json is ${input.packageVersion}`,
    );

  const expectedTag = tagFor(input.packageVersion);

  if (registry.kind === 'package-missing')
    return skip(
      `${PACKAGE_NAME} does not exist on npm yet. Trusted Publishing can only be configured for an existing package: ` +
        'perform the documented bootstrap publication first (docs/operations/release-and-deployment.md)',
    );

  if (registry.kind === 'version-published') {
    if (registry.integrity === input.tarballIntegrity) {
      if (tag.exists && tag.sha !== input.ci.headSha)
        return refuse(
          `${expectedTag} points to ${tag.sha?.slice(0, 7)}, not the published commit ${input.ci.headSha.slice(0, 7)}`,
        );
      if (tag.exists && input.releaseExists)
        return skip(`${PACKAGE_NAME}@${input.packageVersion} is published and released`);
      return {
        action: 'repair-github-release',
        reason: `${PACKAGE_NAME}@${input.packageVersion} is published from this artifact; creating the missing GitHub Release`,
      };
    }
    return skip(
      `${PACKAGE_NAME}@${input.packageVersion} is already on npm with different content; versions are immutable. ` +
        'Bump the version in packages/doq/package.json to release again',
    );
  }

  // Version not on npm: a tag or release for it already would mean source and registry disagree.
  if (tag.exists) return refuse(`${expectedTag} already exists but ${input.packageVersion} is not on npm`);
  if (input.releaseExists)
    return refuse(`A GitHub Release for ${expectedTag} exists but ${input.packageVersion} is not on npm`);
  if (registry.latest && compareVersions(input.packageVersion, registry.latest) < 0)
    return refuse(`${input.packageVersion} is lower than the latest published version ${registry.latest}`);
  return { action: 'publish', reason: `${PACKAGE_NAME}@${input.packageVersion} is not on npm and every check passed` };
}

export interface PublishEnv {
  npmVersion: string;
  /** `ACTIONS_ID_TOKEN_REQUEST_URL`: present only when the job has `id-token: write`. */
  idTokenRequestUrl: string | undefined;
  /** Any persistent npm credential in the environment defeats the OIDC-only design. */
  npmTokenPresent: boolean;
  runnerHosted: boolean;
}

/** Problems that make a Trusted Publishing run impossible or unsafe; empty means ready. */
export function publishPrerequisites(env: PublishEnv): string[] {
  const problems: string[] = [];
  if (!env.idTokenRequestUrl) problems.push('the job has no OIDC token (id-token: write missing)');
  if (compareVersions(env.npmVersion, MIN_NPM_FOR_OIDC) < 0)
    problems.push(`npm ${env.npmVersion} is older than ${MIN_NPM_FOR_OIDC}, which is required for Trusted Publishing`);
  if (env.npmTokenPresent)
    problems.push('a persistent npm token is present (NODE_AUTH_TOKEN/NPM_TOKEN); Doq publishes through OIDC only');
  if (!env.runnerHosted) problems.push('Trusted Publishing requires a GitHub-hosted runner');
  return problems;
}

/** The `## <version>` section of a changelog, without its heading, for GitHub Release notes. */
export function changelogSection(changelog: string, version: string): string | undefined {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start < 0) return undefined;
  const end = lines.findIndex((line, index) => index > start && /^## /.test(line));
  return (
    lines
      .slice(start + 1, end < 0 ? undefined : end)
      .join('\n')
      .trim() || undefined
  );
}

export interface PublishedCheck {
  ok: boolean;
  problems: string[];
}

/** After publication: the exact version is public and is the artifact we validated (and has provenance). */
export function checkPublished(
  registry: RegistryState,
  tarballIntegrity: string,
  requireAttestations: boolean,
): PublishedCheck {
  if (registry.kind !== 'version-published') return { ok: false, problems: [`registry state is ${registry.kind}`] };
  const problems: string[] = [];
  if (registry.integrity !== tarballIntegrity) problems.push('registry integrity differs from the validated tarball');
  if (requireAttestations && !registry.hasAttestations) problems.push('registry lists no provenance attestations');
  return { ok: problems.length === 0, problems };
}

/**
 * The argv for `npm publish` of a local tarball. npm treats a bare relative argument such as `artifacts/x.tgz` as a
 * package spec and may resolve it as a GitHub shorthand (`artifacts/x.tgz` -> `github:artifacts/x.tgz`), which is how
 * the 0.3.0 publication failed. An absolute path is always a file, so the argument can never be read as a spec.
 */
export function npmPublishArgs(tarball: string, cwd: string): string[] {
  if (!tarball.endsWith('.tgz')) throw new Error(`Not a package tarball: ${tarball}`);
  const absolute = isAbsolute(tarball) ? tarball : resolve(cwd, tarball);
  return ['publish', absolute, '--access', 'public', '--provenance'];
}

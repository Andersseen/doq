import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repo = resolve(import.meta.dirname, '..');
const read = (path: string) => readFile(resolve(repo, path), 'utf8');
const json = async (path: string) => JSON.parse(await read(path));

describe('UNIT-007 open-source community files', () => {
  const files = [
    'LICENSE',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'SECURITY.md',
    'SUPPORT.md',
    'AGENTS.md',
    'CLAUDE.md',
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/ISSUE_TEMPLATE/bug_report.yml',
    '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
    '.github/dependabot.yml',
    '.github/workflows/ci.yml',
  ];

  it.each(files)('%s exists and is not empty', async (file) => {
    expect(existsSync(resolve(repo, file)), file).toBe(true);
    expect((await read(file)).trim().length).toBeGreaterThan(5);
  });

  it('licenses the repository and the package consistently under MIT', async () => {
    const license = await read('LICENSE');
    expect(license.startsWith('MIT License')).toBe(true);
    expect(await read('packages/doq/LICENSE')).toBe(license);
    expect((await json('packages/doq/package.json')).license).toBe('MIT');
  });

  it('does not invent contact addresses or community channels', async () => {
    for (const file of ['CODE_OF_CONDUCT.md', 'SECURITY.md', 'SUPPORT.md']) {
      expect(await read(file), file).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      expect(await read(file), file).not.toMatch(/discord\.(gg|com)|slack\.com|gitter/i);
    }
  });

  it('tells reporters not to disclose vulnerabilities publicly', async () => {
    const security = await read('SECURITY.md');
    expect(security).toMatch(/do \*\*not\*\* report security problems through public issues/i);
    expect(security).toContain('security/advisories/new');
  });

  it('keeps package metadata pointing at this repository', async () => {
    const manifest = await json('packages/doq/package.json');
    expect(manifest.repository.url).toBe('git+https://github.com/Andersseen/doq.git');
    expect(manifest.bugs.url).toBe('https://github.com/Andersseen/doq/issues');
    expect(manifest.keywords).toContain('angular');
  });
});

describe('UNIT-008 Agentyx configuration is pinned and generated for all three providers', () => {
  it('pins the CLI to an exact version', async () => {
    const version = (await json('package.json')).devDependencies['@agentyx/cli'];
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('targets Codex, Claude Code and Kimi Code and registers the project-owned skill', async () => {
    const config = await json('.agentyx.json');
    expect(config.targets).toEqual(['codex', 'claude', 'kimi']);
    expect(config.skillDirectories).toContain('.agentyx/skills');
    expect(config.localPacks.map((pack: { name: string }) => pack.name)).toContain('doq-workflow');
    expect(config.packs).toContain('doq-workflow');
    expect(existsSync(resolve(repo, '.agentyx/skills/doq-sdd-development/SKILL.md'))).toBe(true);
  });

  it.each([
    '.agentyx.lock.json',
    '.agents/skills/doq-sdd-development/SKILL.md',
    '.claude/skills/doq-sdd-development/SKILL.md',
    '.codex/config.toml',
    '.mcp.json',
    '.kimi-code/mcp.json',
  ])('has the generated file %s', (file) => {
    expect(existsSync(resolve(repo, file)), file).toBe(true);
  });

  it('keeps MCP definitions pinned and free of credentials', async () => {
    for (const file of ['.codex/config.toml', '.mcp.json', '.kimi-code/mcp.json']) {
      const text = await read(file);
      expect(text, file).toContain('context7');
      expect(text, file).toContain('@playwright/mcp@');
      expect(text, file).not.toMatch(/@latest/);
      expect(text, file).not.toMatch(/(token|secret|api[_-]?key|authorization)/i);
    }
  });
});

describe('UNIT-009 agent instructions have one canonical source', () => {
  it('CLAUDE.md only imports AGENTS.md', async () => {
    expect((await read('CLAUDE.md')).trim()).toBe('@AGENTS.md');
  });

  it('AGENTS.md names every mandatory verification command that exists as a package script', async () => {
    const scripts = (await json('package.json')).scripts as Record<string, string>;
    const agents = await read('AGENTS.md');
    for (const command of [
      'sdd:new',
      'sdd:check',
      'test:unit',
      'test:components',
      'test:e2e',
      'test:contract',
      'verify:change',
      'quality:gate',
      'verify:mvp',
    ]) {
      expect(scripts[command], command).toBeTruthy();
      expect(agents, command).toContain(`pnpm ${command}`);
    }
  });
});

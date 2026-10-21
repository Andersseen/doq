import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSpec, render, validateSpecName, type Spec } from './lib.ts';

const valid = (): Spec => ({
  name: '0002-example',
  files: {
    'spec.md': `# 0002
## Problem
Readers cannot find pages.
## Consumer impact
Hosts get search.
## Scope
A search box.
## Non-goals
Ranking.
## Requirements
- **REQ-001** The index lists pages.
- **REQ-002** Pages are linked.
## Acceptance cases
- **AC-001** [REQ-001] The index shows one card per page.
- **AC-002** [REQ-002, REQ-001] Cards link to routes.
## Public API impact
None.
## Compatibility
Angular 21.
`,
    'design.md': `## Existing implementation
Catalog.
## Proposed implementation
Reuse it.
## Tradeoffs and alternatives
None needed.
`,
    'tasks.md': `- [ ] T-001 [REQ-001, AC-001] Render cards.
- [x] T-002 [REQ-002, AC-002] Link cards.
`,
    'verification.md': `## Test cases
| Case | Acceptance | Checks | Result |
| ---- | ---------- | ------ | ------ |
| COMP-001 | AC-001 | cards | PASS |
| E2E-001 | AC-002, AC-001 | links | NOT RUN |
## Executed commands
pnpm test:components
## Remaining limitations
None.
`,
  },
});

const mutate = (change: (spec: Spec) => void) => {
  const spec = valid();
  change(spec);
  return checkSpec(spec);
};
const edit = (spec: Spec, file: keyof Spec['files'], from: string | RegExp, to: string) => {
  spec.files[file] = spec.files[file]!.replace(from, to);
};

describe('SDD-001 spec naming', () => {
  it.each([
    ['2', 'ok', /four digits/],
    ['0002', 'Bad Slug', /kebab-case/],
    ['0002', '', /kebab-case/],
    ['abcd', 'ok-slug', /four digits/],
  ])('rejects id=%j slug=%j', (id, slug, message) => {
    expect(validateSpecName(id, slug).join()).toMatch(message);
  });
  it('accepts a valid name', () => expect(validateSpecName('0002', 'search-index')).toEqual([]));
});

describe('SDD-002 a complete, traceable spec passes', () => {
  it('has no errors', () => expect(checkSpec(valid())).toEqual([]));
});

describe('SDD-003 requirement and reference integrity', () => {
  it('rejects duplicate requirement ids', () => {
    expect(mutate((s) => edit(s, 'spec.md', '**REQ-002**', '**REQ-001**'))).toContain(
      '0002-example/spec.md: duplicate requirement REQ-001',
    );
  });
  it('rejects acceptance cases that reference an unknown requirement', () => {
    expect(mutate((s) => edit(s, 'spec.md', '[REQ-001] The index', '[REQ-009] The index')).join('\n')).toContain(
      'AC-001 references unknown requirement REQ-009',
    );
  });
  it('rejects a requirement without an acceptance case', () => {
    expect(mutate((s) => edit(s, 'spec.md', '[REQ-002, REQ-001]', '[REQ-001]')).join('\n')).toContain(
      'requirement REQ-002 has no acceptance case',
    );
  });
  it('rejects a requirement without a task', () => {
    expect(mutate((s) => edit(s, 'tasks.md', /- \[x\] T-002.*\n/, '')).join('\n')).toContain(
      'requirement REQ-002 has no task',
    );
  });
  it('rejects tasks referencing unknown acceptance cases', () => {
    expect(mutate((s) => edit(s, 'tasks.md', 'AC-002', 'AC-007')).join('\n')).toContain(
      'T-002 references unknown acceptance case AC-007',
    );
  });
});

describe('SDD-004 verification traceability', () => {
  it('rejects an acceptance case with no verification case', () => {
    expect(
      mutate((s) => edit(s, 'verification.md', /\| E2E-001.*\n/, '| COMP-002 | AC-001 | x | PASS |\n')).join('\n'),
    ).toContain('acceptance case AC-002 has no verification case');
  });
  it('rejects verification cases for unknown acceptance cases', () => {
    expect(mutate((s) => edit(s, 'verification.md', 'AC-002, AC-001', 'AC-005, AC-002, AC-001')).join('\n')).toContain(
      'E2E-001 references unknown acceptance case AC-005',
    );
  });
  it('rejects duplicate test case ids and rows with a missing result', () => {
    expect(mutate((s) => edit(s, 'verification.md', 'E2E-001', 'COMP-001')).join('\n')).toContain(
      'duplicate test case COMP-001',
    );
    expect(mutate((s) => edit(s, 'verification.md', '| NOT RUN |', '| maybe |')).join('\n')).toContain(
      'malformed test-case row',
    );
  });
  it('rejects a test id that no test source contains, but never checks MANUAL cases', () => {
    const spec = valid();
    expect(checkSpec(spec, { testExists: (id) => id !== 'E2E-001' })).toEqual([
      '0002-example/verification.md: E2E-001 does not appear in any test source',
    ]);
    edit(spec, 'verification.md', 'E2E-001', 'MANUAL-001');
    expect(checkSpec(spec, { testExists: () => false }).join()).toContain('COMP-001');
    expect(checkSpec(spec, { testExists: () => false }).join()).not.toContain('MANUAL-001');
  });
});

describe('SDD-005 malformed and incomplete content', () => {
  it('rejects identifiers without three digits', () => {
    expect(mutate((s) => edit(s, 'tasks.md', 'T-002', 'T-2')).join('\n')).toContain('malformed identifier "T-2"');
    expect(mutate((s) => edit(s, 'verification.md', 'AC-001 | cards', 'AC-01 | cards')).join('\n')).toContain(
      'malformed identifier "AC-01"',
    );
  });
  it('rejects missing files, missing sections, empty sections and unfinished markers', () => {
    expect(mutate((s) => delete s.files['design.md']).join()).toContain('missing design.md');
    expect(mutate((s) => edit(s, 'spec.md', '## Non-goals\nRanking.\n', '')).join('\n')).toContain(
      'missing section "## Non-goals"',
    );
    expect(mutate((s) => edit(s, 'spec.md', 'Ranking.', '<!-- later -->')).join('\n')).toContain(
      'section "## Non-goals" is empty',
    );
    expect(mutate((s) => edit(s, 'spec.md', 'A search box.', 'TODO(sdd): fill in')).join('\n')).toContain(
      'unfinished marker',
    );
  });
});

describe('SDD-006 template rendering and scaffolding', () => {
  it('replaces known placeholders only', () => {
    expect(render('# {{id}} {{title}} {{other}}', { id: '0002', title: 'x' })).toBe('# 0002 x {{other}}');
  });

  it('sdd:new creates a spec that sdd:check rejects until it is filled in, and refuses to overwrite', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'doq-sdd-'));
    try {
      const run = (script: string, ...args: string[]) =>
        spawnSync('node', [resolve(import.meta.dirname, script), ...args], {
          env: { ...process.env, DOQ_SPECS_ROOT: root },
          encoding: 'utf8',
        });
      expect(run('new.ts', '2', 'bad').status).toBe(2);
      expect(run('new.ts', '0003', 'Bad').status).toBe(2);
      const created = run('new.ts', '0003', 'sample-change');
      expect(created.status, created.stderr).toBe(0);
      expect(await readdir(resolve(root, '0003-sample-change'))).toEqual([
        'design.md',
        'spec.md',
        'tasks.md',
        'verification.md',
      ]);
      expect(await readFile(resolve(root, '0003-sample-change/spec.md'), 'utf8')).toContain('# 0003 — sample change');
      expect(run('new.ts', '0003', 'sample-change').status).toBe(1); // existing id is never overwritten
      const checked = run('check.ts', resolve(root, '0003-sample-change'));
      expect(checked.status).toBe(1);
      expect(checked.stderr).toContain('unfinished marker');
      await writeFile(resolve(root, '0003-sample-change/spec.md'), 'kept');
      expect(run('new.ts', '0003', 'other').status).toBe(1);
      expect(await readFile(resolve(root, '0003-sample-change/spec.md'), 'utf8')).toBe('kept');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

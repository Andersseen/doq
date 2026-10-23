import { describe, expect, it } from 'vitest';
import { compareWithBaseline, readDeclarations, type ApiReport } from './public-api.ts';

const report = (source: string): ApiReport => ({
  version: 'x',
  entries: { '.': readDeclarations('index.d.ts', source) },
  files: [],
  bin: { doq: './bin/doq.mjs' },
});

const BASE = `
export interface DoqConfig { contentDirectory: string; basePath?: string; /** doc */ sidebar?: 'left' | 'right'; }
export declare function defineDoqConfig(config: DoqConfig): DoqConfig;
export type Mode = 'a' | 'b';
export declare class Thing { static ɵfac: unknown; private secret; value: number; run(): void; }
declare const internal: number;
export { internal as renamed };
`;

describe('UNIT-080 public API report', () => {
  it('lists exports as printed declarations, with members and without internals or comments', () => {
    const api = readDeclarations('index.d.ts', BASE);
    expect(Object.keys(api)).toEqual(['DoqConfig', 'Mode', 'Thing', 'defineDoqConfig', 'renamed']);
    expect(api['DoqConfig']!.members).toEqual({
      basePath: 'basePath?: string;',
      contentDirectory: 'contentDirectory: string;',
      sidebar: "sidebar?: 'left' | 'right';",
    });
    expect(Object.keys(api['Thing']!.members!)).toEqual(['run', 'value']);
    expect(api['defineDoqConfig']!.text).toBe('export declare function defineDoqConfig(config: DoqConfig): DoqConfig;');
    expect(api['renamed']!.text).toContain('renamed = declare const internal: number');
  });
});

describe('UNIT-081 compatibility against a baseline (negative controls)', () => {
  const baseline = report(BASE);
  const problems = (source: string) => compareWithBaseline(baseline, report(source));

  it('accepts the identical API and purely additive changes', () => {
    expect(problems(BASE)).toEqual([]);
    expect(problems(`${BASE}\nexport declare const added: number;`)).toEqual([]);
    expect(problems(BASE.replace('basePath?: string;', 'basePath?: string; newOption?: boolean;'))).toEqual([]);
    expect(problems(BASE.replace('run(): void;', 'run(): void; extra(): void;'))).toEqual([]);
  });

  it('detects a removed export', () => {
    expect(problems(BASE.replace("export type Mode = 'a' | 'b';", ''))).toEqual([
      expect.stringContaining('export "Mode" was removed'),
    ]);
  });

  it('detects a removed or retyped member, even though the export is still present', () => {
    expect(problems(BASE.replace('basePath?: string;', ''))).toEqual([
      expect.stringContaining('DoqConfig.basePath was removed'),
    ]);
    expect(problems(BASE.replace('basePath?: string;', 'basePath?: number;'))).toEqual([
      expect.stringContaining('DoqConfig.basePath changed'),
    ]);
  });

  it('detects an incompatible function signature and a changed alias', () => {
    expect(problems(BASE.replace('config: DoqConfig', 'config: DoqConfig, extra: string'))).toEqual([
      expect.stringContaining('"defineDoqConfig" changed'),
    ]);
    expect(problems(BASE.replace("'a' | 'b'", "'a'"))).toEqual([expect.stringContaining('"Mode" changed')]);
  });

  it('detects a new required interface member but not an optional one', () => {
    expect(problems(BASE.replace('basePath?: string;', 'basePath?: string; mustSet: string;'))).toEqual([
      expect.stringContaining('new required member'),
    ]);
  });

  it('detects a removed binary and a kind change', () => {
    expect(compareWithBaseline(baseline, { ...report(BASE), bin: {} })).toEqual([
      expect.stringContaining('binary "doq" was removed'),
    ]);
    expect(
      problems(
        BASE.replace('export declare class Thing', 'export interface Thing').replace(
          'static ɵfac: unknown; private secret; value: number; run(): void;',
          'value: number; run(): void;',
        ),
      ),
    ).toEqual([expect.stringContaining('changed from class to interface')]);
  });
});

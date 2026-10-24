import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, '../..', file), 'utf8'));
const report = read('public-api.report.json');
const stability = read('public-api.stability.json');

const browserExports = [...new Set([...Object.keys(report.entries['.']), ...Object.keys(report.entries['./config'])])].sort();
const classified: string[] = [
  ...stability.stable,
  ...stability.advanced,
  ...Object.keys(stability.deprecated),
  ...stability.internal,
];

describe('UNIT-140 API-01 / API-02 stable API inventory', () => {
  it('classifies every export of the browser entries exactly once', () => {
    expect([...classified].sort()).toEqual(browserExports);
    expect(new Set(classified).size).toBe(classified.length);
  });

  it('lists only exports that exist, so a removal cannot hide behind the inventory', () => {
    for (const name of [...stability.stable, ...stability.advanced, ...Object.keys(stability.deprecated)])
      expect(browserExports, name).toContain(name);
  });

  it('keeps the contract of the 1.0 readiness document stable', () => {
    for (const name of ['defineDoqConfig', 'provideDoq', 'doqRoutes', 'doqPrerenderRoutes', 'DoqConfig', 'DoqShellComponent', 'formatDoqUsage'])
      expect(stability.stable, name).toContain(name);
  });

  it('gives the accidental example component an explicit treatment: deprecated, still exported, with a reason', () => {
    expect(report.entries['.']['DoqButtonDemoComponent']).toBeTruthy();
    expect(stability.deprecated['DoqButtonDemoComponent']).toMatch(/DoqConfig\.demos/);
    expect(readFileSync(resolve(import.meta.dirname, '../../src/lib/doq-demo.component.ts'), 'utf8')).toContain('@deprecated');
  });
});

describe('UNIT-141 API-03 the root entry keeps every 0.10 export', () => {
  it('re-exports the configuration surface unchanged from the lightweight entry', () => {
    for (const name of Object.keys(report.entries['./config'])) {
      if (stability.internal.includes(name) && !(name in report.entries['.'])) continue; // shared helpers need not be public from the root
      expect(report.entries['.'][name], name).toEqual(report.entries['./config'][name]);
    }
  });

  it('exposes exactly the documented entry points', () => {
    expect(Object.keys(report.entries).sort()).toEqual(['.', './api-reference', './config', './content', './search-index', './vite']);
  });
});

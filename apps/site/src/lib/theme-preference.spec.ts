import { describe, expect, it } from 'vitest';
import { isThemeChoice, resolveDark } from './theme-preference.ts';

describe('UNIT-050 theme preference resolution', () => {
  it('lets an explicit choice win over the system preference', () => {
    expect(resolveDark('light', true)).toBe(false);
    expect(resolveDark('dark', false)).toBe(true);
  });

  it('follows the system preference without a stored choice', () => {
    expect(resolveDark(null, true)).toBe(true);
    expect(resolveDark(undefined, false)).toBe(false);
  });

  it('ignores stored values that are not a theme choice', () => {
    for (const bad of ['', 'auto', 'DARK', 1, {}]) {
      expect(isThemeChoice(bad), String(bad)).toBe(false);
      expect(resolveDark(bad, true), String(bad)).toBe(true);
    }
  });
});

// Build-safe and browser-free: shared by the app config, the theme controller and the unit tests.
export const themeStorageKey = 'doqs-theme';

export type ThemeChoice = 'light' | 'dark';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark';
}

/** An explicit choice wins; otherwise the system preference decides. */
export function resolveDark(stored: unknown, systemPrefersDark: boolean): boolean {
  return isThemeChoice(stored) ? stored === 'dark' : systemPrefersDark;
}

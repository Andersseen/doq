import { DOCUMENT } from '@angular/common';
import { afterNextRender, Injectable, inject, signal } from '@angular/core';
import { applyVoltTheme } from '@voltui/components';
import { resolveDark, themeStorageKey } from '../lib/theme-preference';

/** Browser-only read of the stored choice and the system preference; safe to call during SSR. */
export function readInitialDark(): boolean {
  if (typeof window === 'undefined') return false;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(themeStorageKey);
  } catch {
    // Storage can be blocked; the system preference still applies.
  }
  return resolveDark(stored, window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/**
 * Thin host layer over Volt's own theme infrastructure: Volt applies `.dark` and the color scheme,
 * this service only decides the value and remembers an explicit choice.
 */
@Injectable({ providedIn: 'root' })
export class ThemeController {
  private readonly document = inject(DOCUMENT);
  readonly dark = signal(false);

  constructor() {
    // The server and the first client render agree on "light"; the real state is read after hydration.
    afterNextRender(() => this.dark.set(this.document.documentElement.classList.contains('dark')));
  }

  toggle() {
    const dark = !this.dark();
    this.dark.set(dark);
    applyVoltTheme({ dark }, this.document);
    try {
      this.document.defaultView?.localStorage.setItem(themeStorageKey, dark ? 'dark' : 'light');
    } catch {
      // The choice still applies for this visit.
    }
  }
}

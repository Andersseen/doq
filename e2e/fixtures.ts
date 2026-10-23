import { expect, test as base, type Page } from '@playwright/test';
import { apps } from '../playwright.config.ts';

export { apps, expect };

/**
 * Reads the clipboard back and compares it. Only Chromium lets a test grant `clipboard-read`; Firefox and WebKit have no such
 * permission, so there the visible "Code copied" confirmation (asserted by the caller) is the evidence and the gap is annotated.
 */
export async function expectClipboard(page: Page, expected: string): Promise<void> {
  if (page.context().browser()?.browserType().name() === 'chromium') {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  } else {
    test.info().annotations.push({
      type: 'clipboard',
      description: 'read-back not testable: clipboard-read cannot be granted in this engine',
    });
  }
}

const HARNESS_LAYOUT_WARNING =
  /^\[JavaScript Warning: "Layout was forced before the page was fully loaded\..*\{file: "debugger eval code"/;

/** Every test fails on uncaught exceptions, console errors/warnings and failed requests (hydration regressions surface here). */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          // Firefox reports, for Playwright's own evaluation (`{file: "debugger eval code"}`, never page code), that layout was
          // measured while the document was still settling. Nothing in the page produced it, so it is not a page problem.
          if (HARNESS_LAYOUT_WARNING.test(message.text())) return;
          problems.push(`console.${message.type()}: ${message.text()}`);
        }
      });
      page.on('requestfailed', (request) =>
        problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`),
      );
      await use(problems);
      expect(problems, 'browser reported errors or warnings').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * The key that moves focus to the next focusable element. Safari's default (and therefore Playwright's WebKit on macOS) skips
 * links and many buttons on plain Tab unless a system option is enabled; Option+Tab is its "visit everything" chord.
 * WebKit on Linux, Firefox and Chromium tab to every control, so Tab is right there.
 */
export const nextFocusKey = (page: Page, backwards = false): string => {
  const safariOnMac = process.platform === 'darwin' && page.context().browser()?.browserType().name() === 'webkit';
  return `${safariOnMac ? 'Alt+' : ''}${backwards ? 'Shift+' : ''}Tab`;
};

/**
 * What the engine reports for a resource that legitimately answered 404 (a missing page or search bundle). Chromium logs a
 * console error and an aborted request; Firefox reports a corrupted-content request failure and a module-load warning; WebKit
 * a cancelled request. Chromium keeps its exact expectation in the callers; the others must report nothing but this.
 */
export const EXPECTED_404_NOISE =
  /^console\.error: Failed to load resource|^requestfailed: \S+\/pagefind\/pagefind\.js |^console\.warning: \[JavaScript Warning: "Loading failed for the module with source .*pagefind\.js/;

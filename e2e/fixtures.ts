import { expect, test as base } from '@playwright/test';
import { apps } from '../playwright.config.ts';

export { apps, expect };

/** Every test fails on uncaught exceptions, console errors/warnings and failed requests (hydration regressions surface here). */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning')
          problems.push(`console.${message.type()}: ${message.text()}`);
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

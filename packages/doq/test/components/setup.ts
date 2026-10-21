import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

import { vi } from 'vitest';

// Analog fills its content lists from a Vite import.meta.glob at build time, which no unit environment
// has. Everything else in @analogjs/content (renderer, markdown component, parsing) stays real.
vi.mock('@analogjs/content', async (importOriginal) => {
  const original = await importOriginal<typeof import('@analogjs/content')>();
  const state = await import('./content-state');
  return {
    ...original,
    injectContentFiles: (filter?: (file: { filename: string }) => boolean) =>
      filter ? state.fileList().filter(filter) : state.fileList(),
    injectContentFilesMap: () => state.fileMap(),
  };
});

import { afterEach } from 'vitest';

afterEach(() => {
  getTestBed().resetTestingModule();
});

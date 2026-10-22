import '@angular/compiler';
import { afterEach } from 'vitest';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

afterEach(() => getTestBed().resetTestingModule());

// jsdom has no IntersectionObserver; Angular Movement's in-view reveal needs one. A no-op keeps content in place.
class IdleIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, 'IntersectionObserver', { value: IdleIntersectionObserver, configurable: true });

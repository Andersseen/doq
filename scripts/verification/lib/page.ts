import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import type { CDP } from './cdp.ts';
import { waitFor } from './wait.ts';

const KEY_CODES: Record<string, number> = { Escape: 27, Tab: 9, Enter: 13 };

/** Browser-page helpers shared by every check. */
export class Page {
  readonly cdp: CDP;

  constructor(cdp: CDP) {
    this.cdp = cdp;
  }

  evaluate<T = any>(expression: string, awaitPromise = true): Promise<T> {
    return this.cdp.evaluate<T>(expression, awaitPromise);
  }

  send<T = any>(method: string, params: object = {}): Promise<T> {
    return this.cdp.send<T>(method, params);
  }

  on(name: string, listener: (params: any) => void): void {
    this.cdp.on(name, listener);
  }

  off(name: string, listener: (params: any) => void): void {
    this.cdp.off(name, listener);
  }

  /** Emulate exact CSS viewport dimensions and verify the browser applied them. */
  async viewport(width: number, height: number): Promise<void> {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const actual = await this.evaluate('({width:innerWidth,height:innerHeight})');
    assert.deepEqual(actual, { width, height }, 'browser viewport differs from requested dimensions');
  }

  /** Load a URL and wait until a Doq or host landing page has rendered. */
  async navigate(url: string): Promise<void> {
    await this.send('Page.navigate', { url });
    await this.send('Page.bringToFront');
    await waitFor(async () => (await this.evaluate('document.readyState')) === 'complete', 'document load');
    await waitFor(
      () => this.evaluate("!!document.querySelector('doq-docs, .doq-index, .landing-a, .landing-b')"),
      'app content',
    );
    await delay(250);
  }

  /** Scroll an element into view and click its centre with real mouse events. */
  async click(selector: string): Promise<void> {
    const rect = await this.evaluate<{ x: number; y: number } | null>(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`,
    );
    assert.ok(rect, `missing clickable ${selector}`);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.send('Input.dispatchMouseEvent', { type, x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    }
  }

  async press(key: string): Promise<void> {
    const code = KEY_CODES[key] ?? 0;
    for (const type of ['keyDown', 'keyUp']) {
      await this.send('Input.dispatchKeyEvent', {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
      });
    }
  }

  async waitVisible(selector: string): Promise<void> {
    await waitFor(
      () =>
        this.evaluate(
          `(()=>{const e=document.querySelector(${JSON.stringify(selector)});return !!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0})()`,
        ),
      `${selector} visible`,
    );
  }
}

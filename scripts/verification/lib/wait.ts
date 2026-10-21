import { setTimeout as delay } from 'node:timers/promises';

/** Poll `test` every 100ms until it returns truthy; throws a descriptive timeout otherwise. */
export async function waitFor(test: () => unknown, message: string, timeout = 15000): Promise<void> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      if (await test()) return;
    } catch {
      // Not ready yet; keep polling.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${message}`);
}

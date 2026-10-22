// Node-only. Shared by the API reference generator modules.

/** A failure the CLI reports without a stack trace. `exitCode` 2 is a usage/configuration problem, 1 a failed run. */
export class DoqApiError extends Error {
  /** @param {string} message @param {number} [exitCode] */
  constructor(message, exitCode = 1) {
    super(message);
    this.name = 'DoqApiError';
    this.exitCode = exitCode;
  }
}

/** Locale-independent ordering, so output never depends on the machine's ICU data. */
export const compare = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);

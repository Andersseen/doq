// Node-only. Shared by the content authoring modules (`doq content`, `@doqs/analog/content`).

/**
 * What went wrong, for the exit code and the wording of the report.
 * @typedef {'config' | 'invalid-authoring' | 'missing-source' | 'unsafe-path' | 'unknown-symbol' | 'ambiguous-symbol' | 'stale' | 'conflict'} DoqContentErrorKind
 */

export const EXIT_CODES = Object.freeze({ stale: 1, config: 2, conflict: 3, authoring: 4 });

/** A failure the CLI reports without a stack trace. `exitCode` 1 is stale output, 2 configuration, 3 a conflict, 4 invalid authoring. */
export class DoqContentError extends Error {
  /** @param {string} message @param {DoqContentErrorKind} [kind] @param {number} [exitCode] */
  constructor(message, kind = 'config', exitCode = kind === 'config' ? EXIT_CODES.config : kind === 'conflict' ? EXIT_CODES.conflict : kind === 'stale' ? EXIT_CODES.stale : EXIT_CODES.authoring) {
    super(message);
    this.name = 'DoqContentError';
    this.kind = kind;
    this.exitCode = exitCode;
  }
}

/**
 * One authoring problem, located in the page the author wrote.
 * @typedef {{ kind: DoqContentErrorKind, file: string, line: number, directive: string, reference: string, message: string, hint?: string }} DoqContentDiagnostic
 */

/** Locale-independent ordering, so output never depends on the machine's ICU data. */
export const compare = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);

/** @param {DoqContentDiagnostic} d */
export function formatDiagnostic(d) {
  const where = `${d.file}:${d.line}`;
  return [`  ${where}  ${d.kind}  ${d.directive} ${d.reference}`, `    ${d.message}`, ...(d.hint ? [`    Fix: ${d.hint}`] : [])].join('\n');
}

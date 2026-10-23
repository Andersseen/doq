export interface DoqDeterministicMarkdownOptions {
  /** Name of Analog's Markdown plugin. Default `analogjs-content-file`. */
  contentPlugin?: string;
}

/** Minimal structural type of the returned Vite plugin, so the package needs no dependency on Vite. */
export interface DoqVitePlugin {
  name: string;
  enforce: 'pre';
  configResolved(config: { plugins: readonly { name: string }[] }): void;
  load(this: unknown, id: string): unknown;
}

/**
 * A Vite plugin that renders Analog's Markdown files one at a time, so duplicate-heading ids (`usage`, `usage-1`) cannot
 * be corrupted by concurrent renders. Add it next to `analog()` in `vite.config.ts`.
 */
export function doqDeterministicMarkdown(options?: DoqDeterministicMarkdownOptions): DoqVitePlugin;

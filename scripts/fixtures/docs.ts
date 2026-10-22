/**
 * Generated documentation fixtures for stress and scaling checks. Nothing here is committed as Markdown: the documents are
 * produced on demand into a disposable consumer, so a thousand-page site costs no repository space.
 *
 * Every document repeats headings (`Usage`, `Details`, a nested `Usage`) so duplicate-heading suffixes are exercised on
 * every page, mixes rich Markdown (callouts, tabs, steps, titled code, tables, an inline demo placed between two duplicate
 * headings) and is a pure function of its index, so two generations are byte-identical.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface DocsFixtureOptions {
  /** Number of documents to write into each directory. */
  readonly count: number;
  /** Id of an inline demo registered by the consuming app; omit to leave demos out. */
  readonly demo?: string;
  /** Tag that makes titles and ids unique per version (for example `v1`). */
  readonly label?: string;
}

export function fixtureDocument(index: number, { demo, label = 'current' }: Pick<DocsFixtureOptions, 'demo' | 'label'>): { path: string; markdown: string } {
  const n = String(index).padStart(4, '0');
  const group = `Group ${String(Math.floor(index / 10)).padStart(3, '0')}`;
  const markdown = `---
title: Stress ${n} (${label})
description: Generated fixture document ${n} for the ${label} documentation.
group: ${group}
order: ${index + 10}
---

Generated fixture ${n}. This paragraph gives the page enough text to be meaningful content for the indexer and the checks.

## Usage

Call the API as shown below.

\`\`\`ts
export const value${n} = ${index};
\`\`\`

> [!NOTE]
> Fixture ${n} callout. It must survive the rich Markdown pass.

${demo ? `::demo[${demo}]\n` : 'A paragraph in place of an inline demo.\n'}
## Usage

The second Usage heading must become \`usage-1\` on every build, in every render order.

### Details

| Option | Meaning |
| ------ | ------- |
| \`a\` | First option of ${n} |
| \`b\` | Second option of ${n} |

### Details

:::tabs Install ${n}
:::tab npm
\`\`\`bash
npm install fixture-${n}
\`\`\`
:::tab pnpm
\`\`\`bash
pnpm add fixture-${n}
\`\`\`
:::end

:::steps
1. Install fixture ${n}.
2. Configure it.
3. Ship it.
:::end

## Related

See [the first fixture](./stress-0000) and [Usage](#usage).
`;
  return { path: `stress/stress-${n}.md`, markdown };
}

export async function writeDocsFixture(contentDirectory: string, options: DocsFixtureOptions): Promise<number> {
  for (let index = 0; index < options.count; index++) {
    const { path, markdown } = fixtureDocument(index, options);
    const target = join(contentDirectory, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, markdown);
  }
  return options.count;
}

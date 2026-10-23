#!/usr/bin/env node
import { relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DoqApiError, checkApiReference, generateApiReference, strictMessage } from './api-reference.mjs';
import { conflictMessage } from './api-reference/output.mjs';
import { assertSupportedNode } from './cli/node-support.mjs';

assertSupportedNode('doq-api');

const usage = `Usage: doq-api <generate|check> --entry <file> [options]

  generate   write the API reference pages (Markdown) from the library's public TypeScript API
  check      compare the pages with the source and exit 1 when they are stale; writes nothing

Options:
  --entry <file>         public entry point, e.g. projects/lib/src/public-api.ts (required)
  --project <tsconfig>   TypeScript project used to resolve imports and paths (default: built-in options)
  --out <dir>            output directory, inside the content directory (default src/content/docs/reference/generated)
  --content-dir <dir>    Doqs content directory (default src/content/docs)
  --base-path <path>     Doqs basePath, used for cross-links (default /docs; use / for docs-first sites)
  --group <name>         sidebar group of the generated pages (default "API reference")
  --title <text>         title of the generated index page (default "API reference")
  --order-start <n>      sidebar order of the index page; symbols follow (default 1000, after hand-written pages)
  --source-url <tpl>     link template for declarations, e.g. https://github.com/o/r/blob/main/{path}#L{line}
  --include <list>       only these categories: component,directive,pipe,service,function,class,interface,type,enum,constant
  --exclude <list>       skip these categories
  --strict               fail on warnings and on public symbols without a documentation comment
  --cwd <dir>            project root (default: the current directory)
`;

const optionSpec = {
  entry: { type: 'string' },
  project: { type: 'string' },
  out: { type: 'string' },
  'content-dir': { type: 'string' },
  'base-path': { type: 'string' },
  group: { type: 'string' },
  title: { type: 'string' },
  'source-url': { type: 'string' },
  'order-start': { type: 'string' },
  include: { type: 'string' },
  exclude: { type: 'string' },
  strict: { type: 'boolean' },
  cwd: { type: 'string' },
  help: { type: 'boolean', short: 'h' },
};

function fail(/** @type {string} */ message, code = 2) {
  console.error(message);
  process.exit(code);
}

let parsed;
try {
  parsed = parseArgs({ args: process.argv.slice(2), options: optionSpec, allowPositionals: true });
} catch (error) {
  fail(`doq-api: ${error instanceof Error ? error.message : error}\n\n${usage}`);
}
const [command, ...extra] = parsed.positionals;
if (parsed.values.help || command === 'help') {
  console.log(usage);
  process.exit(0);
}
if ((command !== 'generate' && command !== 'check') || extra.length) fail(usage);
const v = parsed.values;
const options = {
  entry: v.entry,
  project: v.project,
  out: v.out,
  contentDir: v['content-dir'],
  basePath: v['base-path'],
  group: v.group,
  title: v.title,
  sourceUrl: v['source-url'],
  orderStart: v['order-start'] === undefined ? undefined : Number(v['order-start']),
  include: v.include,
  exclude: v.exclude,
  strict: v.strict,
  cwd: v.cwd,
};

function printDiagnostics(/** @type {{ severity: string, symbol: string, message: string }[]} */ diagnostics) {
  for (const d of diagnostics) if (d.severity === 'warning') console.error(`doq-api: warning: ${d.symbol}: ${d.message}`);
}

try {
  if (command === 'generate') {
    const result = await generateApiReference(options);
    const shown = relative(resolve(options.cwd ?? '.'), result.outDir) || '.';
    printDiagnostics(result.diagnostics);
    const changed = result.written.length + result.removed.length;
    console.log(
      `doq-api: ${result.symbolCount} symbols, ${result.fileCount} pages in ${shown} (${changed ? `${result.written.length} written, ${result.removed.length} removed` : 'already up to date'}; TypeScript ${result.typescriptVersion})`,
    );
  } else {
    const result = await checkApiReference(options);
    const shown = relative(resolve(options.cwd ?? '.'), result.outDir) || '.';
    printDiagnostics(result.diagnostics);
    if (result.problems.length) fail(strictMessage(result.problems), 1);
    if (result.conflicts.length) fail(conflictMessage(result.conflicts), 1);
    if (!result.upToDate) {
      const lines = [
        ...result.added.map((f) => `  added     ${f}`),
        ...result.modified.map((f) => `  modified  ${f}`),
        ...result.removed.map((f) => `  removed   ${f}`),
      ];
      fail(`doq-api: the API reference in ${shown} is stale:\n${lines.join('\n') || '  manifest'}\nRun "doq-api generate" and commit the result.`, 1);
    }
    console.log(`doq-api: ${result.fileCount} pages in ${shown} are up to date`);
  }
} catch (error) {
  if (error instanceof DoqApiError) fail(error.message, error.exitCode);
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
}

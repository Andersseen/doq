import { parseArgs } from 'node:util';
import { CliError } from './source.mjs';

const COMMON = { help: { type: 'boolean', short: 'h' }, dir: { type: 'string' }, json: { type: 'boolean' }, 'src-dir': { type: 'string' } };
const OPTIONS = {
  init: {
    ...COMMON,
    mode: { type: 'string' },
    'content-dir': { type: 'string' },
    'base-path': { type: 'string' },
    'dry-run': { type: 'boolean' },
  },
  content: { help: { type: 'boolean', short: 'h' }, dir: { type: 'string' }, json: { type: 'boolean' }, config: { type: 'string' } },
  doctor: { ...COMMON, build: { type: 'boolean' }, 'site-dir': { type: 'string' }, strict: { type: 'boolean' } },
};

export const MODES = ['embedded', 'docs-first'];

/** Parses `argv` (without node and script) into a typed command; throws CliError (exit 2) for any misuse. */
export function parseCli(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') return { command: 'help' };
  if (command === '--version' || command === '-v') return { command: 'version' };
  if (!(command in OPTIONS)) throw new CliError(`Unknown command "${command}". Use "doq init", "doq doctor" or "doq content".`);
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({ args: rest, options: OPTIONS[command], allowPositionals: true, strict: true }));
  } catch (error) {
    throw new CliError(error.message.replace(/ to specify a positional.*$/, '').replace(/\. If you.*$/, '.'));
  }
  if (command === 'content') {
    const [action, ...extra] = positionals;
    if (values.help || !action) return { command: 'help', topic: 'content' };
    if (!['generate', 'check', 'watch'].includes(action) || extra.length) throw new CliError(`Unknown content command "${extra[0] ?? action}". Use "doq content generate", "check" or "watch".`);
    if (action === 'watch' && values.json) throw new CliError('"doq content watch" does not support --json.');
    return { command, action, dir: values.dir ?? '.', json: Boolean(values.json), config: values.config };
  }
  if (positionals.length) throw new CliError(`Unexpected argument "${positionals[0]}". Use --dir <path> to choose the project.`);
  if (values.help) return { command: 'help', topic: command };
  const common = { dir: values.dir ?? '.', json: Boolean(values.json), srcDir: values['src-dir'] ?? 'src' };
  if (command === 'doctor') {
    return { command, ...common, build: Boolean(values.build), siteDir: values['site-dir'], strict: Boolean(values.strict) };
  }
  const mode = values.mode ?? 'embedded';
  if (!MODES.includes(mode)) throw new CliError(`Invalid --mode "${mode}"; use "embedded" or "docs-first".`);
  const contentDir = values['content-dir'] ?? 'docs';
  const basePath = values['base-path'] ?? (mode === 'docs-first' ? '/' : '/docs');
  if (mode === 'docs-first' && values['base-path'] !== undefined && basePath !== '/') {
    throw new CliError('--mode docs-first mounts the documentation at "/"; use --mode embedded for a custom --base-path.');
  }
  return { command, ...common, mode, contentDir, basePath, dryRun: Boolean(values['dry-run']) };
}

export const USAGE = `doq — integration helper for @doqs/analog

Usage:
  doq init   [--mode embedded|docs-first] [--content-dir <name>] [--base-path </docs>] [--dir <path>] [--dry-run] [--json]
  doq doctor [--dir <path>] [--build] [--site-dir <path>] [--strict] [--json]
  doq content <generate|check|watch> [--dir <path>] [--config <file>] [--json]

content  Resolves ::source{}, ::include{} and [[api:Name]] in authored pages into ordinary Markdown (see doq.content.json).
         generate writes the pages it owns; check writes nothing and exits 1 when they are stale; watch regenerates on change.
init     Creates src/doq.paths.ts and a minimal Markdown tree; never overwrites a file; prints what remains to connect.
doctor   Reads the project (without running it) and reports PASS / WARN / FAIL / UNKNOWN for the Doqs integration.
         --build also checks the static output; it never builds for you. Exit code 1 when a check FAILs.

Common options:
  --dir <path>       Project directory (default: current directory)
  --src-dir <path>   Source directory below the project (default: src)
  --json             Machine-readable result on stdout, nothing else
  -h, --help         Show this help

Exit codes: 0 success, 1 conflicts, failed or stale checks, 2 invalid usage or environment;
            "doq content" also uses 3 for output conflicts and 4 for invalid authoring (missing source, unsafe path, unknown symbol).`;

#!/usr/bin/env node
// Node-only integration CLI for @doqs/analog. Never imports Angular or TypeScript.
import { readFile } from 'node:fs/promises';
import { parseCli, USAGE } from './cli/args.mjs';
import { formatContent, runContent } from './cli/content.mjs';
import { formatDoctor, runDoctor } from './cli/doctor.mjs';
import { formatInit, runInit } from './cli/init.mjs';
import { assertSupportedNode } from './cli/node-support.mjs';
import { CliError } from './cli/source.mjs';

assertSupportedNode('doq');

async function main() {
  const command = parseCli(process.argv.slice(2));
  if (command.command === 'help') {
    console.log(USAGE);
    return 0;
  }
  if (command.command === 'version') {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(manifest.version);
    return 0;
  }
  const result = command.command === 'init' ? await runInit(command) : command.command === 'content' ? await runContent(command) : await runDoctor(command);
  // JSON mode writes exactly one document to stdout; the text form goes to stdout too, errors always to stderr.
  console.log(command.json ? JSON.stringify(result, null, 2) : command.command === 'init' ? formatInit(result) : command.command === 'content' ? formatContent(result) : formatDoctor(result));
  return result.exitCode;
}

try {
  process.exitCode = await main();
} catch (error) {
  if (error instanceof CliError) {
    const json = process.argv.includes('--json');
    console.error(json ? JSON.stringify({ error: error.message, exitCode: error.exitCode }) : `doq: ${error.message}`);
    process.exitCode = error.exitCode;
  } else {
    console.error(`doq: unexpected error: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}

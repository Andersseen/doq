#!/usr/bin/env node
import { indexDoqSearch } from './search-index.mjs';

const [command, siteDir, ...rest] = process.argv.slice(2);
const usage = 'Usage: doq-search index <siteDir> [--output <dir>]\n  Run after the static build, e.g. doq-search index dist/analog/public';
if (command !== 'index' || !siteDir || siteDir.startsWith('-')) {
  console.error(usage);
  process.exit(command === '--help' || command === '-h' ? 0 : 2);
}
const outputFlag = rest.indexOf('--output');
const outputDir = outputFlag >= 0 ? rest[outputFlag + 1] : undefined;
if (outputFlag >= 0 && !outputDir) {
  console.error(usage);
  process.exit(2);
}
try {
  const { pageCount, outputPath } = await indexDoqSearch({ siteDir, outputDir });
  console.log(`doq-search: indexed ${pageCount} page${pageCount === 1 ? '' : 's'} into ${outputPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

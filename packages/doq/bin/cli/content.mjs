// `doq content`: thin CLI over bin/content.mjs. Node-only; reads text, never executes the consumer's code.
import { watch } from 'node:fs';
import { relative, resolve } from 'node:path';
import { DoqContentError, checkContent, generateContent } from '../content.mjs';
import { CliError } from './source.mjs';

const shown = (/** @type {string} */ cwd, /** @type {string} */ path) => relative(cwd, path) || '.';

function wrap(/** @type {unknown} */ error) {
  if (error instanceof DoqContentError) return Object.assign(new CliError(error.message, error.exitCode), { diagnostics: /** @type {any} */ (error).diagnostics });
  return error;
}

export async function runContent(/** @type {{ action: string, dir: string, json: boolean, config?: string }} */ command) {
  const options = { cwd: resolve(command.dir), config: command.config };
  if (command.action === 'watch') return watchContent(options);
  try {
    if (command.action === 'generate') {
      const result = await generateContent(options);
      return { exitCode: 0, action: 'generate', targets: result.targets.map((t) => ({ name: t.name, out: shown(options.cwd, t.outDir), pages: t.pageCount, written: t.written, removed: t.removed })) };
    }
    const result = await checkContent(options);
    return {
      exitCode: result.upToDate ? 0 : result.conflicts.length ? 3 : 1,
      action: 'check',
      upToDate: result.upToDate,
      targets: result.targets.map((t) => ({ name: t.name, out: shown(options.cwd, t.outDir), pages: t.pageCount, added: t.added, modified: t.modified, removed: t.removed, conflicts: t.conflicts, upToDate: t.upToDate })),
    };
  } catch (error) {
    throw wrap(error);
  }
}

export function formatContent(/** @type {any} */ result) {
  const lines = [];
  for (const target of result.targets) {
    if (result.action === 'generate') {
      const changed = target.written.length + target.removed.length;
      lines.push(`doq content: ${target.name}: ${target.pages} pages in ${target.out} (${changed ? `${target.written.length} written, ${target.removed.length} removed` : 'already up to date'})`);
    } else if (target.upToDate) {
      lines.push(`doq content: ${target.name}: ${target.pages} pages in ${target.out} are up to date`);
    } else {
      lines.push(`doq content: ${target.name}: the pages in ${target.out} are stale:`);
      for (const [label, names] of [['added', target.added], ['modified', target.modified], ['removed', target.removed]]) for (const name of names) lines.push(`  ${label.padEnd(9)} ${name}`);
      for (const conflict of target.conflicts) lines.push(`  conflict  ${conflict}`);
      lines.push(target.conflicts.length ? 'Resolve the conflicts, then run "doq content generate".' : 'Run "doq content generate" and commit the result.');
    }
  }
  return lines.join('\n');
}

async function watchContent(/** @type {{ cwd: string, config?: string }} */ options) {
  const regenerate = async () => {
    try {
      const result = await generateContent(options);
      const changed = result.targets.reduce((n, t) => n + t.written.length + t.removed.length, 0);
      console.log(`doq content: ${changed ? `${changed} file${changed === 1 ? '' : 's'} updated` : 'up to date'}`);
      return result;
    } catch (error) {
      console.error(error instanceof DoqContentError ? error.message : error);
      return undefined;
    }
  };
  let current = await regenerate();
  if (!current) {
    // Keep watching after a failed first run only when the configuration itself loaded; otherwise there is nothing to watch.
    throw new CliError('doq content watch: fix the problems above and start it again.', 1);
  }
  let timer;
  const watchers = new Map();
  const attach = () => {
    const wanted = new Set([...(current?.authoringRoots ?? []), ...(current?.dependencies ?? []).map((file) => resolve(file, '..'))]);
    for (const [dir, watcher] of watchers) if (!wanted.has(dir)) { watcher.close(); watchers.delete(dir); }
    for (const dir of wanted) {
      if (watchers.has(dir)) continue;
      try {
        watchers.set(dir, watch(dir, { recursive: false, persistent: true }, (_event, name) => {
          if (!name || String(name).startsWith('.doq-') || String(name).endsWith('.tmp')) return;
          clearTimeout(timer);
          timer = setTimeout(async () => { current = (await regenerate()) ?? current; attach(); }, 150);
        }));
      } catch { /* a directory that disappeared is picked up on the next run */ }
    }
  };
  attach();
  console.log(`doq content: watching ${watchers.size} directories (Ctrl+C to stop)`);
  await new Promise(() => {});
  return { exitCode: 0 };
}


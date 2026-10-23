// `doq init`: non-destructive scaffold for an existing Angular / Analog application.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { CliError, exists, readText, resolveInside, walk } from './source.mjs';
import { inspectProject, parsePathsModule, publicPath, readPackage, STYLES_IMPORT } from './project.mjs';

const SEGMENT = /^[A-Za-z0-9._-]+$/;
const SLUG_SEGMENT = /^[\p{L}\p{N}_~-]+$/u;

/** Validates `--content-dir` and `--base-path`; returns the normalized values or throws a CliError. */
export function validateInitOptions({ contentDir, basePath }) {
  const parts = String(contentDir).replace(/\\/g, '/').split('/').filter(Boolean);
  if (/^[\\/]/.test(String(contentDir)) || !parts.length || parts.some(part => part === '.' || part === '..' || !SEGMENT.test(part))) {
    throw new CliError(`Invalid --content-dir ${JSON.stringify(contentDir)}; use a directory name below src/content such as "docs".`);
  }
  const text = String(basePath).trim();
  const segments = text.split('/').filter(Boolean);
  if (!text.startsWith('/') || segments.some(part => !SLUG_SEGMENT.test(part))) {
    throw new CliError(`Invalid --base-path ${JSON.stringify(basePath)}; use a mount path such as "/docs", or "/" for the application root.`);
  }
  return { contentDirectory: parts.join('/'), basePath: `/${segments.join('/')}` };
}

export const pathsTemplate = ({ contentDirectory, basePath }) => `// Build-safe: imported by vite.config.ts, so it must stay free of Angular components.
export const doqPaths = {
  contentDirectory: '${contentDirectory}',
  basePath: '${basePath}',
} as const;
`;

const introductionTemplate = ({ basePath }) => `---
title: Introduction
description: What this documentation covers and where to start.
group: Introduction
order: 1
---

Welcome. This documentation is rendered by [Doqs](https://github.com/Andersseen/doqs) inside this application: Markdown files under \`src/content\` become routes, a sidebar and a table of contents.

## Where to go next

- Read [Getting started](${publicPath(basePath, 'getting-started')}) to add your own pages.
- Edit this file to describe your product.
`;

const gettingStartedTemplate = ({ contentDirectory }) => `---
title: Getting started
description: Add, order and group documentation pages.
group: Introduction
order: 2
---

## Add a page

Create a Markdown file in \`src/content/${contentDirectory}\`. The file path becomes the URL, and the frontmatter controls the title and navigation:

\`\`\`md
---
title: Installation
description: Install the package.
group: Guides
order: 10
---
\`\`\`

## Check the integration

Run \`doq doctor\` in the project root. It lists what is connected and what is still missing.

> [!TIP]
> Search, versioned documentation, API reference pages and interactive Angular demos are optional. Enable them when you need them.
`;

/** The files \`init\` manages: [relative path, content, kind]. */
export function plannedFiles({ srcDir, contentDirectory, basePath }) {
  const content = `${srcDir}/content/${contentDirectory}`;
  return [
    { path: `${srcDir}/doq.paths.ts`, text: pathsTemplate({ contentDirectory, basePath }), kind: 'paths' },
    { path: `${content}/introduction.md`, text: introductionTemplate({ basePath }), kind: 'content' },
    { path: `${content}/getting-started.md`, text: gettingStartedTemplate({ contentDirectory }), kind: 'content' },
  ];
}

function installCommand(root, missing, lockfiles) {
  const list = missing.join(' ');
  if (lockfiles.has('pnpm-lock.yaml')) return `pnpm add ${list}`;
  if (lockfiles.has('yarn.lock')) return `yarn add ${list}`;
  if (lockfiles.has('bun.lock') || lockfiles.has('bun.lockb')) return `bun add ${list}`;
  return `npm install ${list}`;
}

/** What still has to be connected for the generated files to render. Each step is verified by reading the project. */
export async function integrationSteps(project, { pkg, mode, importFrom }) {
  const { viteConfig, stylesheet, where } = project;
  const declared = { ...pkg?.devDependencies, ...pkg?.dependencies };
  const missing = ['@doqs/analog', '@analogjs/content', '@analogjs/router', 'prismjs'].filter(name => !(name in declared));
  const lockfiles = new Set();
  for (const name of ['pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']) if (await exists(join(project.root, name))) lockfiles.add(name);

  const appConfig = where('provideFileRouter')[0] ?? `${project.srcDir}/app/app.config.ts`;
  const pathsImport = posix.relative(posix.dirname(appConfig), `${project.srcDir}/doq.paths`);
  const appImport = pathsImport.startsWith('.') ? pathsImport : `./${pathsImport}`;
  const missingProviders = ['doqRoutes', 'provideDoq', 'provideContent', 'withMarkdownRenderer'].filter(name => where(name).length === 0);
  const vite = viteConfig?.code ?? '';
  const hasPrerender = /doqPrerenderRoutes/.test(vite);
  const hasHighlighter = /highlighter\s*:/.test(vite);
  const rootRoute = mode === 'docs-first' ? '' : "'/', ";

  return [
    {
      id: 'dependencies',
      required: true,
      done: missing.filter(name => name !== 'prismjs').length === 0,
      title: 'Install the packages Doqs and Analog need',
      detail: missing.length ? `Missing from package.json: ${missing.join(', ')}.` : 'All required packages are declared.',
      command: missing.length ? installCommand(project.root, missing, lockfiles) : undefined,
    },
    {
      id: 'stylesheet',
      required: true,
      done: Boolean(stylesheet),
      title: 'Import the Doqs stylesheet once',
      detail: stylesheet ? `Found in ${stylesheet}.` : `Add this line to your global stylesheet (for example ${project.srcDir}/styles.css).`,
      snippet: { file: `${project.srcDir}/styles.css`, code: `@import '${STYLES_IMPORT}';` },
    },
    {
      id: 'providers',
      required: true,
      done: missingProviders.length === 0,
      title: 'Connect the Doqs routes and providers',
      detail: missingProviders.length
        ? `Not found in ${project.srcDir}: ${missingProviders.join(', ')}. Merge these into the existing providers; keep your own routes and call provideContent only once.`
        : 'Routes and providers are present.',
      snippet: {
        file: appConfig,
        code: `import { provideFileRouter, withExtraRoutes } from '@analogjs/router';
import { provideContent, withMarkdownRenderer } from '@analogjs/content';
import { defineDoqConfig, doqRoutes, provideDoq } from '@doqs/analog';
import { doqPaths } from '${appImport}';

const doqConfig = defineDoqConfig({ ...doqPaths });

// providers: [
//   provideFileRouter(withExtraRoutes(doqRoutes(doqConfig))),  // already using withExtraRoutes? concatenate the arrays
//   provideContent(withMarkdownRenderer()),
//   provideDoq(doqConfig),
// ]`,
      },
    },
    {
      id: 'prerender',
      required: true,
      done: hasPrerender && hasHighlighter,
      title: 'Prerender the documentation and enable the Markdown highlighter',
      detail: !viteConfig
        ? 'No vite.config.* was found in the project root; add this to the file that calls analog().'
        : `${hasPrerender ? '' : 'doqPrerenderRoutes() is not used. '}${hasHighlighter ? '' : 'analog({ content: { highlighter } }) is not set. '}`.trim() || 'Present.',
      snippet: {
        file: viteConfig?.path ?? 'vite.config.ts',
        code: `import { doqPrerenderRoutes } from '@doqs/analog';
import { doqPaths } from './${project.srcDir}/doq.paths';

// inside analog({ ... }):
content: { highlighter: 'prism' },
prerender: { routes: async () => [${rootRoute}...doqPrerenderRoutes(doqPaths)] },
// keep your existing prerender routes in the same array.`,
      },
    },
    {
      id: 'deterministic-markdown',
      required: false,
      done: /doqDeterministicMarkdown/.test(vite),
      title: 'Render Markdown deterministically (recommended)',
      detail:
        'Contains an upstream race in Analog that can give duplicate headings different ids between builds. Add it next to analog(); the project must render Markdown through @analogjs/platform.',
      snippet: {
        file: viteConfig?.path ?? 'vite.config.ts',
        code: `import { doqDeterministicMarkdown } from '@doqs/analog/vite';

// plugins: [analog({ ... }), doqDeterministicMarkdown()]`,
      },
    },
  ];
}

/**
 * Plans and (unless dry-run) applies the scaffold. Never overwrites: files are written with the "wx" flag and a
 * conflict anywhere cancels all writes.
 */
export async function runInit(options) {
  const root = resolve(process.cwd(), options.dir);
  return initProject(root, options);
}

export async function initProject(root, options) {
  const pkg = await readPackage(root);
  if (pkg === undefined) throw new CliError(`No package.json in ${root}. Run doq init in the Angular application directory, or pass --dir <path>.`);
  if (pkg === null) throw new CliError(`${join(root, 'package.json')} is not valid JSON.`);
  const { contentDirectory, basePath } = validateInitOptions(options);
  const srcDir = options.srcDir;
  const warnings = [];
  const declared = { ...pkg.devDependencies, ...pkg.dependencies };
  if (!('@angular/core' in declared)) warnings.push('@angular/core is not declared in package.json; Doqs needs an Angular application.');

  const files = [];
  const contentRoot = await resolveInside(root, `${srcDir}/content/${contentDirectory}`, '--content-dir');
  const existingMarkdown = await walk(contentRoot, name => name.endsWith('.md'), 50);

  for (const file of plannedFiles({ srcDir, contentDirectory, basePath })) {
    const target = await resolveInside(root, file.path, 'generated path');
    const current = await readText(target);
    const entry = { path: file.path, status: 'create', target, text: file.text };
    if (current !== undefined) {
      if (current === file.text) entry.status = 'unchanged';
      else if (file.kind === 'paths') {
        const found = parsePathsModule(current);
        if (found.computed) Object.assign(entry, { status: 'kept', note: 'exists and builds its values dynamically; cannot verify it matches the requested paths' });
        else if (found.contentDirectory !== contentDirectory || (found.basePath ?? '/docs') !== basePath) {
          Object.assign(entry, {
            status: 'conflict',
            note: `defines contentDirectory "${found.contentDirectory}" and basePath "${found.basePath ?? '/docs'}", not "${contentDirectory}" and "${basePath}"; edit it yourself or re-run with matching options`,
          });
        } else Object.assign(entry, { status: 'kept', note: 'already defines the requested paths' });
      } else Object.assign(entry, { status: 'kept', note: 'exists; not overwritten' });
    } else if (file.kind === 'content' && existingMarkdown.length) {
      Object.assign(entry, { status: 'skipped', note: `src/content/${contentDirectory} already contains Markdown` });
    }
    files.push(entry);
  }

  const conflicts = files.filter(file => file.status === 'conflict');
  const toCreate = files.filter(file => file.status === 'create');
  if (!options.dryRun && !conflicts.length) {
    for (const file of toCreate) {
      await mkdir(dirname(file.target), { recursive: true });
      await writeFile(file.target, file.text, { flag: 'wx' });
    }
  }

  const project = await inspectProject(root, { srcDir });
  const steps = await integrationSteps(project, { pkg, mode: options.mode, importFrom: srcDir });
  const pending = steps.filter(step => !step.done);
  const requiredPending = pending.filter(step => step.required);
  return {
    command: 'init',
    projectDir: root,
    mode: options.mode,
    contentDirectory,
    basePath,
    dryRun: Boolean(options.dryRun),
    files: files.map(({ path, status, note }) => ({ path, status, ...(note ? { note } : {}) })),
    warnings,
    steps: steps.map(({ id, required, done, title, detail, command, snippet }) => ({ id, required, done, title, detail, ...(command ? { command } : {}), ...(snippet ? { snippet } : {}) })),
    scaffold: conflicts.length ? 'blocked' : 'complete',
    integration: requiredPending.length ? 'incomplete' : 'complete',
    recommendationsOpen: pending.length - requiredPending.length,
    exitCode: conflicts.length ? 1 : 0,
  };
}

const VERB = { create: 'create', unchanged: 'unchanged', kept: 'kept', skipped: 'skipped', conflict: 'CONFLICT' };

export function formatInit(result) {
  const lines = [`doq init: ${result.mode}, mounted at ${result.basePath}, content in src/content/${result.contentDirectory}${result.dryRun ? ' (dry run, nothing written)' : ''}`, ''];
  for (const file of result.files) {
    const verb = result.dryRun && file.status === 'create' ? 'would create' : VERB[file.status];
    lines.push(`  ${verb.padEnd(12)} ${file.path}${file.note ? `  (${file.note})` : ''}`);
  }
  for (const warning of result.warnings) lines.push('', `Warning: ${warning}`);
  lines.push('');
  if (result.scaffold === 'blocked') {
    lines.push('Scaffold blocked: resolve the conflict above. No file was written.');
  } else {
    lines.push(result.dryRun ? 'Scaffold: dry run complete.' : 'Scaffold complete.');
    const pending = result.steps.filter(step => !step.done);
    if (!pending.some(step => step.required)) {
      lines.push('Integration complete: every required step is connected.');
    } else {
      lines.push(`Integration incomplete: ${pending.filter(step => step.required).length} required step(s) remain. The files above do not render until they are done.`);
    }
    pending.forEach((step, index) => {
      lines.push('', `${index + 1}. ${step.title}${step.required ? '' : ' [recommended]'}`, `   ${step.detail}`);
      if (step.command) lines.push(`   $ ${step.command}`);
      if (step.snippet) {
        lines.push(`   ${step.snippet.file}:`);
        for (const line of step.snippet.code.split('\n')) lines.push(`     ${line}`);
      }
    });
    lines.push('', 'Then: review the generated files, build the application, and run "doq doctor".');
  }
  return lines.join('\n');
}

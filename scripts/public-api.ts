/**
 * Public API compatibility check on the PACKED package (not the sources).
 *
 *   node scripts/public-api.ts check  [tarball]   compare with the committed report and the 0.7 baseline
 *   node scripts/public-api.ts update [tarball]   rewrite packages/doq/public-api.report.json (a deliberate act)
 *   node scripts/public-api.ts baseline <tarball> write packages/doq/public-api.baseline.json (one-off, from a released tarball)
 *
 * The report lists every exported declaration of each entry point the manifest exposes (browser entry and the Node-only
 * helpers), as printed TypeScript without comments, with the members of classes and interfaces listed separately. Angular
 * compiler internals (`ɵ*`) and private/protected members are not API. Declarations are read syntactically; nothing is executed.
 *
 * Two comparisons, both from the tarball:
 *  1. against the committed report: any difference fails, so every public change is a reviewed change of that file;
 *  2. against the baseline of the last compatible release: a removed export, a removed or retyped member, a retyped function,
 *     alias or constant, or a new REQUIRED member of an interface fails. Additions (new exports, optional members) pass.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const repo = resolve(import.meta.dirname, '..');
const reportPath = resolve(repo, 'packages/doq/public-api.report.json');
const baselinePath = resolve(repo, 'packages/doq/public-api.baseline.json');

export interface Declaration {
  kind: string;
  text: string;
  members?: Record<string, string>;
}
export type EntryReport = Record<string, Declaration>;
export interface ApiReport {
  version: string;
  entries: Record<string, EntryReport>;
  files: string[];
  bin: Record<string, string>;
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
const printer = ts.createPrinter({ removeComments: true });
const isInternalMember = (member: ts.NamedDeclaration) => {
  const name = member.name && ts.isIdentifier(member.name) ? member.name.text : member.name?.getText();
  const flags = ts.canHaveModifiers(member) ? (ts.getModifiers(member) ?? []) : [];
  return (
    (name?.startsWith('ɵ') ?? false) ||
    flags.some((flag) => flag.kind === ts.SyntaxKind.PrivateKeyword || flag.kind === ts.SyntaxKind.ProtectedKeyword)
  );
};
const memberName = (member: ts.TypeElement | ts.ClassElement) => {
  if (ts.isConstructorDeclaration(member)) return 'constructor';
  if (
    ts.isIndexSignatureDeclaration(member) ||
    ts.isCallSignatureDeclaration(member) ||
    ts.isConstructSignatureDeclaration(member)
  )
    return `[${member.kind}]`;
  return member.name ? member.name.getText().replace(/^['"]|['"]$/g, '') : `[${member.kind}]`;
};

/** Reads the exported declarations of one declaration file, following local `export { a as b }` lists. */
export function readDeclarations(
  fileName: string,
  source: string,
  /** Looks a name up in another entry point of the same package (a bundled declaration may re-export from a sibling entry). */
  resolveExternal: (specifier: string, name: string) => Declaration | undefined = () => undefined,
): EntryReport {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true);
  const declared = new Map<string, ts.Node[]>();
  const exported = new Map<string, string>(); // public name → local name
  const external = new Map<string, Declaration>(); // public name → declaration resolved from a sibling entry point
  const add = (name: string, node: ts.Node) => declared.set(name, [...(declared.get(name) ?? []), node]);
  const isExported = (node: ts.Node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((flag) => flag.kind === ts.SyntaxKind.ExportKeyword);
  for (const statement of sf.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const name = declaration.name.getText();
        add(name, statement);
        if (isExported(statement)) exported.set(name, name);
      }
    } else if (ts.isExportDeclaration(statement)) {
      if (statement.moduleSpecifier) {
        const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
        assert.ok(
          statement.exportClause && ts.isNamedExports(statement.exportClause),
          `${fileName}: "export * from '${specifier}'" is not expected in a bundled declaration`,
        );
        for (const element of statement.exportClause.elements) {
          const resolved = resolveExternal(specifier, (element.propertyName ?? element.name).text);
          assert.ok(resolved, `${fileName}: cannot resolve re-export "${element.name.text}" from '${specifier}'`);
          external.set(element.name.text, resolved);
        }
      } else if (statement.exportClause && ts.isNamedExports(statement.exportClause))
        for (const element of statement.exportClause.elements)
          exported.set(element.name.text, (element.propertyName ?? element.name).text);
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      add(statement.name.text, statement);
      if (isExported(statement)) exported.set(statement.name.text, statement.name.text);
    }
  }
  const report: EntryReport = Object.fromEntries(external);
  for (const [publicName, local] of [...exported].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const nodes = declared.get(local);
    assert.ok(nodes, `${fileName}: export "${publicName}" has no declaration in the file`);
    const first = nodes[0]!;
    const kind = ts.isVariableStatement(first)
      ? 'const'
      : ts.isFunctionDeclaration(first)
        ? 'function'
        : ts.isClassDeclaration(first)
          ? 'class'
          : ts.isInterfaceDeclaration(first)
            ? 'interface'
            : ts.isEnumDeclaration(first)
              ? 'enum'
              : 'type';
    const prefix = publicName === local ? '' : `${publicName} = `;
    if (ts.isClassDeclaration(first) || ts.isInterfaceDeclaration(first)) {
      const members: Record<string, string> = {};
      for (const node of nodes) {
        if (!ts.isClassDeclaration(node) && !ts.isInterfaceDeclaration(node)) continue;
        for (const member of node.members as ts.NodeArray<ts.ClassElement | ts.TypeElement>) {
          if (isInternalMember(member as ts.NamedDeclaration)) continue;
          members[memberName(member)] = normalize(printer.printNode(ts.EmitHint.Unspecified, member, sf));
        }
      }
      const heritage = (first.heritageClauses ?? []).map((clause) => normalize(clause.getText())).join(' ');
      const generics = first.typeParameters ? `<${first.typeParameters.map((p) => p.getText()).join(', ')}>` : '';
      report[publicName] = {
        kind,
        text: normalize(`${prefix}${local}${generics} ${heritage}`),
        members: Object.fromEntries(Object.entries(members).sort(([a], [b]) => (a < b ? -1 : 1))),
      };
    } else {
      report[publicName] = {
        kind,
        text: normalize(
          nodes
            .map((node) => printer.printNode(ts.EmitHint.Unspecified, node, sf))
            .map((text) => `${prefix}${text}`)
            .join(' | '),
        ),
      };
    }
  }
  return report;
}

async function readTarball(tarball: string): Promise<ApiReport> {
  const temp = await mkdtemp(join(tmpdir(), 'doq-public-api-'));
  try {
    execFileSync('tar', ['-xzf', tarball, '-C', temp]);
    const root = join(temp, 'package');
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const entries: Record<string, EntryReport> = {};
    // Sibling entries first: the browser entry re-exports from `@doqs/analog/config`.
    const subpaths = Object.entries<any>(manifest.exports).sort(([a], [b]) => Number(a === '.') - Number(b === '.'));
    const resolveExternal = (specifier: string, name: string) => {
      const sibling = specifier.replace(/^@doqs\/analog/, '.');
      return entries[sibling]?.[name];
    };
    for (const [subpath, target] of subpaths) {
      if (typeof target === 'string' || subpath === './package.json') {
        if (typeof target === 'string')
          assert.ok(existsSync(join(root, target)), `export ${subpath} points at a missing file ${target}`);
        continue;
      }
      assert.ok(target.types && target.default, `export ${subpath} must declare both "types" and "default"`);
      for (const path of [target.types, target.default])
        assert.ok(existsSync(join(root, path)), `export ${subpath} points at a missing file ${path}`);
      entries[subpath] = readDeclarations(
        target.types,
        await readFile(join(root, target.types), 'utf8'),
        resolveExternal,
      );
    }
    const files = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map((file) => file.replace(/^package\//, ''))
      .sort();
    const ordered = Object.fromEntries(
      Object.keys(manifest.exports)
        .filter((key) => key in entries)
        .map((key) => [key, entries[key]!]),
    );
    return {
      version: manifest.version,
      entries: ordered,
      files: files.filter((file) => /\.(d\.mts|d\.ts)$/.test(file)),
      bin: manifest.bin,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

const isOptionalMember = (text: string) => /^(readonly )?[^:(<]*\?[:(<]/.test(text) || /^[^:(]*\?:/.test(text);

/** Breaking differences between a baseline (older) and the current report. */
export function compareWithBaseline(baseline: ApiReport, current: ApiReport): string[] {
  const problems: string[] = [];
  for (const [entry, declarations] of Object.entries(baseline.entries)) {
    const now = current.entries[entry];
    if (!now) {
      problems.push(`entry point "${entry}" was removed`);
      continue;
    }
    for (const [name, old] of Object.entries(declarations)) {
      const next = now[name];
      if (!next) {
        problems.push(`${entry}: export "${name}" was removed`);
        continue;
      }
      if (old.members) {
        if (old.kind !== next.kind) problems.push(`${entry}: "${name}" changed from ${old.kind} to ${next.kind}`);
        for (const [member, text] of Object.entries(old.members)) {
          if (next.members?.[member] === undefined) problems.push(`${entry}: ${name}.${member} was removed`);
          else if (next.members[member] !== text)
            problems.push(`${entry}: ${name}.${member} changed\n    was: ${text}\n    now: ${next.members[member]}`);
        }
        if (next.kind === 'interface' && next.members)
          for (const [member, text] of Object.entries(next.members))
            if (old.members[member] === undefined && !isOptionalMember(text))
              problems.push(`${entry}: ${name}.${member} is a new required member (${text})`);
      } else if (old.text !== next.text)
        problems.push(`${entry}: "${name}" changed\n    was: ${old.text}\n    now: ${next.text}`);
    }
  }
  for (const [name, target] of Object.entries(baseline.bin))
    if (current.bin[name] === undefined) problems.push(`binary "${name}" was removed (${target})`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [command = 'check', tarballArg] = process.argv.slice(2);
  const { version } = JSON.parse(await readFile(resolve(repo, 'packages/doq/package.json'), 'utf8')) as {
    version: string;
  };
  const tarball = resolve(tarballArg ?? `artifacts/doqs-analog-${version}.tgz`);
  const current = await readTarball(tarball);
  const render = (report: ApiReport) => `${JSON.stringify(report, null, 2)}\n`;
  if (command === 'baseline') {
    await writeFile(baselinePath, render(current));
    console.log(`public-api: wrote ${baselinePath} from ${tarball}`);
  } else if (command === 'update') {
    await writeFile(reportPath, render(current));
    console.log(
      `public-api: wrote ${reportPath} (${Object.values(current.entries).reduce((n, e) => n + Object.keys(e).length, 0)} exports)`,
    );
  } else if (command === 'check') {
    const failures: string[] = [];
    const committed = JSON.parse(await readFile(reportPath, 'utf8')) as ApiReport;
    // The report records the version it was taken at only informationally; compare the API, not the version.
    const { version: _a, ...currentApi } = current;
    const { version: _b, ...committedApi } = committed;
    if (JSON.stringify(currentApi) !== JSON.stringify(committedApi)) {
      const names = (report: Omit<ApiReport, 'version'>) =>
        Object.entries(report.entries).flatMap(([entry, items]) =>
          Object.entries(items).map(([name, item]) => `${entry}#${name}=${JSON.stringify(item)}`),
        );
      const was = new Set(names(committedApi));
      const now = new Set(names(currentApi));
      const changed = [...now]
        .filter((item) => !was.has(item))
        .map((item) => `+ ${item.slice(0, 160)}`)
        .concat([...was].filter((item) => !now.has(item)).map((item) => `- ${item.slice(0, 160)}`));
      failures.push(
        `the packed package's public API differs from packages/doq/public-api.report.json. If intended, run "node scripts/public-api.ts update" and review the diff:\n  ${changed.slice(0, 20).join('\n  ')}${changed.length > 20 ? `\n  ... ${changed.length - 20} more` : ''}\n  files: ${JSON.stringify(currentApi.files) === JSON.stringify(committedApi.files) ? 'same' : 'differ'}`,
      );
    }
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as ApiReport;
    failures.push(
      ...compareWithBaseline(baseline, current).map((problem) => `incompatible with ${baseline.version}: ${problem}`),
    );
    if (failures.length) {
      console.error(`public-api: FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
      process.exit(1);
    }
    console.log(
      `public-api: PASS ${tarball} (${Object.values(current.entries).reduce((n, e) => n + Object.keys(e).length, 0)} exports across ${Object.keys(current.entries).length} entry points; compatible with ${baseline.version})`,
    );
  } else {
    console.error('Usage: node scripts/public-api.ts check|update [tarball] | baseline <tarball>');
    process.exit(2);
  }
}

// Node-only. Turns the extracted API model into ordinary Doqs Markdown pages. Pure: no file system access, no clock.
import { compare } from './errors.mjs';

/** Order and labels of the symbol categories on the index page and in the sidebar. */
export const CATEGORIES = /** @type {const} */ ([
  ['component', 'Components', 'Component'],
  ['directive', 'Directives', 'Directive'],
  ['pipe', 'Pipes', 'Pipe'],
  ['service', 'Services', 'Service'],
  ['function', 'Functions', 'Function'],
  ['class', 'Classes', 'Class'],
  ['interface', 'Interfaces', 'Interface'],
  ['type', 'Types', 'Type alias'],
  ['enum', 'Enums', 'Enum'],
  ['constant', 'Constants', 'Constant'],
]);
const RANK = new Map(CATEGORIES.map(([id], index) => [id, index]));
const LABEL = new Map(CATEGORIES.map(([id, , singular]) => [id, singular]));
const PLURAL = new Map(CATEGORIES.map(([id, plural]) => [id, plural]));
export const categoryIds = CATEGORIES.map(([id]) => id);

/** `MoveEnterDirective` → `move-enter-directive`, `HTTPClient` → `http-client`. */
export function slugify(/** @type {string} */ name) {
  const slug = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'symbol';
}

/** Unique, stable slugs: collisions get a numeric suffix in name order; `index` is reserved for the overview page. */
export function assignSlugs(/** @type {{ name: string, category?: string }[]} */ symbols) {
  const taken = new Set(['index']);
  const slugs = new Map();
  for (const symbol of [...symbols].sort((a, b) => compare(a.name, b.name))) {
    const base = slugify(symbol.name);
    let slug = base;
    // A colliding name is told apart by its category first (`movement-config-interface`), then by a number.
    if (taken.has(slug) && symbol.category) slug = `${base}-${slugify(symbol.category)}`;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${symbol.category ? `${slugify(symbol.category)}-` : ''}${n}`;
    taken.add(slug);
    slugs.set(symbol.name, slug);
  }
  return slugs;
}

/** A plain YAML scalar when that is unambiguous, otherwise a double-quoted (JSON) one. */
const yaml = (/** @type {string} */ value) =>
  /^[A-Za-z][A-Za-z0-9 ._,()/-]*$/.test(value) && !/^(?:true|false|null|yes|no|on|off|y|n)$/i.test(value) && !/\s$/.test(value)
    ? value
    : JSON.stringify(value);

const LINK = /\{@link(?:code|plain)?\s+([^}\s|]+)(?:[\s|]+([^}]*))?\}/g;
const resolveLinks = (/** @type {string} */ text, /** @type {((name: string) => string | undefined) | undefined} */ link) =>
  text.replace(LINK, (_m, target, label) => {
    const href = link?.(String(target));
    const shown = String(label ?? '').trim() || String(target);
    return href ? `[\`${shown}\`](${href})` : `\`${shown}\``;
  });

/** One line of text that cannot inject HTML. */
export function inlineText(/** @type {string} */ text, /** @type {((name: string) => string | undefined) | undefined} */ link = undefined) {
  return proseInline(resolveLinks(text.replace(/\s+/g, ' ').trim(), link));
}

/** One line of text that is safe inside a Markdown table cell. */
export function cellText(/** @type {string} */ text, /** @type {((name: string) => string | undefined) | undefined} */ link = undefined) {
  return inlineText(text, link).replace(/\|/g, '\\|');
}
const codeCell = (/** @type {string} */ text, table = true) => {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/`/g, '\u02cb');
  return clean ? `\`${table ? clean.replace(/\|/g, '\\|') : clean}\`` : '';
};

/** Escapes the characters that would turn JSDoc prose into HTML, outside inline code. */
function proseInline(/** @type {string} */ text) {
  return text
    .split(/(`+[^`]*`+)/)
    .map((part, index) => (index % 2 ? part : part.replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;').replace(/</g, '&lt;')))
    .join('');
}

/**
 * JSDoc prose → Markdown that cannot inject HTML or Doq directives, with `{@link X}` resolved to a page when X is documented.
 * @param {string} text
 * @param {(name: string) => string | undefined} link
 */
export function proseBlock(text, link) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let fence = '';
  for (const line of lines) {
    const opening = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      out.push(line);
      if (opening && opening[1].startsWith(fence[0]) && opening[1].length >= fence.length && !line.trim().slice(opening[1].length).trim()) fence = '';
      continue;
    }
    if (opening) {
      fence = opening[1];
      out.push(line);
      continue;
    }
    const linked = resolveLinks(line, link);
    const safe = proseInline(linked).replace(/^(\s*)(:{2,})/, '$1\\$2');
    out.push(safe);
  }
  return out.join('\n').trim();
}

const fenceFor = (/** @type {string} */ code) => {
  const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(longest + 1);
};
const codeBlock = (/** @type {string} */ code, language = 'ts') => {
  const fence = fenceFor(code);
  return `${fence}${language}\n${code.replace(/\s+$/, '')}\n${fence}`;
};

/** First sentence of a description, plain text, for meta descriptions and the index table. */
export function summarize(/** @type {string} */ text, /** @type {number} */ limit = 160) {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\{@link(?:code|plain)?\s+([^}\s|]+)(?:[\s|]+([^}]*))?\}/g, (_m, target, label) => String(label ?? '').trim() || String(target))
    .replace(/[`*>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentence = /^.*?[.!?](?=\s|$)/.exec(plain)?.[0] ?? plain;
  return sentence.length <= limit ? sentence : `${sentence.slice(0, limit - 1).trimEnd()}…`;
}

/**
 * @param {any[]} symbols extracted, filtered symbols
 * @param {{ routePrefix: string, group: string, title: string, sourceUrl?: string }} options
 * @returns {Map<string, string>} file name → Markdown
 */
export function renderReference(symbols, options) {
  const ordered = [...symbols].sort((a, b) => (RANK.get(a.category) ?? 99) - (RANK.get(b.category) ?? 99) || compare(a.name, b.name));
  const slugs = assignSlugs(ordered);
  const orderStart = options.orderStart ?? 1000;
  const routeOf = (/** @type {string} */ name) => `${options.routePrefix}/${slugs.get(name)}`;

  // Names a type signature may mention, mapped to the page that documents them (declared and exported names).
  const documented = new Map();
  for (const symbol of ordered) {
    for (const name of [symbol.name, ...symbol.aliases]) documented.set(name, symbol.name);
    if (!documented.has(symbol.declaredName)) documented.set(symbol.declaredName, symbol.name);
  }
  const linkTo = (/** @type {string} */ name) => {
    const target = documented.get(name.split('.')[0] ?? name);
    return target ? routeOf(target) : undefined;
  };
  const referenced = (/** @type {string[]} */ texts, /** @type {string} */ self) => {
    const found = new Set();
    for (const text of texts) {
      for (const match of text.matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*/g)) {
        const target = documented.get(match[0]);
        if (target && target !== self) found.add(target);
      }
    }
    return [...found].sort(compare);
  };
  const typeCell = (/** @type {string} */ text, table = true) => {
    const whole = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)((?:\[\])*)$/.exec(text.trim());
    const target = whole ? documented.get(whole[1] ?? '') : undefined;
    return target && whole ? `[\`${whole[1]}${whole[2]}\`](${routeOf(target)})` : codeCell(text, table);
  };
  const prose = (/** @type {string} */ text) => proseBlock(text, linkTo);
  const cell = (/** @type {string} */ text) => cellText(text, linkTo);
  const inline = (/** @type {string} */ text) => inlineText(text, linkTo);

  const files = new Map();
  ordered.forEach((symbol, index) => {
    files.set(`${slugs.get(symbol.name)}.md`, renderSymbol(symbol, orderStart + index + 1));
  });
  files.set('index.md', renderIndex());
  return files;

  function frontmatter(/** @type {string} */ title, /** @type {string} */ description, /** @type {number} */ order, /** @type {string} */ category) {
    return [
      '---',
      '# Generated by doq-api. Do not edit: change the source declarations and run "doq-api generate".',
      `title: ${yaml(title)}`,
      `description: ${yaml(description)}`,
      `group: ${yaml(options.group)}`,
      `order: ${order}`,
      `generated: doq-api`,
      `category: ${category}`,
      '---',
      '',
    ].join('\n');
  }

  function renderIndex() {
    const body = [];
    const intro = `${ordered.length} public ${ordered.length === 1 ? 'symbol' : 'symbols'} generated from the TypeScript declarations of the library.`;
    body.push(intro, '');
    for (const [id, plural] of CATEGORIES) {
      const inCategory = ordered.filter((s) => s.category === id);
      if (!inCategory.length) continue;
      body.push(`## ${plural}`, '', '| Name | Summary |', '| --- | --- |');
      for (const symbol of inCategory) {
        const summary = summarize(symbol.description) || '';
        const badge = symbol.deprecated !== undefined ? ' (deprecated)' : '';
        body.push(`| [${symbol.name}](${routeOf(symbol.name)})${badge} | ${cell(summary)} |`);
      }
      body.push('');
    }
    return `${frontmatter(options.title, intro, orderStart, 'index')}\n${body.join('\n').trimEnd()}\n`;
  }

  function overview(/** @type {any} */ symbol, /** @type {string[]} */ extra = []) {
    const lines = ['## Overview', ''];
    if (symbol.deprecated !== undefined) {
      lines.push('> [!WARNING]', `> **Deprecated.** ${inline(symbol.deprecated) || 'This API is deprecated.'}`, '');
    }
    if (symbol.description) lines.push(prose(symbol.description), '');
    const facts = [`- **Kind:** ${LABEL.get(symbol.category)}`, ...extra];
    if (symbol.stability) facts.push(`- **Stability:** \`${symbol.stability}\``);
    if (symbol.since) facts.push(`- **Since:** ${inline(symbol.since)}`);
    if (symbol.aliases.length) facts.push(`- **Also exported as:** ${symbol.aliases.map((a) => `\`${a}\``).join(', ')}`);
    const source = sourceLink(symbol);
    if (source) facts.push(`- **Source:** ${source}`);
    lines.push(...facts, '');
    return lines;
  }

  function sourceLink(/** @type {any} */ symbol) {
    if (!options.sourceUrl || symbol.source.path.startsWith('..')) return undefined;
    const url = options.sourceUrl.replace('{path}', symbol.source.path).replace('{line}', String(symbol.source.line));
    return `[${symbol.source.path}:${symbol.source.line}](${url})`;
  }

  function renderSymbol(/** @type {any} */ symbol, /** @type {number} */ order) {
    const sections = [];
    const description = summarize(symbol.description) || fallbackDescription(symbol);
    const texts = [];
    const angular = symbol.angular;

    if (symbol.category === 'component' || symbol.category === 'directive') {
      const extra = angular?.exportAs ? [`- **Export as:** \`${angular.exportAs}\``] : [];
      sections.push(overview(symbol, extra));
      if (angular?.selector) sections.push(['## Selector', '', codeBlock(angular.selector, 'text'), '']);
      if (symbol.inputs.length) {
        sections.push(['## Inputs', '', '| Input | Type | Default | Required | Description |', '| --- | --- | --- | --- | --- |']);
        for (const input of symbol.inputs) {
          texts.push(input.type, input.readType ?? '');
          const name = input.name === input.property ? codeCell(input.name) : `${codeCell(input.name)} (property ${codeCell(input.property)})`;
          const notes = [];
          if (input.deprecated !== undefined) notes.push(`**Deprecated.** ${cell(input.deprecated)}`);
          if (input.stability) notes.push(`Stability: ${input.stability}.`);
          if (input.transform) notes.push(`Transform ${codeCell(input.transform)}${input.readType ? `; reads as ${codeCell(input.readType)}` : ''}.`);
          sections.at(-1)?.push(`| ${name} | ${typeCell(input.type)} | ${codeCell(input.defaultValue ?? '')} | ${input.required ? 'Yes' : ''} | ${[cell(input.description), ...notes].filter(Boolean).join(' ')} |`);
        }
        sections.at(-1)?.push('');
      }
      if (symbol.models.length) {
        sections.push(['## Models', '', 'Two-way bindings: each model is an input and emits the matching change output.', '', '| Model | Type | Default | Required | Change output | Description |', '| --- | --- | --- | --- | --- | --- |']);
        for (const model of symbol.models) {
          texts.push(model.type);
          const name = model.name === model.property ? codeCell(model.name) : `${codeCell(model.name)} (property ${codeCell(model.property)})`;
          sections.at(-1)?.push(`| ${name} | ${typeCell(model.type)} | ${codeCell(model.defaultValue ?? '')} | ${model.required ? 'Yes' : ''} | ${codeCell(model.changeOutput)} | ${cell(model.description)} |`);
        }
        sections.at(-1)?.push('');
      }
      if (symbol.outputs.length) {
        sections.push(['## Outputs', '', '| Output | Payload | Description |', '| --- | --- | --- |']);
        for (const output of symbol.outputs) {
          texts.push(output.type);
          const name = output.name === output.property ? codeCell(output.name) : `${codeCell(output.name)} (property ${codeCell(output.property)})`;
          const note = output.deprecated !== undefined ? ` **Deprecated.** ${cell(output.deprecated)}` : '';
          sections.at(-1)?.push(`| ${name} | ${typeCell(output.type)} | ${cell(output.description)}${note} |`);
        }
        sections.at(-1)?.push('');
      }
      pushMethodsAndProperties(sections, symbol, texts);
    } else if (symbol.category === 'pipe') {
      sections.push(overview(symbol, angular?.pipeName ? [`- **Pipe name:** \`${angular.pipeName}\``] : []));
      if (angular?.pipeName) sections.push(['## Usage', '', codeBlock(`{{ value | ${angular.pipeName} }}`, 'html'), '']);
      for (const method of symbol.methods) sections.push(signaturesSection('Transform', method.signatures, texts, 'transform'));
    } else if (symbol.category === 'service') {
      const extra = angular?.providedIn ? [`- **Provided in:** \`${angular.providedIn}\``] : [];
      sections.push(overview(symbol, extra));
      pushMethodsAndProperties(sections, symbol, texts);
    } else if (symbol.category === 'function') {
      sections.push(overview(symbol));
      sections.push(signaturesSection(symbol.signatures.length > 1 ? 'Signatures' : 'Signature', symbol.signatures, texts, `function ${symbol.name}`));
    } else if (symbol.category === 'class') {
      sections.push(overview(symbol));
      sections.push(['## Declaration', '', codeBlock(symbol.header, 'ts'), '']);
      texts.push(symbol.header);
      pushMethodsAndProperties(sections, symbol, texts);
    } else if (symbol.category === 'interface') {
      sections.push(overview(symbol));
      sections.push(['## Declaration', '', codeBlock(symbol.header, 'ts'), '']);
      texts.push(symbol.header);
      pushMethodsAndProperties(sections, symbol, texts);
    } else if (symbol.category === 'type') {
      sections.push(overview(symbol));
      if (symbol.definition) {
        sections.push(['## Definition', '', codeBlock(symbol.definition, 'ts'), '']);
        texts.push(symbol.definition);
      }
      pushMethodsAndProperties(sections, symbol, texts);
    } else if (symbol.category === 'enum') {
      sections.push(overview(symbol));
      sections.push(['## Members', '', '| Member | Value | Description |', '| --- | --- | --- |']);
      for (const member of symbol.enumMembers) sections.at(-1)?.push(`| ${codeCell(member.name)} | ${codeCell(member.value ?? '')} | ${cell(member.description)} |`);
      sections.at(-1)?.push('');
    } else {
      sections.push(overview(symbol));
      sections.push(['## Type', '', codeBlock(`const ${symbol.name}: ${symbol.type}`, 'ts'), '']);
      texts.push(symbol.type);
    }

    const related = referenced(texts, symbol.name);
    if (related.length) {
      sections.push(['## Related types', '', ...related.map((name) => `- [\`${name}\`](${routeOf(name)})`), '']);
    }
    if (symbol.examples.length) {
      const lines = ['## Examples', ''];
      for (const example of symbol.examples) lines.push(exampleBlock(example), '');
      sections.push(lines);
    }
    if (symbol.see.length) sections.push(['## See also', '', ...symbol.see.map((s) => `- ${prose(s).replace(/\n+/g, ' ')}`), '']);

    const markdown = sections.flat().join('\n').trimEnd();
    return `${frontmatter(symbol.name, description, order, symbol.category)}\n${markdown}\n`;
  }

  function exampleBlock(/** @type {string} */ example) {
    return /^\s*(`{3,}|~{3,})/m.test(example) ? prose(example) : codeBlock(example, /^\s*</.test(example) ? 'html' : 'ts');
  }

  function fallbackDescription(/** @type {any} */ symbol) {
    const selector = symbol.angular?.selector ? ` with the selector ${symbol.angular.selector}` : '';
    return `${LABEL.get(symbol.category)} reference for ${symbol.name}${selector}.`;
  }

  function signaturesSection(/** @type {string} */ title, /** @type {any[]} */ signatures, /** @type {string[]} */ texts, prefix = '') {
    const lines = [`## ${title}`, ''];
    const multiple = signatures.length > 1;
    signatures.forEach((signature, index) => {
      const text = `${prefix}${signature.text}`;
      texts.push(signature.text);
      if (multiple) lines.push(`### Overload ${index + 1}`, '');
      lines.push(codeBlock(text, 'ts'), '');
      if (signature.deprecated !== undefined) lines.push('> [!WARNING]', `> **Deprecated.** ${inline(signature.deprecated)}`, '');
      if (signature.description && (multiple || signature.description !== '')) {
        if (multiple) lines.push(prose(signature.description), '');
      }
      if (signature.parameters.length) {
        lines.push('| Parameter | Type | Optional | Description |', '| --- | --- | --- | --- |');
        for (const parameter of signature.parameters) {
          texts.push(parameter.type);
          const name = `${parameter.rest ? '...' : ''}${parameter.name}`;
          lines.push(`| ${codeCell(name)} | ${typeCell(parameter.type)} | ${parameter.optional ? 'Yes' : ''} | ${cell(parameter.description)} |`);
        }
        lines.push('');
      }
      if (signature.returnType && signature.returnType !== 'void') {
        texts.push(signature.returnType);
        lines.push(`**Returns** ${typeCell(signature.returnType, false)}${signature.returns ? ` — ${inline(signature.returns)}` : ''}`, '');
      }
    });
    return lines;
  }

  function pushMethodsAndProperties(/** @type {any[][]} */ sections, /** @type {any} */ symbol, /** @type {string[]} */ texts) {
    if (symbol.properties?.length) {
      const lines = ['## Properties', '', '| Name | Type | Description |', '| --- | --- | --- |'];
      for (const property of symbol.properties) {
        texts.push(property.type);
        const flags = [property.isStatic ? 'static' : '', property.readonly ? 'readonly' : ''].filter(Boolean).join(' ');
        const name = codeCell(`${flags ? `${flags} ` : ''}${property.name}${property.optional ? '?' : ''}`);
        const notes = property.deprecated !== undefined ? ` **Deprecated.** ${cell(property.deprecated)}` : '';
        lines.push(`| ${name} | ${typeCell(property.type)} | ${cell(property.description)}${notes} |`);
      }
      sections.push([...lines, '']);
    }
    if (symbol.methods?.length) {
      const lines = ['## Public methods', ''];
      for (const method of symbol.methods) {
        lines.push(`### ${method.name}`, '');
        const sigs = method.signatures.length ? method.signatures : [];
        for (const signature of sigs) {
          texts.push(signature.text);
          lines.push(codeBlock(`${method.isStatic ? 'static ' : ''}${method.name}${signature.text}`, 'ts'), '');
          if (signature.description) lines.push(prose(signature.description), '');
          if (signature.deprecated !== undefined) lines.push('> [!WARNING]', `> **Deprecated.** ${inline(signature.deprecated)}`, '');
          if (signature.parameters.length) {
            lines.push('| Parameter | Type | Optional | Description |', '| --- | --- | --- | --- |');
            for (const parameter of signature.parameters) {
              texts.push(parameter.type);
              lines.push(`| ${codeCell(`${parameter.rest ? '...' : ''}${parameter.name}`)} | ${typeCell(parameter.type)} | ${parameter.optional ? 'Yes' : ''} | ${cell(parameter.description)} |`);
            }
            lines.push('');
          }
          if (signature.returns) lines.push(`**Returns** ${inline(signature.returns)}`, '');
        }
      }
      sections.push(lines);
    }
  }
}

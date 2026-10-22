// Node-only. Reads the public API of a TypeScript entry point through the compiler's type checker and returns a
// plain, serialisable model. Nothing here executes the analysed source.
import { dirname, relative, resolve } from 'node:path';
import { DoqApiError, compare } from './errors.mjs';

const LIFECYCLE_HOOKS = new Set([
  'ngOnChanges',
  'ngOnInit',
  'ngDoCheck',
  'ngAfterContentInit',
  'ngAfterContentChecked',
  'ngAfterViewInit',
  'ngAfterViewChecked',
  'ngOnDestroy',
]);
const IGNORED_MEMBER_DECORATORS = new Set(['HostBinding', 'HostListener', 'ViewChild', 'ViewChildren', 'ContentChild', 'ContentChildren']);
const IGNORED_INITIALIZERS = new Set(['inject', 'viewChild', 'viewChildren', 'contentChild', 'contentChildren']);
const ANGULAR_CLASS_DECORATORS = { Component: 'component', Directive: 'directive', Pipe: 'pipe', Injectable: 'service' };
const MAX_DEFAULT_LENGTH = 48;
const MAX_TRANSFORM_LENGTH = 72;
const MAX_CONSTANT_TYPE_LENGTH = 300;

/** @typedef {{ severity: 'warning' | 'info', symbol: string, message: string }} Diagnostic */

const collapse = (/** @type {string} */ text) => text.replace(/\s+/g, ' ').trim();
const dropImports = (/** @type {string} */ text) => text.replace(/import\((?:"[^"]*"|'[^']*')\)\./g, '');

/**
 * @param {any} ts the consumer's TypeScript module
 * @param {{ cwd: string, project?: string, entry: string }} options
 * @returns {{ symbols: any[], diagnostics: Diagnostic[], typescriptVersion: string }}
 */
export function extractApi(ts, options) {
  const { cwd } = options;
  const diagnostics = /** @type {Diagnostic[]} */ ([]);
  const warn = (/** @type {string} */ symbol, /** @type {string} */ message) => diagnostics.push({ severity: 'warning', symbol, message });
  const info = (/** @type {string} */ symbol, /** @type {string} */ message) => diagnostics.push({ severity: 'info', symbol, message });

  const entry = resolve(cwd, options.entry);
  const compilerOptions = readCompilerOptions(ts, options.project ? resolve(cwd, options.project) : undefined);
  const program = ts.createProgram({ rootNames: [entry], options: compilerOptions });
  const entryFile = program.getSourceFile(entry);
  if (!entryFile) throw new DoqApiError(`doq-api: the entry point ${options.entry} was not found or could not be parsed.`, 2);
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(entryFile);
  if (!moduleSymbol) throw new DoqApiError(`doq-api: ${options.entry} is not a module; it has no exports to document.`, 2);

  const F = ts.SymbolFlags;
  const posix = (/** @type {string} */ file) => relative(cwd, file).split('\\').join('/');
  const isExternal = (/** @type {any} */ node) => {
    const file = node.getSourceFile();
    return file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file) || /[\\/]node_modules[\\/]/.test(file.fileName);
  };
  const typeText = (/** @type {any} */ type, /** @type {any} */ at) =>
    collapse(
      dropImports(
        checker.typeToString(type, at, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope),
      ),
    );
  const nodeText = (/** @type {any} */ node) => collapse(dropImports(node.getText()));
  const typeArgs = (/** @type {any} */ type) =>
    type && type.flags & ts.TypeFlags.Object && type.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type) : [];

  /** Resolves a string-valued expression the compiler can see (literal or `const` reference). */
  const staticString = (/** @type {any} */ expr) => {
    if (!expr) return undefined;
    if (ts.isStringLiteralLike(expr)) return expr.text;
    const type = checker.getTypeAtLocation(expr);
    return type?.isStringLiteral?.() ? type.value : undefined;
  };
  const staticBoolean = (/** @type {any} */ expr) => {
    if (expr?.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (expr?.kind === ts.SyntaxKind.FalseKeyword) return false;
    return undefined;
  };
  const property = (/** @type {any} */ object, /** @type {string} */ name) =>
    object && ts.isObjectLiteralExpression(object)
      ? object.properties.find((/** @type {any} */ p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name?.getText?.() === name)
      : undefined;
  const propertyValue = (/** @type {any} */ object, /** @type {string} */ name) => {
    const found = property(object, name);
    return found ? (ts.isShorthandPropertyAssignment(found) ? found.name : found.initializer) : undefined;
  };

  /** Documentation of one symbol: markdown description and a map of JSDoc tags. */
  const docs = (/** @type {any} */ symbol) => {
    const description = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
    /** @type {{ name: string, text: string }[]} */
    const tags = symbol.getJsDocTags(checker).map((/** @type {any} */ tag) => ({ name: tag.name, text: ts.displayPartsToString(tag.text ?? []).trim() }));
    const tag = (/** @type {string} */ name) => tags.find((t) => t.name === name);
    const all = (/** @type {string} */ name) => tags.filter((t) => t.name === name).map((t) => t.text);
    const stabilityTag = tag('stability');
    const stability = stabilityTag ? (stabilityTag.text.split(/\s+/)[0] ?? '').toLowerCase() || undefined : tag('experimental') ? 'experimental' : undefined;
    const deprecated = tag('deprecated');
    return {
      description,
      stability,
      deprecated: deprecated ? deprecated.text : undefined,
      since: tag('since')?.text || undefined,
      see: all('see').filter(Boolean),
      examples: all('example').filter(Boolean),
      returns: tag('returns')?.text || tag('return')?.text || undefined,
      internal: Boolean(tag('internal') || tag('ignore')),
    };
  };

  const sourceOf = (/** @type {any} */ declaration) => {
    const file = declaration.getSourceFile();
    const at = file.getLineAndCharacterOfPosition((declaration.name ?? declaration).getStart(file));
    return { path: posix(file.fileName), line: at.line + 1 };
  };

  const decoratorsOf = (/** @type {any} */ node) =>
    (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []).map((/** @type {any} */ decorator) => {
      const call = ts.isCallExpression(decorator.expression) ? decorator.expression : undefined;
      const callee = call ? call.expression : decorator.expression;
      return { name: resolvedName(callee), call, args: call ? [...call.arguments] : [] };
    });

  /** The declared name of an imported identifier, following aliases; accepted only when it comes from Angular. */
  function resolvedName(/** @type {any} */ callee) {
    const identifier = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
    const written = ts.isIdentifier(identifier) ? identifier.text : undefined;
    if (!written) return undefined;
    const symbol = ts.isIdentifier(callee) ? checker.getSymbolAtLocation(callee) : undefined;
    if (!symbol) return written;
    const target = symbol.flags & F.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declarations = target.declarations ?? [];
    // An unresolvable import (Angular not installed) is accepted by name; a resolved one must be Angular's own.
    if (!declarations.length) return written;
    return declarations.some((/** @type {any} */ d) => /@angular[\\/]core/.test(d.getSourceFile().fileName)) ? target.name : undefined;
  }

  const shortText = (/** @type {any} */ node, /** @type {number} */ limit) => {
    if (!node) return undefined;
    const text = nodeText(node);
    return text.length <= limit && !text.includes('\n') ? text : undefined;
  };

  /** Type of a member for display, preferring the author's written annotation. */
  function memberType(/** @type {any} */ member, /** @type {any} */ declaration) {
    const written = declaration.type ?? declaration.parameters?.[0]?.type;
    if (written && ts.isPropertyDeclaration(declaration) || ts.isPropertySignature(declaration) || ts.isParameter(declaration)) return nodeText(written);
    return typeText(checker.getTypeOfSymbolAtLocation(member, declaration), declaration);
  }

  /** `input()`, `input.required()`, `model()`, `output()` and friends, validated against Angular's own declarations. */
  function initializerApi(/** @type {any} */ declaration) {
    let call = declaration.initializer;
    while (call && (ts.isParenthesizedExpression(call) || ts.isAsExpression(call) || ts.isNonNullExpression(call))) call = call.expression;
    if (!call || !ts.isCallExpression(call)) return undefined;
    let callee = call.expression;
    let required = false;
    if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'required') {
      required = true;
      callee = callee.expression;
    }
    if (!ts.isIdentifier(callee)) return undefined;
    const api = resolvedName(callee);
    if (!api) return undefined;
    if (IGNORED_INITIALIZERS.has(api)) return { api, ignored: true };
    if (!['input', 'model', 'output', 'outputFromObservable'].includes(api)) return undefined;
    if (required && api !== 'input' && api !== 'model') return undefined;
    return { api, required, call };
  }

  function bindingOptions(/** @type {any} */ call, /** @type {string} */ api, /** @type {boolean} */ required) {
    const index = api === 'output' || required ? 0 : 1;
    const candidate = call.arguments[index];
    return candidate && ts.isObjectLiteralExpression(candidate) ? candidate : undefined;
  }

  function transformInfo(/** @type {any} */ options, /** @type {string} */ symbolName) {
    const expression = propertyValue(options, 'transform');
    if (!expression) return undefined;
    const text = shortText(expression, MAX_TRANSFORM_LENGTH);
    if (!text) info(symbolName, 'An input transform is too long to show; documented as "(inline function)".');
    return { expression, text: text ?? '(inline function)' };
  }

  function aliasOf(/** @type {any} */ options, /** @type {string} */ symbolName) {
    const expression = propertyValue(options, 'alias');
    if (!expression) return undefined;
    const alias = staticString(expression);
    if (alias === undefined) warn(symbolName, 'An input/output alias is not a static string; the property name is used.');
    return alias;
  }

  /** Accepted binding type of a decorator `transform` (the first parameter of the transform function). */
  function transformParameterType(/** @type {any} */ expression, /** @type {any} */ at) {
    const signature = checker.getTypeAtLocation(expression).getCallSignatures()[0];
    const parameter = signature?.getParameters()[0];
    return parameter ? typeText(checker.getTypeOfSymbolAtLocation(parameter, at), at) : undefined;
  }

  /** Class members split into inputs, outputs, models, properties and methods. */
  function classMembers(/** @type {any} */ type, /** @type {string} */ owner) {
    const out = { inputs: [], outputs: [], models: [], properties: [], methods: [] };
    for (const member of checker.getPropertiesOfType(type)) {
      const declarations = member.declarations ?? [];
      const declaration = declarations[0];
      if (!declaration || isExternal(declaration)) continue;
      if (ts.isPrivateIdentifier(declaration.name ?? {}) || (declaration.name && declaration.name.kind === ts.SyntaxKind.PrivateIdentifier)) continue;
      const modifiers = ts.getCombinedModifierFlags(declaration);
      if (modifiers & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;
      const name = member.getName();
      if (LIFECYCLE_HOOKS.has(name) || name === 'constructor') continue;
      const memberDocs = docs(member);
      if (memberDocs.internal) continue;

      const decorated = declarations
        .map((/** @type {any} */ d) => ({ node: d, decorators: decoratorsOf(d) }))
        .find((/** @type {any} */ d) => d.decorators.length);
      const decoratorNames = decorated ? decorated.decorators.map((/** @type {any} */ d) => d.name) : [];
      if (decoratorNames.some((/** @type {string} */ n) => IGNORED_MEMBER_DECORATORS.has(n))) continue;

      const common = {
        description: memberDocs.description,
        deprecated: memberDocs.deprecated,
        stability: memberDocs.stability,
      };
      const memberSymbolName = `${owner}.${name}`;
      const isStatic = Boolean(modifiers & ts.ModifierFlags.Static);
      const isReadonly = Boolean(modifiers & ts.ModifierFlags.Readonly);

      // Legacy decorators.
      const inputDecorator = decorated?.decorators.find((/** @type {any} */ d) => d.name === 'Input');
      if (inputDecorator) {
        const first = inputDecorator.args[0];
        const options = first && ts.isObjectLiteralExpression(first) ? first : undefined;
        const alias = options ? aliasOf(options, memberSymbolName) : first ? staticString(first) : undefined;
        const transform = transformInfo(options, memberSymbolName);
        const readType = memberType(member, decorated.node.kind === ts.SyntaxKind.SetAccessor ? decorated.node : declaration);
        const accepted = transform ? (transformParameterType(transform.expression, declaration) ?? 'unknown') : readType;
        out.inputs.push({
          ...common,
          name: alias ?? name,
          property: name,
          type: accepted,
          readType: transform ? readType : undefined,
          transform: transform?.text,
          required: staticBoolean(propertyValue(options, 'required')) === true,
          defaultValue: shortText(declaration.initializer, MAX_DEFAULT_LENGTH),
          legacy: true,
        });
        continue;
      }
      const outputDecorator = decorated?.decorators.find((/** @type {any} */ d) => d.name === 'Output');
      if (outputDecorator) {
        const memberTypeValue = checker.getTypeOfSymbolAtLocation(member, declaration);
        const payload = typeArgs(memberTypeValue)[0];
        out.outputs.push({
          ...common,
          name: outputDecorator.args[0] ? (staticString(outputDecorator.args[0]) ?? name) : name,
          property: name,
          type: payload ? typeText(payload, declaration) : 'void',
          legacy: true,
        });
        continue;
      }

      // Initializer APIs.
      const initializer = ts.isPropertyDeclaration(declaration) ? initializerApi(declaration) : undefined;
      if (initializer?.ignored) continue;
      if (initializer) {
        const { api, required, call } = initializer;
        const options = bindingOptions(call, api, Boolean(required));
        const alias = aliasOf(options, memberSymbolName);
        const signalType = checker.getTypeOfSymbolAtLocation(member, declaration);
        const signalName = signalType.aliasSymbol?.name ?? signalType.symbol?.name;
        const resolved = typeArgs(signalType);
        const explicit = call.typeArguments ?? [];
        const text = (/** @type {number} */ index, /** @type {string} */ what) => {
          if (resolved[index]) return typeText(resolved[index], declaration);
          if (explicit[index]) return nodeText(explicit[index]);
          if (index === 0) {
            warn(memberSymbolName, `The ${what} type could not be resolved (is @angular/core installed for this project?); shown as "unknown".`);
          }
          return index === 0 ? 'unknown' : undefined;
        };
        if (api === 'input') {
          const transform = transformInfo(options, memberSymbolName);
          const readType = text(0, 'input');
          const accepted = transform ? (text(1, 'input binding') ?? 'unknown') : readType;
          out.inputs.push({
            ...common,
            name: alias ?? name,
            property: name,
            type: accepted,
            readType: transform ? readType : undefined,
            transform: transform?.text,
            required: Boolean(required),
            defaultValue: required ? undefined : shortText(call.arguments[0], MAX_DEFAULT_LENGTH),
            legacy: false,
          });
        } else if (api === 'model') {
          const modelName = alias ?? name;
          out.models.push({
            ...common,
            name: modelName,
            property: name,
            type: text(0, 'model'),
            required: Boolean(required),
            defaultValue: required ? undefined : shortText(call.arguments[0], MAX_DEFAULT_LENGTH),
            changeOutput: `${modelName}Change`,
          });
        } else {
          out.outputs.push({ ...common, name: alias ?? name, property: name, type: signalName ? text(0, 'output payload') : (explicit[0] ? nodeText(explicit[0]) : 'void'), legacy: false });
        }
        continue;
      }

      const memberTypeValue = checker.getTypeOfSymbolAtLocation(member, declaration);
      const signatures = memberTypeValue.getCallSignatures();
      if (member.flags & F.Method || (signatures.length && !(member.flags & (F.Property | F.Accessor)))) {
        out.methods.push({ name, isStatic, ...common, ...signatureSet(memberTypeValue, declaration) });
      } else if (member.flags & (F.Property | F.Accessor)) {
        out.properties.push({
          ...common,
          name,
          type: memberType(member, declaration),
          optional: Boolean(member.flags & F.Optional),
          readonly: isReadonly || (Boolean(member.flags & F.GetAccessor) && !(member.flags & F.SetAccessor)),
          isStatic,
        });
      }
    }
    return out;
  }

  /** Call signatures of a function or method, one entry per overload. */
  function signatureSet(/** @type {any} */ type, /** @type {any} */ at) {
    const signatures = type.getCallSignatures().map((/** @type {any} */ signature) => {
      const declaration = signature.declaration;
      const tags = signature.getJsDocTags(checker).map((/** @type {any} */ t) => ({ name: t.name, text: ts.displayPartsToString(t.text ?? []).trim() }));
      const description = ts.displayPartsToString(signature.getDocumentationComment(checker)).trim();
      const returnNode = declaration?.type;
      return {
        text: collapse(dropImports(checker.signatureToString(signature, at, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope))),
        description,
        parameters: signature.getParameters().map((/** @type {any} */ parameter) => {
          const parameterDeclaration = parameter.valueDeclaration;
          const written = parameterDeclaration && ts.isParameter(parameterDeclaration) ? parameterDeclaration.type : undefined;
          return {
            name: parameter.getName(),
            type: written ? nodeText(written) : typeText(checker.getTypeOfSymbolAtLocation(parameter, at), at),
            optional: Boolean(parameterDeclaration && (parameterDeclaration.questionToken || parameterDeclaration.initializer)),
            rest: Boolean(parameterDeclaration?.dotDotDotToken),
            description: ts.displayPartsToString(parameter.getDocumentationComment(checker)).trim().replace(/^-\s+/, ''),
          };
        }),
        returnType: returnNode ? nodeText(returnNode) : typeText(signature.getReturnType(), at),
        returns: tags.find((/** @type {any} */ t) => t.name === 'returns' || t.name === 'return')?.text || undefined,
        deprecated: tags.find((/** @type {any} */ t) => t.name === 'deprecated')?.text,
      };
    });
    return { signatures };
  }

  function typeParametersText(/** @type {any} */ declaration) {
    const list = declaration.typeParameters;
    return list?.length ? `<${list.map((/** @type {any} */ p) => collapse(p.getText())).join(', ')}>` : '';
  }

  function classHeader(/** @type {any} */ declaration, /** @type {string} */ name) {
    const abstract = ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Abstract ? 'abstract ' : '';
    const heritage = (declaration.heritageClauses ?? []).map((/** @type {any} */ h) => collapse(h.getText())).join(' ');
    return `${abstract}class ${name}${typeParametersText(declaration)}${heritage ? ` ${heritage}` : ''}`;
  }

  function angularMetadata(/** @type {any} */ declaration, /** @type {string} */ name) {
    const decorators = decoratorsOf(declaration);
    const decorator = decorators.find((/** @type {any} */ d) => d.name && d.name in ANGULAR_CLASS_DECORATORS);
    if (!decorator) return undefined;
    const kind = /** @type {Record<string, string>} */ (ANGULAR_CLASS_DECORATORS)[decorator.name];
    const metadata = decorator.args[0];
    const object = metadata && ts.isObjectLiteralExpression(metadata) ? metadata : undefined;
    if (metadata && !object) warn(name, `The @${decorator.name} metadata is not an object literal; selector and options could not be read.`);
    const read = (/** @type {string} */ key) => {
      const expression = propertyValue(object, key);
      if (!expression) return undefined;
      const value = staticString(expression);
      if (value === undefined) warn(name, `The "${key}" of @${decorator.name} is computed and could not be resolved statically.`);
      return value;
    };
    const result = /** @type {Record<string, any>} */ ({ kind });
    if (kind === 'component' || kind === 'directive') {
      result['selector'] = read('selector');
      result['exportAs'] = read('exportAs');
    } else if (kind === 'pipe') {
      result['pipeName'] = read('name');
    } else {
      result['providedIn'] = read('providedIn');
    }
    return result;
  }

  // ---- public export discovery -----------------------------------------------------------------------------------
  const exported = checker.getExportsOfModule(moduleSymbol);
  /** @type {Map<any, { target: any, names: string[] }>} */
  const byTarget = new Map();
  for (const exportSymbol of exported) {
    const exportName = exportSymbol.getName();
    if (exportName === 'default') {
      info('default', 'The default export is not documented; export the symbol by name.');
      continue;
    }
    const target = exportSymbol.flags & F.Alias ? checker.getAliasedSymbol(exportSymbol) : exportSymbol;
    const declarations = target.declarations ?? [];
    if (!declarations.length) {
      warn(exportName, 'The export could not be resolved to a declaration and was skipped.');
      continue;
    }
    if (declarations.every((/** @type {any} */ d) => isExternal(d))) {
      info(exportName, 'Re-exported from an external package or declaration file; not documented.');
      continue;
    }
    if (declarations.some((/** @type {any} */ d) => ts.isModuleDeclaration(d)) && !(target.flags & (F.Class | F.Function | F.Interface | F.TypeAlias | F.Enum | F.Variable))) {
      info(exportName, 'Namespace exports are not documented.');
      continue;
    }
    const known = byTarget.get(target);
    if (known) known.names.push(exportName);
    else byTarget.set(target, { target, names: [exportName] });
  }

  const symbols = [];
  for (const { target, names } of byTarget.values()) {
    const sorted = [...new Set(names)].sort(compare);
    const name = sorted.includes(target.getName()) ? target.getName() : sorted[0];
    const aliases = sorted.filter((n) => n !== name);
    const declarations = (target.declarations ?? []).filter((/** @type {any} */ d) => !isExternal(d));
    const pick = (/** @type {(d: any) => boolean} */ test) => declarations.find(test);

    const classDeclaration = pick((d) => ts.isClassDeclaration(d) || ts.isClassExpression(d));
    const functionDeclaration = pick((d) => ts.isFunctionDeclaration(d));
    const enumDeclaration = pick((d) => ts.isEnumDeclaration(d));
    const interfaceDeclaration = pick((d) => ts.isInterfaceDeclaration(d));
    const aliasDeclaration = pick((d) => ts.isTypeAliasDeclaration(d));
    const variableDeclaration = pick((d) => ts.isVariableDeclaration(d));
    const primary = classDeclaration ?? functionDeclaration ?? enumDeclaration ?? interfaceDeclaration ?? aliasDeclaration ?? variableDeclaration;
    if (!primary) {
      info(name, 'Only declarations that are not classes, functions, interfaces, type aliases, enums or constants; skipped.');
      continue;
    }

    const symbolDocs = docs(target);
    if (symbolDocs.internal) continue;
    const base = {
      name,
      aliases,
      description: symbolDocs.description,
      stability: symbolDocs.stability,
      deprecated: symbolDocs.deprecated,
      since: symbolDocs.since,
      see: symbolDocs.see,
      examples: symbolDocs.examples,
      source: sourceOf(primary),
      declaredName: target.getName(),
      typeParameters: typeParametersText(primary),
    };

    if (classDeclaration) {
      const angular = angularMetadata(classDeclaration, name);
      const instanceType = checker.getDeclaredTypeOfSymbol(target);
      const members = classMembers(instanceType, name);
      const category = angular?.kind ?? 'class';
      const entry = { ...base, category, angular, header: classHeader(classDeclaration, name), ...members };
      if (category === 'pipe') {
        entry.methods = members.methods.filter((/** @type {any} */ m) => m.name === 'transform');
        entry.properties = [];
      }
      if (category === 'component' || category === 'directive') {
        if (angular && angular['selector'] === undefined && !(ts.getCombinedModifierFlags(classDeclaration) & ts.ModifierFlags.Abstract)) {
          info(name, `The ${category} declares no selector.`);
        }
      }
      symbols.push(entry);
    } else if (functionDeclaration) {
      const type = checker.getTypeOfSymbolAtLocation(target, functionDeclaration);
      symbols.push({ ...base, category: 'function', ...signatureSet(type, functionDeclaration) });
    } else if (enumDeclaration) {
      const members = enumDeclaration.members.map((/** @type {any} */ member) => {
        const memberSymbol = checker.getSymbolAtLocation(member.name);
        const value = checker.getConstantValue(member);
        return {
          name: member.name.getText(),
          value: value === undefined ? undefined : typeof value === 'string' ? JSON.stringify(value) : String(value),
          description: memberSymbol ? docs(memberSymbol).description : '',
        };
      });
      symbols.push({ ...base, category: 'enum', constEnum: Boolean(ts.getCombinedModifierFlags(enumDeclaration) & ts.ModifierFlags.Const), enumMembers: members });
    } else if (interfaceDeclaration) {
      const instanceType = checker.getDeclaredTypeOfSymbol(target);
      const members = classMembers(instanceType, name);
      const heritage = (interfaceDeclaration.heritageClauses ?? []).map((/** @type {any} */ h) => collapse(h.getText())).join(' ');
      symbols.push({
        ...base,
        category: 'interface',
        header: `interface ${name}${base.typeParameters}${heritage ? ` ${heritage}` : ''}`,
        properties: members.properties,
        methods: members.methods,
      });
    } else if (aliasDeclaration) {
      const literal = ts.isTypeLiteralNode(aliasDeclaration.type) ? aliasDeclaration.type : undefined;
      const entry = { ...base, category: 'type', definition: undefined, properties: [], methods: [] };
      if (literal) {
        const members = classMembers(checker.getTypeAtLocation(literal), name);
        entry.properties = members.properties;
        entry.methods = members.methods;
        entry.header = `type ${name}${base.typeParameters}`;
      } else {
        entry.definition = declarationSource(ts, aliasDeclaration);
      }
      symbols.push(entry);
    } else if (variableDeclaration) {
      const type = checker.getTypeOfSymbolAtLocation(target, variableDeclaration);
      const callable = type.getCallSignatures().length > 0 && Boolean(variableDeclaration.initializer && (ts.isArrowFunction(variableDeclaration.initializer) || ts.isFunctionExpression(variableDeclaration.initializer)));
      if (callable) {
        symbols.push({ ...base, category: 'function', ...signatureSet(type, variableDeclaration) });
      } else {
        let text = variableDeclaration.type ? nodeText(variableDeclaration.type) : typeText(type, variableDeclaration);
        if (text.length > MAX_CONSTANT_TYPE_LENGTH) {
          info(name, 'The type of this constant is long; it is shortened in the generated page.');
          const cut = text.slice(0, MAX_CONSTANT_TYPE_LENGTH);
          text = `${cut.slice(0, Math.max(cut.lastIndexOf(', '), 1))} …`;
        }
        symbols.push({ ...base, category: 'constant', type: text });
      }
    }
  }

  symbols.sort((a, b) => compare(a.name, b.name));
  diagnostics.sort((a, b) => compare(a.symbol, b.symbol) || compare(a.message, b.message));
  return { symbols, diagnostics, typescriptVersion: ts.version };
}

/** Source text of a declaration without the `export`/`declare` modifiers, re-indented to column zero. */
function declarationSource(/** @type {any} */ ts, /** @type {any} */ declaration) {
  const file = declaration.getSourceFile();
  const column = file.getLineAndCharacterOfPosition(declaration.getStart(file)).character;
  const lines = declaration.getText(file).replace(/\r\n?/g, '\n').split('\n');
  const text = [lines[0], ...lines.slice(1).map((l) => l.replace(new RegExp(`^[ \\t]{0,${column}}`), ''))].join('\n');
  return text.replace(/^(?:export\s+|declare\s+)+/, '');
}

function readCompilerOptions(/** @type {any} */ ts, /** @type {string | undefined} */ project) {
  /** @type {any} */
  const defaults = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    experimentalDecorators: true,
  };
  let options = defaults;
  if (project) {
    const read = ts.readConfigFile(project, ts.sys.readFile);
    if (read.error) throw new DoqApiError(`doq-api: cannot read the TypeScript project ${project}: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`, 2);
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(project), undefined, project);
    options = { ...parsed.options };
  }
  return { ...options, noEmit: true, skipLibCheck: true, declaration: false, declarationMap: false, composite: false, incremental: false, tsBuildInfoFile: undefined, sourceMap: false, outDir: undefined, rootDir: undefined };
}

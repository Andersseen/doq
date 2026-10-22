export type ApiReferenceCategory = 'component' | 'directive' | 'pipe' | 'service' | 'function' | 'class' | 'interface' | 'type' | 'enum' | 'constant';

export interface ApiReferenceOptions {
  /** Public entry point of the library, relative to `cwd`, for example "projects/lib/src/public-api.ts". */
  entry: string;
  /** TypeScript project (tsconfig) used to resolve imports and path aliases. Default: built-in compiler options. */
  project?: string;
  /** Output directory, a sub-directory of `contentDir`. Default "src/content/docs/reference/generated". */
  out?: string;
  /** Doqs content directory. Default "src/content/docs". */
  contentDir?: string;
  /** Doqs `basePath`, used to build cross-links. Default "/docs"; "/" for docs-first sites. */
  basePath?: string;
  /** Sidebar group of the generated pages. Default "API reference". */
  group?: string;
  /** Title of the generated index page. Default "API reference". */
  title?: string;
  /** `order` of the index page; symbols follow. Default 1000, so generated pages come after hand-written ones. */
  orderStart?: number;
  /** Link template for source declarations; `{path}` and `{line}` are replaced. */
  sourceUrl?: string;
  /** Only these categories (array or comma-separated string). */
  include?: ApiReferenceCategory[] | string;
  /** Skip these categories. */
  exclude?: ApiReferenceCategory[] | string;
  /** Treat warnings and undocumented public symbols as failures. */
  strict?: boolean;
  /** Project root. Default `process.cwd()`. */
  cwd?: string;
}

export interface ApiReferenceDiagnostic {
  severity: 'warning' | 'info';
  symbol: string;
  message: string;
}

export interface ApiReferenceSummary {
  fileCount: number;
  symbolCount: number;
  outDir: string;
  routePrefix: string;
  diagnostics: ApiReferenceDiagnostic[];
  problems: ApiReferenceDiagnostic[];
  typescriptVersion: string;
  conflicts: string[];
}

export interface GenerateApiReferenceResult extends ApiReferenceSummary {
  written: string[];
  removed: string[];
}

export interface CheckApiReferenceResult extends ApiReferenceSummary {
  upToDate: boolean;
  added: string[];
  modified: string[];
  removed: string[];
}

export interface BuildApiReferenceResult {
  /** File name → Markdown, in memory. */
  files: Map<string, string>;
  outDir: string;
  routePrefix: string;
  diagnostics: ApiReferenceDiagnostic[];
  problems: ApiReferenceDiagnostic[];
  typescriptVersion: string;
}

/** A failure with a user-facing message; `exitCode` 2 is a configuration problem, 1 a failed run. */
export class DoqApiError extends Error {
  exitCode: number;
}

/** Analyses the library and renders the pages in memory without writing anything. */
export function buildApiReference(options: ApiReferenceOptions): Promise<BuildApiReferenceResult>;
/** Writes the reference pages below `out`, touching only files the generator owns. */
export function generateApiReference(options: ApiReferenceOptions): Promise<GenerateApiReferenceResult>;
/** Compares the expected pages with the directory; never writes. */
export function checkApiReference(options: ApiReferenceOptions): Promise<CheckApiReferenceResult>;

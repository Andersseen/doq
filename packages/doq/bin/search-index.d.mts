export interface IndexDoqSearchOptions {
  /** Prerendered static output, for example "dist/analog/public". */
  siteDir: string;
  /** Bundle directory name inside `siteDir`. Default "pagefind". */
  outputDir?: string;
  /** Base for resolving `siteDir` and the `pagefind` package. Default `process.cwd()`. */
  cwd?: string;
}
export interface IndexDoqSearchResult {
  pageCount: number;
  outputPath: string;
}
export function indexDoqSearch(options: IndexDoqSearchOptions): Promise<IndexDoqSearchResult>;

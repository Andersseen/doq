import type { ForgeConfig } from './config';
import type { ForgeEntry, ForgeQuery } from './types';

// #region doqs:error-codes
/** Reasons a Forge request can fail. */
export enum ForgeErrorCode {
  /** The API key is missing or revoked. */
  Unauthorized = 'unauthorized',
  /** The collection or entry does not exist. */
  NotFound = 'not_found',
  /** Too many requests; retry after the delay in the response. */
  RateLimited = 'rate_limited',
}
// #endregion doqs:error-codes

/** A page of entries and the cursor of the next one. */
export interface ForgePage<T> {
  /** Entries of this page in the requested order. */
  readonly entries: readonly ForgeEntry<T & Record<string, unknown>>[];
  /** Pass to `ForgeQuery.cursor` for the next page; `undefined` on the last page. */
  readonly nextCursor?: string;
}

/**
 * Typed client for authenticated collection reads.
 *
 * @stability candidate
 */
export interface ForgeClient {
  /**
   * Reads one page of a collection.
   *
   * @param collection - Collection name, as shown in the dashboard.
   * @param query - Optional paging and sorting.
   * @returns The page, or rejects with a {@link ForgeErrorCode}.
   */
  read<T extends Record<string, unknown>>(collection: string, query?: ForgeQuery): Promise<ForgePage<T>>;
  /** Reads a single entry by identifier. */
  get<T extends Record<string, unknown>>(collection: string, id: string): Promise<ForgeEntry<T>>;
}

/**
 * Creates a client for one API key.
 *
 * @param apiKey - Secret key; never ship it to a browser.
 * @param config - Result of `defineForgeConfig`.
 * @example
 * const client = createForgeClient(process.env.FORGE_KEY!, forge);
 * const page = await client.read<{ title: string }>('posts', { pageSize: 10 });
 */
export function createForgeClient(apiKey: string, config: Readonly<ForgeConfig>): ForgeClient;
export function createForgeClient(apiKey: string): ForgeClient;
export function createForgeClient(apiKey: string, config?: Readonly<ForgeConfig>): ForgeClient {
  void apiKey;
  void config;
  throw new Error('Illustrative signature for the documentation example.');
}

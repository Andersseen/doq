/** A stored record: its identifier plus the fields you defined for the collection. */
export type ForgeEntry<TFields extends Record<string, unknown> = Record<string, unknown>> = {
  /** Stable identifier assigned by Forge. */
  readonly id: string;
  /** ISO 8601 timestamp of the last write. */
  readonly updatedAt: string;
} & TFields;

/** Filters and paging accepted by a collection read. */
export interface ForgeQuery {
  /** Maximum number of entries per page. Defaults to 25, at most 100. */
  pageSize?: number;
  /** Opaque cursor returned by the previous page. */
  cursor?: string;
  /** Field to sort by; prefix with `-` for descending order. */
  sort?: string;
}

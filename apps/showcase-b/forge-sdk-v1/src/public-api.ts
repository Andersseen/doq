/** Settings of a ForgeCMS 1.x client. */
export interface ForgeClientOptions {
  /** Project API key. Replaced by workspace tokens in ForgeCMS 2. */
  apiKey: string;
}

/** The ForgeCMS 1.x client: one entry per request. */
export interface ForgeClient {
  /** Loads one entry; resolves to `null` when it does not exist. */
  getEntry(collection: string, slug: string): Promise<unknown | null>;
}

/** Creates a 1.x client from a project API key. */
export function createForgeClient(options: ForgeClientOptions): ForgeClient {
  return { getEntry: async () => (options.apiKey ? null : null) };
}

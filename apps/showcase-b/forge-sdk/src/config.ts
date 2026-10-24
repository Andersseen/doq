/** Deployment target of a Forge project. */
export type ForgeEnvironment = 'development' | 'staging' | 'production';

// #region doqs:forge-config
/** Settings shared by every client created in an application. */
export interface ForgeConfig {
  /** Project identifier from the Forge dashboard. */
  projectId: string;
  /** Environment the client talks to. Defaults to `production`. */
  environment?: ForgeEnvironment;
  /**
   * Called before every request, for example to refresh a token.
   * Throwing from this hook aborts the request.
   */
  onRequest?: (path: string) => void | Promise<void>;
}
// #endregion doqs:forge-config

/**
 * Validates and freezes a configuration object so it can be shared safely.
 *
 * @example
 * export const forge = defineForgeConfig({ projectId: 'prj_123', environment: 'staging' });
 */
export function defineForgeConfig(config: ForgeConfig): Readonly<ForgeConfig> {
  return Object.freeze({ environment: 'production', ...config });
}

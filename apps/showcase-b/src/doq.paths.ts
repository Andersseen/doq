// Build-safe: imported by vite.config.ts, so it must stay free of Angular components.
export const doqPaths = {
  contentDirectory: 'docs',
  basePath: '/', // the whole application is documentation (Starlight-style); Showcase A mounts Doqs at /docs instead
  // Current docs stay at "/"; the 1.x snapshot in src/content/docs-v1 is served at /v/1.
  versioning: {
    current: { id: 'latest', label: '2.x (latest)' },
    archives: [{ id: '1', label: '1.x', contentDirectory: 'docs-v1' }],
  },
} as const;

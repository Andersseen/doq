// Build-safe: imported by vite.config.ts, so it must stay free of Angular components.
export const doqPaths = {
  contentDirectory: 'docs',
  basePath: '/', // the whole application is documentation (Starlight-style); Showcase A mounts Doqs at /docs instead
} as const;

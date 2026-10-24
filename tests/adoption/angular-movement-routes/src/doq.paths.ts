// Migrated pages keep their public Angular Movement URLs: /docs/get-started, /docs/api-selection, /docs/accessibility, /docs/reference.
// The remaining host pages (/docs/introduction, /docs/api, ...) stay host-owned and win the route table where a host file exists.
export const doqPaths = {
  contentDirectory: 'docs',
  basePath: '/docs',
} as const;

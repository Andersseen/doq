// Current handbook at /handbook; the Angular Movement v0.9.0 tag is preserved as an archived snapshot at /handbook/v/0.9.
export const doqPaths = {
  contentDirectory: 'handbook',
  basePath: '/handbook',
  versioning: {
    current: { id: 'latest', label: 'Latest' },
    archives: [{ id: '0.9', label: 'v0.9.0', contentDirectory: 'handbook-v0-9' }],
  },
} as const;

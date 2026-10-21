import { defineConfig } from 'vitest/config';

// Pure TypeScript logic: domain code of the library and the repository scripts. No DOM, no Angular compiler.
export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['packages/doq/test/unit/**/*.spec.ts', 'scripts/**/*.spec.ts', 'apps/site/src/**/*.spec.ts'],
  },
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const config = fileURLToPath(new URL('packages/doq/config/src/public-api.ts', import.meta.url));

// Pure TypeScript logic: domain code of the library and the repository scripts. No DOM, no Angular compiler.
export default defineConfig({
  resolve: { alias: { '@doqs/analog/config': config } },
  test: {
    name: 'unit',
    environment: 'node',
    include: ['packages/doq/test/unit/**/*.spec.ts', 'scripts/**/*.spec.ts', 'apps/site/src/**/*.spec.ts'],
  },
});

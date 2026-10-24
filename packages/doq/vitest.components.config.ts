import angular from '@analogjs/vite-plugin-angular';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const config = fileURLToPath(new URL('config/src/public-api.ts', import.meta.url));

// Rendered Angular behavior in jsdom. Components are compiled ahead-of-time, like the published package
// (the JIT transform in @analogjs/vite-plugin-angular does not register signal inputs).
export default defineConfig({
  plugins: [angular({ jit: false, tsconfig: 'tsconfig.spec.json' })],
  resolve: { alias: { '@doqs/analog/config': config } },
  test: {
    name: 'components',
    environment: 'jsdom',
    globals: false,
    // The first test of a file pays for the cold jsdom + Angular compile; under a busy machine that exceeded the 5 s default.
    testTimeout: 20_000,
    setupFiles: ['test/components/setup.ts'],
    include: ['test/components/**/*.spec.ts'],
    server: { deps: { inline: [/@analogjs\//, /@testing-library\/angular/] } },
  },
});

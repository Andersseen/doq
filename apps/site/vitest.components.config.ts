import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

// Rendered behavior of the landing components in jsdom, compiled ahead of time like the production build.
export default defineConfig({
  plugins: [angular({ jit: false, tsconfig: 'tsconfig.spec.json' })],
  test: {
    name: 'site-components',
    environment: 'jsdom',
    globals: false,
    setupFiles: ['test/components/setup.ts'],
    include: ['test/components/**/*.spec.ts'],
    server: { deps: { inline: [/@analogjs\//, /@testing-library\/angular/] } },
  },
});

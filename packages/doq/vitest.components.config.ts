import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

// Rendered Angular behavior in jsdom. Components are compiled ahead-of-time, like the published package
// (the JIT transform in @analogjs/vite-plugin-angular does not register signal inputs).
export default defineConfig({
  plugins: [angular({ jit: false, tsconfig: 'tsconfig.spec.json' })],
  test: {
    name: 'components',
    environment: 'jsdom',
    globals: false,
    setupFiles: ['test/components/setup.ts'],
    include: ['test/components/**/*.spec.ts'],
    server: { deps: { inline: [/@analogjs\//, /@testing-library\/angular/] } },
  },
});

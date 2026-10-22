import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { doqPrerenderRoutes } from '@doqs/analog';
import { doqPaths } from './src/doq.paths';

// `vite build --mode nosearch` builds the search-disabled variant into its own directory (see src/app/app.config.ts).
export default defineConfig(({ mode }) => ({
  build: { target: ['es2022'] },
  resolve: { mainFields: ['module'] },
  plugins: [
    analog({
      ssr: true,
      static: true,
      content: { highlighter: 'prism' },
      prerender: { routes: async () => [...doqPrerenderRoutes(doqPaths)] },
      ...(mode === 'nosearch' ? { nitro: { output: { dir: '{{ rootDir }}/dist/analog-nosearch', publicDir: '{{ output.dir }}/public' } } } : {}),
    }),
    tailwindcss(),
  ],
}));

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { doqPrerenderRoutes } from '@getdoq/analog';
import { doqPaths } from './src/doq.paths';

export default defineConfig({
  build: { target: ['es2022'] },
  resolve: { mainFields: ['module'] },
  plugins: [
    analog({
      ssr: true,
      static: true,
      content: { highlighter: 'prism' },
      prerender: { routes: async () => ['/', ...doqPrerenderRoutes(doqPaths)] },
    }),
    tailwindcss(),
  ],
});

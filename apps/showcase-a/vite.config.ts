import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { doqPrerenderRoutes } from '@doqs/analog';
import { doqDeterministicMarkdown } from '@doqs/analog/vite';
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
    // Renders Markdown one file at a time so duplicate-heading ids stay identical between builds.
    doqDeterministicMarkdown(),
    tailwindcss(),
  ],
});

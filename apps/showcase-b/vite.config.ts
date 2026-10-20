import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { doqPrerenderRoute } from '@getdoq/analog';

export default defineConfig({
  build: { target: ['es2022'] },
  resolve: { mainFields: ['module'] },
  plugins: [
    analog({
      ssr: true,
      static: true,
      content: { highlighter: 'prism' },
      prerender: { routes: async () => [
        '/', '/docs',
        { contentDir: 'src/content/docs', recursive: true, transform: (file) => doqPrerenderRoute(file, '/docs') },
      ] },
    }),
    tailwindcss(),
  ],
});

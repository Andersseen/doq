import { defineConfig, type Plugin } from 'vite';
import analog from '@analogjs/platform';
import { buildRobots, buildSitemap, normalizeOrigin, originHeadTags, site } from './src/lib/site-config';

// DOQ_SITE_ORIGIN (for example the production Pages URL or custom domain) enables canonical URLs and the sitemap.
// Without it the site still builds; those absolute-URL features are simply left out.
const origin = normalizeOrigin(process.env['DOQ_SITE_ORIGIN']);
if (process.env['DOQ_SITE_ORIGIN'] && !origin) throw new Error('DOQ_SITE_ORIGIN must be an https origin such as https://example.com');

function siteMetadata(): Plugin {
  return {
    name: 'doq-site-metadata',
    transformIndexHtml: (html) => html.replace('<!-- origin-tags -->', originHeadTags(origin)),
    generateBundle() {
      if (this.environment.name !== 'client') return;
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(origin) });
      if (origin) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(origin) });
    },
  };
}

export default defineConfig({
  build: { target: ['es2022'] },
  resolve: { mainFields: ['module'] },
  plugins: [analog({ ssr: true, static: true, prerender: { routes: async () => [...site.routes] } }), siteMetadata()],
});

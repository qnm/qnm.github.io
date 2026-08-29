import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Custom domain (qnm.lol) hosted on GitHub Pages → root domain, no base path.
export default defineConfig({
  site: 'https://qnm.lol',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
});

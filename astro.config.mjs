import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages user site (qnm.github.io) → root domain, no base path.
export default defineConfig({
  site: 'https://qnm.github.io',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
});

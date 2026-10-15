import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_ORIGIN ?? 'https://csml-iit-ucl.github.io';
const base = process.env.SITE_BASE_PATH ?? '/csml-website/';
// The staging (dev preview) build is noindex and disallowed in robots.txt; it gets
// no sitemap of its own so a sitemap never advertises pages search engines must skip.
const isStaging = process.env.PUBLIC_SITE_ENV === 'staging';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  outDir: process.env.BUILD_OUT_DIR ?? './dist',
  integrations: isStaging ? [] : [sitemap()],
  build: {
    format: 'directory',
  },
  vite: {
    server: {
      fs: {
        allow: ['.'],
      },
    },
  },
});

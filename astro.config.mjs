import { defineConfig } from 'astro/config';

const site = process.env.SITE_ORIGIN ?? 'https://danfoa.github.io';
const base = process.env.SITE_BASE_PATH ?? '/cmsl-website/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  outDir: process.env.BUILD_OUT_DIR ?? './dist',
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

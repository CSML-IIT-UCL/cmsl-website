/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_ENV?: 'production' | 'staging' | 'local';
  readonly PUBLIC_COMMIT_SHA?: string;
  readonly PUBLIC_BUILD_TIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

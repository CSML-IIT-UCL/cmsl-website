import type { APIRoute } from 'astro';
import { withBase } from '@/lib/paths';

// Only the production build's output is ever served at the site root (the dev
// preview is composed under /dev/ and can't act as the domain's robots.txt), but
// this stays environment-aware so a staging build never advertises itself as indexable.
export const GET: APIRoute = ({ site }) => {
  const siteEnvironment = import.meta.env.PUBLIC_SITE_ENV ?? 'production';
  const lines =
    siteEnvironment === 'staging'
      ? ['User-agent: *', 'Disallow: /']
      : ['User-agent: *', 'Disallow: /dev/', '', `Sitemap: ${new URL(withBase('sitemap-index.xml'), site).toString()}`];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

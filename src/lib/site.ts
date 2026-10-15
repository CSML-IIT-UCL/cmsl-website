import * as yaml from 'js-yaml';
import siteYaml from '../../content/site.yaml?raw';
import { siteSchema, type SiteConfig } from './site-schema';

export type { SiteConfig };

export function getSiteConfig(): SiteConfig {
  const parsed = siteSchema.safeParse(yaml.load(siteYaml));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `- ${issue.path.join('.') || 'document'}: ${issue.message}`).join('\n');
    throw new Error(`content/site.yaml is invalid:\n${issues}\nFix the field(s) above, or run \`npm run content:validate\` for the full report.`);
  }
  return parsed.data;
}

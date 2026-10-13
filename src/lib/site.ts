import * as yaml from 'js-yaml';
import { z } from 'zod';
import siteYaml from '../../content/site.yaml?raw';

const siteSchema = z.object({
  title: z.string(),
  short_title: z.string(),
  description: z.string(),
  principal_investigator_id: z.string(),
  logo: z.string(),
  logo_dark: z.string().nullable().optional(),
  logo_margin_top: z.number().default(0),
  logo_margin_bottom: z.number().default(0),
  hero: z.object({
    image: z.string().nullable(),
    alt: z.string().nullable(),
    focal_position: z.string(),
  }),
  role_groups: z.array(z.object({ key: z.string(), label: z.string(), order: z.number() })),
  contact: z.object({
    location_label: z.string().nullable(),
    address: z.string().nullable(),
    institution_url: z.string().url(),
    privacy_url: z.string().url(),
  }),
});

export type SiteConfig = z.infer<typeof siteSchema>;

export function getSiteConfig(): SiteConfig {
  return siteSchema.parse(yaml.load(siteYaml));
}

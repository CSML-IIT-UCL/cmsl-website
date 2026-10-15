import { z } from 'zod';

const URL_MESSAGE = 'must be a complete, valid URL, e.g. "https://example.org/page"';
const HTTPS_MESSAGE = 'must start with "https://" — plain http://, javascript:, mailto:, and other schemes are not accepted';

export const siteSchema = z.object({
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
    institution_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE),
    privacy_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE),
  }),
});

export type SiteConfig = z.infer<typeof siteSchema>;

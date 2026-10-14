import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { NATIONALITIES } from './lib/nationality';

const nullableUrl = z.string().url().startsWith('https://').nullable().optional();
const localMediaPath = z.string().regex(/^\/media\/[A-Za-z0-9._~!$&'()*+,;=:@%/ -]+$/).nullable().optional();

const about = defineCollection({
  loader: glob({ base: './content', pattern: 'about.md' }),
  schema: z.object({ title: z.string().min(1) }),
});

const affiliationYear = z.number().int().min(1990).max(2100).nullable().optional();

const people = defineCollection({
  // '!_*.md' keeps content/people/_template.md out of the published roster so
  // team members can copy it in place without it being parsed as a real person.
  loader: glob({ base: './content/people', pattern: ['**/*.md', '!_*.md'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    draft: z.boolean().default(true),
    role: z.enum([
      'senior_academic',
      'postdoc',
      'phd_student',
      'research_engineer',
      'affiliated_researcher',
      'research_support',
    ]),
    role_label: z.string().min(1),
    status: z.enum(['active', 'alumni', 'affiliated']),
    order: z.number().int().default(100),
    email: z.string().email().nullable().optional(),
    photo: localMediaPath,
    photo_alt: z.string().nullable().optional(),
    // ISO 3166-1 alpha-2 code; must be a verified entry in src/lib/nationality.ts
    nationality: z.string().regex(/^[A-Z]{2}$/).nullable().optional()
      .refine((code) => code == null || code in NATIONALITIES, {
        message: 'unrecognized nationality code; add it to src/lib/nationality.ts first',
      }),
    research_summary: z.string().nullable().optional(),
    research_interests: z.array(z.string()).default([]),
    iit_profile: nullableUrl,
    personal_website: nullableUrl,
    orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/).nullable().optional(),
    scholar_url: nullableUrl,
    github_url: nullableUrl,
    linkedin_url: nullableUrl,
    x_url: nullableUrl,
    bluesky_url: nullableUrl,
    // Current employer/institution, shown only for alumni (status: alumni) cards and profiles.
    current_affiliation: z.string().min(1).nullable().optional(),
    media_links: z.array(z.object({ label: z.string().min(1), url: z.string().url().startsWith('https://') })).default([]),
    openalex_ids: z.array(z.string().regex(/^A\d+$/)).default([]),
    publications: z.object({
      enabled: z.boolean().default(true),
      include_in_team_list: z.boolean().default(true),
      // Inclusive year range this person was part of the group. Only used to scope
      // which of their works count toward the shared/common publications pool; the
      // person's own profile always shows their complete publication history.
      start_of_affiliation: affiliationYear,
      end_of_affiliation: affiliationYear,
    }).refine(
      (value) => value.start_of_affiliation == null || value.end_of_affiliation == null || value.start_of_affiliation <= value.end_of_affiliation,
      { message: 'start_of_affiliation must be on or before end_of_affiliation', path: ['end_of_affiliation'] },
    ),
  }),
});

const research = defineCollection({
  loader: glob({ base: './content/research', pattern: ['**/*.md', '!_*.md'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    draft: z.boolean().default(true),
    order: z.number().int().default(100),
    media: z.object({
      src: localMediaPath,
      alt: z.string().nullable().optional(),
      fit: z.enum(['cover', 'contain']).default('cover'),
      position: z.string().default('center'),
      poster: localMediaPath,
    }),
    link: nullableUrl,
  }),
});

const news = defineCollection({
  loader: glob({ base: './content/news', pattern: ['**/*.md', '!_*.md'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    draft: z.boolean().default(true),
    published_at: z.coerce.date(),
    event_date: z.coerce.date().nullable().optional(),
    pinned: z.boolean().default(false),
    link: nullableUrl,
    image: localMediaPath,
    image_alt: z.string().nullable().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './content/projects', pattern: ['**/*.{yaml,yml}', '!_*.{yaml,yml}'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    acronym: z.string().min(1),
    draft: z.boolean().default(true),
    status: z.enum(['active', 'completed']),
    start_date: z.coerce.date().nullable().optional(),
    end_date: z.coerce.date().nullable().optional(),
    project_url: nullableUrl,
    project_logo: localMediaPath,
    funders: z.array(z.object({
      name: z.string().min(1),
      logo: localMediaPath,
      logo_alt: z.string().nullable().optional(),
      url: nullableUrl,
    })).default([]),
    order: z.number().int().default(100),
  }),
});

const collaborations = defineCollection({
  loader: glob({ base: './content/collaborations', pattern: ['**/*.{yaml,yml}', '!_*.{yaml,yml}'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    draft: z.boolean().default(true),
    speciality: z.string().min(1),
    lab_name: z.string().min(1),
    institution: z.string().nullable().optional(),
    lab_logo: localMediaPath,
    lab_logo_alt: z.string().nullable().optional(),
    lab_url: nullableUrl,
    pi_name: z.string().min(1),
    pi_photo: localMediaPath,
    pi_photo_alt: z.string().nullable().optional(),
    order: z.number().int().default(100),
  }),
});

const openings = defineCollection({
  loader: glob({ base: './content/openings', pattern: ['**/*.md', '!_*.md'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1),
    draft: z.boolean().default(true),
    application_type: z.enum(['phd', 'postdoc', 'research_engineer', 'open']),
    status: z.enum(['open', 'closed']),
    published_at: z.coerce.date(),
    deadline_at: z.coerce.date().nullable().optional(),
    position_reference: z.string().nullable().optional(),
    description_url: nullableUrl,
    apply_url: nullableUrl,
  }),
});

const blogEntries = defineCollection({
  loader: glob({ base: './content/blog-entries', pattern: ['**/*.{yaml,yml}', '!_*.{yaml,yml}'] }),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    draft: z.boolean().default(true),
    title: z.string().min(1),
    author: z.string().min(1),
    person_id: z.string().nullable().optional(),
    url: z.string().url().startsWith('https://'),
    published_at: z.coerce.date().nullable().optional(),
    image: z.union([localMediaPath, z.string().url().startsWith('https://')]).nullable().optional(),
    image_alt: z.string().nullable().optional(),
  }),
});

export const collections = { about, people, research, news, projects, collaborations, openings, blogEntries };

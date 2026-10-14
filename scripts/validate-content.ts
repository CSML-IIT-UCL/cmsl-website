import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { filesUnder, readMarkdown, readYaml } from './content-utils.ts';
import { NATIONALITIES } from '../src/lib/nationality.ts';
import { publicationOverridesSchema } from '../src/lib/publication-overrides.ts';

const personSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  draft: z.boolean(),
  role: z.enum(['senior_academic', 'postdoc', 'phd_student', 'research_engineer', 'affiliated_researcher', 'research_support']),
  role_label: z.string().min(1),
  status: z.enum(['active', 'alumni', 'affiliated']),
  photo: z.string().nullable().optional(),
  photo_alt: z.string().nullable().optional(),
  nationality: z.string().regex(/^[A-Z]{2}$/).nullable().optional()
    .refine((code) => code == null || code in NATIONALITIES, {
      message: 'unrecognized nationality code; add it to src/lib/nationality.ts first',
    }),
  iit_profile: z.string().url().startsWith('https://').nullable().optional(),
  personal_website: z.string().url().startsWith('https://').nullable().optional(),
  orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/).nullable().optional(),
  scholar_url: z.string().url().startsWith('https://').nullable().optional(),
  github_url: z.string().url().startsWith('https://').nullable().optional(),
  linkedin_url: z.string().url().startsWith('https://').nullable().optional(),
  x_url: z.string().url().startsWith('https://').nullable().optional(),
  bluesky_url: z.string().url().startsWith('https://').nullable().optional(),
  current_affiliation: z.string().min(1).nullable().optional(),
  openalex_ids: z.array(z.string().regex(/^A\d+$/)),
  publications: z.object({
    enabled: z.boolean(),
    include_in_team_list: z.boolean(),
    start_of_affiliation: z.number().int().min(1990).max(2100).nullable().optional(),
    end_of_affiliation: z.number().int().min(1990).max(2100).nullable().optional(),
  }).refine(
    (value) => value.start_of_affiliation == null || value.end_of_affiliation == null || value.start_of_affiliation <= value.end_of_affiliation,
    { message: 'start_of_affiliation must be on or before end_of_affiliation', path: ['end_of_affiliation'] },
  ),
});

const newsSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  draft: z.boolean().default(true),
  image: z.string().nullable().optional(),
  image_alt: z.string().nullable().optional(),
});

type Person = z.infer<typeof personSchema>;
type Site = { principal_investigator_id: string; logo: string; logo_dark?: string | null; hero?: { image?: string | null } };

const errors: string[] = [];
const people = new Map<string, Person>();
const openAlexOwners = new Map<string, string>();

function addError(file: string, field: string, message: string) {
  errors.push(`${file}: ${field}: ${message}`);
}

function validateLocalMedia(file: string, field: string, value: string | null | undefined) {
  if (!value) return;
  if (!value.startsWith('/media/') || value.includes('..') || /[?#]/.test(value)) {
    addError(file, field, 'use a traversal-free /media/... source path');
    return;
  }
  const source = path.join('media', value.slice('/media/'.length));
  if (!fs.existsSync(source)) addError(file, field, `source asset does not exist: ${source}`);
}

for (const file of filesUnder('content/people', ['.md'])) {
  try {
    const parsed = personSchema.safeParse(readMarkdown(file).data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) addError(file, issue.path.join('.') || 'frontmatter', issue.message);
      continue;
    }
    const person = parsed.data;
    const fileId = path.basename(file, '.md');
    if (fileId !== person.id) addError(file, 'id', `must match filename '${fileId}'`);
    if (people.has(person.id)) addError(file, 'id', `duplicate person ID '${person.id}'`);
    people.set(person.id, person);
    validateLocalMedia(file, 'photo', person.photo);
    if (person.photo && !person.photo_alt) addError(file, 'photo_alt', 'required when photo is set');
    for (const authorId of person.openalex_ids) {
      const owner = openAlexOwners.get(authorId);
      if (owner && owner !== person.id) addError(file, 'openalex_ids', `${authorId} is already assigned to ${owner}`);
      openAlexOwners.set(authorId, person.id);
    }
  } catch (error) {
    addError(file, 'frontmatter', error instanceof Error ? error.message : String(error));
  }
}

try {
  const site = readYaml<Site>('content/site.yaml');
  const pi = people.get(site.principal_investigator_id);
  if (!pi) addError('content/site.yaml', 'principal_investigator_id', 'must reference an existing person');
  else if (pi.draft) addError('content/site.yaml', 'principal_investigator_id', 'must reference a published person');
  validateLocalMedia('content/site.yaml', 'logo', site.logo);
  validateLocalMedia('content/site.yaml', 'logo_dark', site.logo_dark);
  validateLocalMedia('content/site.yaml', 'hero.image', site.hero?.image);
} catch (error) {
  addError('content/site.yaml', 'document', error instanceof Error ? error.message : String(error));
}

for (const file of filesUnder('content/news', ['.md'])) {
  try {
    const parsed = newsSchema.safeParse(readMarkdown(file).data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) addError(file, issue.path.join('.') || 'frontmatter', issue.message);
      continue;
    }
    const news = parsed.data;
    const fileId = path.basename(file, '.md');
    if (fileId !== news.id) addError(file, 'id', `must match filename '${fileId}'`);
    validateLocalMedia(file, 'image', news.image);
    if (news.image && !news.image_alt) addError(file, 'image_alt', 'required when image is set');
  } catch (error) {
    addError(file, 'frontmatter', error instanceof Error ? error.message : String(error));
  }
}

for (const file of filesUnder('content/projects', ['.yaml', '.yml'])) {
  try {
    const project = readYaml<Record<string, unknown>>(file);
    if (project.draft === false) {
      if (typeof project.project_url !== 'string' || !project.project_url.startsWith('https://')) addError(file, 'project_url', 'published projects require an HTTPS destination');
      if (!Array.isArray(project.funders) || project.funders.length === 0) addError(file, 'funders', 'published projects require at least one named funder');
    }
  } catch (error) {
    addError(file, 'document', error instanceof Error ? error.message : String(error));
  }
}

{
  const file = 'content/publication-overrides.yaml';
  try {
    const parsed = publicationOverridesSchema.safeParse(readYaml(file));
    if (!parsed.success) {
      for (const issue of parsed.error.issues) addError(file, issue.path.join('.') || 'document', issue.message);
    } else {
      const seen = new Set<string>();
      parsed.data.exclusions.forEach((exclusion, index) => {
        if (!people.has(exclusion.person_id)) addError(file, `exclusions.${index}.person_id`, `unknown person '${exclusion.person_id}'`);
        const key = `${exclusion.work_id}:${exclusion.person_id}`;
        if (seen.has(key)) addError(file, `exclusions.${index}`, `duplicate exclusion ${key}`);
        seen.add(key);
      });
    }
  } catch (error) {
    addError(file, 'document', error instanceof Error ? error.message : String(error));
  }
}

for (const file of ['data/publications.json', 'data/blog.json']) {
  try { JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { addError(file, 'document', `invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`Content valid: ${people.size} people, ${openAlexOwners.size} verified OpenAlex IDs.`);

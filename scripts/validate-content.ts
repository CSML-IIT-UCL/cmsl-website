import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { filesUnder, readMarkdown, readYaml } from './content-utils.ts';
import { NATIONALITIES } from '../src/lib/nationality.ts';
import { publicationOverridesSchema } from '../src/lib/publication-overrides.ts';
import { siteSchema } from '../src/lib/site-schema.ts';

const URL_MESSAGE = 'must be a complete, valid URL, e.g. "https://example.org/page"';
const HTTPS_MESSAGE = 'must start with "https://" — plain http://, javascript:, mailto:, and other schemes are not accepted';
const ID_MESSAGE = 'must use only lowercase letters, digits, and hyphens between words (e.g. "jane-doe"), with no leading, trailing, or doubled hyphen';

const personSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ID_MESSAGE),
  name: z.string().min(1),
  draft: z.boolean(),
  role: z.enum(['senior_academic', 'postdoc', 'phd_student', 'research_engineer', 'affiliated_researcher', 'research_support']),
  role_label: z.string().min(1),
  status: z.enum(['active', 'alumni', 'affiliated']),
  photo: z.string().nullable().optional(),
  photo_alt: z.string().nullable().optional(),
  nationality: z.string().regex(/^[A-Z]{2}$/, 'must be a two-letter uppercase ISO 3166-1 country code, e.g. "IT" or "CO" (not lowercase or three letters)').nullable().optional()
    .refine((code) => code == null || code in NATIONALITIES, {
      message: 'unrecognized nationality code; add it to src/lib/nationality.ts first',
    }),
  iit_profile: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  personal_website: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'must be a bare ORCID iD in the form 0000-0001-2345-6789 (four groups of four digits separated by hyphens; the last character may be X)').nullable().optional(),
  scholar_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  github_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  linkedin_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  x_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  bluesky_url: z.string().url(URL_MESSAGE).startsWith('https://', HTTPS_MESSAGE).nullable().optional(),
  current_affiliation: z.string().min(1).nullable().optional(),
  openalex_ids: z.array(z.string().regex(/^A\d+$/, 'must be a verified OpenAlex Author ID: an uppercase "A" followed by digits only, e.g. "A5089972466" (not a Work ID starting with "W", and not a bare number)')),
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
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, ID_MESSAGE),
  draft: z.boolean().default(true),
  image: z.string().nullable().optional(),
  image_alt: z.string().nullable().optional(),
});

type Person = z.infer<typeof personSchema>;

const errors: string[] = [];
const warnings: string[] = [];
const people = new Map<string, Person>();
const personFiles = new Map<string, string>();
const openAlexOwners = new Map<string, string>();
// role -> role_label -> files using that exact label; surfaces drift like
// "Post Doc" vs "Postdoctoral Researcher" for the same role without forcing
// every label to match (a person's career history, e.g. "PhD Student &
// Postdoctoral Researcher", is legitimately different, not a typo).
const roleLabelsByRole = new Map<string, Map<string, string[]>>();

// Renders a Zod issue path like ['openalex_ids', 0] as 'openalex_ids[0]' instead
// of 'openalex_ids.0', which reads oddly to content editors unfamiliar with Zod.
function formatPath(segments: readonly PropertyKey[]): string {
  return segments.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    return acc ? `${acc}.${String(segment)}` : String(segment);
  }, '');
}

function addError(file: string, field: string, message: string) {
  errors.push(`${file}: ${field}: ${message}`);
}

function addWarning(file: string, field: string, message: string) {
  warnings.push(`${file}: ${field}: ${message}`);
}

function validateLocalMedia(file: string, field: string, value: string | null | undefined) {
  if (!value) return;
  if (!value.startsWith('/media/') || value.includes('..') || /[?#]/.test(value)) {
    addError(file, field, `must be a plain path under /media/ with no "..", "?", or "#" (e.g. "/media/people/jane-doe.jpg") — got "${value}"`);
    return;
  }
  const source = path.join('media', value.slice('/media/'.length));
  if (!fs.existsSync(source)) addError(file, field, `source asset does not exist at ${source} — add the file under media/ or fix the path`);
}

// Same shape as validateLocalMedia, but for fields the content contract doesn't
// yet treat as hard-blocking (project/funder logos, research card media). These
// stay warnings — not every missing/placeholder image here should fail a build —
// but editors still get told exactly what's broken and where.
function warnLocalMedia(file: string, field: string, value: string | null | undefined) {
  if (!value || value.startsWith('https://')) return;
  if (!value.startsWith('/media/') || value.includes('..') || /[?#]/.test(value)) {
    addWarning(file, field, `looks like an unsafe or malformed media path ("${value}") — expected a plain path under /media/`);
    return;
  }
  const source = path.join('media', value.slice('/media/'.length));
  if (!fs.existsSync(source)) addWarning(file, field, `referenced file is missing at ${source} — this will render as a broken image`);
}

for (const file of filesUnder('content/people', ['.md'])) {
  try {
    const parsed = personSchema.safeParse(readMarkdown(file).data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) addError(file, formatPath(issue.path) || 'frontmatter', issue.message);
      continue;
    }
    const person = parsed.data;
    const fileId = path.basename(file, '.md');
    if (fileId !== person.id) addError(file, 'id', `must match filename '${fileId}'`);
    const existingFile = personFiles.get(person.id);
    if (existingFile) {
      // Keep the first-seen record in the `people` map so later checks (PI
      // lookup, OpenAlex ownership) aren't silently overwritten by the
      // duplicate and don't cascade into unrelated, misleading errors.
      addError(file, 'id', `duplicate person ID '${person.id}' — already defined in ${existingFile}`);
    } else {
      personFiles.set(person.id, file);
      people.set(person.id, person);
    }
    validateLocalMedia(file, 'photo', person.photo);
    if (person.photo && !person.photo_alt) addError(file, 'photo_alt', 'required when photo is set');
    for (const [index, authorId] of person.openalex_ids.entries()) {
      const owner = openAlexOwners.get(authorId);
      if (owner && owner !== person.id) addError(file, `openalex_ids[${index}]`, `${authorId} is already assigned to ${owner} — each OpenAlex author ID may belong to only one person`);
      openAlexOwners.set(authorId, person.id);
    }
    if (!roleLabelsByRole.has(person.role)) roleLabelsByRole.set(person.role, new Map());
    const labelFiles = roleLabelsByRole.get(person.role)!;
    if (!labelFiles.has(person.role_label)) labelFiles.set(person.role_label, []);
    labelFiles.get(person.role_label)!.push(file);
  } catch (error) {
    addError(file, 'frontmatter', error instanceof Error ? error.message : String(error));
  }
}

for (const [role, labelFiles] of roleLabelsByRole) {
  if (labelFiles.size <= 1) continue;
  const summary = [...labelFiles.entries()].map(([label, files]) => `"${label}" (${files.map((f) => path.basename(f, '.md')).join(', ')})`).join(' vs. ');
  addWarning('content/people', 'role_label', `role "${role}" is rendered with ${labelFiles.size} different role_label strings: ${summary} — consider using one consistent label unless the difference reflects a genuinely different title`);
}

try {
  const rawSite = readYaml<Record<string, unknown>>('content/site.yaml');
  const parsedSite = siteSchema.safeParse(rawSite);
  if (!parsedSite.success) {
    for (const issue of parsedSite.error.issues) addError('content/site.yaml', formatPath(issue.path) || 'document', issue.message);
  } else {
    const site = parsedSite.data;
    const pi = people.get(site.principal_investigator_id);
    if (!pi) addError('content/site.yaml', 'principal_investigator_id', `must reference an existing person (no content/people/${site.principal_investigator_id}.md was found)`);
    else if (pi.draft) addError('content/site.yaml', 'principal_investigator_id', `must reference a published person (content/people/${site.principal_investigator_id}.md has draft: true)`);
    validateLocalMedia('content/site.yaml', 'logo', site.logo);
    validateLocalMedia('content/site.yaml', 'logo_dark', site.logo_dark);
    validateLocalMedia('content/site.yaml', 'hero.image', site.hero?.image);
  }
} catch (error) {
  addError('content/site.yaml', 'document', error instanceof Error ? error.message : String(error));
}

for (const file of filesUnder('content/news', ['.md'])) {
  try {
    const parsed = newsSchema.safeParse(readMarkdown(file).data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) addError(file, formatPath(issue.path) || 'frontmatter', issue.message);
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
      if (typeof project.project_url !== 'string' || !project.project_url.startsWith('https://')) addError(file, 'project_url', 'published projects (draft: false) require an https:// project_url');
      if (!Array.isArray(project.funders) || project.funders.length === 0) addError(file, 'funders', 'published projects (draft: false) require at least one entry in funders');
    }
    warnLocalMedia(file, 'project_logo', project.project_logo as string | null | undefined);
    if (Array.isArray(project.funders)) {
      project.funders.forEach((funder, index) => {
        if (funder && typeof funder === 'object') warnLocalMedia(file, `funders[${index}].logo`, (funder as Record<string, unknown>).logo as string | null | undefined);
      });
    }
  } catch (error) {
    addError(file, 'document', error instanceof Error ? error.message : String(error));
  }
}

for (const file of filesUnder('content/research', ['.md'])) {
  try {
    const research = readMarkdown<Record<string, unknown>>(file).data;
    const media = (research.media ?? {}) as Record<string, unknown>;
    warnLocalMedia(file, 'media.src', media.src as string | null | undefined);
    warnLocalMedia(file, 'media.poster', media.poster as string | null | undefined);
    if (media.src && !media.alt) addWarning(file, 'media.alt', 'media.src is set but media.alt is empty — add alt text for screen readers');
  } catch (error) {
    addError(file, 'document', error instanceof Error ? error.message : String(error));
  }
}

{
  const seenBlogUrls = new Map<string, string>();
  for (const entry of (JSON.parse(fs.readFileSync('data/blog.json', 'utf8')).entries ?? []) as Array<{ url?: string }>) {
    if (typeof entry.url === 'string') seenBlogUrls.set(entry.url, 'data/blog.json');
  }
  for (const file of filesUnder('content/blog-entries', ['.yaml', '.yml'])) {
    try {
      const entry = readYaml<Record<string, unknown>>(file);
      warnLocalMedia(file, 'image', entry.image as string | null | undefined);
      if (typeof entry.url === 'string') {
        const existing = seenBlogUrls.get(entry.url);
        if (existing) addWarning(file, 'url', `this article URL is already listed via ${existing} — the post will appear twice on /blog/`);
        seenBlogUrls.set(entry.url, file);
      }
    } catch (error) {
      addError(file, 'document', error instanceof Error ? error.message : String(error));
    }
  }
}

for (const file of filesUnder('content/collaborations', ['.yaml', '.yml'])) {
  try {
    const collaboration = readYaml<Record<string, unknown>>(file);
    validateLocalMedia(file, 'pi_photo', collaboration.pi_photo as string | null | undefined);
    if (collaboration.pi_photo && !collaboration.pi_photo_alt) addError(file, 'pi_photo_alt', 'required when pi_photo is set');
    validateLocalMedia(file, 'lab_logo', collaboration.lab_logo as string | null | undefined);
    if (collaboration.lab_logo && !collaboration.lab_logo_alt) addError(file, 'lab_logo_alt', 'required when lab_logo is set');
    if (collaboration.draft === false) {
      if (typeof collaboration.lab_url !== 'string' || !collaboration.lab_url.startsWith('https://')) addError(file, 'lab_url', 'published collaborations (draft: false) require an https:// lab_url');
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
      for (const issue of parsed.error.issues) addError(file, formatPath(issue.path) || 'document', issue.message);
    } else {
      const seen = new Set<string>();
      parsed.data.exclusions.forEach((exclusion, index) => {
        if (!people.has(exclusion.person_id)) addError(file, `exclusions[${index}].person_id`, `unknown person '${exclusion.person_id}' — must match an existing content/people/<id>.md file`);
        const key = `${exclusion.work_id}:${exclusion.person_id}`;
        if (seen.has(key)) addError(file, `exclusions[${index}]`, `duplicate exclusion: ${exclusion.work_id} for ${exclusion.person_id} is already excluded elsewhere in this file`);
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

if (warnings.length > 0) {
  console.warn(`Content warnings (non-blocking) — ${warnings.length} item(s) to review when convenient:\n${warnings.map((warning) => `- ${warning}`).join('\n')}`);
}

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} error(s):\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`Content valid: ${people.size} people, ${openAlexOwners.size} verified OpenAlex IDs.`);

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { filesUnder, readMarkdown } from './content-utils.ts';

type Person = {
  id: string;
  name: string;
  draft: boolean;
  openalex_ids?: string[];
  publications?: { enabled?: boolean; include_in_team_list?: boolean };
};

const authors = filesUnder('content/people', ['.md'])
  .map((file) => readMarkdown<Person>(file).data)
  .filter((person) => !person.draft && person.publications?.enabled)
  .map((person) => ({
    person_id: person.id,
    name: person.name,
    openalex_ids: [...(person.openalex_ids ?? [])].sort(),
    include_in_team_list: person.publications?.include_in_team_list ?? false,
  }))
  .sort((a, b) => a.person_id.localeCompare(b.person_id));

const signature = crypto.createHash('sha256').update(JSON.stringify(authors)).digest('hex');
const output = { version: 1, signature, authors };
fs.mkdirSync('.cache', { recursive: true });
fs.writeFileSync(path.join('.cache', 'authors.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Exported ${authors.length} publication-enabled people to .cache/authors.json (${signature.slice(0, 12)}).`);

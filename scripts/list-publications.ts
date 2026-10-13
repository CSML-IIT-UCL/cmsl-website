import { filesUnder, readMarkdown } from './content-utils.ts';

type Person = { id: string; name: string; draft: boolean; openalex_ids?: string[]; publications?: { enabled?: boolean } };
const people = filesUnder('content/people', ['.md'])
  .map((file) => readMarkdown<Person>(file).data)
  .filter((person) => !person.draft && person.publications?.enabled)
  .sort((a, b) => a.name.localeCompare(b.name));

for (const person of people) {
  const coverage = person.openalex_ids?.length ? person.openalex_ids.join(', ') : 'not linked';
  console.log(`${person.id.padEnd(24)} ${person.name} [${coverage}]`);
}

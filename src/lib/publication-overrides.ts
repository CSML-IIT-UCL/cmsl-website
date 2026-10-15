import { z } from 'zod';

const notYetSupported = (name: string) => z.array(z.unknown()).max(0, {
  message: `${name} are not supported yet; leave the list empty`,
});

export const publicationOverridesSchema = z.object({
  version: z.literal(1),
  // Removes one person's membership edge from one OpenAlex work, e.g. when a
  // merged OpenAlex author profile wrongly includes someone else's paper. A work
  // left with no members disappears from every view.
  exclusions: z.array(z.object({
    work_id: z.string().regex(/^W\d+$/, 'must be a bare OpenAlex work ID such as W1234567890'),
    person_id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be the lowercase hyphenated id of an existing content/people/<id>.md file'),
    reason: z.string().trim().min(1),
  })).default([]),
  additions: notYetSupported('additions').default([]),
  patches: notYetSupported('patches').default([]),
  aliases: notYetSupported('aliases').default([]),
});

export type PublicationOverrides = z.infer<typeof publicationOverridesSchema>;

const workKey = (id: string) => id.replace(/^https:\/\/openalex\.org\//, '');

export function applyExclusions<T extends { id: string; member_ids: string[] }>(
  records: T[],
  exclusions: PublicationOverrides['exclusions'],
): T[] {
  if (exclusions.length === 0) return records;
  const excluded = new Map<string, Set<string>>();
  for (const { work_id, person_id } of exclusions) {
    if (!excluded.has(work_id)) excluded.set(work_id, new Set());
    excluded.get(work_id)!.add(person_id);
  }
  return records.flatMap((record) => {
    const people = excluded.get(workKey(record.id));
    if (!people) return [record];
    const memberIds = record.member_ids.filter((memberId) => !people.has(memberId));
    return memberIds.length > 0 ? [{ ...record, member_ids: memberIds }] : [];
  });
}

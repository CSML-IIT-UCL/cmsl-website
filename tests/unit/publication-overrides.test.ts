import { describe, expect, it } from 'vitest';
import { applyExclusions, publicationOverridesSchema } from '../../src/lib/publication-overrides';
import { compareItems } from '../../src/scripts/publication-sort';

const records = [
  { id: 'https://openalex.org/W1', member_ids: ['alice', 'bob'] },
  { id: 'https://openalex.org/W2', member_ids: ['alice'] },
  { id: 'https://openalex.org/W3', member_ids: ['bob'] },
];

describe('applyExclusions', () => {
  it('removes only the excluded person edge and drops works left without members', () => {
    const result = applyExclusions(records, [
      { work_id: 'W1', person_id: 'alice', reason: 'namesake' },
      { work_id: 'W2', person_id: 'alice', reason: 'namesake' },
    ]);
    expect(result).toEqual([
      { id: 'https://openalex.org/W1', member_ids: ['bob'] },
      { id: 'https://openalex.org/W3', member_ids: ['bob'] },
    ]);
  });

  it('leaves records untouched without exclusions', () => {
    expect(applyExclusions(records, [])).toBe(records);
  });
});

describe('publicationOverridesSchema', () => {
  it('rejects malformed work IDs and unsupported override kinds', () => {
    expect(publicationOverridesSchema.safeParse({ version: 1, exclusions: [{ work_id: 'https://openalex.org/W1', person_id: 'a', reason: 'x' }] }).success).toBe(false);
    expect(publicationOverridesSchema.safeParse({ version: 1, patches: [{}] }).success).toBe(false);
    expect(publicationOverridesSchema.safeParse({ version: 1, exclusions: [], additions: [], patches: [], aliases: [] }).success).toBe(true);
  });
});

describe('compareItems', () => {
  const items = [
    { dateRank: 0, citations: 3 },
    { dateRank: 1, citations: null },
    { dateRank: 2, citations: 40 },
    { dateRank: 3, citations: 3 },
  ];
  it('keeps the rendered date order by default', () => {
    expect([...items].reverse().sort((a, b) => compareItems('date', a, b)).map((i) => i.dateRank)).toEqual([0, 1, 2, 3]);
  });
  it('orders by citations descending, unknown last, ties by date', () => {
    expect([...items].sort((a, b) => compareItems('citations', a, b)).map((i) => i.dateRank)).toEqual([2, 0, 3, 1]);
  });
});

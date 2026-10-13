import { describe, expect, it, vi } from 'vitest';

vi.mock('../../data/publications.json', () => ({
  default: {
    version: 1,
    source: 'OpenAlex',
    last_full_refresh_at: null,
    author_roster_signature: null,
    queried_author_ids: [],
    coverage_by_person: {},
    mapping_warnings: [],
    records: [
      { id: 'w-2020', title: 'Work from 2020', publication_year: 2020, member_ids: ['alice'] },
      { id: 'w-2023', title: 'Work from 2023', publication_year: 2023, member_ids: ['alice'] },
      { id: 'w-undated', title: 'Undated work', publication_year: null, member_ids: ['alice'] },
      { id: 'w-bob-2024', title: 'Bob 2024', publication_year: 2024, member_ids: ['bob'] },
      { id: 'w-excluded', title: 'Excluded member work', publication_year: 2022, member_ids: ['carol'] },
    ],
  },
}));

const { teamPublications, publicationsForPerson } = await import('../../src/lib/publications');

describe('teamPublications', () => {
  it('only counts a work toward a member whose affiliation window covers its year', () => {
    const records = teamPublications([
      { id: 'alice', includeInTeamList: true, startOfAffiliation: 2021, endOfAffiliation: 2022 },
    ]);
    expect(records.map((r) => r.id)).toEqual(['w-undated']);
  });

  it('treats undated works as always included within an open window', () => {
    const records = teamPublications([
      { id: 'alice', includeInTeamList: true, startOfAffiliation: null, endOfAffiliation: null },
    ]);
    expect(records.map((r) => r.id).sort()).toEqual(['w-2020', 'w-2023', 'w-undated']);
  });

  it('excludes members not flagged for the shared team list', () => {
    const records = teamPublications([
      { id: 'carol', includeInTeamList: false, startOfAffiliation: null, endOfAffiliation: null },
    ]);
    expect(records).toEqual([]);
  });

  it('does not restrict a member\'s own full publication history', () => {
    const records = publicationsForPerson('alice');
    expect(records.map((r) => r.id).sort()).toEqual(['w-2020', 'w-2023', 'w-undated']);
  });
});

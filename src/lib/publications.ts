import publicationData from '../../data/publications.json';

export interface PublicationRecord {
  id: string;
  source: string;
  source_url: string;
  doi: string | null;
  title: string;
  publication_year: number | null;
  publication_date: string | null;
  type: string;
  authors: string[];
  member_ids: string[];
  venue: string | null;
  landing_page_url: string | null;
  open_access_url: string | null;
  is_retracted: boolean;
}

interface PublicationEnvelope {
  version: number;
  source: string;
  last_full_refresh_at: string | null;
  author_roster_signature: string | null;
  queried_author_ids: string[];
  coverage_by_person: Record<string, unknown>;
  mapping_warnings: string[];
  records: PublicationRecord[];
}

const publications = publicationData as PublicationEnvelope;

export function publicationsForPerson(personId: string): PublicationRecord[] {
  return publications.records
    .filter((record) => record.member_ids.includes(personId))
    .sort((a, b) => {
      const yearDifference = (b.publication_year ?? -1) - (a.publication_year ?? -1);
      return yearDifference || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
}

export function coverageForPerson(personId: string) {
  return publications.coverage_by_person[personId] ?? null;
}

export { publications as publicationData };

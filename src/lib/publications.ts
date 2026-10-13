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
  return sortRecords(publications.records.filter((record) => record.member_ids.includes(personId)));
}

export function coverageForPerson(personId: string) {
  return publications.coverage_by_person[personId] ?? null;
}

export interface TeamMemberWindow {
  id: string;
  includeInTeamList: boolean;
  startOfAffiliation: number | null;
  endOfAffiliation: number | null;
}

function sortRecords(records: PublicationRecord[]): PublicationRecord[] {
  return [...records].sort((a, b) => {
    const yearDifference = (b.publication_year ?? -1) - (a.publication_year ?? -1);
    return yearDifference || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

// Common/shared publications pool: only counts a work toward a member if its
// publication year falls inside that member's start/end-of-affiliation window
// (an unset bound is open-ended). Individual profiles always show the member's
// complete history via publicationsForPerson, regardless of this window.
export function teamPublications(members: TeamMemberWindow[]): PublicationRecord[] {
  const windows = new Map(members.filter((member) => member.includeInTeamList).map((member) => [member.id, member]));
  const records = publications.records.filter((record) => record.member_ids.some((memberId) => {
    const member = windows.get(memberId);
    if (!member) return false;
    if (record.publication_year == null) return true;
    if (member.startOfAffiliation != null && record.publication_year < member.startOfAffiliation) return false;
    if (member.endOfAffiliation != null && record.publication_year > member.endOfAffiliation) return false;
    return true;
  }));
  return sortRecords(records);
}

export { publications as publicationData };

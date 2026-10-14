// Verified ISO 3166-1 alpha-2 codes for nationalities actually held by team members.
// Add an entry here, plus its rectangular flag SVG under media/flags/<code>.svg
// (recorded in docs/media-sources.yaml), before using the code in a person record.
export const NATIONALITIES: Record<string, string> = {
  IT: 'Italy',
  CO: 'Colombia',
  BR: 'Brazil',
  FR: 'France',
  RS: 'Serbia',
  DE: 'Germany',
  IR: 'Iran',
  SE: 'Sweden',
  SG: 'Singapore',
};

export function countryName(code: string): string | null {
  return NATIONALITIES[code] ?? null;
}

export function flagIconPath(code: string): string {
  return `/media/flags/${code.toLowerCase()}.svg`;
}

import { describe, expect, it } from 'vitest';
import { joinBase, normalizeBase } from '../../src/lib/paths';

describe('base path helpers', () => {
  it('normalizes root and project bases', () => {
    expect(normalizeBase('/')).toBe('/');
    expect(normalizeBase('cmsl-website')).toBe('/cmsl-website/');
    expect(normalizeBase('/cmsl-website/dev')).toBe('/cmsl-website/dev/');
  });

  it('keeps every internal route beneath the selected base', () => {
    expect(joinBase('/cmsl-website/', '/people/example/')).toBe('/cmsl-website/people/example/');
    expect(joinBase('/cmsl-website/dev/', 'media/team.jpg')).toBe('/cmsl-website/dev/media/team.jpg');
  });
});

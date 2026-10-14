import { describe, expect, it } from 'vitest';
import { readableEmailFallback, splitEmail } from '../../src/lib/obfuscate';

describe('email obfuscation helpers', () => {
  it('splits an address into user and domain without the literal address appearing in either part', () => {
    expect(splitEmail('pietro.novelli@iit.it')).toEqual({ user: 'pietro.novelli', domain: 'iit.it' });
  });

  it('rejects input that is not a plausible email address', () => {
    expect(() => splitEmail('not-an-email')).toThrow();
    expect(() => splitEmail('@iit.it')).toThrow();
    expect(() => splitEmail('user@')).toThrow();
  });

  it('builds a human-readable fallback that does not contain a scrapable "user@domain" substring', () => {
    const fallback = readableEmailFallback('pietro.novelli@iit.it');
    expect(fallback).toBe('pietro.novelli [at] iit [dot] it');
    expect(fallback).not.toContain('@');
    expect(fallback).not.toContain('pietro.novelli@iit.it');
  });
});

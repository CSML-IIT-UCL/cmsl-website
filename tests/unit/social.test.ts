import { describe, expect, it } from 'vitest';
import { buildBlueskyFeedUrl, getSocialConfig, parseBlueskyFeed } from '../../src/lib/social';

describe('getSocialConfig', () => {
  it('parses content/social.yaml into a typed config', () => {
    const config = getSocialConfig();
    expect(config.bluesky.actor).toBe('pontilgroup.bsky.social');
  });
});

describe('buildBlueskyFeedUrl', () => {
  it('targets the public AppView with the configured actor, no-replies filter, and limit', () => {
    const url = buildBlueskyFeedUrl('pontilgroup.bsky.social', 8);
    expect(url).toBe('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=pontilgroup.bsky.social&filter=posts_no_replies&limit=8');
  });
});

describe('parseBlueskyFeed', () => {
  const basePost = (overrides: Record<string, unknown> = {}) => ({
    post: {
      uri: 'at://did:plc:abc/app.bsky.feed.post/xyz',
      cid: 'cid-1',
      author: { handle: 'pontilgroup.bsky.social', displayName: 'Pontil Group', avatar: 'https://cdn.example/a.jpg' },
      record: { text: 'hello world', createdAt: '2026-01-01T00:00:00.000Z' },
      indexedAt: '2026-01-01T00:00:01.000Z',
      ...overrides,
    },
  });

  it('maps a plain post into a normalized SocialPost', () => {
    const [post] = parseBlueskyFeed({ feed: [basePost()] }, 8);
    expect(post).toMatchObject({
      id: 'cid-1',
      source: 'bluesky',
      authorName: 'Pontil Group',
      authorHandle: 'pontilgroup.bsky.social',
      text: 'hello world',
      url: 'https://bsky.app/profile/pontilgroup.bsky.social/post/xyz',
    });
  });

  it('excludes replies even when the endpoint filter should have removed them', () => {
    const posts = parseBlueskyFeed({ feed: [{ ...basePost(), reply: { parent: {}, root: {} } }] }, 8);
    expect(posts).toHaveLength(0);
  });

  it('excludes reposts', () => {
    const posts = parseBlueskyFeed({ feed: [{ ...basePost(), reason: { $type: 'app.bsky.feed.defs#reasonRepost' } }] }, 8);
    expect(posts).toHaveLength(0);
  });

  it('caps the result at maxItems', () => {
    const posts = parseBlueskyFeed({ feed: [basePost(), basePost(), basePost()] }, 2);
    expect(posts).toHaveLength(2);
  });

  it('skips malformed items missing required fields', () => {
    const posts = parseBlueskyFeed({ feed: [{ post: { author: { handle: 'x' } } }] }, 8);
    expect(posts).toHaveLength(0);
  });
});

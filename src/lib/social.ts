import * as yaml from 'js-yaml';
import { z } from 'zod';
import socialYaml from '../../content/social.yaml?raw';

const socialSchema = z.object({
  bluesky: z.object({
    enabled: z.boolean().default(false),
    actor: z.string().min(1),
    max_items: z.number().int().positive().default(8),
    session_cache_seconds: z.number().int().positive().default(300),
  }),
});

export type SocialConfig = z.infer<typeof socialSchema>;

export function getSocialConfig(): SocialConfig {
  return socialSchema.parse(yaml.load(socialYaml));
}

export interface SocialPost {
  id: string;
  source: 'bluesky';
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
  text: string;
  url: string;
  createdAt: string;
}

export function buildBlueskyFeedUrl(actor: string, limit: number): string {
  const params = new URLSearchParams({ actor, filter: 'posts_no_replies', limit: String(limit) });
  return `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?${params.toString()}`;
}

interface BlueskyFeedItem {
  post?: {
    uri?: string;
    cid?: string;
    author?: { handle?: string; displayName?: string; avatar?: string };
    record?: { text?: string; createdAt?: string };
    indexedAt?: string;
  };
  reply?: unknown;
  reason?: { $type?: string };
}

interface BlueskyFeedResponse {
  feed?: BlueskyFeedItem[];
}

function blueskyPostUrl(handle: string, uri: string): string {
  const rkey = uri.split('/').pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

// The endpoint filter (`posts_no_replies`) is not a guarantee about every item,
// so replies/reposts are also excluded here from the actual response shape.
export function parseBlueskyFeed(response: BlueskyFeedResponse, maxItems: number): SocialPost[] {
  const feed = response.feed ?? [];
  const posts: SocialPost[] = [];
  for (const item of feed) {
    if (posts.length >= maxItems) break;
    if (item.reply || item.reason) continue;
    const post = item.post;
    const uri = post?.uri;
    const handle = post?.author?.handle;
    const text = post?.record?.text;
    if (!uri || !handle || text === undefined) continue;
    posts.push({
      id: post.cid ?? uri,
      source: 'bluesky',
      authorName: post.author?.displayName || handle,
      authorHandle: handle,
      authorAvatar: post.author?.avatar ?? null,
      text,
      url: blueskyPostUrl(handle, uri),
      createdAt: post.record?.createdAt ?? post.indexedAt ?? new Date().toISOString(),
    });
  }
  return posts;
}

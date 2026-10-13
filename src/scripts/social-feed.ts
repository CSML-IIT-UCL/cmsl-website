import { buildBlueskyFeedUrl, parseBlueskyFeed, type SocialPost } from '@/lib/social';

interface ClientSocialConfig {
  bluesky: { enabled: boolean; actor: string; maxItems: number; cacheSeconds: number };
}

const FETCH_TIMEOUT_MS = 8000;

function readConfig(): ClientSocialConfig | null {
  const node = document.getElementById('social-config');
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent) as ClientSocialConfig;
  } catch {
    return null;
  }
}

function cacheKey(platform: string): string {
  return `csml-social-cache:${platform}`;
}

function readCache(platform: string, maxAgeSeconds: number): SocialPost[] | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(platform));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fetchedAt: number; posts: SocialPost[] };
    if (Date.now() - parsed.fetchedAt > maxAgeSeconds * 1000) return null;
    return parsed.posts;
  } catch {
    return null;
  }
}

function writeCache(platform: string, posts: SocialPost[]): void {
  try {
    sessionStorage.setItem(cacheKey(platform), JSON.stringify({ fetchedAt: Date.now(), posts }));
  } catch {
    // Private browsing / blocked storage: live fetches still work, just uncached per visit.
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function renderState(panel: HTMLElement, state: 'loading' | 'ready' | 'empty' | 'error' | 'unavailable'): void {
  panel.dataset.state = state;
}

function renderPosts(panel: HTMLElement, posts: SocialPost[]): void {
  const list = panel.querySelector<HTMLUListElement>('.social-list');
  const template = document.getElementById('social-post-template') as HTMLTemplateElement | null;
  if (!list || !template) return;
  list.innerHTML = '';
  for (const post of posts) {
    const node = template.content.firstElementChild?.cloneNode(true) as HTMLElement;
    const link = node.querySelector<HTMLAnchorElement>('.social-post-link');
    const author = node.querySelector<HTMLElement>('.social-post-author');
    const handle = node.querySelector<HTMLElement>('.social-post-handle');
    const text = node.querySelector<HTMLElement>('.social-post-text');
    const time = node.querySelector<HTMLTimeElement>('.social-post-time');
    const avatar = node.querySelector<HTMLImageElement>('.social-post-avatar');
    if (link) link.href = post.url;
    if (author) author.textContent = post.authorName;
    if (handle) handle.textContent = `@${post.authorHandle}`;
    if (text) text.textContent = post.text;
    if (time) {
      time.dateTime = post.createdAt;
      time.textContent = new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    if (avatar) {
      if (post.authorAvatar) avatar.src = post.authorAvatar;
      else avatar.remove();
    }
    list.append(node);
  }
}

function renderFetchedAt(panel: HTMLElement, fetchedAt: number): void {
  const status = panel.querySelector<HTMLElement>('.social-fetched-at');
  if (status) status.textContent = `Updated ${new Date(fetchedAt).toLocaleTimeString()}`;
}

async function loadBluesky(panel: HTMLElement, config: ClientSocialConfig['bluesky']): Promise<void> {
  const cached = readCache('bluesky', config.cacheSeconds);
  if (cached) {
    renderPosts(panel, cached);
    renderState(panel, cached.length > 0 ? 'ready' : 'empty');
    return;
  }
  renderState(panel, 'loading');
  try {
    const json = await fetchJson(buildBlueskyFeedUrl(config.actor, config.maxItems));
    const posts = parseBlueskyFeed(json as Parameters<typeof parseBlueskyFeed>[0], config.maxItems);
    writeCache('bluesky', posts);
    renderPosts(panel, posts);
    renderFetchedAt(panel, Date.now());
    renderState(panel, posts.length > 0 ? 'ready' : 'empty');
  } catch {
    renderState(panel, 'error');
  }
}

function init(): void {
  const section = document.getElementById('updates');
  const config = readConfig();
  if (!section || !config) return;

  const blueskyPanel = section.querySelector<HTMLElement>('[data-platform="bluesky"]');

  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    if (blueskyPanel && config.bluesky.enabled) loadBluesky(blueskyPanel, config.bluesky);
  };

  if (!('IntersectionObserver' in window)) {
    load();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        load();
        observer.disconnect();
      }
    },
    { rootMargin: '200px' },
  );
  observer.observe(section);

  const retry = blueskyPanel?.querySelector<HTMLButtonElement>('.social-retry');
  retry?.addEventListener('click', () => {
    if (blueskyPanel) loadBluesky(blueskyPanel, config.bluesky);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

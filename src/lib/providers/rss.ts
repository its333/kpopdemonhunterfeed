import Parser from 'rss-parser';
import type { ArticleItem, ProviderContext, ProviderResult } from '@/lib/types';
import { cacheGet, cacheSet } from '@/lib/cache';

type MediaEntry = { url?: string };
type MediaGroup = {
  'media:thumbnail'?: MediaEntry | MediaEntry[];
  'media:content'?: MediaEntry | MediaEntry[];
};
type FeedParserItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  categories?: Array<string | { _: string }> | string;
  content?: unknown;
  contentSnippet?: unknown;
  enclosure?: { url?: string };
  'content:encoded'?: unknown;
  'content:encodedSnippet'?: unknown;
  'media:thumbnail'?: MediaEntry | MediaEntry[];
  'media:content'?: MediaEntry | MediaEntry[];
  'media:group'?: MediaGroup;
};

type FeedSourceSpec = {
  url: string;
};

type ParsedFeed = {
  feedUrl: string;
  items: FeedParserItem[];
  source: FeedSourceSpec;
};

const parser = new Parser<FeedParserItem>({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  }
});

const CURATED_FEEDS: string[] = [
  'https://www.soompi.com/feed',
  'https://www.koreaboo.com/feed/',
  'https://www.allkpop.com/rss'
];

const STATIC_FEEDS: string[] = [
  'https://gameluster.com/feed/',
  'https://www.thewrap.com/feed/',
  'https://geekculture.co/feed/'
];

const SEARCH_QUERIES: string[] = ['kpop demon hunter', 'k-pop demon hunter', 'huntrix'];
const SEARCH_FEED_BUILDERS: Array<(keyword: string) => string> = [
  (keyword) => `https://gameluster.com/?s=${encodeURIComponent(keyword)}&feed=rss2`,
  (keyword) => `https://www.thewrap.com/?s=${encodeURIComponent(keyword)}&feed=rss2`,
  (keyword) => `https://geekculture.co/?s=${encodeURIComponent(keyword)}&feed=rss2`
];

const RELEVANT_KEYWORDS = [
  'demon hunter',
  'demon-hunter',
  'demonhunter',
  'huntrix',
  'kpop demon hunter',
  'k-pop demon hunter'
];
const FALLBACK_ARTICLE_IMAGE = 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80';
const MAX_ENRICH_ITEMS = 15;
const AGGREGATOR_HOST_HINTS = ['news.google.com', 'news.google', 'bing.com'];
const PLACEHOLDER_HOST_HINTS = ['googleusercontent.com', 'gstatic.com', 'bing.com', 'news.google'];

export async function fetchRSS(ctx: ProviderContext): Promise<ProviderResult> {
  const key = `rss:${ctx.sort}:${ctx.limit}:${ctx.cursor ?? ''}`;
  const cached = await cacheGet<ProviderResult>(key);
  if (cached) return cached;

  const seen = new Set<string>();
  const items: ArticleItem[] = [];
  const feedSources = buildFeedSources();

  const results = await Promise.allSettled(
    feedSources.map(async (source): Promise<ParsedFeed> => {
      const feed = await parser.parseURL(source.url);
      return { feedUrl: source.url, items: feed.items ?? [], source };
    })
  );

  for (const outcome of results) {
    if (outcome.status !== 'fulfilled') continue;
    const { feedUrl, items: feedItems } = outcome.value;

    for (const rawItem of feedItems.slice(0, ctx.limit)) {
      if (!isRelevant(rawItem)) continue;

      const normalizedLink = normalizeLink(rawItem.link, feedUrl);
      const baseLink = normalizedLink && normalizedLink.trim() ? normalizedLink : undefined;
      const aggregatorLink = isAggregatorUrl(baseLink ?? rawItem.link);
      const link = baseLink ?? rawItem.link ?? '#';
      const canonicalLink = canonicalizeUrl(link);
      const dedupeKey =
        (canonicalLink && canonicalLink !== '#') ? canonicalLink :
        rawItem.guid ?? rawItem.title ?? '';

      if (dedupeKey && seen.has(dedupeKey)) continue;
      if (dedupeKey) seen.add(dedupeKey);

      let id = rawItem.guid || (canonicalLink && canonicalLink !== '#' ? canonicalLink : rawItem.link) || rawItem.isoDate;
      if (!id) id = createFallbackId();

      const imageBase = aggregatorLink ? undefined : canonicalLink || baseLink;
      const thumbnailUrl = aggregatorLink ? undefined : extractThumbnail(rawItem, imageBase);

      const finalLink = canonicalLink || link;

      items.push({
        id,
        type: 'article',
        title: rawItem.title || 'Untitled',
        url: finalLink,
        thumbnailUrl,
        publishedAt: rawItem.isoDate,
        source: extractSourceLabel(finalLink),
      });
    }
  }

  await enrichMissingThumbnails(items);

  if (ctx.sort === 'recent') {
    items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  }

  for (const item of items) {
    if (needsBetterThumbnail(item.thumbnailUrl)) {
      item.thumbnailUrl = FALLBACK_ARTICLE_IMAGE;
    }
  }

  const result: ProviderResult = { items: items.slice(0, Math.min(50, ctx.limit)), nextCursor: null };
  await cacheSet(key, result, 60 * 5);
  return result;
}

function buildFeedSources(): FeedSourceSpec[] {
  const specs: FeedSourceSpec[] = [];
  for (const url of [...CURATED_FEEDS, ...STATIC_FEEDS]) {
    specs.push({ url });
  }
  for (const query of SEARCH_QUERIES) {
    for (const build of SEARCH_FEED_BUILDERS) {
      specs.push({ url: build(query) });
    }
  }
  return dedupeFeedSources(specs);
}

function dedupeFeedSources(sources: FeedSourceSpec[]): FeedSourceSpec[] {
  const seen = new Set<string>();
  const deduped: FeedSourceSpec[] = [];
  for (const source of sources) {
    const normalized = source.url.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push({ ...source, url: normalized });
  }
  return deduped;
}

function fieldToText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => fieldToText(entry))
      .filter((entry) => entry.length > 0)
      .join(' ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record._ === 'string') return record._;
    return Object.values(record)
      .map((entry) => fieldToText(entry))
      .filter((entry) => entry.length > 0)
      .join(' ');
  }
  return '';
}

function isRelevant(item: FeedParserItem): boolean {
  const fields = [
    item.title,
    item.contentSnippet,
    item.content,
    item['content:encoded'],
    item['content:encodedSnippet'],
    item.categories,
    item.link,
  ]
    .map((value) => fieldToText(value))
    .filter((value) => value.length > 0);
  if (fields.length === 0) return false;

  const haystack = fields.join(' ').toLowerCase();

  if (RELEVANT_KEYWORDS.some((keyword) => haystack.includes(keyword))) return true;

  const hasDemon = haystack.includes('demon');
  const hasHunter = haystack.includes('hunter');
  const hasKpop = haystack.includes('kpop') || haystack.includes('k-pop');
  const hasHuntrix = haystack.includes('huntrix');

  return (hasHuntrix && (hasDemon || hasHunter || hasKpop)) || (hasDemon && hasHunter && hasKpop);
}

function extractThumbnail(item: FeedParserItem, baseLink?: string): string | undefined {
  const candidates: string[] = [];
  candidates.push(...collectMediaUrls(item['media:thumbnail'], baseLink));
  candidates.push(...collectMediaUrls(item['media:content'], baseLink));
  candidates.push(...collectMediaUrls(item['media:group']?.['media:thumbnail'], baseLink));
  candidates.push(...collectMediaUrls(item['media:group']?.['media:content'], baseLink));
  const enclosure = resolveImageUrl(item.enclosure?.url, baseLink);
  if (enclosure) candidates.push(enclosure);
  candidates.push(...extractImagesFromHtml(item['content:encoded'], baseLink));
  candidates.push(...extractImagesFromHtml(item['content:encodedSnippet'], baseLink));
  candidates.push(...extractImagesFromHtml(item.content, baseLink));

  return pickBestImage(candidates);
}

function collectMediaUrls(entry?: MediaEntry | MediaEntry[], base?: string): string[] {
  if (!entry) return [];
  const entries = Array.isArray(entry) ? entry : [entry];
  const urls: string[] = [];
  for (const item of entries) {
    const resolved = resolveImageUrl(item?.url, base);
    if (resolved) urls.push(resolved);
  }
  return urls;
}

function resolveImageUrl(candidate?: string, base?: string): string | undefined {
  if (!candidate) return undefined;
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!base) return undefined;
  try {
    return new URL(trimmed, base).href;
  } catch {
    return undefined;
  }
}

function extractImagesFromHtml(html?: string, base?: string): string[] {
  if (!html) return [];
  const candidates = new Set<string>();
  const metaRegex = /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const imgRegex = /<img[^>]+(?:data-src|data-original|data-lazy-src|src)=["']([^"'\s>]+)["'][^>]*>/gi;
  const sourceRegex = /<source[^>]+srcset=["']([^"'\s>]+)["'][^>]*>/gi;

  for (const match of html.matchAll(metaRegex)) {
    const resolved = resolveImageUrl(match[1], base);
    if (resolved) candidates.add(resolved);
  }
  for (const match of html.matchAll(imgRegex)) {
    const resolved = resolveImageUrl(match[1], base);
    if (resolved) candidates.add(resolved);
  }
  for (const match of html.matchAll(sourceRegex)) {
    const srcset = match[1];
    const first = srcset.split(',')[0]?.trim().split(' ')[0];
    const resolved = resolveImageUrl(first, base);
    if (resolved) candidates.add(resolved);
  }

  return [...candidates];
}

function pickBestImage(candidates: string[]): string | undefined {
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (!isLikelyPlaceholder(candidate)) filtered.push(candidate);
  }
  const pool = filtered.length > 0 ? filtered : [...seen];
  if (pool.length === 0) return undefined;

  let bestUrl = pool[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  pool.forEach((url, index) => {
    const score = scoreImage(url, index);
    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  });
  return bestUrl;
}

function scoreImage(url: string, index: number): number {
  let score = 100 - index * 2;
  const lower = url.toLowerCase();
  if (lower.includes('huntrix')) score += 60;
  if (lower.includes('demon')) score += 40;
  if (lower.includes('hunter')) score += 25;
  if (lower.includes('kpop') || lower.includes('k-pop')) score += 20;
  if (lower.includes('uploads') || lower.includes('wp-content')) score += 15;
  if (lower.includes('feature') || lower.includes('news')) score += 5;
  if (/\.(jpe?g|png|webp)(\?|$)/.test(lower)) score += 5;
  if (/\.(gif)(\?|$)/.test(lower)) score -= 10;
  if (/\b\d{1,2}x\d{1,2}\b/.test(lower)) score -= 40;
  const badKeywords = ['logo', 'sprite', 'placeholder', 'default', 'avatar', 'icon', 'spacer', 'pixel', 'blank', 'transparent'];
  if (badKeywords.some((kw) => lower.includes(kw))) score -= 80;
  return score;
}

function isLikelyPlaceholder(url: string): boolean {
  const host = getHostname(url);
  if (!host) return true;
  if (PLACEHOLDER_HOST_HINTS.some((hint) => host.includes(hint))) return true;
  const lower = url.toLowerCase();
  if (lower.startsWith('data:')) return true;
  if (/\b(placeholder|default|fallback|blank|spacer|pixel|avatar|icon|logo)\b/.test(lower)) return true;
  if (/\b\d{1,2}x\d{1,2}\b/.test(lower)) return true;
  return false;
}

function needsBetterThumbnail(url?: string): boolean {
  if (!url) return true;
  const host = getHostname(url);
  if (!host) return true;
  if (isAggregatorHost(host)) return true;
  return isLikelyPlaceholder(url);
}

function extractSourceLabel(link?: string): string {
  if (!link) return 'RSS';
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return 'RSS';
  }
}

function normalizeLink(rawLink: string | undefined, feedUrl: string): string | undefined {
  if (!rawLink) return undefined;
  try {
    const parsed = new URL(rawLink);
    const host = parsed.hostname;
    if (host.includes('news.google.com')) {
      const candidate = parsed.searchParams.get('url');
      if (candidate) return canonicalizeUrl(decodeParam(candidate));
    }
    if (host.includes('bing.com')) {
      const candidate = parsed.searchParams.get('url') ?? parsed.searchParams.get('r');
      if (candidate) return canonicalizeUrl(decodeParam(candidate));
    }
    return canonicalizeUrl(parsed.toString());
  } catch {
    if (!rawLink.startsWith('http')) {
      try {
        return canonicalizeUrl(new URL(rawLink, feedUrl).toString());
      } catch {
        return canonicalizeUrl(rawLink);
      }
    }
    return canonicalizeUrl(rawLink);
  }
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function canonicalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    url.username = '';
    url.password = '';
    url.hostname = url.hostname.toLowerCase();
    const removableParams = new Set([
      'ref',
      'ref_',
      'refsrc',
      'ref_src',
      'ref_url',
      'rss',
      'feed',
      'output',
      'amp',
      'amp_share',
      'feature',
      'share',
      'spref',
      'source',
      'via'
    ]);
    const removablePrefixes = ['utm', 'utm_', 'mc_', 'mkt_', 'ga_', 'fbclid', 'gclid', 'yclid', 'icid', 'ocid', 'cmpid', 'rb_clickid', 'igshid', 'msclkid'];
    const params = url.searchParams;
    for (const key of Array.from(params.keys())) {
      const lower = key.toLowerCase();
      if (removableParams.has(lower)) {
        params.delete(key);
        continue;
      }
      if (removablePrefixes.some((prefix) => lower.startsWith(prefix))) {
        params.delete(key);
      }
    }
    const query = params.toString();
    url.search = query ? `?${query}` : '';
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function isAggregatorUrl(url?: string): boolean {
  if (!url) return false;
  const host = getHostname(url);
  if (!host) return false;
  return isAggregatorHost(host);
}

function isAggregatorHost(host: string): boolean {
  const normal = host.toLowerCase();
  return AGGREGATOR_HOST_HINTS.some((hint) => normal === hint || normal.endsWith(`.${hint}`));
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function createFallbackId(): string {
  try {
    return (globalThis as { crypto?: Crypto }).crypto?.randomUUID?.() ?? `rss-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `rss-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function enrichMissingThumbnails(items: ArticleItem[]): Promise<void> {
  const needingHelp = items
    .filter((item) => needsBetterThumbnail(item.thumbnailUrl) || isAggregatorUrl(item.url))
    .slice(0, MAX_ENRICH_ITEMS);
  if (needingHelp.length === 0) return;

  await Promise.allSettled(
    needingHelp.map(async (item) => {
      try {
        const res = await fetch(item.url, { headers: { Accept: 'text/html' }, cache: 'no-store' });
        if (!res.ok) return;
        const resolvedBase = res.url || item.url;
        if (res.url && !isAggregatorUrl(res.url)) {
          item.url = res.url;
          item.source = extractSourceLabel(item.url);
        }
        const html = await res.text();
        const candidates = extractImagesFromHtml(html, resolvedBase);
        const best = pickBestImage(candidates);
        if (best) {
          item.thumbnailUrl = best;
        }
      } catch {
        // ignore fetch failures and fall back after loop
      }
    })
  );
}



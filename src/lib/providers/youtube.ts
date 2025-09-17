import { cacheGet, cacheSet } from '@/lib/cache';
import type { ProviderContext, ProviderResult, VideoItem } from '@/lib/types';

const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

type YtSearchItem = { id: { videoId?: string }; snippet: { title: string; publishedAt?: string; thumbnails?: { high?: { url?: string } } } };
type YtVideosItem = { id: string; statistics?: { viewCount?: string } };

export async function fetchYouTube(ctx: ProviderContext): Promise<ProviderResult> {
  const keyBase = `yt:${ctx.type}:${ctx.sort}:${ctx.limit}:${ctx.cursor ?? ''}`;
  const cached = await cacheGet<ProviderResult>(keyBase);
  if (cached) return cached;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { items: [], nextCursor: null };

  const envQuery = (process.env.YOUTUBE_SEARCH_QUERY || '').trim();
  const queries = envQuery ? [envQuery] : ['kpop demon hunter', 'demon hunter kpop', 'kpop'];
  const order = ctx.sort === 'popular' ? 'viewCount' : 'date';
  let searchJson: { items: YtSearchItem[]; nextPageToken?: string } = { items: [] };
  let usedQuery = queries[0];
  let lastError: string | null = null;
  for (const q of queries) {
    const searchParams = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      q,
      type: 'video',
      maxResults: String(Math.min(25, ctx.limit)),
      order,
      safeSearch: 'moderate',
      regionCode: 'US',
      relevanceLanguage: 'en',
    });
    if (ctx.cursor) searchParams.set('pageToken', ctx.cursor);
    try {
      const url = `${YT_SEARCH_URL}?${searchParams.toString()}`;
      const searchResp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      if (!searchResp.ok) {
        let msg = `HTTP ${searchResp.status}`;
        try { const err = await searchResp.json(); msg = err?.error?.message || msg; } catch {}
        lastError = `YouTube search error: ${msg}`;
        continue;
      }
      const json = await searchResp.json();
      if (Array.isArray(json.items) && json.items.length > 0) {
        searchJson = json;
        usedQuery = q;
        break;
      }
    } catch {
      lastError = 'YouTube search request failed';
    }
  }
  if (!Array.isArray(searchJson.items) || searchJson.items.length === 0) {
    return { items: [], nextCursor: null, errors: lastError ? { youtube: lastError } : { youtube: 'No videos found for query' } };
  }

  const videoIds = Array.from(new Set(searchJson.items.map((i) => i.id.videoId).filter(Boolean) as string[]));
  if (videoIds.length === 0) return { items: [], nextCursor: searchJson.nextPageToken || null };

  const videosParams = new URLSearchParams({ key: apiKey, part: 'statistics', id: videoIds.join(',') });
  let videosJson: { items: YtVideosItem[] } = { items: [] };
  try {
    const url = `${YT_VIDEOS_URL}?${videosParams.toString()}`;
    const videosResp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!videosResp.ok) {
      let msg = `HTTP ${videosResp.status}`;
      try { const err = await videosResp.json(); msg = err?.error?.message || msg; } catch {}
      return { items: [], nextCursor: searchJson.nextPageToken || null, errors: { youtube: `YouTube videos error: ${msg}` } };
    }
    videosJson = await videosResp.json();
  } catch {
    return { items: [], nextCursor: searchJson.nextPageToken || null, errors: { youtube: 'YouTube videos request failed' } };
  }
  const idToStats = new Map(videosJson.items.map((v) => [v.id, v.statistics?.viewCount ? Number(v.statistics.viewCount) : 0]));

  const items: VideoItem[] = searchJson.items
    .map((i, idx) => {
      const id = (i.id.videoId as string) ?? String(idx);
      const fallbackThumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return {
        id,
        type: 'video',
        title: i.snippet.title,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnailUrl: i.snippet.thumbnails?.high?.url || (i.snippet as any).thumbnails?.medium?.url || (i.snippet as any).thumbnails?.default?.url || fallbackThumb,
        publishedAt: i.snippet.publishedAt,
        popularity: idToStats.get(id) ?? 0,
        source: 'YouTube'
      } satisfies VideoItem;
    });

  if (ctx.sort === 'popular') items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  if (ctx.sort === 'recent') items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  const result: ProviderResult = { items: items.slice(0, Math.min(25, ctx.limit)), nextCursor: searchJson.nextPageToken || null };
  await cacheSet(keyBase, result, 60 * 60 * 24);
  return result;
}



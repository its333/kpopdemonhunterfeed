import type { FeedItem, FeedType, ProviderContext, ProviderResult, SortType } from '@/lib/types';
import { fetchYouTube } from './youtube';
import { fetchRSS } from './rss';
import { fetchGoogleProducts } from './googleProducts';
import { cacheGet, cacheSet } from '@/lib/cache';

export async function fetchFeed(ctx: ProviderContext): Promise<ProviderResult> {
  const cacheKey = `feed:${ctx.type}:${ctx.sort}:${ctx.limit}:${ctx.cursor ?? ''}`;
  const cached = await cacheGet<ProviderResult>(cacheKey);
  if (cached) return cached;

  const tasks: Promise<ProviderResult>[] = [];
  const wantVideo = ctx.type === 'video' || ctx.type === 'all';
  const wantArticle = ctx.type === 'article' || ctx.type === 'all';
  const wantProduct = ctx.type === 'product' || ctx.type === 'all';

  if (wantVideo) tasks.push(fetchYouTube(ctx));
  if (wantArticle) tasks.push(fetchRSS(ctx));
  if (wantProduct) tasks.push(fetchGoogleProducts(ctx));

  const settled = await Promise.allSettled(tasks);
  const results = settled
    .filter((r): r is PromiseFulfilledResult<ProviderResult> => r.status === 'fulfilled')
    .map((r) => r.value);
  let items = results.flatMap((r) => r.items);

  // Ensure representation from each category when type=all
  if (ctx.type === 'all') {
    const videos: FeedItem[] = items.filter((i) => i.type === 'video');
    const articles: FeedItem[] = items.filter((i) => i.type === 'article');
    const products: FeedItem[] = items.filter((i) => i.type === 'product');
    sortItems(videos, ctx.sort);
    sortItems(articles, ctx.sort);
    sortItems(products, ctx.sort);
    const per = Math.max(1, Math.floor((ctx.limit || 10) / 3));
    const merged: FeedItem[] = [];
    for (let i = 0; i < per; i++) {
      if (videos[i]) merged.push(videos[i]);
      if (articles[i]) merged.push(articles[i]);
      if (products[i]) merged.push(products[i]);
    }
    // If still short, fill with remaining best items overall
    const remainderPool = [...videos.slice(per), ...articles.slice(per), ...products.slice(per)];
    sortItems(remainderPool, ctx.sort);
    while (merged.length < ctx.limit && remainderPool.length) {
      const next = remainderPool.shift();
      if (next) merged.push(next);
    }
    items = merged;
  } else {
    sortItems(items, ctx.sort);
  }

  // naive cursor: we forward only YouTube's cursor for now
  const nextCursor = results.find((r) => r.nextCursor)?.nextCursor ?? null;
  const errors = Object.assign({}, ...results.map((r) => r.errors || {}));
  const cap = ctx.type === 'article' ? 50 : ctx.type === 'product' ? 50 : ctx.type === 'video' ? 25 : ctx.type === 'all' ? 125 : 10;
  const result: ProviderResult = { items: items.slice(0, Math.min(cap, ctx.limit)), nextCursor, errors: Object.keys(errors).length ? errors : undefined };
  await cacheSet(cacheKey, result, 60 * 60 * 24);
  return result;
}

function sortItems(items: FeedItem[], sort: SortType) {
  if (sort === 'popular') items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  if (sort === 'recent') items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

export type { ProviderContext, ProviderResult } from '@/lib/types';
export type { FeedItem, FeedType, SortType } from '@/lib/types';



import type { FeedItem, FeedType, ProviderContext, ProviderResult, SortType } from '@/lib/types';
import { fetchYouTube } from './youtube';
import { fetchRSS } from './rss';
import { fetchGoogleProducts } from './googleProducts';
import { getFeedLimit } from '@/lib/feedLimits';

export async function fetchFeed(ctx: ProviderContext): Promise<ProviderResult> {
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

  if (ctx.type === 'all') {
    const videos: FeedItem[] = items.filter((i) => i.type === 'video');
    const articles: FeedItem[] = items.filter((i) => i.type === 'article');
    const products: FeedItem[] = items.filter((i) => i.type === 'product');
    sortItems(videos, ctx.sort);
    sortItems(articles, ctx.sort);
    sortItems(products, ctx.sort);
    const per = Math.max(1, Math.floor((ctx.limit || getFeedLimit('all')) / 3));
    const merged: FeedItem[] = [];
    for (let i = 0; i < per; i++) {
      if (videos[i]) merged.push(videos[i]);
      if (articles[i]) merged.push(articles[i]);
      if (products[i]) merged.push(products[i]);
    }
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

  const nextCursor = results.find((r) => r.nextCursor)?.nextCursor ?? null;
  const errors = Object.assign({}, ...results.map((r) => r.errors || {}));
  const cap = getFeedLimit(ctx.type === 'all' ? 'all' : ctx.type);
  const result: ProviderResult = { items: items.slice(0, Math.min(cap, ctx.limit)), nextCursor, errors: Object.keys(errors).length ? errors : undefined };
  return result;
}

function sortItems(items: FeedItem[], sort: SortType) {
  if (sort === 'popular') items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  if (sort === 'recent') items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

export type { ProviderContext, ProviderResult } from '@/lib/types';
export type { FeedItem, FeedType, SortType } from '@/lib/types';


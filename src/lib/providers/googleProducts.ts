import { cacheGet, cacheSet } from '@/lib/cache';
import { getServerEnv } from '@/lib/env';
import type { ProductItem, ProviderContext, ProviderResult } from '@/lib/types';

type SerpShoppingResult = {
  product_id?: string;
  title?: string;
  product_link?: string;
  thumbnail?: string;
  source?: string;
  price?: string; // like "$12.34"
  extracted_price?: number;
  rating?: number;
  reviews?: number;
};

type SerpApiResponse = {
  shopping_results?: SerpShoppingResult[];
  error?: string;
};

function parsePriceToCents(price?: string, extracted?: number): number | undefined {
  if (typeof extracted === 'number' && !Number.isNaN(extracted)) {
    return Math.round(extracted * 100);
  }
  if (!price) return undefined;
  const numeric = price.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const value = Number(numeric);
  if (Number.isNaN(value)) return undefined;
  return Math.round(value * 100);
}

async function fetchSerpApiPage(apiKey: string, start: number): Promise<SerpShoppingResult[]> {
  try {
    const q = 'kpop demon hunter';
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q,
      hl: 'en',
      api_key: apiKey,
    });
    if (start > 0) params.set('start', String(start));
    const resp = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    if (!resp.ok) return [];
    const json: SerpApiResponse = await resp.json();
    return json.shopping_results ?? [];
  } catch {
    return [];
  }
}

export async function fetchGoogleProducts(ctx: ProviderContext): Promise<ProviderResult> {
  const { serpApiKey } = getServerEnv();
  const apiKey = serpApiKey;
  if (!apiKey) return { items: [], nextCursor: null };

  const key = `gshop:${ctx.sort}:${ctx.limit}:${ctx.cursor ?? ''}`;
  const cached = await cacheGet<ProviderResult>(key);
  if (cached) return cached;

  const target = Math.min(200, ctx.limit);
  const collected: SerpShoppingResult[] = [];
  const seen = new Set<string>();
  let start = 0;
  const MAX_PAGES = 6; // safety guard; Google tends to return ~10 results per page

  for (let page = 0; page < MAX_PAGES && collected.length < target; page++) {
    const pageResults = await fetchSerpApiPage(apiKey, start);
    if (!pageResults.length) break;
    for (const item of pageResults) {
      const dedupeKey = item.product_id || item.product_link;
      if (dedupeKey && seen.has(dedupeKey)) continue;
      if (dedupeKey) seen.add(dedupeKey);
      collected.push(item);
      if (collected.length >= target) break;
    }
    start += pageResults.length;
  }

  const items: ProductItem[] = collected.slice(0, target).map((r, idx) => {
    const priceCents = parsePriceToCents(r.price, r.extracted_price);
    const popularity = typeof r.reviews === 'number' ? r.reviews : (typeof r.rating === 'number' ? Math.round(r.rating * 100) : undefined);
    return {
      id: r.product_id || r.product_link || `${Date.now()}-${idx}`,
      type: 'product',
      title: r.title || 'Product',
      url: r.product_link || '#',
      thumbnailUrl: r.thumbnail || (r as any).thumbnail_high || (r as any).thumbnail_product,
      priceCents,
      popularity,
      source: r.source || 'Google Shopping',
    } satisfies ProductItem;
  });

  const result: ProviderResult = { items, nextCursor: null };
  await cacheSet(key, result, 60 * 60 * 24);
  return result;
}


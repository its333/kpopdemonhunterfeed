import { cacheGet, cacheSet } from '@/lib/cache';
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

export async function fetchGoogleProducts(ctx: ProviderContext): Promise<ProviderResult> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return { items: [], nextCursor: null };

  const key = `gshop:${ctx.sort}:${ctx.limit}:${ctx.cursor ?? ''}`;
  const cached = await cacheGet<ProviderResult>(key);
  if (cached) return cached;

  const q = 'kpop demon hunter';
  const searchParams = new URLSearchParams({
    engine: 'google_shopping',
    q,
    hl: 'en',
    api_key: apiKey,
  });
  // Basic pagination not wired (SerpAPI supports start). We ignore cursor for now.

  let raw: SerpShoppingResult[] = [];
  try {
  const resp = await fetch(`https://serpapi.com/search.json?${searchParams.toString()}`);
    if (!resp.ok) return { items: [], nextCursor: null };
    const json: SerpApiResponse = await resp.json();
    raw = json.shopping_results ?? [];
  } catch {
    return { items: [], nextCursor: null };
  }

  const items: ProductItem[] = raw.slice(0, Math.min(50, ctx.limit)).map((r, idx) => {
    const priceCents = parsePriceToCents(r.price, r.extracted_price);
    const popularity = typeof r.reviews === 'number' ? r.reviews : (typeof r.rating === 'number' ? Math.round(r.rating * 100) : undefined);
    return {
      id: r.product_id || `${Date.now()}-${idx}`,
      type: 'product',
      title: r.title || 'Product',
      url: r.product_link || '#',
      thumbnailUrl: r.thumbnail || (r as any).thumbnail_high || (r as any).thumbnail_product,
      priceCents,
      popularity,
      source: r.source || 'Google Shopping',
    } satisfies ProductItem;
  });

  const result: ProviderResult = { items: items.slice(0, Math.min(50, ctx.limit)), nextCursor: null };
  await cacheSet(key, result, 60 * 60 * 24);
  return result;
}



import { NextRequest } from 'next/server';
import { fetchFeed } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const env = {
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
    serpapi: Boolean(process.env.SERPAPI_API_KEY),
    upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  };

  const [videos, news, products] = await Promise.allSettled([
    fetchFeed({ type: 'video', sort: 'popular', limit: 3, cursor: null }),
    fetchFeed({ type: 'article', sort: 'recent', limit: 3, cursor: null }),
    fetchFeed({ type: 'product', sort: 'popular', limit: 3, cursor: null }),
  ]);

  const toCount = (r: PromiseSettledResult<{ items: unknown[] }>) => (r.status === 'fulfilled' ? r.value.items.length : -1);
  const toErr = (r: PromiseSettledResult<unknown>) => (r.status === 'rejected' ? String(r.reason) : null);

  return Response.json(
    {
      env,
      counts: { videos: toCount(videos), news: toCount(news), products: toCount(products) },
      errors: { videos: toErr(videos), news: toErr(news), products: toErr(products) },
      notes: [
        'counts -1 indicate a provider error. 0 indicates configured but no results.',
        'env flags show whether required keys are present (not their values).',
      ],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}



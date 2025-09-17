import { NextRequest } from 'next/server';
import { fetchFeed } from '@/lib/providers';
import { getServerEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const envVars = getServerEnv();
  const env = {
    youtube: Boolean(envVars.youtubeApiKey),
    serpapi: Boolean(envVars.serpApiKey),
    upstash: Boolean(envVars.upstashRedisUrl && envVars.upstashRedisToken),
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

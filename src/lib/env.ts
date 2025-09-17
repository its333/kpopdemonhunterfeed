export type ServerEnv = {
  youtubeApiKey: string | null;
  serpApiKey: string | null;
  shopifyStoreDomain: string | null;
  shopifyStorefrontToken: string | null;
  upstashRedisUrl: string | null;
  upstashRedisToken: string | null;
  siteUrl: string | null;
  cacheRefreshToken: string | null;
};

const serverEnv: ServerEnv = {
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? null,
  serpApiKey: process.env.SERPAPI_API_KEY ?? process.env.NEXT_PUBLIC_SERPAPI_API_KEY ?? null,
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN ?? null,
  shopifyStorefrontToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? null,
  upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL ?? null,
  upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? null,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? null,
  cacheRefreshToken: process.env.CACHE_REFRESH_TOKEN ?? null,
};

export function getServerEnv(): ServerEnv {
  return serverEnv;
}


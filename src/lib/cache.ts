import { Redis } from '@upstash/redis';

type MemoryEntry = { value: unknown; expiresAt: number };

let redisClient: Redis | null | 'failed' = null;
const memoryCache = new Map<string, MemoryEntry>();
const MEMORY_CACHE_TTL_SECONDS = 60 * 5;

function getMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setMemory(key: string, value: unknown, ttlSeconds: number): void {
  if (ttlSeconds <= 0) {
    memoryCache.delete(key);
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function clearMemory(prefix?: string): number {
  let removed = 0;
  const hasPrefix = typeof prefix === 'string' && prefix.length > 0;
  const targetPrefix = hasPrefix ? (prefix as string) : null;
  for (const key of Array.from(memoryCache.keys())) {
    if (!targetPrefix || key.startsWith(targetPrefix)) {
      memoryCache.delete(key);
      removed++;
    }
  }
  return removed;
}

export function getRedis(): Redis | null {
  if (redisClient && redisClient !== 'failed') return redisClient;
  if (redisClient === 'failed') return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    redisClient = 'failed';
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const fromMemory = getMemory<T>(key);
  if (fromMemory !== null) return fromMemory;

  const redis = getRedis();
  if (!redis) return null;
  try {
    const value = (await redis.get<T>(key)) ?? null;
    if (value !== null) {
      setMemory(key, value, MEMORY_CACHE_TTL_SECONDS);
    }
    return value;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const memoryTtl = Math.min(ttlSeconds, MEMORY_CACHE_TTL_SECONDS);
  setMemory(key, value, memoryTtl);

  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // noop
  }
}

export async function cacheFlush(prefix?: string): Promise<{ memory: number; redis: number }> {
  const memoryCleared = clearMemory(prefix);

  const redis = getRedis();
  if (!redis) return { memory: memoryCleared, redis: 0 };

  let redisCleared = 0;
  const pattern = prefix && prefix.length > 0 ? `${prefix}*` : '*';
  try {
    for await (const key of redis.scanIterator({ match: pattern })) {
      const keyString = typeof key === 'string' ? key : String(key);
      await redis.del(keyString);
      redisCleared++;
    }
  } catch {
    return { memory: memoryCleared, redis: redisCleared };
  }
  return { memory: memoryCleared, redis: redisCleared };
}


import type { FeedType } from '@/lib/types';

const ARTICLE_LIMIT = 50;
const PRODUCT_LIMIT = 200;
const VIDEO_LIMIT = 25;
const ALL_LIMIT = 125;
const DEFAULT_LIMIT = 50;

type ExtendedFeedType = FeedType | 'all';

export function getFeedLimit(type: ExtendedFeedType): number {
  switch (type) {
    case 'article':
      return ARTICLE_LIMIT;
    case 'product':
      return PRODUCT_LIMIT;
    case 'video':
      return VIDEO_LIMIT;
    case 'all':
      return ALL_LIMIT;
    default:
      return DEFAULT_LIMIT;
  }
}

export const FEED_LIMITS = {
  article: ARTICLE_LIMIT,
  product: PRODUCT_LIMIT,
  video: VIDEO_LIMIT,
  all: ALL_LIMIT,
  default: DEFAULT_LIMIT,
} as const;

export type FeedLimitMap = typeof FEED_LIMITS;


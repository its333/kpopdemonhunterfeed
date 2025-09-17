export type FeedType = 'all' | 'video' | 'article' | 'product';
export type SortType = 'recent' | 'popular';

export type FeedItemBase = {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  publishedAt?: string; // ISO
  popularity?: number; // viewCount, likes, etc.
  source: string; // provider/source label
};

export type VideoItem = FeedItemBase & { type: 'video' };
export type ArticleItem = FeedItemBase & { type: 'article' };
export type ProductItem = FeedItemBase & { type: 'product'; priceCents?: number };

export type FeedItem = VideoItem | ArticleItem | ProductItem;

export type ProviderContext = {
  type: FeedType;
  sort: SortType;
  limit: number;
  cursor?: string | null;
};

export type ProviderResult = {
  items: FeedItem[];
  nextCursor?: string | null;
  errors?: Record<string, string>;
};


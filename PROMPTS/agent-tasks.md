# Cursor Agent Tasks (paste in Composer)


## 1) Wire YouTube videos provider
**Goal:** Replace mock videos with real data from YouTube for query `kpop demon hunter`.


**Steps:**
- Add `lib/providers/youtube.ts` using YouTube Data API v3 `search` + `videos` for stats (popularity = viewCount).
- Map to `FeedItem` with `type: 'video'`.
- Merge into `fetchFeed()` when `type==='video'` or `type==='all'`.
- Add 60s Redis cache by `(type, sort)` key using Upstash.


## 2) Add RSS news provider
**Goal:** Pull news from a list of K‑pop sites’ RSS feeds.
- Install `rss-parser`.
- Normalize posts to `FeedItem` with thumbnails if provided.


## 3) Product provider (Shopify storefront)
- Install `@shopify/storefront-api-client`.
- Fetch featured products, map price to `priceCents`.


## 4) Cursor QA pass
- Ask Agent to add unit tests for providers and a11y checks for images/titles.



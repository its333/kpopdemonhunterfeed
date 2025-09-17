# AGENT Coding Guide

Authoritative guidance for contributors working on Kpop Demon Hunter Feed. Follow these rules to keep code consistent, maintainable, scalable, and modular.

## Tech & Structure
- **Stack**: TypeScript, Next.js 15 (App Router), TailwindCSS.
- **Layout**: `src/app` (routes), `src/components` (UI), `src/lib` (logic), `src/lib/providers` (data providers).
- **Routing**: Use App Router. Only mark components "use client" when needed.
- **Imports**: Use alias `@/*`.

## TypeScript & Safety
- Strict TypeScript. No `any`.
- Export explicit function and API types; use discriminated unions for domain models.
- Keep shared types in `src/lib/types.ts`.
- Prefer type narrowing over assertions; use `zod` for runtime validation when needed.

## Naming & Style
- Functions are verbs; variables are nouns; avoid abbreviations.
- Prefer early returns; avoid deep nesting.
- Handle errors meaningfully; do not swallow exceptions silently.
- Keep functions small and focused; extract helpers into `src/lib`.

## Components & UI
- Small components in `src/components/`. Compose over conditional nesting.
- Accessibility:
  - Images have meaningful `alt`.
  - Interactive elements have labels/`aria-*`.
  - Visible focus states (`:focus-visible`).
- Tailwind:
  - Prefer utilities; minimize custom CSS.
  - Extract repeated patterns into small wrapper components.
- Default to server components; use client components only for state/effects.

## Providers & Data Layer
- Each provider: `src/lib/providers/<name>.ts` exporting `async fetch<Name>(ctx)` -> `ProviderResult`.
- `ctx` includes `type`, `sort`, `limit`, `cursor` from `src/lib/types.ts`.
- Normalize upstream data into `FeedItem` inside the provider; never leak upstream shapes.
- Wire providers in `src/lib/providers/index.ts` (aggregator `fetchFeed`).
- Sorting:
  - `popular`: by `popularity` desc.
  - `recent`: by `publishedAt` desc.
- Pagination: support `cursor` when upstream allows; return `nextCursor`.

## Caching
- Use Upstash Redis via `src/lib/cache.ts`.
- Cache provider outputs and aggregated feed for 60s using key: `provider-or-feed:${type}:${sort}:${limit}:${cursor}`.
- If Redis env is missing, cache helpers are no-ops; do not throw.

## API
- API routes under `src/app/api/.../route.ts`.
- Read inputs from URL search params; clamp and validate (e.g., `limit`).
- Return stable JSON shapes; avoid leaking internal errors.
- Set `Cache-Control: no-store` for dynamic endpoints.

## Performance
- Use `next/image` with `sizes` and appropriate aspect ratios.
- Batch requests to avoid N+1 (e.g., YouTube `videos` for stats).
- Ship client JS only when needed; prefer server components.
- Prefetch internal links when beneficial.

## Errors & Logging
- Fail gracefully if provider env keys are missing or upstream errors occur (return empty items).
- Never log secrets; keep client logs minimal.
- Add minimal context when catching errors; avoid silent catches in business logic.

## Environment Variables
- Use `.env.local` in dev. Keys as required by features:
  - `YOUTUBE_API_KEY`
  - `SERPAPI_API_KEY`
  - `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_TOKEN` (fallback)
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `NEXT_PUBLIC_SITE_URL`

## Testing (Guidance)
- Unit tests for providers: mapping, sorting, empty-env behavior, error resilience.
- Include basic a11y checks for images/titles where feasible.

## PR Checklist
- Explicit types; no `any`.
- Small, semantic, accessible components.
- Providers normalize to `FeedItem` and are aggregated in `fetchFeed`.
- Caching keys and TTLs set; safe without Redis.
- No dead code; no upstream types in UI.
- Lint passes; formatting consistent.

## Examples
- Provider skeleton `src/lib/providers/foo.ts`:
```ts
import type { ProviderContext, ProviderResult } from '@/lib/types';

export async function fetchFoo(ctx: ProviderContext): Promise<ProviderResult> {
	// fetch upstream, normalize to FeedItem[], compute nextCursor
	return { items: [], nextCursor: null };
}
```

- Wire into aggregator `src/lib/providers/index.ts`:
```ts
import { fetchFoo } from './foo';
// ... inside fetchFeed
if (ctx.type === 'all' || ctx.type === 'article') tasks.push(fetchFoo(ctx));
```

Adhere to this guide for all changes; document any justified deviations in PRs.

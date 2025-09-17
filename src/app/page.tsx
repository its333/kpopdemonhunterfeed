"use client";
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// Use static import so Next can bundle the image even if it's not in /public
// Path from this file to project root image
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Next handles image module types at build time
import Landing from '../../LandingPageThumbnail.jpg';
import { TopTabs } from '@/components/TopTabs';
import { SortSelect } from '@/components/SortSelect';
import { FeedGrid } from '@/components/FeedGrid';
import { getFeedLimit } from '@/lib/feedLimits';
import { useIncrementalReveal } from '@/lib/hooks/useIncrementalReveal';
import type { FeedType } from '@/lib/types';

function HomePageFallback() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 pb-10 pt-8 text-white">
      <div className="rounded-2xl bg-slate-900/70 px-6 py-4 text-lg font-semibold shadow-lg shadow-indigo-900/20 backdrop-blur">
        Loading feed…
      </div>
    </main>
  );
}

function HomePageContent() {
  const params = useSearchParams();
  const type = (params.get('type') || 'all') as FeedType;
  const sort = params.get('sort') || 'popular';
  const limit = getFeedLimit(type);
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data, isLoading, error } = useSWR<{ items: any[]; errors?: Record<string, string> }>(`/api/feed?type=${type}&sort=${sort}&limit=${limit}`, fetcher, { keepPreviousData: true } as any);

  const items = data?.items ?? [];
  const { items: visibleItems, sentinelRef, shouldRenderSentinel } = useIncrementalReveal(items, {
    enabled: type === 'product',
    chunkSize: 50,
  });

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 pb-10 pt-8 text-white">
      <header className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900/70 px-6 py-4 shadow-lg shadow-indigo-900/20 backdrop-blur">
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(15,23,42,0.6)]">HUNTRIX FAN PAGE</h1>
        <nav className="flex gap-4 text-sm">
          <Link className="rounded-full bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20" href="/products">Products</Link>
        </nav>
      </header>
      <div className="rounded-full border border-white/10 bg-slate-900/60 p-1.5 shadow-lg shadow-indigo-900/20 backdrop-blur">
        <TopTabs />
      </div>
      {type === 'all' && (
      <section className="relative -mx-6 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/70 via-purple-500/70 to-pink-500/70 p-[1px] shadow-2xl shadow-indigo-900/30 sm:-mx-10">
        <div className="rounded-[1.4rem] bg-slate-900/80 p-6 backdrop-blur">
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-[1.05fr_1.45fr]">
            <div className="flex flex-col justify-center space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-white">MEGA HUNTRIX FAN PAGE</h2>
              <p className="max-w-xl text-slate-200">WELCOME TO THE KPOP DEMON HUNTER FAN PAGE.</p>
              <div className="flex flex-wrap gap-3">
                <a href="#content" className="rounded-full bg-indigo-500 px-5 py-2 font-semibold text-white shadow transition hover:bg-indigo-400">Explore Feed</a>
                <Link href="/products" className="rounded-full bg-white/10 px-5 py-2 font-semibold text-white shadow transition hover:bg-white/20">BUY HUNTRIX</Link>
              </div>
            </div>
            <div className="relative aspect-[16/9] sm:aspect-[5/3] w-full overflow-hidden rounded-2xl border border-white/10">
              <Image src={Landing} alt="Huntrix fan page" fill className="object-cover transition-transform duration-500 hover:scale-105" priority sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>
      )}
      <section id="content" className="space-y-4">
        <div className="flex items-center justify-end">
          <SortSelect />
        </div>
        {isLoading && <p>Loading...</p>}
        {error && <p role="alert">Failed to load feed.</p>}
        {!isLoading && data?.errors && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-900/40 p-3 text-sm text-red-100">
            {Object.entries(data.errors).map(([k, v]) => (
              <div key={k}><strong className="capitalize">{k}:</strong> {v}</div>
            ))}
          </div>
        )}
        {data && <FeedGrid items={visibleItems as any} />}
        {shouldRenderSentinel && <div ref={sentinelRef} className="h-16" />}
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageFallback />}>
      <HomePageContent />
    </Suspense>
  );
}

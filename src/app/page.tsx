"use client";
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
// Use static import so Next can bundle the image even if it's not in /public
// Path from this file to project root image
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Next handles image module types at build time
import Landing from '../../LandingPageThumbnail.jpg';
import { TopTabs } from '@/components/TopTabs';
import { SortSelect } from '@/components/SortSelect';
import { FeedGrid } from '@/components/FeedGrid';

export default function HomePage() {
  const params = useSearchParams();
  const type = params.get('type') || 'all';
  const sort = params.get('sort') || 'popular';
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const limit = type === 'article' ? 50 : type === 'product' ? 50 : type === 'video' ? 25 : type === 'all' ? 125 : 10;
  const { data, isLoading, error } = useSWR<{ items: any[]; errors?: Record<string, string> }>(`/api/feed?type=${type}&sort=${sort}&limit=${limit}`, fetcher, { keepPreviousData: true } as any);
  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">HUNTRIX FAN PAGE</h1>
        <nav className="flex gap-4 text-sm">
          <Link className="rounded px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800" href="/products">Products</Link>
        </nav>
      </header>
      <div className="mb-6">
        <TopTabs />
      </div>
      {type === 'all' && (
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1">
        <div className="rounded-xl bg-white p-4 dark:bg-gray-950">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold">Latest News, Videos, and Products</h2>
              <p className="text-gray-600 dark:text-gray-300">Curated K-pop Demon Hunter content, refreshed every day. Explore trending videos, breaking news, and hot products.</p>
              <div className="flex gap-3">
                <a href="#content" className="rounded-md bg-indigo-600 px-4 py-2 text-white shadow transition hover:translate-y-[-1px] hover:shadow-md">Explore Feed</a>
                <Link href="/products" className="rounded-md bg-gray-900 px-4 py-2 text-white shadow transition hover:translate-y-[-1px] hover:shadow-md dark:bg-gray-100 dark:text-gray-900">Shop Picks</Link>
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              <Image src={Landing} alt="Huntrix fan page" fill className="object-cover transition-transform duration-500 hover:scale-105" priority sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>
      )}
      <section id="content" className="mt-8">
        <div className="mb-4 flex items-center justify-end">
          <SortSelect />
        </div>
        {isLoading && <p>Loading…</p>}
        {error && <p role="alert">Failed to load feed.</p>}
        {!isLoading && data?.errors && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {Object.entries(data.errors).map(([k, v]) => (
              <div key={k}><strong>{k}:</strong> {v}</div>
            ))}
          </div>
        )}
        {data && <FeedGrid items={data.items as any} />}
      </section>
    </main>
  );
}



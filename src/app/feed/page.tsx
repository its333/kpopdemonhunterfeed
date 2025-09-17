"use client";
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { TopTabs } from '@/components/TopTabs';
import { SortSelect } from '@/components/SortSelect';
import { FeedGrid } from '@/components/FeedGrid';

type FeedItem = {
  id: string;
  type: 'video' | 'article' | 'product';
  title: string;
  url: string;
  thumbnailUrl?: string;
  popularity?: number;
  priceCents?: number;
  source: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FeedPage() {
  const params = useSearchParams();
  const type = params.get('type') || 'all';
  const sort = params.get('sort') || 'popular';
  const { data, isLoading, error } = useSWR<{ items: FeedItem[]; errors?: Record<string, string> }>(`/api/feed?type=${type}&sort=${sort}&limit=10`, fetcher, {
    keepPreviousData: true,
  } as any);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <TopTabs />
        <div className="sm:ml-auto">
          <SortSelect />
        </div>
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
      {data && <FeedGrid items={data.items} />}
    </main>
  );
}



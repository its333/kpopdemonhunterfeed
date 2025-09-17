"use client";
import { useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import type { FeedCardItem } from '@/components/FeedCard';
import { SortSelect } from '@/components/SortSelect';
import { FeedGrid } from '@/components/FeedGrid';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ProductsFallback() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="rounded-2xl bg-gray-100 p-6 text-gray-700 shadow">Loading products...</div>
    </main>
  );
}

function ProductsPageContent() {
  const searchParams = useSearchParams();

  const sort = useMemo<'popular' | 'recent'>(() => {
    const value = searchParams.get('sort');
    return value === 'recent' ? 'recent' : 'popular';
  }, [searchParams]);

  const limit = useMemo(() => {
    const raw = searchParams.get('limit');
    if (!raw) {
      return 50;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      return 50;
    }

    return Math.min(Math.max(parsed, 1), 200);
  }, [searchParams]);

  const swrKey = useMemo(() => `/api/feed?type=product&sort=${sort}&limit=${limit}`, [sort, limit]);

  const { data, isLoading, error } = useSWR<{ items: FeedCardItem[] }>(swrKey, fetcher);
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <SortSelect />
      </div>
      {isLoading && <p>Loading...</p>}
      {error && <p role="alert">Failed to load products.</p>}
      {data && <FeedGrid items={data.items} />}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}

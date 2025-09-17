"use client";
import useSWR from 'swr';
import { SortSelect } from '@/components/SortSelect';
import { FeedGrid } from '@/components/FeedGrid';

type ProductItem = {
  id: string;
  type: 'product';
  title: string;
  url: string;
  thumbnailUrl?: string;
  priceCents?: number;
  source: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProductsPage() {
  const { data, isLoading, error } = useSWR<{ items: ProductItem[] }>(`/api/feed?type=product&sort=popular&limit=10`, fetcher);
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <SortSelect />
      </div>
      {isLoading && <p>Loading…</p>}
      {error && <p role="alert">Failed to load products.</p>}
      {data && <FeedGrid items={data.items as any} />}
    </main>
  );
}



"use client";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sort = params.get('sort') || 'popular';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const search = new URLSearchParams(params.toString());
    search.set('sort', e.target.value);
    router.push(`${pathname}?${search.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-600 dark:text-gray-300">Sort</span>
      <select
        aria-label="Sort feed"
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
        value={sort}
        onChange={onChange}
      >
        <option value="popular">Popularity</option>
        <option value="recent">Most Recent</option>
      </select>
    </label>
  );
}



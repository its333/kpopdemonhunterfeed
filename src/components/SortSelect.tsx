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
    <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-100">
      <span className="text-slate-200">Sort</span>
      <select
        aria-label="Sort feed"
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white shadow-inner shadow-indigo-900/20 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        value={sort}
        onChange={onChange}
      >
        <option className="text-slate-900" value="popular">Popularity</option>
        <option className="text-slate-900" value="recent">Most Recent</option>
      </select>
    </label>
  );
}



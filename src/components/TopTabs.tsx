"use client";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Tab = { key: string; label: string };

const TABS: Tab[] = [
  { key: 'all', label: 'All' },
  { key: 'article', label: 'News' },
  { key: 'product', label: 'Products' },
  { key: 'video', label: 'Videos' },
];

export function TopTabs({ basePath }: { basePath?: string } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const type = params.get('type') || 'all';
  const sort = params.get('sort') || 'popular';

  function onSelect(nextType: string) {
    const search = new URLSearchParams(params.toString());
    search.set('type', nextType);
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${search.toString()}`);
  }

  return (
    <div role="tablist" aria-label="Content type" className="flex items-center gap-2 rounded-md bg-gray-100 p-1 dark:bg-gray-800">
      {TABS.map((t) => {
        const active = t.key === type;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.key)}
            className={
              `px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ` +
              (active ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 hover:dark:text-white')
            }
          >
            {t.label}
          </button>
        );
      })}
      <div className="ml-auto" aria-hidden>
        {/* spacer to align with SortSelect on the right on small screens when stacked */}
      </div>
    </div>
  );
}



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

  function onSelect(nextType: string) {
    const search = new URLSearchParams(params.toString());
    search.set('type', nextType);
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${search.toString()}`);
  }

  return (
    <div role="tablist" aria-label="Content type" className="flex w-full items-center gap-2">
      {TABS.map((t) => {
        const active = t.key === type;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.key)}
            className={
              `rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ` +
              (active
                ? 'bg-indigo-500 text-white shadow shadow-indigo-900/40'
                : 'bg-white/0 text-slate-200 hover:bg-white/10 hover:text-white')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}


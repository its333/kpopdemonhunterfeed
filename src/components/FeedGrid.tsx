import type { FeedCardItem } from './FeedCard';
import { FeedCard } from './FeedCard';

export function FeedGrid({ items }: { items: FeedCardItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => (
        <FeedCard key={it.id} item={it} />
      ))}
    </ul>
  );
}



import { useEffect, useMemo, useRef, useState } from 'react';

type IncrementalRevealOptions = {
  enabled: boolean;
  chunkSize?: number;
  rootMargin?: string;
};

type IncrementalRevealResult<T> = {
  items: T[];
  sentinelRef: (node: HTMLDivElement | null) => void;
  shouldRenderSentinel: boolean;
};

const DEFAULT_CHUNK = 50;
const DEFAULT_MARGIN = '200px';

export function useIncrementalReveal<T>(
  source: T[],
  { enabled, chunkSize = DEFAULT_CHUNK, rootMargin = DEFAULT_MARGIN }: IncrementalRevealOptions
): IncrementalRevealResult<T> {
  const [visibleCount, setVisibleCount] = useState(() => (enabled ? Math.min(chunkSize, source.length) : source.length));
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(enabled ? Math.min(chunkSize, source.length) : source.length);
  }, [enabled, source.length, chunkSize]);

  useEffect(() => {
    if (!enabled) return;
    const target = nodeRef.current;
    if (!target) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      setVisibleCount((prev) => {
        if (prev >= source.length) return prev;
        return Math.min(prev + chunkSize, source.length);
      });
    }, { rootMargin });

    observerRef.current.observe(target);

    return () => observerRef.current?.disconnect();
  }, [enabled, source.length, chunkSize, rootMargin]);

  const items = useMemo(() => (enabled ? source.slice(0, visibleCount) : source), [enabled, source, visibleCount]);
  const shouldRenderSentinel = enabled && items.length < source.length;

  const sentinelRef = (node: HTMLDivElement | null) => {
    if (nodeRef.current === node) return;
    if (observerRef.current && nodeRef.current) {
      observerRef.current.unobserve(nodeRef.current);
    }
    nodeRef.current = node;
    if (node && observerRef.current) {
      observerRef.current.observe(node);
    }
  };

  return { items, sentinelRef, shouldRenderSentinel };
}


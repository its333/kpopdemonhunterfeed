"use client";
import Image from 'next/image';
import { useState } from 'react';

export type FeedCardItem = {
  id: string;
  type: 'video' | 'article' | 'product';
  title: string;
  url: string;
  thumbnailUrl?: string;
  popularity?: number;
  priceCents?: number;
  source: string;
};

export function FeedCard({ item }: { item: FeedCardItem }) {
  const [playVideo, setPlayVideo] = useState(false);

  const getVideoId = (): string => {
    try {
      const url = new URL(item.url);
      return url.searchParams.get('v') || item.id;
    } catch {
      return item.id;
    }
  };

  const videoId = item.type === 'video' ? getVideoId() : '';
  const videoThumb = item.type === 'video'
    ? item.thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined)
    : undefined;

  return (
    <li className="group animate-fadeInUp rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      {item.type === 'video' && (playVideo ? (
        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-md">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlayVideo(true)}
          className="relative mb-3 block aspect-video w-full overflow-hidden rounded-md bg-gray-100 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-gray-800"
          aria-label="Play video"
          title="Play video"
        >
          {videoThumb && (
            <Image
              src={videoThumb}
              alt={item.title}
              fill
              className="object-cover transition-transform group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )}
        </button>
      ))}
      {item.type !== 'video' && item.thumbnailUrl && (
        <div className="relative mb-3 aspect-video overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <a
        className="line-clamp-2 font-medium text-gray-900 underline-offset-2 hover:underline dark:text-gray-50"
        href={item.url}
        target="_blank"
        rel="noreferrer"
      >
        {item.title}
      </a>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">{item.source}</span>
        {item.popularity != null && <span>{item.popularity.toLocaleString()}?~.</span>}
        {item.priceCents != null && <span>${(item.priceCents / 100).toFixed(2)}</span>}
      </div>
    </li>
  );
}


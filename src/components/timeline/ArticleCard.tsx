'use client';

import Image from 'next/image';
import type { ArticlePreview } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCardProps {
  article: ArticlePreview;
}

/**
 * Lightweight article preview card for the folder-first timeline.
 * Shows title, summary, thumbnail, and publication time.
 */
export function ArticleCard({ article }: ArticleCardProps) {
  const publishedDate = article.pubDate ? new Date(article.pubDate * 1000) : null;

  return (
    <article
      className={`bg-white rounded-lg border p-4 transition-all shadow-sm ${
        article.unread ? 'border-blue-200 border-l-4 border-l-blue-600' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {article.thumbnailUrl && (
          <div className="sm:w-40 flex-shrink-0">
            <Image
              src={article.thumbnailUrl}
              alt={article.title}
              width={160}
              height={120}
              className="rounded-md object-cover w-full h-[120px]"
              unoptimized
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {article.title || 'Untitled article'}
            </a>

            {article.unread && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                New
              </span>
            )}
          </div>

          {publishedDate && (
            <time className="text-sm text-gray-500" dateTime={publishedDate.toISOString()}>
              {formatDistanceToNow(publishedDate, { addSuffix: true })}
            </time>
          )}

          <p className="text-gray-700 mt-2 leading-relaxed">
            {article.summary || 'No summary available for this article.'}
          </p>
        </div>
      </div>
    </article>
  );
}

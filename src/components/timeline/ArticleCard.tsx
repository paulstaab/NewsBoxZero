'use client';

import { useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import type { Article, ArticlePreview } from '@/types';
import { getArticle } from '@/lib/api/items';

interface ArticleCardProps {
  article: ArticlePreview;
  onMarkRead?: (id: number) => void;
}

/**
 * Lightweight article preview card for the folder-first timeline.
 * Shows title, summary, thumbnail, and publication time.
 * Expands to show full content on click.
 */
export function ArticleCard({ article, onMarkRead }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const publishedDate = article.pubDate ? new Date(article.pubDate * 1000) : null;

  const {
    data: fullArticle,
    error,
    isLoading,
  } = useSWR<Article | null, Error>(isExpanded ? `article-${String(article.id)}` : null, async () =>
    getArticle(article.id),
  );

  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      onMarkRead?.(article.id);
    } else {
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleExpand();
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all shadow-sm cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        article.unread ? 'border-blue-200 border-l-4 border-l-blue-600' : 'border-gray-200'
      }`}
      onClick={handleExpand}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${article.title || 'Untitled article'}, ${
        article.unread ? 'unread' : 'read'
      }. Click to ${isExpanded ? 'collapse' : 'expand'}.`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        {article.thumbnailUrl && (
          <div className="sm:w-40 flex-shrink-0">
            <Image
              src={article.thumbnailUrl}
              alt="" // Decorative image, title describes content
              width={160}
              height={120}
              className="rounded-md object-cover w-full h-[120px] bg-gray-100"
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
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:underline"
              onClick={(e) => {
                e.stopPropagation();
              }}
              aria-label={`Open ${article.title || 'article'} in new tab`}
            >
              {article.title || 'Untitled article'}
            </a>
          </div>

          {publishedDate && (
            <time
              className="text-sm text-gray-500 block mt-1"
              dateTime={publishedDate.toISOString()}
            >
              {formatDistanceToNow(publishedDate, { addSuffix: true })}
            </time>
          )}

          <p className="text-gray-700 mt-2 leading-relaxed line-clamp-3">
            {article.summary || 'No summary available for this article.'}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div
          className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => {
            e.stopPropagation();
          }} // Prevent collapsing when clicking inside content
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          role="presentation"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-4 justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              Loading full article...
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm py-2 text-center">
              Failed to load article content. Please try again.
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none text-gray-800"
              dangerouslySetInnerHTML={{ __html: fullArticle?.body ?? '' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

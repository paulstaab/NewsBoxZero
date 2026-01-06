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
  const author = article.author.trim();
  const feedName = article.feedName.trim() || 'Unknown source';
  const ageLabel = publishedDate
    ? formatDistanceToNow(publishedDate, { addSuffix: true }).replace(/^about\\s+/i, '')
    : null;
  const summary = article.summary.trim();

  const {
    data: fullArticle,
    error,
    isLoading,
  } = useSWR<Article | null, Error>(
    isExpanded ? ['article', article.id, article.feedId] : null,
    async () => getArticle(article.id),
  );

  const handleExpand = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      onMarkRead?.(article.id);
    } else {
      setIsExpanded(false);
    }
  };

  const handleCardClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('a')) {
      return;
    }
    handleExpand();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a')) {
      return;
    }
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
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${article.title || 'Untitled article'}, ${
        article.unread ? 'unread' : 'read'
      }. Click to ${isExpanded ? 'collapse' : 'expand'}.`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:underline"
              aria-label={`Open ${article.title || 'article'} in new tab`}
            >
              {article.title || 'Untitled article'}
            </a>
          </div>

          <div className="text-sm text-gray-500 mt-1">
            <span>
              {feedName}
              {author ? ` (${author})` : ''}
            </span>
            {ageLabel && publishedDate && (
              <>
                <span aria-hidden="true"> &middot; </span>
                <time dateTime={publishedDate.toISOString()}>{ageLabel}</time>
              </>
            )}
          </div>

          {!isExpanded && summary && (
            <p className="text-gray-700 mt-2 leading-relaxed line-clamp-3">{summary}</p>
          )}

          {isExpanded && (
            <div className="mt-3">
              {isLoading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  Loading full article...
                </div>
              ) : error ? (
                <div className="text-red-600 text-sm py-2">
                  Failed to load article content. Please try again.
                </div>
              ) : fullArticle?.body ? (
                <div
                  className="prose prose-sm max-w-none text-gray-800 prose-img:max-w-full prose-img:h-auto prose-img:object-contain prose-img:block"
                  dangerouslySetInnerHTML={{ __html: fullArticle.body }}
                />
              ) : null}
            </div>
          )}
        </div>

        {!isExpanded && article.thumbnailUrl && (
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
      </div>
    </div>
  );
}

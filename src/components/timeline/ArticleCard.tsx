'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Article } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCardProps {
  article: Article;
  onMarkRead?: (id: number) => void;
  onToggleStar?: (id: number, starred: boolean) => void;
}

/**
 * Article card component for timeline
 *
 * Features:
 * - Lazy-loaded body content (collapsed by default)
 * - Large enclosures collapsed with preview
 * - Read/star actions
 * - Responsive layout
 */
export function ArticleCard({ article, onMarkRead, onToggleStar }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const publishedDate = article.pubDate ? new Date(article.pubDate * 1000) : null;

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);

    // Mark as read when expanding (if unread)
    if (!isExpanded && article.unread && onMarkRead) {
      onMarkRead(article.id);
    }
  };

  const handleToggleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleStar) {
      onToggleStar(article.id, !article.starred);
    }
  };

  return (
    <article
      className={`bg-white rounded-lg border transition-all ${
        article.unread ? 'border-blue-200 border-l-4 border-l-blue-600' : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleToggleExpand();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3
              className={`text-lg font-semibold mb-1 ${article.unread ? 'text-gray-900' : 'text-gray-600'}`}
            >
              {article.title || 'Untitled'}
            </h3>

            <div className="flex items-center gap-3 text-sm text-gray-500">
              {article.author && <span className="truncate">{article.author}</span>}
              {publishedDate && (
                <time dateTime={publishedDate.toISOString()}>
                  {formatDistanceToNow(publishedDate, { addSuffix: true })}
                </time>
              )}
              {article.unread && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  New
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleStar}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              aria-label={article.starred ? 'Unstar article' : 'Star article'}
            >
              <svg
                className={`w-5 h-5 ${article.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                fill={article.starred ? 'currentColor' : 'none'}
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>

            <button
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              aria-label={isExpanded ? 'Collapse article' : 'Expand article'}
            >
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Enclosure preview */}
          {article.enclosureLink && (
            <div className="my-4">
              {article.enclosureMime?.startsWith('image/') ? (
                <Image
                  src={article.enclosureLink}
                  alt={article.mediaDescription ?? ''}
                  className="max-w-full h-auto rounded-lg"
                  width={800}
                  height={600}
                  unoptimized
                />
              ) : article.enclosureMime?.startsWith('audio/') ? (
                <audio controls className="w-full" preload="none">
                  <source src={article.enclosureLink} type={article.enclosureMime} />
                  <track kind="captions" />
                  Your browser does not support the audio element.
                </audio>
              ) : article.enclosureMime?.startsWith('video/') ? (
                <video controls className="w-full rounded-lg" preload="none">
                  <source src={article.enclosureLink} type={article.enclosureMime} />
                  <track kind="captions" />
                  Your browser does not support the video element.
                </video>
              ) : (
                <a
                  href={article.enclosureLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download attachment
                </a>
              )}
            </div>
          )}

          {/* Article body */}
          <div
            className="prose prose-sm max-w-none mt-4"
            dangerouslySetInnerHTML={{ __html: article.body || '' }}
          />

          {/* Link to original */}
          {article.url && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                Read original article
                <svg
                  className="w-4 h-4"
                  fill="none"
                  strokeWidth="2"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

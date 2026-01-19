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
  // Track the article ID in state alongside expansion state to reset when article changes.
  // This pattern is recommended by React docs for deriving state from props:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [expandState, setExpandState] = useState({
    articleId: article.id,
    isExpanded: false,
  });

  const publishedDate = article.pubDate ? new Date(article.pubDate * 1000) : null;
  const author = article.author.trim();
  const feedName = article.feedName.trim() || 'Unknown source';
  const ageLabel = publishedDate
    ? formatDistanceToNow(publishedDate, { addSuffix: true }).replace(/^about\\s+/i, '')
    : null;
  const summary = article.summary.trim();
  const fallbackColors = ['#f6b4c0', '#f7d49b', '#bfe3c7', '#b6d7f2', '#c8c5f2', '#f2b9df'];
  const fallbackColor = fallbackColors[article.id % fallbackColors.length];

  // Derive expansion state, resetting it when article changes.
  // If the stored article ID doesn't match the current article, default to collapsed.
  const isExpanded = expandState.articleId === article.id ? expandState.isExpanded : false;

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
      setExpandState({ articleId: article.id, isExpanded: true });
      onMarkRead?.(article.id);
    } else {
      setExpandState({ articleId: article.id, isExpanded: false });
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
      className={`article-card${article.unread ? ' article-card--unread' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${article.title || 'Untitled article'}, ${
        article.unread ? 'unread' : 'read'
      }. Click to ${isExpanded ? 'collapse' : 'expand'}.`}
    >
      <div className="article-card__media">
        {article.thumbnailUrl ? (
          <Image
            src={article.thumbnailUrl}
            alt="" // Decorative image, title describes content
            fill
            className="article-card__media-image"
            unoptimized
          />
        ) : (
          <div
            className="article-card__media-fallback"
            style={{ backgroundColor: fallbackColor }}
          />
        )}
      </div>

      <div className="article-card__body">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="article-card__title"
          aria-label={`Open ${article.title || 'article'} in new tab`}
        >
          {article.title || 'Untitled article'}
        </a>
        <div className="article-card__meta">
          <span>
            {feedName}
            {author ? ` · ${author}` : ''}
          </span>
          {ageLabel && publishedDate && (
            <>
              <span aria-hidden="true"> · </span>
              <time dateTime={publishedDate.toISOString()}>{ageLabel}</time>
            </>
          )}
        </div>

        {!isExpanded && summary && (
          <p className="article-card__excerpt article-card__excerpt--clamped">{summary}</p>
        )}

        {isExpanded && (
          <div className="article-card__expanded">
            {isLoading ? (
              <div className="article-card__loading">
                <div className="article-card__spinner" />
                Loading full article...
              </div>
            ) : error ? (
              <div className="article-card__error">
                Failed to load article content. Please try again.
              </div>
            ) : fullArticle?.body ? (
              <div
                className="article-card__content"
                dangerouslySetInnerHTML={{ __html: fullArticle.body }}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

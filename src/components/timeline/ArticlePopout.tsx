'use client';

import { useMemo, useRef, type RefObject } from 'react';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import type { Article, ArticlePreview } from '@/types';
import { getArticle } from '@/lib/api/items';
import { useSwipeDismiss } from '@/hooks/useSwipeDismiss';

interface ArticlePopoutProps {
  isOpen: boolean;
  article: ArticlePreview | null;
  onClose: () => void;
  dialogRef: RefObject<HTMLDivElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
}

export function ArticlePopout({
  isOpen,
  article,
  onClose,
  dialogRef,
  closeButtonRef,
}: ArticlePopoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeDismiss({
    enabled: isOpen,
    onDismiss: onClose,
    canStart: () => (scrollRef.current?.scrollTop ?? 0) <= 0,
  });

  const shouldFetch = isOpen && Boolean(article);

  const {
    data: fullArticle,
    error,
    isLoading,
  } = useSWR<Article | null, Error>(
    shouldFetch && article ? ['article', article.id, article.feedId] : null,
    async () => (article ? getArticle(article.id) : null),
    {
      keepPreviousData: false,
    },
  );

  const content = useMemo(() => {
    if (!article) return null;
    return {
      title: article.title || 'Untitled article',
      feedName: article.feedName.trim() || 'Unknown source',
      author: article.author.trim(),
      summary: article.summary.trim(),
      publishedDate: article.pubDate ? new Date(article.pubDate * 1000) : null,
    };
  }, [article]);

  if (!isOpen || !article || !content) {
    return null;
  }

  const ageLabel = content.publishedDate
    ? formatDistanceToNow(content.publishedDate, { addSuffix: true }).replace(/^about\s+/i, '')
    : null;

  const fullArticleMatches = !fullArticle || fullArticle.id === article.id;
  const bodyHtml = fullArticleMatches ? (fullArticle?.body ?? '') : '';
  const bodyFallback = !bodyHtml && content.summary ? content.summary : null;

  return (
    <div
      className="article-popout__overlay"
      role="presentation"
      data-testid="article-popout-overlay"
      onClick={onClose}
    >
      <div
        className="article-popout"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-popout-title"
        aria-describedby="article-popout-subheading"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          type="button"
          className="article-popout__close"
          onClick={onClose}
          aria-label="Close article"
          ref={closeButtonRef}
        >
          ×
        </button>
        <div className="article-popout__scroll" ref={scrollRef}>
          <div className="article-popout__heading">
            <h2 id="article-popout-title" className="article-popout__title">
              {content.title}
            </h2>
            <p id="article-popout-subheading" className="article-popout__subheading">
              {content.feedName}
              {content.author ? ` · ${content.author}` : ''}
              {ageLabel ? ` · ${ageLabel}` : ''}
            </p>
          </div>

          <div
            className="article-popout__body"
            dir={fullArticleMatches && fullArticle?.rtl ? 'rtl' : 'ltr'}
          >
            {isLoading || !fullArticleMatches ? (
              <div className="article-popout__loading">
                <div className="article-popout__spinner" />
                Loading full article...
              </div>
            ) : error ? (
              <div className="article-popout__error">
                Failed to load article content. Please try again.
              </div>
            ) : bodyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            ) : bodyFallback ? (
              <p>{bodyFallback}</p>
            ) : (
              <p>No additional article content available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

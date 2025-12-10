'use client';

import { useEffect, useRef } from 'react';
import type { Article } from '@/types';
import { ArticleCard } from './ArticleCard';

interface TimelineListProps {
  items: Article[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMarkRead?: (id: number) => void;
  onToggleStar?: (id: number, starred: boolean) => void;
}

/**
 * Timeline list component with infinite scroll
 *
 * Features:
 * - Virtualization-ready article list
 * - Intersection Observer for load more trigger
 * - Loading states
 * - Empty state handling
 */
export function TimelineList({
  items,
  isLoading,
  hasMore,
  onLoadMore,
  onMarkRead,
  onToggleStar,
}: TimelineListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, onLoadMore]);

  if (items.length === 0 && !isLoading) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="space-y-4">
      {items.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onMarkRead={onMarkRead}
          onToggleStar={onToggleStar}
        />
      ))}

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-8 text-center">
          {isLoading ? (
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading more articles...</span>
            </div>
          ) : (
            <button onClick={onLoadMore} className="text-blue-600 hover:underline font-medium">
              Load more
            </button>
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && items.length > 0 && (
        <div className="py-8 text-center text-gray-500 text-sm">You&apos;ve reached the end</div>
      )}
    </div>
  );
}

'use client';

import type { ArticlePreview } from '@/types';
import { ArticleCard } from './ArticleCard';

interface TimelineListProps {
  items: ArticlePreview[];
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Folder-scoped article list with lightweight loading and empty-state handling.
 */
export function TimelineList({ items, isLoading, emptyMessage }: TimelineListProps) {
  if (isLoading && items.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="inline-flex items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading articles...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-500">
        {emptyMessage ?? 'No unread articles in this folder.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

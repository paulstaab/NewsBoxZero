'use client';

import { useState } from 'react';
import type { ArticlePreview } from '@/types';
import { ArticleCard } from './ArticleCard';
import { MarkAllReadButton } from './MarkAllReadButton';

interface TimelineListProps {
  items: ArticlePreview[];
  isLoading?: boolean;
  emptyMessage?: string;
  onMarkRead?: (id: number) => void;
  onMarkAllRead?: () => Promise<void>;
  onSkipFolder?: () => Promise<void>;
  isUpdating?: boolean;
}

/**
 * Folder-scoped article list with lightweight loading and empty-state handling.
 */
export function TimelineList({
  items,
  isLoading,
  emptyMessage,
  onMarkRead,
  onMarkAllRead,
  onSkipFolder,
  isUpdating,
}: TimelineListProps) {
  const [isSkipping, setIsSkipping] = useState(false);

  const showActions = items.length > 0 && Boolean(onMarkAllRead ?? onSkipFolder);

  const handleSkip = async () => {
    if (!onSkipFolder) return;

    setIsSkipping(true);
    try {
      await onSkipFolder();
    } catch (error) {
      console.error('Failed to skip folder:', error);
    } finally {
      setIsSkipping(false);
    }
  };

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
      {showActions && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {onSkipFolder && (
              <button
                onClick={() => {
                  void handleSkip();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                disabled={isSkipping || isUpdating}
              >
                {isSkipping ? 'Skipping…' : 'Skip'}
              </button>
            )}
          </div>
          {onMarkAllRead && (
            <MarkAllReadButton onMarkAllRead={onMarkAllRead} disabled={isUpdating} />
          )}
        </div>
      )}
      {items.map((article) => (
        <ArticleCard key={article.id} article={article} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
}

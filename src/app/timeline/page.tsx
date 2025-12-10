'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useItems } from '@/hooks/useItems';
import { TimelineList } from '@/components/timeline/TimelineList';
import { EmptyState } from '@/components/timeline/EmptyState';
import { UnreadSummary } from '@/components/timeline/UnreadSummary';

/**
 * Timeline page content component
 * Extracted to wrap useSearchParams in Suspense
 */
function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isInitializing } = useAuth();

  // Get filter from URL or default to unread
  const getReadParam = searchParams.get('getRead');
  const showRead = getReadParam === 'true';

  // Redirect to login if not authenticated (but wait for initialization to complete)
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitializing, router]);

  // Fetch items with infinite scroll
  const { items, isLoading, isValidating, error, hasMore, loadMore, refresh } = useItems({
    type: 3, // All feeds
    getRead: showRead,
    oldestFirst: false, // Newest first
    batchSize: 50,
    infiniteScroll: true,
  });

  // Toggle between Unread and All
  const handleToggleView = (showAllItems: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('getRead', showAllItems.toString());
    router.push(`/timeline?${params.toString()}`);
  };

  // Handle mark read action
  const handleMarkRead = (itemId: number) => {
    // TODO: Implement mark read mutation
    // This will be implemented in Phase 4 (US2)
    console.log('Mark read:', itemId);
  };

  // Handle toggle star action
  const handleToggleStar = (itemId: number, starred: boolean) => {
    // TODO: Implement star mutation
    // This will be implemented in Phase 4 (US2)
    console.log('Toggle star:', itemId, starred);
  };

  // Show loading state while checking authentication
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="inline-flex items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Determine empty state type
  const getEmptyStateType = () => {
    if (error) return 'error';
    if (!showRead && items.length === 0) return 'no-unread';
    if (items.length === 0) return 'no-items';
    return null;
  };

  const emptyStateType = getEmptyStateType();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>

            {/* Unread summary */}
            <UnreadSummary items={items} />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleToggleView(false);
              }}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                !showRead ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={!showRead}
            >
              Unread
            </button>
            <button
              onClick={() => {
                handleToggleView(true);
              }}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                showRead ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              aria-pressed={showRead}
            >
              All
            </button>

            {/* Refresh button */}
            <button
              onClick={() => {
                void refresh();
              }}
              disabled={isValidating}
              className="ml-auto p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Refresh timeline"
            >
              <svg
                className={`w-5 h-5 text-gray-700 ${isValidating ? 'animate-spin' : ''}`}
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Initial loading state */}
        {isLoading && items.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="inline-flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>Loading articles...</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {emptyStateType && !isLoading && (
          <EmptyState
            type={emptyStateType}
            action={
              emptyStateType === 'error'
                ? {
                    label: 'Retry',
                    onClick: () => {
                      void refresh();
                    },
                  }
                : emptyStateType === 'no-items'
                  ? {
                      label: 'Browse Feeds',
                      onClick: () => {
                        router.push('/');
                      }, // Will implement feed management in US3
                    }
                  : undefined
            }
          />
        )}

        {/* Timeline list */}
        {items.length > 0 && (
          <TimelineList
            items={items}
            isLoading={isValidating}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onMarkRead={handleMarkRead}
            onToggleStar={handleToggleStar}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Timeline page - aggregated article feed
 *
 * Features:
 * - Unread/All toggle with URL synchronization
 * - Infinite scroll with 75% prefetch
 * - Empty states (no items, offline, etc.)
 * - Offline-friendly guardrails
 * - Read/star actions
 */
export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading timeline...</p>
          </div>
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}

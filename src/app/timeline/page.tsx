'use client';

import { Suspense, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolderQueue } from '@/hooks/useFolderQueue';
import { useFolderQueueDocking } from '@/hooks/useFolderQueueDocking';
import { useAutoMarkReadOnScroll } from '@/hooks/useAutoMarkReadOnScroll';
import { useTimelineSelection } from '@/hooks/useTimelineSelection';
import { FolderQueuePills } from '@/components/timeline/FolderQueuePills';
import { TimelineList } from '@/components/timeline/TimelineList';
import { EmptyState } from '@/components/timeline/EmptyState';
import { PinnedActionCluster } from '@/components/timeline/PinnedActionCluster';
import { RequestStateToast, useToast } from '@/components/ui/RequestStateToast';
import { handleTimelineKeyDown } from '@/lib/timeline/keyboard-handler';
import {
  markTimelineCacheLoadStart,
  markTimelineCacheReady,
  markTimelineUpdateStart,
  markTimelineUpdateComplete,
} from '@/lib/metrics/metricsClient';

/**
 * Timeline page content component
 * Extracted to wrap useSearchParams in Suspense
 */
function TimelineContent() {
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAuth();

  // Mark cache load start before hook initialization
  useEffect(() => {
    markTimelineCacheLoadStart();
  }, []);

  const {
    queue,
    activeFolder,
    activeArticles,
    progress,
    totalUnread,
    isHydrated,
    isUpdating,
    isRefreshing,
    error,
    refresh,
    setActiveFolder,
    markFolderRead,
    markItemRead,
    skipFolder,
    restart,
    lastUpdateError,
  } = useFolderQueue();

  const { isDocked, dockedHeight, queueRef, sentinelRef } = useFolderQueueDocking();
  const timelineRef = useRef<HTMLDivElement>(null);

  const { selectedArticleId, setSelectedArticleId } = useTimelineSelection(activeArticles);
  const unreadIdSet = useMemo(
    () => new Set(activeArticles.filter((article) => article.unread).map((article) => article.id)),
    [activeArticles],
  );

  const { registerArticle } = useAutoMarkReadOnScroll({
    items: activeArticles,
    topOffset: isDocked ? dockedHeight : 0,
    onMarkRead: (id) => {
      void markItemRead(id);
    },
  });

  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      handleTimelineKeyDown(event, {
        timelineRef,
        selectedId: selectedArticleId,
        onSelect: setSelectedArticleId,
        onMarkRead: (id) => {
          if (!unreadIdSet.has(id)) return;
          void markItemRead(id);
        },
      });
    };

    window.addEventListener('keydown', handler, { passive: false });
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [selectedArticleId, unreadIdSet, markItemRead, setSelectedArticleId]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isInitializing, router]);

  // Mark cache ready after hydration
  useEffect(() => {
    if (isHydrated) {
      markTimelineCacheReady();
    }
  }, [isHydrated]);

  // Automatic update on mount (US5 requirement)
  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      markTimelineUpdateStart();
      // Trigger refresh to get latest articles and merge with cache
      void refresh()
        .then(() => {
          markTimelineUpdateComplete();
        })
        .catch(() => {
          // Error already logged and retried in useFolderQueue
          // Just mark the update as complete (with error)
          markTimelineUpdateComplete();
        });
    }
    // Only run on mount when hydrated and authenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, isAuthenticated]);

  // Show toast when update fails after all retries
  useEffect(() => {
    if (lastUpdateError) {
      showToast({
        title: 'Update Failed',
        message: `Failed to update timeline: ${lastUpdateError}`,
        type: 'error',
        duration: 5000,
      });
    }
  }, [lastUpdateError, showToast]);

  // Show loading state while checking authentication
  if (isInitializing || !isHydrated) {
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

  const hasUnread = !progress.allViewed;

  const showEmptyState = !activeFolder;
  const lastUpdatedLabel = activeFolder
    ? new Date(activeFolder.lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  let emptyStateType: 'no-unread' | 'no-items' | 'offline' | 'error' | 'all-viewed' = 'no-unread';
  if (error) {
    emptyStateType = 'error';
  } else if (totalUnread === 0) {
    emptyStateType = 'no-unread';
  } else {
    emptyStateType = 'all-viewed';
  }

  const timelineStyle = {
    '--timeline-offset': `${isDocked ? String(dockedHeight) : '0'}px`,
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">NewsBoxZero</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4">
        {/* Folder queue */}
        <div ref={sentinelRef} aria-hidden="true" className="folder-queue-sentinel" />
        <div
          ref={queueRef}
          className={`folder-queue-dock${isDocked ? ' folder-queue-dock--sticky' : ''}`}
        >
          <FolderQueuePills
            queue={queue}
            activeFolderId={activeFolder ? activeFolder.id : null}
            onSelect={setActiveFolder}
            isLoading={isUpdating}
          />
          <span className="sr-only" data-testid="active-folder-name">
            {activeFolder?.name ?? 'All caught up'}
          </span>
        </div>

        {/* Main content */}
        <main className="py-6" style={timelineStyle}>
          {showEmptyState ? (
            <EmptyState
              type={emptyStateType}
              action={
                emptyStateType === 'error'
                  ? {
                      label: 'Retry',
                      onClick: () => {
                        void refresh({ forceSync: true });
                      },
                    }
                  : emptyStateType === 'all-viewed'
                    ? {
                        label: 'Restart',
                        onClick: () => {
                          void restart();
                        },
                      }
                    : undefined
              }
            />
          ) : (
            <div ref={timelineRef} role="region" aria-label="Timeline" tabIndex={0}>
              <TimelineList
                items={activeArticles}
                isLoading={isUpdating && activeArticles.length === 0}
                emptyMessage={`No unread articles left in ${activeFolder.name}.`}
                onMarkRead={(id) => {
                  void markItemRead(id);
                }}
                registerArticle={registerArticle}
                selectedArticleId={selectedArticleId}
                isUpdating={isUpdating}
                disableActions={!hasUnread}
              />
            </div>
          )}
          {lastUpdatedLabel && (
            <div className="mt-10 text-center text-sm text-gray-500">
              Last updated at {lastUpdatedLabel}
            </div>
          )}
        </main>
      </div>

      <PinnedActionCluster
        onSync={() => {
          markTimelineUpdateStart();
          void refresh({ forceSync: true })
            .then(() => {
              markTimelineUpdateComplete();
            })
            .catch(() => {
              markTimelineUpdateComplete();
            });
        }}
        onSkip={async () => {
          if (!activeFolder) return;
          await skipFolder(activeFolder.id);
        }}
        onMarkAllRead={async () => {
          if (!activeFolder) return;
          await markFolderRead(activeFolder.id);
        }}
        disableSkip={!hasUnread}
        disableMarkAllRead={!hasUnread}
        isSyncing={isRefreshing}
      />

      {/* Toast notifications for errors */}
      {toasts.map((toast) => (
        <RequestStateToast key={toast.id} message={toast} onDismiss={dismissToast} />
      ))}
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

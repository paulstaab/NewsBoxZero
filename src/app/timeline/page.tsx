'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolderQueue } from '@/hooks/useFolderQueue';
import { FolderQueuePills } from '@/components/timeline/FolderQueuePills';
import { FolderStepper } from '@/components/timeline/FolderStepper';
import { TimelineList } from '@/components/timeline/TimelineList';
import { EmptyState } from '@/components/timeline/EmptyState';
import { PinnedActionCluster } from '@/components/timeline/PinnedActionCluster';
import { RequestStateToast, useToast } from '@/components/ui/RequestStateToast';
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

  const { toasts, showToast, dismissToast } = useToast();

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

  const remainingFolders = progress.remainingFolderIds.length;
  const hasUnread = !progress.allViewed;

  const showEmptyState = !activeFolder;

  let emptyStateType: 'no-unread' | 'no-items' | 'offline' | 'error' | 'all-viewed' = 'no-unread';
  if (error) {
    emptyStateType = 'error';
  } else if (totalUnread === 0) {
    emptyStateType = 'no-unread';
  } else {
    emptyStateType = 'all-viewed';
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
          </div>
          <FolderQueuePills
            queue={queue}
            activeFolderId={activeFolder ? activeFolder.id : null}
            onSelect={setActiveFolder}
            isLoading={isUpdating}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <FolderStepper activeFolder={activeFolder} remainingFolders={remainingFolders} />

        {showEmptyState ? (
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
          <TimelineList
            items={activeArticles}
            isLoading={isUpdating && activeArticles.length === 0}
            emptyMessage={`No unread articles left in ${activeFolder.name}.`}
            onMarkRead={(id) => {
              void markItemRead(id);
            }}
            isUpdating={isUpdating}
            disableActions={!hasUnread}
          />
        )}
      </main>

      <PinnedActionCluster
        onSync={() => {
          markTimelineUpdateStart();
          void refresh()
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

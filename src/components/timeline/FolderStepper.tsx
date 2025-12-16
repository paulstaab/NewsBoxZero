'use client';

import type { FolderQueueEntry } from '@/types';

interface FolderStepperProps {
  activeFolder: FolderQueueEntry | null;
  remainingFolders: number;
  onRefresh: () => void;
  isUpdating: boolean;
}

export function FolderStepper({
  activeFolder,
  remainingFolders,
  onRefresh,
  isUpdating,
}: FolderStepperProps) {
  const unreadCount = activeFolder?.unreadCount ?? 0;
  const lastUpdatedLabel = activeFolder
    ? new Date(activeFolder.lastUpdated).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;
  const remainingLabel =
    remainingFolders === 1
      ? '1 folder queued'
      : `${Number.isFinite(remainingFolders) ? remainingFolders.toLocaleString() : '0'} folders queued`;

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Now reading</p>
          <h2
            className="text-2xl font-semibold text-gray-900 mt-1"
            data-testid="active-folder-name"
          >
            {activeFolder?.name ?? 'All caught up'}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
            <span className="inline-flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
              <span className="text-xs uppercase tracking-wide text-blue-500">Unread</span>
              <span className="text-base" data-testid="active-folder-unread">
                {unreadCount}
              </span>
            </span>
            {remainingFolders > 0 && (
              <span data-testid="remaining-folders-count">{remainingLabel}</span>
            )}
            {lastUpdatedLabel && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 text-sm">Updated {lastUpdatedLabel}</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
          disabled={isUpdating}
        >
          {isUpdating && (
            <span
              className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
          )}
          {isUpdating ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}

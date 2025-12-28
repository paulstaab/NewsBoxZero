'use client';

import { useEffect, useRef } from 'react';
import type { FolderQueueEntry } from '@/types';

interface FolderQueuePillsProps {
  queue: FolderQueueEntry[];
  activeFolderId: number | null;
  onSelect: (folderId: number) => void;
  isLoading?: boolean;
}

export function FolderQueuePills({
  queue,
  activeFolderId,
  onSelect,
  isLoading = false,
}: FolderQueuePillsProps) {
  const pillRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (typeof activeFolderId !== 'number') return;
    const activePill = pillRefs.current[activeFolderId];
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeFolderId, queue.length]);

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Folder queue</p>
        {isLoading && <span className="text-xs text-gray-400">Updating…</span>}
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-2"
        role="tablist"
        aria-label="Unread folder queue"
      >
        {queue.map((entry) => {
          const isActive = entry.id === activeFolderId;
          const label = `${entry.name} (${String(entry.unreadCount)})`;
          const isSkipped = entry.status === 'skipped';

          return (
            <button
              key={entry.id}
              ref={(node) => {
                pillRefs.current[entry.id] = node;
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              onClick={() => {
                onSelect(entry.id);
              }}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              } ${isSkipped ? 'opacity-70' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
              data-testid={`folder-pill-${String(entry.id)}`}
            >
              <span className="truncate max-w-[160px]">{entry.name}</span>
              <span className={isActive ? 'text-blue-100' : 'text-gray-500'}>
                ({entry.unreadCount})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    <div className="folder-pills">
      {isLoading && (
        <div className="folder-pills__status">
          <span className="folder-pills__status-text">Updating…</span>
        </div>
      )}
      <div className="folder-pills__list" role="tablist" aria-label="Unread folder queue">
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
              className={`folder-pill${isActive ? ' folder-pill--active' : ''}${
                isSkipped ? ' folder-pill--skipped' : ''
              }`}
              data-testid={`folder-pill-${String(entry.id)}`}
            >
              <span className="folder-pill__name">{entry.name}</span>
              <span className="folder-pill__count">({entry.unreadCount})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

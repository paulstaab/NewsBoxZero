'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type SubmitEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createFeed, deleteFeed, getFeeds, moveFeed, renameFeed } from '@/lib/api/feeds';
import { createFolder, deleteFolder, getFolders, renameFolder } from '@/lib/api/folders';
import { getItems } from '@/lib/api/items';
import { AuthenticationError } from '@/lib/api/client';
import { formatError } from '@/lib/utils/errorFormatter';
import { ItemFilterType, type Feed, type Folder } from '@/types';
import {
  buildFeedManagementGroups,
  compareLabels,
  formatRelativeDateTime,
  type FeedManagementGroup,
} from '@/lib/feeds/feedManagement';

interface FeedManagementData {
  folders: Folder[];
  feeds: Feed[];
}

/**
 * Removes a feed activity entry without mutating the source record.
 */
function omitLatestArticleDate(
  entries: Record<number, number | null>,
  feedId: number,
): Record<number, number | null> {
  return Object.fromEntries(
    Object.entries(entries).filter(([entryId]) => Number(entryId) !== feedId),
  ) as Record<number, number | null>;
}

interface IconProps {
  className?: string;
}

interface FeedActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'default' | 'accent' | 'danger';
  size?: 'sm' | 'lg';
}

/**
 * Shared icon-only action button used throughout the page.
 */
function FeedActionButton({
  children,
  className = '',
  label,
  size = 'sm',
  variant = 'default',
  ...buttonProps
}: FeedActionButtonProps) {
  const palette =
    variant === 'accent'
      ? 'border-transparent bg-[hsl(var(--color-accent-strong))] text-slate-950 hover:brightness-110 focus:ring-[hsl(var(--color-accent-strong))]'
      : variant === 'danger'
        ? 'border-red-400/30 bg-red-950/20 text-red-200 hover:bg-red-950/35 focus:ring-red-300/60'
        : 'border-white/10 bg-white/6 text-[hsl(var(--color-text))] hover:bg-white/10 focus:ring-[hsl(var(--color-accent-strong))]';
  const sizing = size === 'lg' ? 'h-11 w-11' : 'h-10 w-10';

  return (
    <button
      {...buttonProps}
      aria-label={label}
      title={label}
      className={`inline-flex ${sizing} items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))] disabled:cursor-not-allowed disabled:opacity-60 ${palette} ${className}`.trim()}
      type={buttonProps.type ?? 'button'}
    >
      {children}
    </button>
  );
}

function PlusIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path d="M20 11a8 8 0 0 0-14.9-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13a8 8 0 0 0 14.9 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderPlusIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"
        strokeLinejoin="round"
      />
      <path d="M12 10.5v5" strokeLinecap="round" />
      <path d="M9.5 13h5" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon({ className = 'h-4.5 w-4.5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path d="M4 20l4.5-1 9-9a2.1 2.1 0 1 0-3-3l-9 9z" strokeLinejoin="round" />
      <path d="M13.5 6.5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon({ className = 'h-4.5 w-4.5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5h6v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l1 12h6l1-12" strokeLinejoin="round" />
      <path d="M10 11v5" strokeLinecap="round" />
      <path d="M14 11v5" strokeLinecap="round" />
    </svg>
  );
}

function MoveIcon({ className = 'h-4.5 w-4.5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6H11l2 2h4.5A2.5 2.5 0 0 1 20 10.5V11"
        strokeLinejoin="round"
      />
      <path d="M13 15h7" strokeLinecap="round" />
      <path d="m17 11 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10.5V17a2 2 0 0 0 2 2h7" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
    >
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon({ className = 'h-4.5 w-4.5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3.75c.43 0 .83.23 1.04.61l8 14A1.2 1.2 0 0 1 20 20.25H4a1.2 1.2 0 0 1-1.04-1.89l8-14c.21-.38.61-.61 1.04-.61Zm0 4.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0V9a.75.75 0 0 0-.75-.75Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

/**
 * Returns true when keyboard shortcuts should be ignored because focus is inside an editable field.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  );
}

/**
 * Feed management route for subscriptions and folders.
 */
function FeedManagementContent() {
  const router = useRouter();
  const { isAuthenticated, isInitializing, logout } = useAuth();
  const createFeedDialogRef = useRef<HTMLDialogElement>(null);
  const createFolderDialogRef = useRef<HTMLDialogElement>(null);
  const moveFeedDialogRef = useRef<HTMLDialogElement>(null);

  const [data, setData] = useState<FeedManagementData>({ folders: [], feeds: [] });
  const [latestArticleDates, setLatestArticleDates] = useState<Record<number, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedFolderId, setNewFeedFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingFeedId, setEditingFeedId] = useState<number | null>(null);
  const [editingFeedTitle, setEditingFeedTitle] = useState('');
  const [moveFeedId, setMoveFeedId] = useState<number | null>(null);
  const [moveFeedTitle, setMoveFeedTitle] = useState('');
  const [moveFeedFolderId, setMoveFeedFolderId] = useState('');

  const sortedFolders = useMemo(
    () => [...data.folders].sort((left, right) => compareLabels(left.name, right.name)),
    [data.folders],
  );

  const groups = useMemo<FeedManagementGroup[]>(
    () => buildFeedManagementGroups(data.folders, data.feeds, latestArticleDates),
    [data.feeds, data.folders, latestArticleDates],
  );
  const handleRequestError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      if (error instanceof AuthenticationError) {
        logout();
        router.push('/login');
        return fallbackMessage;
      }

      const formatted = formatError(error);
      return [formatted.message || fallbackMessage, formatted.action].filter(Boolean).join(' ');
    },
    [logout, router],
  );

  const openCreateFeedDialog = useCallback(() => {
    createFeedDialogRef.current?.showModal();
  }, []);

  const closeCreateFeedDialog = useCallback(() => {
    createFeedDialogRef.current?.close();
  }, []);

  const openMoveFeedDialog = useCallback((feed: Feed) => {
    setMoveFeedId(feed.id);
    setMoveFeedTitle(feed.title);
    setMoveFeedFolderId(feed.folderId === null ? '' : String(feed.folderId));
    moveFeedDialogRef.current?.showModal();
  }, []);

  const resetMoveFeedDialog = useCallback(() => {
    setMoveFeedId(null);
    setMoveFeedTitle('');
    setMoveFeedFolderId('');
  }, []);

  /**
   * Refreshes lightweight "latest article date" metadata without blocking the main page render.
   */
  const refreshFeedActivity = useCallback(async (feeds: Feed[]) => {
    if (feeds.length === 0) {
      setLatestArticleDates({});
      return;
    }

    try {
      const results = await Promise.all(
        feeds.map(async (feed) => {
          const items = await getItems({
            type: ItemFilterType.FEED,
            id: feed.id,
            getRead: true,
            batchSize: 1,
          });

          return [feed.id, items[0]?.pubDate ?? null] as const;
        }),
      );

      setLatestArticleDates(Object.fromEntries(results));
    } catch {
      setLatestArticleDates((current) => current);
    }
  }, []);

  /**
   * Loads folder and feed data while preserving the current view on refresh failures.
   */
  const refreshPageData = useCallback(
    async (initialLoad = false) => {
      if (initialLoad) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const [folders, feedsResponse] = await Promise.all([getFolders(), getFeeds()]);
        setData({ folders, feeds: feedsResponse.feeds });
        setPageError(null);
        void refreshFeedActivity(feedsResponse.feeds);
      } catch (error) {
        const message = handleRequestError(error, 'Unable to load feed management data.');
        setPageError(message);
      } finally {
        if (initialLoad) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [handleRequestError, refreshFeedActivity],
  );

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isInitializing && isAuthenticated) {
      void refreshPageData(true);
    }
  }, [isAuthenticated, isInitializing, refreshPageData, router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '+' && event.code !== 'NumpadAdd') {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      openCreateFeedDialog();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openCreateFeedDialog]);

  const runMutation = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusyLabel(label);
      setMutationError(null);
      setStatusMessage(null);

      try {
        await action();
        await refreshPageData(false);
        return true;
      } catch (error) {
        const message = handleRequestError(error, `${label} failed.`);
        setMutationError(message);
        return false;
      } finally {
        setBusyLabel(null);
      }
    },
    [handleRequestError, refreshPageData],
  );

  const handleSubscribe = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUrl = newFeedUrl.trim();
    if (!trimmedUrl) {
      setMutationError('Feed URL is required. Enter a valid RSS or Atom URL and try again.');
      return;
    }

    await runMutation('Subscribe feed', async () => {
      const folderId = newFeedFolderId ? Number(newFeedFolderId) : null;
      const result = await createFeed(trimmedUrl, folderId);

      setData((current) => ({
        ...current,
        feeds: [...current.feeds, result.feed],
      }));
      setLatestArticleDates((current) => ({
        ...current,
        [result.feed.id]: null,
      }));
      setNewFeedUrl('');
      setNewFeedFolderId('');
      closeCreateFeedDialog();
      setStatusMessage(`Subscribed to ${result.feed.title}.`);
    });
  };

  const handleCreateFolder = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newFolderName.trim();
    if (!trimmedName) {
      setMutationError('Folder name is required.');
      return;
    }

    await runMutation('Create folder', async () => {
      const createdFolder = await createFolder(trimmedName);
      setData((current) => ({
        ...current,
        folders: [...current.folders, createdFolder],
      }));
      setNewFolderName('');
      createFolderDialogRef.current?.close();
      setStatusMessage(`Created folder ${createdFolder.name}.`);
    });
  };

  const handleRenameFolder = async (folderId: number) => {
    const trimmedName = editingFolderName.trim();
    if (!trimmedName) {
      setMutationError('Folder name is required.');
      return;
    }

    await runMutation('Rename folder', async () => {
      await renameFolder(folderId, trimmedName);
      setData((current) => ({
        ...current,
        folders: current.folders.map((folder) =>
          folder.id === folderId ? { ...folder, name: trimmedName } : folder,
        ),
      }));
      setEditingFolderId(null);
      setEditingFolderName('');
      setStatusMessage(`Renamed folder to ${trimmedName}.`);
    });
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const assignedFeeds = data.feeds.filter((feed) => feed.folderId === folder.id);
    const assignedFeedCount = assignedFeeds.length;
    const confirmed = window.confirm(
      `Delete "${folder.name}"? This will unsubscribe ${String(assignedFeedCount)} feed${
        assignedFeedCount === 1 ? '' : 's'
      } currently assigned to the folder.`,
    );

    if (!confirmed) {
      return;
    }

    await runMutation('Delete folder', async () => {
      await Promise.all(assignedFeeds.map((feed) => deleteFeed(feed.id)));
      await deleteFolder(folder.id);
      setData((current) => ({
        folders: current.folders.filter((entry) => entry.id !== folder.id),
        feeds: current.feeds.filter((feed) => feed.folderId !== folder.id),
      }));
      setLatestArticleDates((current) =>
        assignedFeeds.reduce(
          (nextEntries, feed) => omitLatestArticleDate(nextEntries, feed.id),
          current,
        ),
      );
      setStatusMessage(`Deleted folder ${folder.name}.`);
    });
  };

  const handleRenameFeed = async (feedId: number) => {
    const trimmedTitle = editingFeedTitle.trim();
    if (!trimmedTitle) {
      setMutationError('Feed name is required.');
      return;
    }

    await runMutation('Rename feed', async () => {
      await renameFeed(feedId, trimmedTitle);
      setData((current) => ({
        ...current,
        feeds: current.feeds.map((feed) =>
          feed.id === feedId ? { ...feed, title: trimmedTitle } : feed,
        ),
      }));
      setEditingFeedId(null);
      setEditingFeedTitle('');
      setStatusMessage(`Renamed feed to ${trimmedTitle}.`);
    });
  };

  const handleMoveFeed = async (feedId: number, folderIdValue: string) => {
    const folderId = folderIdValue ? Number(folderIdValue) : null;

    return runMutation('Move feed', async () => {
      await moveFeed(feedId, folderId);
      setData((current) => ({
        ...current,
        feeds: current.feeds.map((feed) => (feed.id === feedId ? { ...feed, folderId } : feed)),
      }));
      setStatusMessage('Moved feed successfully.');
    });
  };

  const handleMoveFeedSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (moveFeedId === null) {
      return;
    }

    const moved = await handleMoveFeed(moveFeedId, moveFeedFolderId);
    if (moved) {
      moveFeedDialogRef.current?.close();
      resetMoveFeedDialog();
    }
  };

  const handleDeleteFeed = async (feed: Feed) => {
    const confirmed = window.confirm(`Unsubscribe "${feed.title}"?`);
    if (!confirmed) {
      return;
    }

    await runMutation('Delete feed', async () => {
      await deleteFeed(feed.id);
      setData((current) => ({
        ...current,
        feeds: current.feeds.filter((entry) => entry.id !== feed.id),
      }));
      setLatestArticleDates((current) => omitLatestArticleDate(current, feed.id));
      setStatusMessage(`Unsubscribed from ${feed.title}.`);
    });
  };

  if (isInitializing || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--color-surface))]">
        <div className="inline-flex items-center gap-3 text-[hsl(var(--color-text-secondary))]">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[hsl(var(--color-primary))]" />
          <span>Loading feed management...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--color-accent)_/_0.18),_transparent_26%),linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_18%,hsl(var(--color-surface))_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_100%)] p-6 shadow-[0_18px_40px_rgba(5,10,25,0.2)] sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--color-text-muted))]">
                Feed Management
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--color-text))] sm:text-4xl">
                Manage subscriptions and folders
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--color-text-muted))] sm:text-base">
                Review each subscription at a glance, then rename, move, or remove it from a compact
                control surface.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <FeedActionButton
                label="New folder"
                onClick={() => {
                  createFolderDialogRef.current?.showModal();
                }}
                variant="accent"
                size="lg"
              >
                <FolderPlusIcon />
              </FeedActionButton>
              <FeedActionButton
                disabled={isRefreshing || busyLabel !== null}
                label={isRefreshing ? 'Refreshing feeds' : 'Refresh feeds'}
                onClick={() => {
                  void refreshPageData(false);
                }}
                size="lg"
              >
                <RefreshIcon />
              </FeedActionButton>
              <Link
                href="/timeline"
                aria-label="Back to timeline"
                title="Back to timeline"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-[hsl(var(--color-text))] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))]"
              >
                <BackIcon />
              </Link>
            </div>
          </div>
        </header>

        {pageError ? (
          <section className="rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100 shadow-sm">
            <p>{pageError}</p>
          </section>
        ) : null}

        {mutationError ? (
          <section className="rounded-2xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100 shadow-sm">
            <p>{mutationError}</p>
          </section>
        ) : null}

        {statusMessage ? (
          <section className="rounded-2xl border border-emerald-400/30 bg-emerald-950/30 p-4 text-sm text-emerald-100 shadow-sm">
            <p>{statusMessage}</p>
          </section>
        ) : null}

        {groups.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface-muted))]/75 p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-[hsl(var(--color-text))]">No feeds yet</h2>
            <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">
              Add your first feed above to start building your reading queue.
            </p>
          </section>
        ) : (
          <div className="grid gap-6">
            {groups.map((group) => {
              const isEditingFolder = editingFolderId === group.id && group.id !== null;

              return (
                <section
                  key={group.isUncategorized ? 'uncategorized' : String(group.id)}
                  className="overflow-hidden rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_100%)] shadow-[0_14px_32px_rgba(7,10,24,0.16)]"
                >
                  <div className="flex flex-col gap-4 border-b border-white/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      {isEditingFolder ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (group.id !== null) {
                              void handleRenameFolder(group.id);
                            }
                          }}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(event) => {
                              setEditingFolderName(event.target.value);
                            }}
                            className="min-w-[240px] rounded-2xl border border-white/10 bg-black/10 px-4 py-2 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                            aria-label="Folder name"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-[hsl(var(--color-accent-strong))] px-4 py-2 text-sm font-semibold text-slate-950"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[hsl(var(--color-text))]"
                            onClick={() => {
                              setEditingFolderId(null);
                              setEditingFolderName('');
                            }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-semibold text-[hsl(var(--color-text))] sm:text-2xl">
                              {group.name}
                            </h2>
                            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--color-text-muted))]">
                              {group.feeds.length} subscription
                              {group.feeds.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {group.id !== null ? (
                      <div className="flex flex-wrap gap-2">
                        <FeedActionButton
                          label={`Rename folder ${group.name}`}
                          onClick={() => {
                            setEditingFolderId(group.id);
                            setEditingFolderName(group.name);
                          }}
                        >
                          <PencilIcon />
                        </FeedActionButton>
                        <FeedActionButton
                          label={`Delete folder ${group.name}`}
                          onClick={() => {
                            const folder = data.folders.find((entry) => entry.id === group.id);
                            if (folder) {
                              void handleDeleteFolder(folder);
                            }
                          }}
                          variant="danger"
                        >
                          <TrashIcon />
                        </FeedActionButton>
                      </div>
                    ) : null}
                  </div>

                  <div className="divide-y divide-white/8">
                    {group.feeds.map(({ feed, lastArticleDate }) => {
                      const isEditingFeed = editingFeedId === feed.id;

                      return (
                        <article
                          key={feed.id}
                          className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                        >
                          <div className="min-w-0 space-y-3">
                            <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))] w-fit">
                              Feed #{feed.id}
                            </div>

                            {isEditingFeed ? (
                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void handleRenameFeed(feed.id);
                                }}
                                className="flex flex-wrap items-center gap-3"
                              >
                                <input
                                  type="text"
                                  value={editingFeedTitle}
                                  onChange={(event) => {
                                    setEditingFeedTitle(event.target.value);
                                  }}
                                  className="min-w-[240px] rounded-2xl border border-white/10 bg-black/10 px-4 py-2 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                                  aria-label={`Feed name for ${feed.title}`}
                                />
                                <button
                                  type="submit"
                                  className="rounded-full bg-[hsl(var(--color-accent-strong))] px-4 py-2 text-sm font-semibold text-slate-950"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[hsl(var(--color-text))]"
                                  onClick={() => {
                                    setEditingFeedId(null);
                                    setEditingFeedTitle('');
                                  }}
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <div className="flex items-start gap-2">
                                <h3
                                  className="truncate text-lg font-semibold leading-tight text-[hsl(var(--color-text))] sm:text-xl"
                                  title={feed.url}
                                >
                                  {feed.title}
                                </h3>
                                {feed.lastUpdateError ? (
                                  <span
                                    aria-label={`Update error: ${feed.lastUpdateError}`}
                                    className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center text-amber-400"
                                    title={feed.lastUpdateError}
                                  >
                                    <WarningIcon className="h-4.5 w-4.5" />
                                  </span>
                                ) : null}
                              </div>
                            )}

                            <dl className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                                  Last article
                                </dt>
                                <dd className="mt-1 text-sm font-medium text-[hsl(var(--color-text))]">
                                  {formatRelativeDateTime(lastArticleDate)}
                                </dd>
                              </div>
                              <div className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                                <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                                  Next update
                                </dt>
                                <dd className="mt-1 text-sm font-medium text-[hsl(var(--color-text))]">
                                  {formatRelativeDateTime(feed.nextUpdateTime)}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {isEditingFeed ? null : (
                            <div className="flex items-center gap-2 md:justify-self-end">
                              <FeedActionButton
                                label={`Rename feed ${feed.title}`}
                                onClick={() => {
                                  setEditingFeedId(feed.id);
                                  setEditingFeedTitle(feed.title);
                                }}
                              >
                                <PencilIcon />
                              </FeedActionButton>
                              <FeedActionButton
                                label={`Move ${feed.title} to another folder`}
                                onClick={() => {
                                  openMoveFeedDialog(feed);
                                }}
                              >
                                <MoveIcon />
                              </FeedActionButton>
                              <FeedActionButton
                                label={`Delete feed ${feed.title}`}
                                onClick={() => {
                                  void handleDeleteFeed(feed);
                                }}
                                variant="danger"
                              >
                                <TrashIcon />
                              </FeedActionButton>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-label="Add feed"
          title="Add feed (+)"
          onClick={openCreateFeedDialog}
          className="fixed bottom-6 right-6 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(180deg,hsl(var(--color-accent-strong))_0%,hsl(var(--color-accent))_100%)] text-slate-950 shadow-[0_20px_45px_rgba(4,10,24,0.45)] transition hover:scale-[1.04] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface))]"
          style={{
            position: 'fixed',
            right: '1.75rem',
            bottom: '1.75rem',
            width: '4.5rem',
            height: '4.5rem',
          }}
        >
          <PlusIcon className="h-7 w-7" />
        </button>

        <dialog
          ref={createFeedDialogRef}
          className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_100%)] p-0 text-[hsl(var(--color-text))] shadow-2xl backdrop:bg-black/60"
        >
          <form
            method="dialog"
            onSubmit={(event) => {
              void handleSubscribe(event);
            }}
            className="space-y-6 p-6 sm:p-7"
          >
            <div className="space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--color-text-muted))]">
                New Subscription
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Add a feed to your reading queue
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[hsl(var(--color-text-muted))]">
                Paste an RSS or Atom URL, then choose whether it should land in a folder or stay
                uncategorized.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1.7fr)_minmax(220px,1fr)]">
              <label className="flex flex-col gap-2 text-sm font-medium text-[hsl(var(--color-text))]">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                  Feed URL
                </span>
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(event) => {
                    setNewFeedUrl(event.target.value);
                  }}
                  placeholder="https://example.com/feed.xml"
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm outline-none transition placeholder:text-[hsl(var(--color-text-muted))] focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                  aria-label="Feed URL"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[hsl(var(--color-text))]">
                <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                  Destination folder
                </span>
                <select
                  value={newFeedFolderId}
                  onChange={(event) => {
                    setNewFeedFolderId(event.target.value);
                  }}
                  className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                  aria-label="Destination folder"
                >
                  <option value="">Uncategorized</option>
                  {sortedFolders.map((folder) => (
                    <option key={folder.id} value={String(folder.id)}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-[hsl(var(--color-text))]"
                onClick={closeCreateFeedDialog}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyLabel !== null}
                className="rounded-full bg-[hsl(var(--color-accent-strong))] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyLabel === 'Subscribe feed' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
          </form>
        </dialog>

        <dialog
          ref={moveFeedDialogRef}
          className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_100%)] p-0 text-[hsl(var(--color-text))] shadow-2xl backdrop:bg-black/55"
          onClose={resetMoveFeedDialog}
        >
          <form
            onSubmit={(event) => {
              void handleMoveFeedSubmit(event);
            }}
            className="space-y-5 p-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Move Feed</h2>
              <p className="text-sm text-[hsl(var(--color-text-secondary))]">
                Choose a new folder for {moveFeedTitle || 'this feed'}.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-[hsl(var(--color-text))]">
              <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                Destination folder
              </span>
              <select
                value={moveFeedFolderId}
                onChange={(event) => {
                  setMoveFeedFolderId(event.target.value);
                }}
                className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                aria-label="Target folder"
              >
                <option value="">Uncategorized</option>
                {sortedFolders.map((folder) => (
                  <option key={folder.id} value={String(folder.id)}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-[hsl(var(--color-text))]"
                onClick={() => {
                  moveFeedDialogRef.current?.close();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyLabel !== null}
                className="rounded-full bg-[hsl(var(--color-accent-strong))] px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Move Feed
              </button>
            </div>
          </form>
        </dialog>

        <dialog
          ref={createFolderDialogRef}
          className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_100%)] p-0 text-[hsl(var(--color-text))] shadow-2xl backdrop:bg-black/55"
        >
          <form
            method="dialog"
            onSubmit={(event) => {
              void handleCreateFolder(event);
            }}
            className="space-y-5 p-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Create Folder</h2>
              <p className="text-sm text-[hsl(var(--color-text-secondary))]">
                Add a folder to organize related feeds together.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium">
              Folder name
              <input
                type="text"
                value={newFolderName}
                onChange={(event) => {
                  setNewFolderName(event.target.value);
                }}
                className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                aria-label="New folder name"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-[hsl(var(--color-text))]"
                onClick={() => {
                  createFolderDialogRef.current?.close();
                  setNewFolderName('');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-[hsl(var(--color-accent-strong))] px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Create Folder
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </div>
  );
}

export default function FeedManagementPage() {
  return (
    <Suspense fallback={null}>
      <FeedManagementContent />
    </Suspense>
  );
}

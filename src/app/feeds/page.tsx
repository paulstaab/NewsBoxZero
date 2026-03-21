'use client';

import {
  faArrowLeft,
  faCircleCheck,
  faCircleExclamation,
  faFolderOpen,
  faFolderPlus,
  faPen,
  faPlus,
  faRotate,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Fragment,
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
  formatExactLocalDateTime,
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
  const sizing = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

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
   * Fetches a single batch of recent items across all feeds and derives the latest date per feed
   * client-side to avoid an N+1 network pattern.
   */
  const refreshFeedActivity = useCallback(async (feeds: Feed[]) => {
    if (feeds.length === 0) {
      setLatestArticleDates({});
      return;
    }

    try {
      const items = await getItems({
        type: ItemFilterType.ALL,
        getRead: true,
        batchSize: 200,
      });

      const datesByFeed: Record<number, number | null> = {};
      for (const feed of feeds) {
        datesByFeed[feed.id] = null;
      }
      for (const item of items) {
        if (!(item.feedId in datesByFeed)) continue;
        const current = datesByFeed[item.feedId];
        if (current === null || item.pubDate > current) {
          datesByFeed[item.feedId] = item.pubDate;
        }
      }

      setLatestArticleDates(datesByFeed);
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
      if (assignedFeeds.length > 0) {
        const results = await Promise.allSettled(assignedFeeds.map((feed) => deleteFeed(feed.id)));

        const deletedFeedIds = assignedFeeds
          .filter((_, index) => results[index].status === 'fulfilled')
          .map((feed) => feed.id);
        const failedCount = results.filter((result) => result.status === 'rejected').length;

        if (failedCount > 0) {
          setData((current) => ({
            ...current,
            feeds: current.feeds.filter((feed) => !deletedFeedIds.includes(feed.id)),
          }));
          setLatestArticleDates((current) =>
            deletedFeedIds.reduce(
              (nextEntries, feedId) => omitLatestArticleDate(nextEntries, feedId),
              current,
            ),
          );
          throw new Error(
            `Unable to unsubscribe ${String(failedCount)} feed${failedCount === 1 ? '' : 's'} from "${folder.name}". The folder was not deleted.`,
          );
        }
      }

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
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--color-surface))_0%,hsl(var(--color-surface-muted))_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[1.5rem] bg-[hsl(var(--color-surface))]/92 p-6 shadow-[0_20px_48px_rgba(5,10,25,0.18)] backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--color-text-muted))]">
                Feed Management
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--color-text))] sm:text-4xl">
                Manage subscriptions and folders
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <FeedActionButton
                label="New folder"
                onClick={() => {
                  createFolderDialogRef.current?.showModal();
                }}
                variant="accent"
                size="lg"
              >
                <FontAwesomeIcon icon={faFolderPlus} className="h-5 w-5" aria-hidden="true" />
              </FeedActionButton>
              <FeedActionButton
                disabled={isRefreshing || busyLabel !== null}
                label={isRefreshing ? 'Refreshing feeds' : 'Refresh feeds'}
                onClick={() => {
                  void refreshPageData(false);
                }}
                size="lg"
              >
                <FontAwesomeIcon icon={faRotate} className="h-5 w-5" aria-hidden="true" />
              </FeedActionButton>
              <Link
                href="/timeline"
                aria-label="Back to timeline"
                title="Back to timeline"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-[hsl(var(--color-text))] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))]"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" aria-hidden="true" />
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
          <section className="overflow-hidden bg-[hsl(var(--color-surface))]/94 shadow-[0_20px_48px_rgba(7,10,24,0.16)] backdrop-blur">
            <div className="overflow-x-auto">
              <table
                aria-label="Feed management table"
                className="w-full table-fixed border-collapse"
              >
                <colgroup>
                  <col className="w-[42%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-left">
                    <th className="px-5 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--color-text-muted))]">
                      Feed Name
                    </th>
                    <th className="px-4 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--color-text-muted))]">
                      Last Article
                    </th>
                    <th className="px-4 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--color-text-muted))]">
                      Next Update
                    </th>
                    <th className="px-4 py-4 text-center text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--color-text-muted))]">
                      Status
                    </th>
                    <th className="px-5 py-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--color-text-muted))]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const isEditingFolder = editingFolderId === group.id && group.id !== null;

                    return (
                      <Fragment key={group.isUncategorized ? 'uncategorized' : String(group.id)}>
                        <tr className="border-b border-white/10 bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]">
                          {isEditingFolder ? (
                            <td colSpan={5} className="px-5 py-4">
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
                                  className="min-w-[240px] rounded-xl border border-white/10 bg-black/10 px-4 py-2 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
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
                            </td>
                          ) : (
                            <>
                              <td colSpan={4} className="px-5 py-4 align-middle">
                                <h2 className="text-lg font-semibold tracking-tight text-[hsl(var(--color-text))] sm:text-xl">
                                  {group.name}
                                </h2>
                              </td>
                              <td className="px-5 py-4 align-middle">
                                {group.id !== null ? (
                                  <div className="flex items-center gap-3">
                                    <FeedActionButton
                                      label={`Rename folder ${group.name}`}
                                      onClick={() => {
                                        setEditingFolderId(group.id);
                                        setEditingFolderName(group.name);
                                      }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faPen}
                                        className="h-4.5 w-4.5"
                                        aria-hidden="true"
                                      />
                                    </FeedActionButton>
                                    <FeedActionButton
                                      label={`Delete folder ${group.name}`}
                                      onClick={() => {
                                        const folder = data.folders.find(
                                          (entry) => entry.id === group.id,
                                        );
                                        if (folder) {
                                          void handleDeleteFolder(folder);
                                        }
                                      }}
                                      variant="danger"
                                    >
                                      <FontAwesomeIcon
                                        icon={faTrash}
                                        className="h-4.5 w-4.5"
                                        aria-hidden="true"
                                      />
                                    </FeedActionButton>
                                  </div>
                                ) : null}
                              </td>
                            </>
                          )}
                        </tr>

                        {group.feeds.map(({ feed, lastArticleDate }) => {
                          const isEditingFeed = editingFeedId === feed.id;

                          return (
                            <tr
                              key={feed.id}
                              className="border-b border-white/8 align-middle transition last:border-b-0 hover:bg-white/[0.025]"
                            >
                              <td className="px-5 py-4">
                                <div className="flex min-h-20 flex-col justify-center gap-2">
                                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[hsl(var(--color-text-muted))]">
                                    Feed #{feed.id}
                                  </p>

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
                                        className="min-w-[260px] rounded-xl border border-white/10 bg-black/10 px-4 py-2 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
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
                                    <div className="grid gap-1">
                                      <h3
                                        className="truncate text-base font-semibold leading-[1.25] text-[hsl(var(--color-text))] sm:text-lg"
                                        title={feed.url}
                                      >
                                        {feed.title}
                                      </h3>
                                      <p
                                        className="truncate text-sm text-[hsl(var(--color-text-muted))]"
                                        title={feed.url}
                                      >
                                        {feed.url}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <p
                                  className="text-sm font-medium text-[hsl(var(--color-text))]"
                                  title={formatExactLocalDateTime(lastArticleDate)}
                                >
                                  {formatRelativeDateTime(lastArticleDate)}
                                </p>
                              </td>
                              <td className="px-4 py-4 align-middle">
                                <p
                                  className="text-sm font-medium text-[hsl(var(--color-text))]"
                                  title={formatExactLocalDateTime(feed.nextUpdateTime)}
                                >
                                  {formatRelativeDateTime(feed.nextUpdateTime)}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-center align-middle">
                                <div className="flex items-center justify-center">
                                  {feed.lastUpdateError ? (
                                    <span
                                      aria-label={`Update error: ${feed.lastUpdateError}`}
                                      className="inline-flex h-9 w-9 items-center justify-center text-amber-300"
                                      title={feed.lastUpdateError}
                                    >
                                      <FontAwesomeIcon
                                        icon={faCircleExclamation}
                                        className="h-9 w-9"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : (
                                    <span
                                      aria-label="Feed healthy"
                                      className="inline-flex h-9 w-9 items-center justify-center text-emerald-300"
                                    >
                                      <FontAwesomeIcon
                                        icon={faCircleCheck}
                                        className="h-9 w-9"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 align-middle">
                                <div className="flex items-center">
                                  {isEditingFeed ? null : (
                                    <div className="flex flex-wrap items-center gap-3">
                                      <FeedActionButton
                                        label={`Rename feed ${feed.title}`}
                                        onClick={() => {
                                          setEditingFeedId(feed.id);
                                          setEditingFeedTitle(feed.title);
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faPen}
                                          className="h-4.5 w-4.5"
                                          aria-hidden="true"
                                        />
                                      </FeedActionButton>
                                      <FeedActionButton
                                        label={`Delete feed ${feed.title}`}
                                        variant="danger"
                                        onClick={() => {
                                          void handleDeleteFeed(feed);
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faTrash}
                                          className="h-4.5 w-4.5"
                                          aria-hidden="true"
                                        />
                                      </FeedActionButton>
                                      <FeedActionButton
                                        label={`Move ${feed.title} to another folder`}
                                        onClick={() => {
                                          openMoveFeedDialog(feed);
                                        }}
                                      >
                                        <FontAwesomeIcon
                                          icon={faFolderOpen}
                                          className="h-4.5 w-4.5"
                                          aria-hidden="true"
                                        />
                                      </FeedActionButton>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
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
          <FontAwesomeIcon icon={faPlus} className="h-7 w-7" aria-hidden="true" />
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

'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  formatLocalDateTime,
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

/**
 * Compact metric card used in the page header.
 */
function FeedMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/60">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

/**
 * Reusable metadata tile for feed rows.
 */
function FeedDetailTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === 'warning'
          ? 'border-amber-300/35 bg-amber-100/80 text-amber-950'
          : 'border-[hsl(var(--color-border))] bg-[hsl(var(--color-surface))]/80 text-[hsl(var(--color-text))]'
      }`}
    >
      <dt
        className={`text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${
          tone === 'warning' ? 'text-amber-900/70' : 'text-[hsl(var(--color-text-muted))]'
        }`}
      >
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium leading-6">{value}</dd>
    </div>
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

  const sortedFolders = useMemo(
    () => [...data.folders].sort((left, right) => compareLabels(left.name, right.name)),
    [data.folders],
  );

  const groups = useMemo<FeedManagementGroup[]>(
    () => buildFeedManagementGroups(data.folders, data.feeds, latestArticleDates),
    [data.feeds, data.folders, latestArticleDates],
  );
  const totalFeeds = data.feeds.length;
  const foldersWithFeeds = groups.filter((group) => !group.isUncategorized).length;
  const feedsWithErrors = data.feeds.filter((feed) => feed.lastUpdateError).length;

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
      } catch (error) {
        const message = handleRequestError(error, `${label} failed.`);
        setMutationError(message);
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

    await runMutation('Move feed', async () => {
      await moveFeed(feedId, folderId);
      setData((current) => ({
        ...current,
        feeds: current.feeds.map((feed) => (feed.id === feedId ? { ...feed, folderId } : feed)),
      }));
      setStatusMessage('Moved feed successfully.');
    });
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--color-accent)_/_0.24),_transparent_28%),linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_18%,hsl(var(--color-surface))_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_60%,hsl(var(--color-surface))_100%)] p-6 shadow-[0_22px_50px_rgba(5,10,25,0.28)] sm:p-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top,_hsl(var(--color-accent-strong)_/_0.28),_transparent_58%)] lg:block" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-[hsl(var(--color-text-muted))]">
                  Feed Management
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--color-text))] sm:text-4xl">
                  Manage subscriptions and folders
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-[hsl(var(--color-text-muted))] sm:text-base">
                  Add feeds, route them into folders, and clean up stale subscriptions from one
                  focused control surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 xl:max-w-sm xl:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    createFolderDialogRef.current?.showModal();
                  }}
                  className="rounded-full bg-[hsl(var(--color-accent-strong))] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))]"
                >
                  New Folder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void refreshPageData(false);
                  }}
                  disabled={isRefreshing || busyLabel !== null}
                  className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-medium text-[hsl(var(--color-text))] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <Link
                  href="/timeline"
                  className="rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-[hsl(var(--color-text))] transition hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface-muted))]"
                >
                  Back To Timeline
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FeedMetricCard label="Total feeds" value={String(totalFeeds)} />
              <FeedMetricCard label="Active folders" value={String(foldersWithFeeds)} />
              <FeedMetricCard label="Feeds with errors" value={String(feedsWithErrors)} />
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
                  className="overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,hsl(var(--color-surface-muted))_0%,hsl(var(--color-surface))_100%)] shadow-[0_16px_40px_rgba(7,10,24,0.18)]"
                >
                  <div className="flex flex-col gap-5 border-b border-white/8 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
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
                            <h2 className="text-2xl font-semibold text-[hsl(var(--color-text))]">
                              {group.name}
                            </h2>
                            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--color-text-muted))]">
                              {group.feeds.length} subscription
                              {group.feeds.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="max-w-2xl text-sm leading-6 text-[hsl(var(--color-text-muted))]">
                            {group.isUncategorized
                              ? 'Feeds without a folder assignment live here until you move them.'
                              : 'Curate this folder by renaming it, moving feeds, or removing stale subscriptions.'}
                          </p>
                        </>
                      )}
                    </div>

                    {group.id !== null ? (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-[hsl(var(--color-text))] transition hover:bg-white/10"
                          onClick={() => {
                            setEditingFolderId(group.id);
                            setEditingFolderName(group.name);
                          }}
                        >
                          Rename Folder
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-400/30 bg-red-950/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/35"
                          onClick={() => {
                            const folder = data.folders.find((entry) => entry.id === group.id);
                            if (folder) {
                              void handleDeleteFolder(folder);
                            }
                          }}
                        >
                          Delete Folder
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="divide-y divide-white/8">
                    {group.feeds.map(({ feed, lastArticleDate }) => {
                      const isEditingFeed = editingFeedId === feed.id;

                      return (
                        <article
                          key={feed.id}
                          className="grid gap-5 px-6 py-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)_280px]"
                        >
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-start gap-3">
                              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                                Feed #{feed.id}
                              </div>
                              {feed.lastUpdateError ? (
                                <div className="rounded-full border border-amber-300/35 bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-900">
                                  Update error present
                                </div>
                              ) : null}
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
                              <>
                                <h3 className="text-xl font-semibold leading-tight text-[hsl(var(--color-text))] sm:text-2xl">
                                  {feed.title}
                                </h3>
                                <p className="break-all text-sm leading-6 text-[hsl(var(--color-text-muted))]">
                                  {feed.url}
                                </p>
                              </>
                            )}
                          </div>

                          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <FeedDetailTile
                              label="Last Article Date"
                              value={formatLocalDateTime(lastArticleDate)}
                            />
                            <FeedDetailTile
                              label="Next Scheduled Update"
                              value={formatLocalDateTime(feed.nextUpdateTime)}
                            />
                            <FeedDetailTile
                              label="Latest Update Error"
                              value={feed.lastUpdateError ?? 'None'}
                              tone={feed.lastUpdateError ? 'warning' : 'default'}
                            />
                          </dl>

                          <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-black/10 p-4">
                            <label className="flex flex-col gap-2 text-sm font-medium text-[hsl(var(--color-text))]">
                              <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[hsl(var(--color-text-muted))]">
                                Move to folder
                              </span>
                              <select
                                value={feed.folderId === null ? '' : String(feed.folderId)}
                                onChange={(event) => {
                                  void handleMoveFeed(feed.id, event.target.value);
                                }}
                                className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm outline-none transition focus:border-[hsl(var(--color-accent-strong))] focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))]"
                                aria-label={`Move ${feed.title} to folder`}
                              >
                                <option value="">Uncategorized</option>
                                {sortedFolders.map((folder) => (
                                  <option key={folder.id} value={String(folder.id)}>
                                    {folder.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-[hsl(var(--color-text))] transition hover:bg-white/10"
                                onClick={() => {
                                  setEditingFeedId(feed.id);
                                  setEditingFeedTitle(feed.title);
                                }}
                              >
                                Rename Feed
                              </button>
                              <button
                                type="button"
                                className="rounded-full border border-red-400/30 bg-red-950/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-950/35"
                                onClick={() => {
                                  void handleDeleteFeed(feed);
                                }}
                              >
                                Delete Feed
                              </button>
                            </div>
                          </div>
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
          className="fixed bottom-6 right-6 z-50 inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(180deg,hsl(var(--color-accent-strong))_0%,hsl(var(--color-accent))_100%)] text-4xl font-light leading-none text-slate-950 shadow-[0_20px_45px_rgba(4,10,24,0.45)] transition hover:scale-[1.04] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-accent-strong))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--color-surface))]"
          style={{
            position: 'fixed',
            right: '1.75rem',
            bottom: '1.75rem',
            width: '4.5rem',
            height: '4.5rem',
          }}
        >
          <span aria-hidden="true">+</span>
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

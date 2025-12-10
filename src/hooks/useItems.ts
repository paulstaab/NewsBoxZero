'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { useAuth } from './useAuth';
import { getItems } from '@/lib/api/items';
import type { Article } from '@/types';
import { useState, useEffect, useCallback } from 'react';

interface ItemsParams {
  type?: number;
  id?: number;
  getRead?: boolean;
  oldestFirst?: boolean;
  batchSize?: number;
  offset?: number;
}

interface UseItemsOptions extends ItemsParams {
  /** Enable infinite scroll behavior */
  infiniteScroll?: boolean;
  /** Prefetch next batch when this percentage of current batch is visible */
  prefetchThreshold?: number;
}

interface UseItemsResult {
  items: Article[];
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
  mutate: (
    data?: Article[] | Promise<Article[]>,
    shouldRevalidate?: boolean,
  ) => Promise<Article[] | undefined>;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_PREFETCH_THRESHOLD = 0.75;

/**
 * Hook for fetching and managing timeline items with pagination
 *
 * Features:
 * - Batch fetching with configurable size
 * - Infinite scroll support with automatic prefetch
 * - Offline short-circuiting via SWR
 * - Client-side caching and deduplication
 */
export function useItems(options: UseItemsOptions = {}): UseItemsResult {
  const { session, isAuthenticated } = useAuth();
  const {
    type = 3, // All items by default
    id = 0,
    getRead = false, // Unread only by default
    oldestFirst = false,
    batchSize = DEFAULT_BATCH_SIZE,
  } = options;

  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<Article[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Build SWR key
  const key =
    isAuthenticated && session
      ? ['items', session.baseUrl, type, id, getRead, oldestFirst, offset, batchSize]
      : null;

  // Fetcher function
  const fetcher = useCallback(async () => {
    if (!session) throw new Error('Not authenticated');

    const items = await getItems({
      type,
      id,
      getRead,
      oldestFirst,
      batchSize,
      offset,
    });

    return items;
  }, [session, type, id, getRead, oldestFirst, batchSize, offset]);

  // SWR configuration with offline support
  const swrConfig: SWRConfiguration = {
    revalidateOnFocus: false, // Don't auto-revalidate on focus for timeline
    dedupingInterval: 5000, // Dedupe requests within 5s
    errorRetryCount: 3, // Retry 3 times on error
    errorRetryInterval: 1000, // Start with 1s retry interval
    onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
      setTimeout(() => {
        void revalidate({ retryCount });
      }, delay);
    },
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR<Article[], Error>(
    key,
    fetcher,
    swrConfig,
  );

  // Accumulate items for infinite scroll
  useEffect(() => {
    if (data) {
      if (offset === 0) {
        // First page - replace all items
        setAllItems(data);
      } else {
        // Subsequent pages - append items
        setAllItems((prev) => [...prev, ...data]);
      }

      // Check if there are more items to load
      setHasMore(data.length === batchSize);
    }
  }, [data, offset, batchSize]);

  // Reset when filter parameters change
  useEffect(() => {
    setOffset(0);
    setAllItems([]);
    setHasMore(true);
  }, [type, id, getRead, oldestFirst]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isValidating && hasMore) {
      setOffset((prev) => prev + batchSize);
    }
  }, [isLoading, isValidating, hasMore, batchSize]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setAllItems([]);
    setHasMore(true);
    await mutate();
  }, [mutate]);

  return {
    items: allItems,
    isLoading,
    isValidating,
    error: error ?? null,
    hasMore,
    loadMore,
    refresh,
    mutate: mutate as (
      data?: Article[] | Promise<Article[]>,
      shouldRevalidate?: boolean,
    ) => Promise<Article[] | undefined>,
  };
}

/**
 * Hook for detecting when to trigger prefetch based on scroll position
 *
 * Triggers loadMore when user scrolls past the prefetch threshold
 */
export function useInfiniteScrollTrigger(
  hasMore: boolean,
  loadMore: () => void,
  threshold = DEFAULT_PREFETCH_THRESHOLD,
) {
  useEffect(() => {
    if (!hasMore) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Trigger prefetch when scrolled past threshold (default 75%)
      if (scrollPercentage >= threshold) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadMore, threshold]);
}

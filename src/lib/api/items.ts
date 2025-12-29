/**
 * Typed domain wrapper for the Items API.
 * Aligned with contracts/items.md
 */

import { apiGet, apiPost, type ApiRequestOptions } from './client';
import {
  type Article,
  type ItemsResponse,
  type ItemsQueryParams,
  ItemFilterType,
  normalizeArticle,
} from '@/types';
import { CONFIG } from '@/lib/config/env';

/**
 * Builds query string from ItemsQueryParams.
 */
function buildItemsQuery(params: ItemsQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.batchSize !== undefined) {
    searchParams.set('batchSize', String(params.batchSize));
  }
  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }
  if (params.type !== undefined) {
    searchParams.set('type', String(params.type));
  }
  if (params.id !== undefined) {
    searchParams.set('id', String(params.id));
  }
  if (params.getRead !== undefined) {
    searchParams.set('getRead', String(params.getRead));
  }
  if (params.oldestFirst !== undefined) {
    searchParams.set('oldestFirst', String(params.oldestFirst));
  }
  if (params.lastModified !== undefined) {
    searchParams.set('lastModified', String(params.lastModified));
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetches items with optional filtering and pagination.
 */
export async function getItems(
  params: ItemsQueryParams = {},
  options?: ApiRequestOptions,
): Promise<Article[]> {
  const query = buildItemsQuery({
    batchSize: CONFIG.DEFAULT_BATCH_SIZE,
    type: ItemFilterType.ALL,
    getRead: false,
    ...params,
  });
  const response = await apiGet<ItemsResponse>(`/items${query}`, options);
  return response.items.map(normalizeArticle);
}

/**
 * Fetches a single article by ID.
 */
export async function getArticle(id: number): Promise<Article | null> {
  const items = await getItems({ id });
  return items[0] ?? null;
}

/**
 * Fetches items modified since a specific timestamp.
 */
export async function getUpdatedItems(
  lastModified: number,
  type: ItemFilterType = ItemFilterType.ALL,
  id = 0,
): Promise<Article[]> {
  const params = new URLSearchParams({
    lastModified: String(lastModified),
    type: String(type),
    id: String(id),
  });
  const response = await apiGet<ItemsResponse>(`/items/updated?${params.toString()}`);
  return response.items.map(normalizeArticle);
}

/**
 * Marks a single item as read.
 */
export async function markItemRead(itemId: number): Promise<void> {
  await apiPost(`/items/${String(itemId)}/read`);
}

/**
 * Marks a single item as unread.
 */
export async function markItemUnread(itemId: number): Promise<void> {
  await apiPost(`/items/${String(itemId)}/unread`);
}

/**
 * Stars a single item.
 */
export async function starItem(itemId: number): Promise<void> {
  await apiPost(`/items/${String(itemId)}/star`);
}

/**
 * Unstars a single item.
 */
export async function unstarItem(itemId: number): Promise<void> {
  await apiPost(`/items/${String(itemId)}/unstar`);
}

/**
 * Marks multiple items as read.
 */
export async function markItemsRead(itemIds: number[]): Promise<void> {
  await apiPost('/items/read/multiple', { itemIds });
}

/**
 * Marks multiple items as unread.
 */
export async function markItemsUnread(itemIds: number[]): Promise<void> {
  await apiPost('/items/unread/multiple', { itemIds });
}

/**
 * Stars multiple items.
 */
export async function starItems(itemIds: number[]): Promise<void> {
  await apiPost('/items/star/multiple', { itemIds });
}

/**
 * Unstars multiple items.
 */
export async function unstarItems(itemIds: number[]): Promise<void> {
  await apiPost('/items/unstar/multiple', { itemIds });
}

/**
 * Marks all items as read up to a specific item ID.
 */
export async function markAllItemsRead(newestItemId: number): Promise<void> {
  await apiPost('/items/read', { newestItemId });
}

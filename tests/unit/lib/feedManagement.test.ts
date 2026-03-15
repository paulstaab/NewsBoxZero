import { describe, expect, it } from 'vitest';
import { buildFeedManagementGroups, formatLocalDateTime } from '@/lib/feeds/feedManagement';
import type { Feed, Folder } from '@/types';

function buildFeed(partial: Partial<Feed>): Feed {
  return {
    id: partial.id ?? 1,
    title: partial.title ?? 'Sample Feed',
    url: partial.url ?? 'https://example.com/feed.xml',
    link: partial.link ?? 'https://example.com',
    faviconLink: partial.faviconLink ?? null,
    added: partial.added ?? 0,
    nextUpdateTime: partial.nextUpdateTime ?? null,
    folderId: partial.folderId ?? null,
    unreadCount: partial.unreadCount ?? 0,
    ordering: partial.ordering ?? 0,
    pinned: partial.pinned ?? false,
    lastUpdateError: partial.lastUpdateError ?? null,
    updateMode: partial.updateMode ?? 1,
  };
}

describe('feedManagement utilities', () => {
  it('groups folders and feeds alphabetically, including uncategorized feeds', () => {
    const folders: Folder[] = [
      { id: 20, name: 'Podcasts', unreadCount: 0, feedIds: [] },
      { id: 10, name: 'Design', unreadCount: 0, feedIds: [] },
    ];
    const feeds = [
      buildFeed({ id: 1, title: 'Zulu Feed', folderId: 20 }),
      buildFeed({ id: 2, title: 'Alpha Feed', folderId: 20 }),
      buildFeed({ id: 3, title: 'Beta Feed', folderId: null }),
    ];

    const groups = buildFeedManagementGroups(folders, feeds, { 1: 1_700_000_000 });

    expect(groups.map((group) => group.name)).toEqual(['Podcasts', 'Uncategorized']);
    expect(groups[0].feeds.map((row) => row.feed.title)).toEqual(['Alpha Feed', 'Zulu Feed']);
    expect(groups[1].feeds[0].lastArticleDate).toBeNull();
  });

  it('formats missing timestamps as not available', () => {
    expect(formatLocalDateTime(null)).toBe('Not available');
    expect(formatLocalDateTime(0)).toBe('Not available');
    expect(formatLocalDateTime(1_700_000_000)).not.toBe('Not available');
  });
});

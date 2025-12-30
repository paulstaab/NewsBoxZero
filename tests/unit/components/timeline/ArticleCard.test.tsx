import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ArticleCard } from '@/components/timeline/ArticleCard';
import type { ArticlePreview, Article } from '@/types';

// Mock next/image
/* eslint-disable @next/next/no-img-element */
type MockImageProps = React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean };

vi.mock('next/image', () => ({
  default: (props: MockImageProps) => {
    const { unoptimized, ...rest } = props;
    void unoptimized;
    return <img alt="" {...rest} />;
  },
}));
/* eslint-enable @next/next/no-img-element */

// Mock SWR
const { mockSWRResponse } = vi.hoisted(() => ({
  mockSWRResponse: {
    data: undefined as Article | null | undefined,
    error: null as Error | null,
    isLoading: false,
  },
}));

vi.mock('swr', () => ({
  default: () => mockSWRResponse,
}));

const mockArticle: ArticlePreview = {
  id: 1,
  feedId: 10,
  folderId: 100,
  title: 'Test Article Title',
  feedName: 'Example Feed',
  author: 'Test Author',
  summary: 'This is a summary of the article.',
  url: 'https://example.com/article',
  thumbnailUrl: 'https://example.com/image.jpg',
  pubDate: 1700000000,
  unread: true,
  starred: false,
  hasFullText: true,
  storedAt: 1700000000,
};

const mockFullArticle: Article = {
  id: mockArticle.id,
  guid: 'guid-1',
  guidHash: 'hash-1',
  title: mockArticle.title,
  author: 'Author',
  url: mockArticle.url,
  body: '<p>This is the full body content.</p>',
  feedId: mockArticle.feedId,
  folderId: 100,
  unread: mockArticle.unread,
  starred: mockArticle.starred,
  pubDate: mockArticle.pubDate,
  lastModified: 1700000000,
  enclosureLink: null,
  enclosureMime: null,
  fingerprint: 'fp',
  contentHash: 'ch',
  mediaThumbnail: null,
  mediaDescription: null,
  rtl: false,
};

describe('ArticleCard', () => {
  it('renders article summary information correctly', () => {
    render(<ArticleCard article={mockArticle} onMarkRead={vi.fn()} />);

    expect(screen.getByText('Test Article Title')).toBeDefined();
    expect(screen.getByText('This is a summary of the article.')).toBeDefined();
    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders fallback title when title is missing', () => {
    const article = { ...mockArticle, title: '' };
    render(<ArticleCard article={article} onMarkRead={vi.fn()} />);

    expect(screen.getByText('Untitled article')).toBeDefined();
  });

  it('does not render thumbnail if url is missing', () => {
    const article = { ...mockArticle, thumbnailUrl: null };
    render(<ArticleCard article={article} onMarkRead={vi.fn()} />);

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('expands to show full content when clicked and marks as read', async () => {
    const onMarkRead = vi.fn();
    mockSWRResponse.data = mockFullArticle;

    render(<ArticleCard article={mockArticle} onMarkRead={onMarkRead} />);

    // Initially summary is shown
    expect(screen.getByText('This is a summary of the article.')).toBeDefined();
    expect(screen.queryByText('This is the full body content.')).toBeNull();

    // Click to expand
    const card = screen.getByRole('article');
    fireEvent.click(card);

    // Should call onMarkRead
    expect(onMarkRead).toHaveBeenCalledWith(mockArticle.id);

    // Should show full content (mocked SWR returns it) and hide summary
    await waitFor(() => {
      expect(screen.getByText('This is the full body content.')).toBeDefined();
    });
    expect(screen.queryByText('This is a summary of the article.')).toBeNull();
  });

  it('shows loading state when expanding and fetching', () => {
    mockSWRResponse.data = undefined;
    mockSWRResponse.isLoading = true;

    render(<ArticleCard article={mockArticle} onMarkRead={vi.fn()} />);

    fireEvent.click(screen.getByRole('article'));

    expect(screen.getByText(/loading/i)).toBeDefined();
  });

  it('shows error state when fetch fails', () => {
    mockSWRResponse.data = undefined;
    mockSWRResponse.isLoading = false;
    mockSWRResponse.error = new Error('Failed to load');

    render(<ArticleCard article={mockArticle} onMarkRead={vi.fn()} />);

    fireEvent.click(screen.getByRole('article'));

    expect(screen.getByText(/failed to load/i)).toBeDefined();
  });
});

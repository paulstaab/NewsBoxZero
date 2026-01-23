import { useCallback, useMemo, useState } from 'react';
import type { SelectionActions } from '@/types/timeline';
import {
  getNextSelectionId,
  getPreviousSelectionId,
  getTopmostVisibleId,
} from '@/lib/timeline/selection';

export interface UseTimelineSelectionResult extends SelectionActions {
  selectedArticleId: number | null;
  setSelectedArticleId: (id: number | null) => void;
  selectedArticleElement: HTMLElement | null;
  setSelectedArticleElement: (element: HTMLElement | null) => void;
}

export function useTimelineSelection(articles: { id: number }[]): UseTimelineSelectionResult {
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [selectedArticleElement, setSelectedArticleElement] = useState<HTMLElement | null>(null);

  const orderedIds = useMemo(() => articles.map((article) => article.id), [articles]);

  const selectTopmost = useCallback(
    (topmostId?: number | null) => {
      const resolvedId = topmostId ?? getTopmostVisibleId(orderedIds);
      if (resolvedId === null || typeof resolvedId === 'undefined') return;
      setSelectedArticleId(resolvedId);
    },
    [orderedIds],
  );

  const selectNext = useCallback(() => {
    const nextId = getNextSelectionId(selectedArticleId, orderedIds);
    if (nextId === null) return;
    setSelectedArticleId(nextId);
  }, [orderedIds, selectedArticleId]);

  const selectPrevious = useCallback(() => {
    const prevId = getPreviousSelectionId(selectedArticleId, orderedIds);
    if (prevId === null) return;
    setSelectedArticleId(prevId);
  }, [orderedIds, selectedArticleId]);

  const deselect = useCallback(() => {
    setSelectedArticleId(null);
    setSelectedArticleElement(null);
  }, []);

  return {
    selectedArticleId,
    setSelectedArticleId,
    selectedArticleElement,
    setSelectedArticleElement,
    selectTopmost,
    selectNext,
    selectPrevious,
    deselect,
  };
}

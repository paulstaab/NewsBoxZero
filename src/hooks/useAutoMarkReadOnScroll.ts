import { useCallback, useEffect, useRef } from 'react';
import { createReadBatcher } from '@/lib/timeline/read-batching';

export interface AutoMarkReadOptions<T extends { id: number } = { id: number }> {
  items: T[];
  onMarkRead: (id: number) => void;
  root?: Element | null;
  debounceMs?: number;
}

export interface AutoMarkReadResult {
  registerArticle: (id: number) => (node: HTMLElement | null) => void;
}

export function useAutoMarkReadOnScroll<T extends { id: number }>({
  items,
  onMarkRead,
  root,
  debounceMs = 100,
}: AutoMarkReadOptions<T>): AutoMarkReadResult {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const seenRef = useRef<Set<number>>(new Set());
  const batcherRef = useRef<ReturnType<typeof createReadBatcher> | null>(null);
  const unreadMapRef = useRef<Map<number, boolean>>(new Map());

  useEffect(() => {
    batcherRef.current?.clear();
    batcherRef.current = createReadBatcher({
      debounceMs,
      onFlush: (ids) => {
        ids.forEach((id) => {
          onMarkRead(id);
        });
      },
    });

    return () => {
      batcherRef.current?.clear();
      batcherRef.current = null;
    };
  }, [debounceMs, onMarkRead]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          const id = Number(target.dataset.articleId);
          if (!Number.isFinite(id)) return;

          if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
            if (seenRef.current.has(id)) return;
            if (unreadMapRef.current.get(id) === false) return;
            seenRef.current.add(id);
            batcherRef.current?.add(id);
          }
        });
      },
      {
        root: root ?? null,
        threshold: [1],
      },
    );

    observerRef.current = observer;
    elementsRef.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [root]);

  useEffect(() => {
    // Keep ref map in sync with items list
    unreadMapRef.current = new Map(
      items.map((item) => [item.id, 'unread' in item ? Boolean(item.unread) : true]),
    );
    const currentIds = new Set(items.map((item) => item.id));
    for (const [id, element] of elementsRef.current.entries()) {
      if (!currentIds.has(id)) {
        observerRef.current?.unobserve(element);
        elementsRef.current.delete(id);
        seenRef.current.delete(id);
      }
    }
  }, [items]);

  const registerArticle = useCallback(
    (id: number) => (node: HTMLElement | null) => {
      if (!node) return;
      node.dataset.articleId = String(id);
      elementsRef.current.set(id, node);
      observerRef.current?.observe(node);
    },
    [],
  );

  return { registerArticle };
}

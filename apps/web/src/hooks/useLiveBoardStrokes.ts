import { useCallback, useMemo, useRef, useState } from "react";
import type { HubStroke } from "@/services/live-board-hub";

interface BoardBuckets {
  [boardIndex: number]: HubStroke[];
}

/**
 * Holds one live board's strokes, grouped by board index (teacher/own boards
 * can be switched the same way the existing recorder switches numbered
 * boards, via `SwitchBoard`/`SwitchMyBoard`). Kept as plain component state,
 * not Redux — strokes arrive up to ~30 times a second while someone is
 * drawing, and `class.tsx` (the existing recorder) makes the same call for
 * the same reason.
 */
export function useLiveBoardStrokes(initialBoard = 1) {
  const [buckets, setBuckets] = useState<BoardBuckets>({});
  const [currentBoard, setCurrentBoardState] = useState(initialBoard);
  const [availableBoards, setAvailableBoards] = useState<number[]>([initialBoard]);
  const delayTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const registerBoard = useCallback((boardIndex: number) => {
    setAvailableBoards((prev) =>
      prev.includes(boardIndex) ? prev : [...prev, boardIndex].sort((a, b) => a - b)
    );
  }, []);

  /** Replaces all board content wholesale — used for the initial JoinClass
   * snapshot and for the automatic rejoin after a hub reconnect. */
  const loadSnapshot = useCallback(
    (strokes: HubStroke[], boardIndex: number, boards?: number[]) => {
      const grouped: BoardBuckets = {};
      for (const stroke of strokes) {
        const key = stroke.currentBoard ?? boardIndex;
        (grouped[key] ??= []).push(stroke);
      }
      setBuckets(grouped);
      setCurrentBoardState(boardIndex);
      setAvailableBoards((prev) => {
        const union = new Set<number>([
          ...(boards ?? []),
          ...Object.keys(grouped).map(Number),
          boardIndex,
          ...prev,
        ]);
        return Array.from(union).sort((a, b) => a - b);
      });
    },
    []
  );

  const appendStroke = useCallback(
    (stroke: HubStroke) => {
      setBuckets((prev) => {
        const existing = prev[stroke.currentBoard] ?? [];
        if (existing.some((s) => s.id === stroke.id)) return prev; // dedupe
        return { ...prev, [stroke.currentBoard]: [...existing, stroke] };
      });
      registerBoard(stroke.currentBoard);
    },
    [registerBoard]
  );

  /** `delayMs`, when given, holds the stroke back before it becomes visible —
   * used only for view-only consumption of someone else's board, to roughly
   * align what's drawn with the voice describing it (~200ms per the live
   * board contract). Never used for the author's own optimistic echo. */
  const addStroke = useCallback(
    (stroke: HubStroke, delayMs?: number) => {
      if (!delayMs) {
        appendStroke(stroke);
        return;
      }
      const timer = setTimeout(() => {
        delayTimers.current.delete(timer);
        appendStroke(stroke);
      }, delayMs);
      delayTimers.current.add(timer);
    },
    [appendStroke]
  );

  const removeStrokes = useCallback((strokeIds: string[]) => {
    if (strokeIds.length === 0) return;
    const idSet = new Set(strokeIds);
    setBuckets((prev) => {
      const next: BoardBuckets = {};
      for (const [board, list] of Object.entries(prev) as [string, HubStroke[]][]) {
        next[Number(board)] = list.filter((s) => !idSet.has(s.id));
      }
      return next;
    });
  }, []);

  const removeStroke = useCallback((strokeId: string) => removeStrokes([strokeId]), [removeStrokes]);

  const clearBoard = useCallback(
    (boardIndex?: number) => {
      setBuckets((prev) => ({ ...prev, [boardIndex ?? currentBoard]: [] }));
    },
    [currentBoard]
  );

  const switchBoard = useCallback(
    (boardIndex: number) => {
      setCurrentBoardState(boardIndex);
      registerBoard(boardIndex);
    },
    [registerBoard]
  );

  const addBoard = useCallback(() => {
    const next = Math.max(...availableBoards, 0) + 1;
    registerBoard(next);
    switchBoard(next);
    return next;
  }, [availableBoards, registerBoard, switchBoard]);

  const strokes = useMemo(() => buckets[currentBoard] ?? [], [buckets, currentBoard]);

  return {
    strokes,
    currentBoard,
    availableBoards,
    loadSnapshot,
    addStroke,
    removeStroke,
    removeStrokes,
    clearBoard,
    switchBoard,
    addBoard,
  };
}

export type LiveBoardStrokesApi = ReturnType<typeof useLiveBoardStrokes>;

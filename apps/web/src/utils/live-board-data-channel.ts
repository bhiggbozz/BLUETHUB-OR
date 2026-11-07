/**
 * Compact wire format for main-board strokes sent over the LiveKit data
 * channel (topic "board") — the hybrid design's actual live-sync path for
 * the teacher's shared board, riding the same connection as the audio so pen
 * and voice drift less. The SignalR hub still carries the snapshot for late
 * joiners/reconnects, and everything else (private boards, share, speak,
 * warnings, end) stays on the hub/REST entirely, unchanged.
 *
 * Deliberately a separate shape from `HubStroke` (`b` instead of
 * `currentBoard`) — a distinct contract on a distinct channel, not a reuse
 * of the hub's.
 */

import type { HubStroke } from "@/services/live-board-hub";
import type { StrokeSegment } from "@/utils/stroke-segmentation";

export type BoardDataMessage =
  | { type: "stroke"; id: string; pts: [number, number][]; c: string; w: number; ts: number; b: number }
  | { type: "remove"; id: string }
  | { type: "clear"; b: number }
  | { type: "switch"; b: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeBoardMessage(msg: BoardDataMessage): Uint8Array {
  return encoder.encode(JSON.stringify(msg));
}

export function decodeBoardMessage(payload: Uint8Array): BoardDataMessage | null {
  try {
    const parsed = JSON.parse(decoder.decode(payload)) as Partial<BoardDataMessage> | null;
    if (parsed && typeof parsed.type === "string") return parsed as BoardDataMessage;
  } catch {
    // malformed or foreign payload on the "board" topic — ignore it
  }
  return null;
}

/** Builds the outgoing stroke message for a locally-drawn segment. `ts` is
 * stamped from the server-corrected clock relative to class start — NOT the
 * segment's own `ts` field, which stays the hub's raw-device-time value and
 * is left untouched for `hub.sendStroke`. */
export function strokeSegmentToWireMessage(
  segment: StrokeSegment,
  serverOffsetMs: number,
  startedAtMs: number
): BoardDataMessage {
  return {
    type: "stroke",
    id: segment.id,
    pts: segment.pts,
    c: segment.c,
    w: segment.w,
    ts: Date.now() + serverOffsetMs - startedAtMs,
    b: segment.currentBoard,
  };
}

export function wireStrokeToHubStroke(msg: Extract<BoardDataMessage, { type: "stroke" }>): HubStroke {
  return { id: msg.id, pts: msg.pts, c: msg.c, w: msg.w, ts: msg.ts, currentBoard: msg.b };
}

/** Default hold-back before a viewer draws an incoming main-board stroke, so
 * it roughly lines up with the voice describing it. Tunable later from
 * LiveKit audio stats (RTT / jitter buffer delay); starts lower than the old
 * hub-only 300ms since the data channel now shares a connection with audio. */
export const BOARD_PLAYOUT_DELAY_MS = 200;

/** A stroke arriving this far past its scheduled playout time means the
 * viewer has fallen behind — draw immediately and flag it as lagging. */
export const BOARD_LAG_THRESHOLD_MS = 2000;

/**
 * Schedules incoming main-board strokes to render at their intended playout
 * time instead of the instant they arrive. Transport-agnostic timing helper
 * only — callers own the actual stroke cache.
 */
export class BoardPlayoutScheduler {
  private readonly appliedIds = new Set<string>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Cancels anything still pending and reseeds the dedupe set — call this
   * whenever a fresh JoinClass snapshot replaces the board wholesale, so a
   * message already reflected in that snapshot is never re-applied. */
  reset(seedIds: Iterable<string> = []): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.appliedIds.clear();
    for (const id of seedIds) this.appliedIds.add(id);
  }

  dispose(): void {
    this.reset();
  }

  /** Schedules `apply()` for `targetTimeMs` (absolute, `Date.now()`-scale).
   * No-ops for an id already applied or already scheduled. Strokes arriving
   * more than `BOARD_LAG_THRESHOLD_MS` past their slot draw immediately
   * instead of waiting, and report it via `onLag`. */
  schedule(id: string, targetTimeMs: number, apply: () => void, onLag?: () => void): void {
    if (this.appliedIds.has(id) || this.timers.has(id)) return;
    this.appliedIds.add(id);

    const delay = targetTimeMs - Date.now();
    if (delay <= 0) {
      if (delay < -BOARD_LAG_THRESHOLD_MS) onLag?.();
      apply();
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(id);
      apply();
    }, delay);
    this.timers.set(id, timer);
  }
}

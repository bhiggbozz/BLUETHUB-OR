/**
 * Chunks a long pen stroke into small, hub-safe segments while the teacher or
 * student is still drawing it, so other viewers see the stroke appear live
 * instead of all at once when the pen lifts.
 *
 * Rules (from the live-board hub contract): never send a single stroke
 * message over ~256KB; emit a segment every ~300 points or ~100-150ms,
 * whichever comes first; continue each segment from the last point of the
 * previous one; id segments as `${penId}:${n}`; on undo, remove every segment
 * id emitted for that pen, not just the last one.
 *
 * This module is transport-agnostic — it only emits plain segment objects via
 * a callback. The SignalR hub wrapper (or anything else) decides what to do
 * with them.
 */

export interface StrokeSegment {
  id: string;
  pts: [number, number][];
  c: string;
  w: number;
  ts: number;
  currentBoard: number;
  /** "eraser" renders with destination-out compositing instead of a normal
   * stroke. Optional/absent means "stroke" — additive, backward compatible
   * with any stroke that predates this field. */
  strokeType?: "stroke" | "eraser";
}

export interface StrokeSegmenterOptions {
  penId: string;
  color: string;
  width: number;
  currentBoard: number;
  strokeType?: "stroke" | "eraser";
  onSegment: (segment: StrokeSegment) => void;
  /** Max points buffered before an immediate flush. Default 300. */
  maxPointsPerSegment?: number;
  /** Max time a partial segment sits buffered before being flushed anyway. Default 130ms. */
  flushIntervalMs?: number;
  /** Minimum time between accepted points — caps sampling at ~30Hz. Default ~33ms. */
  sampleIntervalMs?: number;
}

export const STROKE_SEGMENT_SIZE_LIMIT_BYTES = 256 * 1024;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function estimateSegmentBytes(segment: StrokeSegment): number {
  return JSON.stringify(segment).length;
}

/** One instance per in-progress pen stroke — create on pointer-down, feed
 * points on pointer-move via `addPoint`, call `finish()` on pointer-up. */
export class StrokeSegmenter {
  private buffer: [number, number][] = [];
  private segmentIndex = 0;
  private readonly emittedIds: string[] = [];
  private lastSampleAt = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  private readonly options: StrokeSegmenterOptions;
  private readonly maxPointsPerSegment: number;
  private readonly flushIntervalMs: number;
  private readonly sampleIntervalMs: number;

  constructor(options: StrokeSegmenterOptions) {
    this.options = options;
    this.maxPointsPerSegment = options.maxPointsPerSegment ?? 300;
    this.flushIntervalMs = options.flushIntervalMs ?? 130;
    this.sampleIntervalMs = options.sampleIntervalMs ?? 1000 / 30;

    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) this.flush();
    }, this.flushIntervalMs);
  }

  /** Feed a raw pointer position. Internally throttled to ~30Hz and rounded
   * to 1 decimal place; call on every pointer-move, don't pre-throttle. */
  addPoint(x: number, y: number, now: number = Date.now()): void {
    if (this.buffer.length > 0 && now - this.lastSampleAt < this.sampleIntervalMs) return;
    this.lastSampleAt = now;
    this.buffer.push([round1(x), round1(y)]);
    if (this.buffer.length >= this.maxPointsPerSegment) this.flush();
  }

  /** Emits whatever is currently buffered as one segment, continuing the next
   * segment from this one's last point (the buffer only clears the emitted
   * points, so the visual line stays connected across segments). */
  flush(): void {
    if (this.buffer.length === 0) return;
    const { penId, color, width, currentBoard, strokeType, onSegment } = this.options;
    const segment: StrokeSegment = {
      id: `${penId}:${this.segmentIndex++}`,
      pts: this.buffer,
      c: color,
      w: width,
      ts: Date.now(),
      currentBoard,
      strokeType,
    };
    // Next segment continues from the last point already sent.
    this.buffer = this.buffer.length > 0 ? [this.buffer[this.buffer.length - 1]] : [];
    this.emittedIds.push(segment.id);
    onSegment(segment);
  }

  /** Call on pointer-up. Flushes any remainder and stops the flush timer.
   * Returns every segment id emitted for this pen (for undo — remove each one). */
  finish(): string[] {
    // Drop the single carry-over point so finish() doesn't emit a trailing
    // one-point "segment" with nothing new to show.
    if (this.buffer.length <= 1) {
      this.buffer = [];
    } else {
      this.flush();
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    return [...this.emittedIds];
  }

  /** Every segment id emitted so far, without stopping the segmenter. */
  getEmittedIds(): string[] {
    return [...this.emittedIds];
  }
}

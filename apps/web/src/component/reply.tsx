import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
// import type Konva from 'konva';
import {
  PlayCircle,
  StopCircle,
  Trash,
  Edit3,
  VolumeX,
  Clock,
  Circle,
  Loader,
} from 'lucide-react';
import type { AudioBatch, CompressedStroke, IActions, IActiveMedia, Stroke } from '@/utils/constant';
import { clearAudio, clearClass, getAudio, getClass, getAudioBySession, getClassBySession } from '@/utils/db';
import { getImage } from '@/services/class-media';
import { base64ToUint8 } from '@/utils';
import { gzipDecompress } from '@/utils/gzip';
import PdfScrollViewer from '@/component/pdf-scroll-viewer';

// ─── local helper — converts "MM:SS" or "HH:MM:SS" → milliseconds ────────────
// This lives here so we are 100% sure of the unit: always returns MS.
// stroke.startTime "00:11" → 11000ms
// stroke.startTime "01:05" → 65000ms
const timeToMs = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 2) {
    const [m, s] = parts;
    return (m * 60 + s) * 1000;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  return 0;
};

const formatReplayMs = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  }

  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const mediaClockMs = (value: string | null | undefined): number => {
  if (!value || value === '—') return Number.POSITIVE_INFINITY;
  return timeToMs(value);
};

const resolvePdfPage = (media: IActiveMedia, sessionMs: number): number | undefined => {
  if (media.type.toLowerCase() !== 'pdf' || !media.pdfPages || media.pdfPages.length === 0) {
    return undefined;
  }

  let page = 1;
  for (const event of media.pdfPages) {
    const eventMs = event.elapsedMs ?? mediaClockMs(event.timerDisplay);
    if (sessionMs >= eventMs) {
      page = event.page;
    } else {
      break;
    }
  }

  return page;
};

const resolvePdfScrollRatio = (media: IActiveMedia, sessionMs: number): number | undefined => {
  if (media.type.toLowerCase() !== 'pdf' || !media.pdfScrollEvents || media.pdfScrollEvents.length === 0) {
    return undefined;
  }

  let ratio: number | undefined = undefined;
  for (const event of media.pdfScrollEvents) {
    const eventMs = event.elapsedMs ?? mediaClockMs(event.timerDisplay);
    if (sessionMs >= eventMs) {
      ratio = event.scrollRatio;
    } else {
      break;
    }
  }

  return ratio;
};

const resolveVideoPlaybackState = (media: IActiveMedia, sessionMs: number): 'play' | 'pause' => {
  if (media.type.toLowerCase() !== 'video' || !media.playbackEvents || media.playbackEvents.length === 0) {
    return 'pause';
  }

  let state: 'play' | 'pause' = 'pause';
  for (const event of media.playbackEvents) {
    const eventMs = event.elapsedMs ?? mediaClockMs(event.timerDisplay);
    if (sessionMs >= eventMs) {
      state = event.state;
    } else {
      break;
    }
  }

  return state;
};



const getReplayFrameClassByType = (type?: string): string => {
  const mediaType = (type ?? '').toLowerCase();

  if (mediaType.includes('pdf')) {
    return 'h-[min(88vh,980px)] w-[min(94vw,1100px)]';
  }

  if (mediaType.includes('video')) {
    return 'h-[64vh] w-[min(86vw,920px)]';
  }

  return 'h-[60vh] w-[min(82vw,840px)]';
};

const buildMediaTimelineFromManifest = (raw: string | null): Array<{ media: IActiveMedia; showMs: number; closeMs: number }> => {
  if (!raw) return [];

  const parsed = JSON.parse(raw) as IActions;
  const timeline: Array<{ media: IActiveMedia; showMs: number; closeMs: number }> = [];
  const fallbackCloseMs = Math.max(0, parsed.totalDuration || 0);

  for (const batch of parsed.batches ?? []) {
    for (const media of batch.mediaAction ?? []) {
      const normalizedMedia: IActiveMedia = {
        ...media,
        pdfPages: media.pdfPages?.length
          ? [...media.pdfPages].sort(
            (a, b) => (a.elapsedMs ?? mediaClockMs(a.timerDisplay)) - (b.elapsedMs ?? mediaClockMs(b.timerDisplay))
          )
          : media.pdfPages,
        playbackEvents: media.playbackEvents?.length
          ? [...media.playbackEvents].sort(
            (a, b) => (a.elapsedMs ?? mediaClockMs(a.timerDisplay)) - (b.elapsedMs ?? mediaClockMs(b.timerDisplay))
          )
          : media.playbackEvents,
      };

      const showMs = normalizedMedia.showMs ?? mediaClockMs(normalizedMedia.show);
      const parsedClose = normalizedMedia.closedMs ?? mediaClockMs(normalizedMedia.closed);
      const baseCloseMs = Number.isFinite(parsedClose)
        ? parsedClose
        : (fallbackCloseMs > 0 ? fallbackCloseMs : Number.POSITIVE_INFINITY);
      const closeMs = Number.isFinite(baseCloseMs) ? baseCloseMs : baseCloseMs;

      timeline.push({
        media: normalizedMedia,
        showMs,
        closeMs,
      });
    }
  }

  return timeline.sort((a, b) => a.showMs - b.showMs);
};

const buildMediaEventsFromManifest = (raw: string | null): Array<{
  atMs: number;
  type: 'show' | 'hide';
  media: IActiveMedia;
}> => {
  const timeline = buildMediaTimelineFromManifest(raw);
  const events: Array<{ atMs: number; type: 'show' | 'hide'; media: IActiveMedia }> = [];

  for (const item of timeline) {
    events.push({ atMs: item.showMs, type: 'show', media: item.media });
    if (Number.isFinite(item.closeMs)) {
      events.push({ atMs: item.closeMs, type: 'hide', media: item.media });
    }
  }

  return events.sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    return a.type === 'show' && b.type === 'hide' ? -1 : 1;
  });
};

interface ReplayProps {
  sessionId?: string;
}

export default function Replay({ sessionId }: ReplayProps = {}) {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [strokesList, setStrokesList] = useState<CompressedStroke[]>([]);
  const [audioList, setAudioList] = useState<AudioBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [_currentBatch, setCurrentBatch] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [scrubMs, setScrubMs] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [_renderTick, setRenderTick] = useState(0);
  const [replayMs, setReplayMs] = useState(0);
  // True while playing and the session clock is between audio batches (silent gap).
  const [isSilentGap, setIsSilentGap] = useState(false);
  const [activeFrame, setActiveFrame] = useState<IActiveMedia | null>(null);
  const [activeFrameUrl, setActiveFrameUrl] = useState<string | null>(null);
  const [activePdfPage, setActivePdfPage] = useState<number | undefined>(undefined);
  const [activePdfScrollRatio, setActivePdfScrollRatio] = useState<number | undefined>(undefined);
  const [isPdfAutoFollowEnabled, setIsPdfAutoFollowEnabled] = useState(true);
  const [isReplayVideoPlaying, setIsReplayVideoPlaying] = useState(false);
  const [targetVideoPlaybackState, setTargetVideoPlaybackState] = useState<'play' | 'pause'>('pause');
  const [currentBoardInReplay, setCurrentBoardInReplay] = useState(1);
  const totalBoards = Math.max(
    1,
    new Set(strokes.map((s) => s.currentBoard ?? 1)).size,
  );

  // Keep replay scoped to one session to avoid cross-session mixing.
  // When an explicit sessionId prop is provided (e.g. from student-replay),
  // we use it directly. Otherwise we fall back to localStorage / heuristic.
  const activeSessionId = useMemo(() => {
    if (sessionId) return sessionId;

    const preferredSessionId = localStorage.getItem('replaySessionId') ?? '';
    if (preferredSessionId) {
      const hasPreferredAudio = audioList.some((a) => a.sessionId === preferredSessionId);
      const hasPreferredStrokes = strokesList.some((s) => s.sessionId === preferredSessionId);
      if (hasPreferredAudio || hasPreferredStrokes) {
        return preferredSessionId;
      }
    }

    if (audioList.length > 0) {
      const latestAudio = [...audioList].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))[0];
      if (latestAudio?.sessionId) return latestAudio.sessionId;
    }

    const strokeWithSession = strokesList
      .filter((s) => typeof s.sessionId === 'string' && s.sessionId.length > 0)
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    return strokeWithSession[0]?.sessionId ?? null;
  }, [sessionId, audioList, strokesList]);

  const sessionAudioList = useMemo(
    () => (activeSessionId ? audioList.filter((a) => a.sessionId === activeSessionId) : audioList),
    [audioList, activeSessionId]
  );

  const sessionStrokesList = useMemo(
    () => (activeSessionId ? strokesList.filter((s) => s.sessionId === activeSessionId) : strokesList),
    [strokesList, activeSessionId]
  );

  // ── Refs ──────────────────────────────────────────────────────────────────

  // Fully decompressed strokes cached here before play() is ever called.
  // play() reads this synchronously — zero async wait.
  const preloadedStrokesRef = useRef<Stroke[]>([]);

  // Drawn strokes live here — mutated directly by RAF, never causes re-renders.
  // setRenderTick triggers React to re-read this ref and repaint.
  const drawnMapRef = useRef<Map<string, Stroke>>(new Map());

  // Per-stroke cursor: how many flat [x,y,...] indices are currently drawn.
  const strokeCursorsRef = useRef<Map<string, number>>(new Map());

  // RAF handle
  const rafRef = useRef<number | null>(null);
  const mediaTimelineRef = useRef<Array<{
    media: IActiveMedia;
    showMs: number;
    closeMs: number;
  }>>([]);
  const mediaEventsRef = useRef<Array<{
    atMs: number;
    type: 'show' | 'hide';
    media: IActiveMedia;
  }>>([]);
  const mediaEventIndexRef = useRef(0);
  const activeFrameSigRef = useRef('');
  const activeFrameRef = useRef<IActiveMedia | null>(null);
  const activePdfPageRef = useRef<number | undefined>(undefined);
  const activePdfScrollRatioRef = useRef<number | undefined>(undefined);
  const targetVideoPlaybackStateRef = useRef<'play' | 'pause'>('pause');
  const replayVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentBoardInReplayRef = useRef<number>(1);
  const boardSwitchTimelineRef = useRef<Array<{ timestampMs: number; toBoard: number }>>([]);
  /** Teacher's recording dimensions; null until manifest is parsed. */
  const recordedBoardDimsRef = useRef<{ width: number; height: number } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // THE SYNC ANCHOR
  //
  // batchStartMsRef = where in the session timeline the CURRENT audio batch
  // started, in milliseconds.
  //
  // Combined with audio.currentTime (how far into the current batch we are),
  // this gives us the true session position at any moment:
  //
  //   sessionMs = batchStartMsRef.current + audio.currentTime * 1000
  //
  // This is the ONLY clock the RAF uses. It is driven by the audio element
  // itself, so board and audio are physically incapable of drifting apart.
  //
  // Why NOT performance.now():
  //   performance.now() keeps ticking during the gap between audio batches
  //   (blob creation, src assignment, .play() call — ~20-100ms per gap).
  //   Over 10 batches that's up to 1 second of accumulated drift.
  //
  // Why NOT timer.elapsedSecondsRef:
  //   It updates every 200ms (setInterval) and returns SECONDS not MS,
  //   causing up to 200ms over-sleep per stroke and unit mismatch bugs.
  // ─────────────────────────────────────────────────────────────────────────
  const batchStartMsRef = useRef<number>(0);

  const stopRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  // AudioContext used to schedule all batches at once so audio.currentTime
  // advances continuously (including through silent gaps) — no fill animation needed.
  const audioCtxRef = useRef<AudioContext | null>(null);
  // sessionMs = (audioCtx.currentTime - audioCtxOffsetRef) * 1000
  // Set so that at the scheduled start of the first audio, sessionMs = startFromSessionMs.
  const audioCtxOffsetRef = useRef<number>(0);
  // Known audio windows in session-space ms. Used to detect silent gaps for the UI.
  const audioPeriodsRef = useRef<Array<{ startMs: number; endMs: number }>>([]);
  // Number of batches that failed to decode (0 = all OK, >0 = possible Cloudinary issue).
  const decodeFailureCountRef = useRef(0);
  const playedSessionMsRef = useRef<number>(0);
  const audioAnchorWallMsRef = useRef<number>(0);
  const replayDisplayOffsetMsRef = useRef<number>(0);
  const startFromSessionMsRef = useRef<number>(0);
  const parentRef = useRef<HTMLDivElement>(null);
  // const __trRef = useRef<Konva.Transformer | null>(null);
  // const _rectRef = useRef(null);

  // Snapshot of drawnMapRef for Konva, limited to current replay board.
  const drawn = Array.from(drawnMapRef.current.values()).filter(
    (stroke) => (stroke.currentBoard ?? 1) === currentBoardInReplay,
  );

  useEffect(() => {
    let mounted = true;

    const resolveActiveFrameUrl = async () => {
      if (!activeFrame) {
        if (mounted) setActiveFrameUrl(null);
        return;
      }

      const mediaType = activeFrame.type.toLowerCase();
      if (mediaType.includes('pdf')) {
        if (mounted) setActiveFrameUrl(activeFrame.url);
        return;
      }

      try {
        const cached = await getImage(activeFrame.id);
        if (mounted) setActiveFrameUrl(cached ?? activeFrame.url);
      } catch {
        if (mounted) setActiveFrameUrl(activeFrame.url);
      }
    };

    resolveActiveFrameUrl();

    return () => {
      mounted = false;
    };
  }, [activeFrame]);

  // Header clock is driven by the same session clock used by drawing.
  // This removes drift between visual timer and audio playback.
  useEffect(() => {
    if (!isPlaying) {
      setReplayMs(0);
      return;
    }

    const id = setInterval(() => {
      const sessionMs = audioCtxRef.current
        ? Math.max(0, (audioCtxRef.current.currentTime - audioCtxOffsetRef.current) * 1000)
        : batchStartMsRef.current + (audioRef.current?.currentTime ?? 0) * 1000;
      setReplayMs(sessionMs + replayDisplayOffsetMsRef.current);
      // Update silent-gap indicator: we're silent when no audio period covers this ms.
      const inAudio = audioPeriodsRef.current.some(
        (p) => sessionMs >= p.startMs && sessionMs <= p.endMs
      );
      const hasGap = !inAudio && audioPeriodsRef.current.length > 0;
      // If decode failures occurred the gap might be a Cloudinary issue, not genuine silence.
      const hasDecodeFailures = decodeFailureCountRef.current > 0;
      setIsSilentGap(hasGap || (hasDecodeFailures && audioPeriodsRef.current.length === 0));
    }, 100);

    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    if (!isSeeking) {
      setScrubMs(replayMs);
    }
  }, [replayMs, isSeeking]);

  const replayDurationMs = useMemo(() => {
    const strokeDurationMs = strokes.length > 0
      ? Math.max(...strokes.map((s) => {
        const startMs = timeToMs(s.startTime);
        const endFromClock = timeToMs(s.endTime);
        const endFromDuration = startMs + Math.max(0, s.duration ?? 0);
        return Math.max(endFromClock, endFromDuration);
      }))
      : 0;

    const sortedAudio = [...sessionAudioList].sort((a, b) => a.batchId - b.batchId);
    const anchorSessionId = localStorage.getItem('sessionStartSessionId') ?? '';
    const storedAnchor = anchorSessionId === activeSessionId
      ? parseInt(localStorage.getItem('sessionStartWallMs') ?? '0', 10)
      : 0;
    const firstAudioBatch = sortedAudio[0];
    const reconstructedAnchor = firstAudioBatch
      ? firstAudioBatch.timestamp - Math.max(1, Math.round((firstAudioBatch.duration ?? 10) * 1000))
      : 0;
    const anchor = storedAnchor || reconstructedAnchor || 0;
    const audioDurationMs = sortedAudio.length > 0
      ? Math.max(...sortedAudio.map((b) => Math.max(0, b.timestamp - anchor)))
      : 0;

    const mediaCloseMs = mediaTimelineRef.current.length > 0
      ? Math.max(...mediaTimelineRef.current.map((m) => (Number.isFinite(m.closeMs) ? m.closeMs : m.showMs)))
      : 0;

    const displayOffset = Math.max(0, replayDisplayOffsetMsRef.current);
    return Math.max(1000, strokeDurationMs, audioDurationMs + displayOffset, mediaCloseMs + displayOffset);
  }, [strokes, sessionAudioList, activeSessionId, _renderTick]);

  const renderPreviewAtDisplayMs = useCallback((displayMs: number) => {
    const previewMap = new Map<string, Stroke>();
    const all = preloadedStrokesRef.current;
    let activeBoard = 1;
    let lastBoardChangeMs = -1;

    // Apply board:switch events first
    for (const ev of boardSwitchTimelineRef.current) {
      if (displayMs >= ev.timestampMs && ev.timestampMs >= lastBoardChangeMs) {
        activeBoard = ev.toBoard;
        lastBoardChangeMs = ev.timestampMs;
      }
    }

    for (const stroke of all) {
      const startMs = timeToMs(stroke.startTime);
      if (displayMs < startMs) continue;

      if (startMs >= lastBoardChangeMs) {
        activeBoard = stroke.currentBoard ?? activeBoard;
        lastBoardChangeMs = startMs;
      }

      const drawWindow = Math.max(50, stroke.duration ?? 0);
      const elapsed = Math.min(displayMs - startMs, drawWindow);
      const totalPoints = stroke.points.length;
      const targetCursor = Math.min(
        totalPoints,
        Math.round((elapsed / drawWindow) * (totalPoints / 2)) * 2
      );

      previewMap.set(stroke.id, {
        ...stroke,
        points: stroke.points.slice(0, Math.max(0, targetCursor)),
      });
    }

    drawnMapRef.current = previewMap;
    currentBoardInReplayRef.current = activeBoard;
    setCurrentBoardInReplay(activeBoard);
    setRenderTick((t) => t + 1);
  }, []);

  const commitSeek = useCallback((displayMs: number) => {
    const clamped = Math.max(0, Math.min(displayMs, replayDurationMs));
    setReplayMs(clamped);
    setScrubMs(clamped);
    renderPreviewAtDisplayMs(clamped);

    const targetSessionMs = Math.max(0, clamped - replayDisplayOffsetMsRef.current);

    if (isPlaying) {
      stop(); // resets startFromSessionMsRef to 0
      startFromSessionMsRef.current = targetSessionMs; // re-apply seek target after stop
      setTimeout(() => {
        void play();
      }, 0);
    } else {
      startFromSessionMsRef.current = targetSessionMs;
    }
  }, [isPlaying, replayDurationMs, renderPreviewAtDisplayMs]);

  // Jumps to the start of the next audio period when in a silent gap.
  const skipToNextAudio = useCallback(() => {
    const currentSessionMs = audioCtxRef.current
      ? Math.max(0, (audioCtxRef.current.currentTime - audioCtxOffsetRef.current) * 1000)
      : batchStartMsRef.current + (audioRef.current?.currentTime ?? 0) * 1000;
    const next = audioPeriodsRef.current
      .slice()
      .sort((a, b) => a.startMs - b.startMs)
      .find((p) => p.startMs > currentSessionMs + 500);
    if (next) {
      commitSeek(next.startMs + replayDisplayOffsetMsRef.current);
    }
  }, [commitSeek]);

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDimensions({
        width: Math.max(r.width - 14, 400),
        height: Math.max(r.height - 14, 400),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // ── Step 1: Load raw data from IndexedDB ──────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [classData, audioData] = sessionId
          ? await Promise.all([getClassBySession(sessionId), getAudioBySession(sessionId)])
          : await Promise.all([getClass(), getAudio()]);
        if (!mounted) return;
        setStrokesList(classData);
        setAudioList(audioData);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  useEffect(() => {
    const refreshTimeline = () => {
      try {
        const raw = localStorage.getItem('currentBatches');
        mediaTimelineRef.current = buildMediaTimelineFromManifest(raw);
        mediaEventsRef.current = buildMediaEventsFromManifest(raw);
        if (raw) {
          const parsed = JSON.parse(raw) as IActions;
          boardSwitchTimelineRef.current = parsed.boardSwitchTimeline ?? [];
          recordedBoardDimsRef.current = parsed.recordedBoardDimensions ?? null;
        } else {
          boardSwitchTimelineRef.current = [];
          recordedBoardDimsRef.current = null;
        }
      } catch (err) {
        console.error('Failed to parse replay manifest media actions:', err);
        mediaTimelineRef.current = [];
        mediaEventsRef.current = [];
        boardSwitchTimelineRef.current = [];
      }
    };

    // Initial parse + periodic refresh so replay can react to late manifest writes.
    refreshTimeline();
    const id = setInterval(refreshTimeline, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Step 2: Parallel decompress + cache in ref ────────────────────────────
  //
  // OLD: sequential for-loop → 50 strokes × 20ms = ~1000ms before play() works
  // NEW: Promise.allSettled fires all at once → ~20ms total (slowest single stroke)
  //
  // Result goes into preloadedStrokesRef (a ref, not state) so play() reads
  // it synchronously with zero React render-cycle delay.
  //
  useEffect(() => {
    if (strokesList.length === 0) return;
    (async () => {
      try {
        setIsPreloading(true);

        // ── Session filtering ──────────────────────────────────────────────
        // Only decompress strokes that belong to the current recording session.
        // Without this, strokes from older sessions (different sessionId) have
        // timestamps BEFORE the current sessionStartWallMs anchor, which makes
        // `stroke.timestamp - sessionStartWallMs` negative. Math.max(0, …)
        // clamps them all to startMs = 0, so they all appear simultaneously
        // at the very start of replay.
        //
        // sessionStrokesList is already filtered to the latest active session.
        const sessionStrokes = sessionStrokesList;

        const results = await Promise.allSettled(
          sessionStrokes.map(async (comp): Promise<Stroke> => {
            const binary = base64ToUint8(comp.data);
            const json = await gzipDecompress(binary);
            const points = JSON.parse(json) as number[];
            return {
              id: comp.id,
              points,
              color: comp.color,
              width: comp.width,
              currentBoard: comp.currentBoard,
              duration: comp.duration ?? 600,
              timestamp: comp.timestamp ?? Date.now(),
              startTime: comp.startTime,  // "MM:SS" string
              endTime: comp.endTime,    // "MM:SS" string
              type: comp.type,
            };
          })
        );

        const decompressed: Stroke[] = [];
        for (const r of results) {
          if (r.status === 'fulfilled') decompressed.push(r.value);
          else console.error('Decompress failed:', r.reason);
        }

        const sorted = decompressed.sort(
          (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
        );

        preloadedStrokesRef.current = sorted;
        setStrokes(sorted); // for UI count display only

      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsPreloading(false);
      }
    })();
  }, [sessionStrokesList]);

  // ── Step 3: RAF sliding window — audio-driven ─────────────────────────────
  //
  // ONE loop replaces N per-stroke async polling loops.
  //
  // Each frame (~16ms):
  //   sessionMs = batchStartMsRef + audio.currentTime * 1000
  //   For each stroke: if sessionMs >= stroke.startMs → advance its points
  //   proportionally based on how far into its draw window we are.
  //   One setRenderTick fires ONE React repaint for all strokes that advanced.
  //
  const startRaf = useCallback((allStrokes: Stroke[]) => {
    // ── Precise ms sync via wall-clock timestamps ─────────────────────────────
    //
    // stroke.timestamp    = Date.now() when the stroke was drawn  (ms-precise)
    // audioBatch[0].timestamp - duration*1000 = when recording started (ms-precise)
    //
    // strokeRelativeMs = stroke.timestamp - recordingStartWallMs
    //
    // This completely avoids the "MM:SS" timerDisplay string which floors to
    // 1-second resolution and was causing the ~1s jitter.
    //
    // Fallback: if audio data is unavailable, fall back to the timerDisplay offset.

    // Primary sync strategy: map stroke wall timestamps onto the recorded audio
    // chunk timeline. This keeps board time physically tied to audio time.
    // Fallbacks remain for older data that may not have enough metadata.
    const storedSessionId = localStorage.getItem('sessionStartSessionId') ?? '';
    const stored = storedSessionId === activeSessionId
      ? parseInt(localStorage.getItem('sessionStartWallMs') ?? '0', 10)
      : 0;
    const sortedAudio = [...sessionAudioList].sort((a, b) => a.batchId - b.batchId);
    const firstBatch  = sortedAudio[0];
    const reconstructed = firstBatch
      ? firstBatch.timestamp - (firstBatch.duration ?? 10) * 1000
      : 0;
    const timerOffsetSessionId = localStorage.getItem('recordingStartSessionId') ?? '';
    const timerOffset = timerOffsetSessionId === activeSessionId
      ? parseInt(localStorage.getItem('recordingStartTimerMs') ?? '0', 10)
      : 0;

    const sessionStartWallMs = stored || reconstructed || 0;
    audioAnchorWallMsRef.current = sessionStartWallMs;

    let accumulatedMs = 0;
    const audioRanges = sortedAudio.map((batch) => {
      const durationMs = Math.max(1, Math.round((batch.duration ?? 10) * 1000));
      const endWallMs = batch.timestamp;
      const startWallMs = endWallMs - durationMs;
      // Use the same formula as audio scheduling (plannedStartMs in play()) so that
      // stroke mapping and audio timing share the exact same session-time origin.
      // The old cumulative `accumulatedMs` diverges when batch.duration > the actual
      // chunk window (e.g. chunk.audio.durationMs > chunk.endMs - chunk.startMs),
      // which pushes later batches' startMs forward past where audio actually plays.
      const startMs = sessionStartWallMs > 0
        ? Math.max(0, startWallMs - sessionStartWallMs)
        : accumulatedMs;
      const endMs = startMs + durationMs;
      // Keep accumulatedMs pointing past the furthest end we've seen (fallback path).
      accumulatedMs = Math.max(accumulatedMs, endMs);
      return { startWallMs, endWallMs, startMs, endMs };
    });
    const audioTimelineEndMs = audioRanges.length > 0 ? audioRanges[audioRanges.length - 1].endMs : 0;

    const mapWallTsToAudioMs = (wallTs: number): number | null => {
      if (audioRanges.length === 0) return null;
      const found = audioRanges.find((range) => wallTs >= range.startWallMs && wallTs <= range.endWallMs);
      if (found) {
        return found.startMs + (wallTs - found.startWallMs);
      }

      // Only clamp tiny out-of-range jitter; large mismatches should fall back
      // to timerDisplay/startTime mapping instead of collapsing everything to t=0.
      const JITTER_TOLERANCE_MS = 2000;
      if (wallTs < audioRanges[0].startWallMs) {
        const delta = audioRanges[0].startWallMs - wallTs;
        if (delta <= JITTER_TOLERANCE_MS) return 0;
        return null;
      }
      const last = audioRanges[audioRanges.length - 1];
      if (wallTs > last.endWallMs) {
        const delta = wallTs - last.endWallMs;
        if (delta <= JITTER_TOLERANCE_MS) return last.endMs;
        return null;
      }
      return null;
    };

    // Safety: only use min-stroke fallback when there is no reliable anchor.
    // Using min stroke as anchor while audio exists can pull board events too early.
    const minStrokeTs = allStrokes.reduce(
      (min, s) => (s.timestamp && s.timestamp < min ? s.timestamp : min),
      Infinity
    );
    const effectiveAnchor =
      sessionStartWallMs > 0
        ? sessionStartWallMs
        : (Number.isFinite(minStrokeTs) ? minStrokeTs : 0);

    const timelines = allStrokes.map(s => {
      const clockStartMs = Math.max(0, timeToMs(s.startTime) - timerOffset);
      const TIMELINE_AGREEMENT_TOLERANCE_MS = 7000;

      let startMs: number;
      if (s.timestamp && audioRanges.length > 0) {
        const mapped = mapWallTsToAudioMs(s.timestamp);
        if (mapped !== null) {
          // Use wall-clock mapping only when it broadly agrees with the stroke's
          // own timeline clock. This prevents a subset of strokes from collapsing
          // near t=0 and appearing all at once.
          startMs = Math.abs(mapped - clockStartMs) <= TIMELINE_AGREEMENT_TOLERANCE_MS
            ? mapped
            : clockStartMs;
        } else if (effectiveAnchor) {
          const wallMs = s.timestamp - effectiveAnchor;
          if (wallMs > 0) {
            startMs = Math.abs(wallMs - clockStartMs) <= TIMELINE_AGREEMENT_TOLERANCE_MS
              ? wallMs
              : clockStartMs;
          } else {
            startMs = clockStartMs;
          }
        } else {
          startMs = clockStartMs;
        }
      } else if (effectiveAnchor && s.timestamp) {
        const wallMs = s.timestamp - effectiveAnchor;
        if (wallMs > 0) {
          startMs = Math.abs(wallMs - clockStartMs) <= TIMELINE_AGREEMENT_TOLERANCE_MS
            ? wallMs
            : clockStartMs;
        } else {
          // timestamp pre-dates anchor — use the recorded timer string as fallback
          // so the stroke still appears at roughly the right moment rather than t=0
          startMs = clockStartMs;
        }
      } else {
        // fallback: timerDisplay "MM:SS" minus stored offset
        startMs = clockStartMs;
      }
      // Preserve captured draw duration so stroke END timing matches audio/time.
      const drawWindow = Math.max(50, s.duration ?? 0);
      return {
        stroke: s,
        startMs,
        drawWindow,
        totalPoints: s.points.length,
      };
    });

    const displayOffsetCandidates = timelines
      .map(({ stroke, startMs }) => {
        const classMs = timeToMs(stroke.startTime);
        if (!Number.isFinite(classMs) || classMs <= 0) return null;
        const offset = classMs - startMs;
        if (!Number.isFinite(offset) || offset < 0 || offset > 5 * 60 * 1000) return null;
        return offset;
      })
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);

    replayDisplayOffsetMsRef.current = displayOffsetCandidates.length > 0
      ? displayOffsetCandidates[Math.floor(displayOffsetCandidates.length / 2)]
      : Math.max(0, timerOffset);

    strokeCursorsRef.current = new Map(timelines.map(t => [t.stroke.id, 0]));
    mediaEventIndexRef.current = 0;
    activeFrameSigRef.current = '';
    activeFrameRef.current = null;
    activePdfPageRef.current = undefined;
    activePdfScrollRatioRef.current = undefined;
    currentBoardInReplayRef.current = 1;
    setActiveFrame(null);
    setActiveFrameUrl(null);
    setIsPdfAutoFollowEnabled(true);
    setIsReplayVideoPlaying(false);
    targetVideoPlaybackStateRef.current = 'pause';
    setTargetVideoPlaybackState('pause');
    setCurrentBoardInReplay(1);
    setActivePdfPage(undefined);
    setActivePdfScrollRatio(undefined);

    const frame = () => {
      if (stopRef.current) return;

      // ✅ Session position: prefer AudioContext clock (continuous, no gaps)
      // Falls back to batchStartMsRef + audio.currentTime for teacher replay.
      const sessionMs = audioCtxRef.current
        ? Math.max(0, (audioCtxRef.current.currentTime - audioCtxOffsetRef.current) * 1000)
        : batchStartMsRef.current + (audioRef.current?.currentTime ?? 0) * 1000;

      // NOTE: timer display (setReplayMs) is intentionally driven by the
      // setInterval below (100ms cadence), NOT here. Calling setReplayMs at
      // 60fps from the RAF causes "Maximum update depth exceeded" in React
      // which freezes the timer display even while strokes keep advancing.

      // Media frames: drive from exact manifest events, not broad time-window filtering.
      while (
        mediaEventIndexRef.current < mediaEventsRef.current.length &&
        sessionMs >= mediaEventsRef.current[mediaEventIndexRef.current].atMs
      ) {
        const event = mediaEventsRef.current[mediaEventIndexRef.current];
        if (event.type === 'show') {
          const pdfPage = resolvePdfPage(event.media, sessionMs);
          const pdfScrollRatio = resolvePdfScrollRatio(event.media, sessionMs);
          const videoState = resolveVideoPlaybackState(event.media, sessionMs);
          activeFrameSigRef.current = `${event.media.id}:${pdfPage ?? ''}`;
          activeFrameRef.current = event.media;
          activePdfPageRef.current = pdfPage;
          activePdfScrollRatioRef.current = pdfScrollRatio;
          targetVideoPlaybackStateRef.current = videoState;
          setActiveFrame(event.media);
          setActiveFrameUrl(null);
          setIsPdfAutoFollowEnabled(true);
          setIsReplayVideoPlaying(videoState === 'play');
          setTargetVideoPlaybackState(videoState);
          setActivePdfPage(pdfPage);
          setActivePdfScrollRatio(pdfScrollRatio);
        } else if (activeFrameSigRef.current.startsWith(`${event.media.id}:`) || activeFrameSigRef.current === event.media.id) {
          activeFrameSigRef.current = '';
          activeFrameRef.current = null;
          activePdfPageRef.current = undefined;
          activePdfScrollRatioRef.current = undefined;
          targetVideoPlaybackStateRef.current = 'pause';
          setActiveFrame(null);
          setActiveFrameUrl(null);
          setIsPdfAutoFollowEnabled(true);
          setIsReplayVideoPlaying(false);
          setTargetVideoPlaybackState('pause');
          setActivePdfPage(undefined);
          setActivePdfScrollRatio(undefined);
        }
        mediaEventIndexRef.current += 1;
      }

      // ── Board tracking — uses same timing logic as stroke drawing ──────────
      // Track the LATEST board (chronologically), not the max. If you write on
      // board 1, then 2, then 1 again, the board should be 1 at the end.
      // board:switch manifest events handle boards the teacher navigated to
      // without drawing on them.
      let activeBoard = 1;
      let lastBoardChangeMs = -1;

      // Apply board:switch events from manifest (populated in student-replay buildReplayBatches)
      for (const ev of boardSwitchTimelineRef.current) {
        if (sessionMs >= ev.timestampMs && ev.timestampMs >= lastBoardChangeMs) {
          activeBoard = ev.toBoard;
          lastBoardChangeMs = ev.timestampMs;
        }
      }

      // Apply stroke-based board tracking — wins when the stroke is more recent
      for (const { stroke, startMs } of timelines) {
        if (sessionMs >= startMs && startMs >= lastBoardChangeMs) {
          activeBoard = stroke.currentBoard ?? activeBoard;  // Latest board, not max
          lastBoardChangeMs = startMs;
        }
      }

      if (activeBoard !== currentBoardInReplayRef.current) {
        currentBoardInReplayRef.current = activeBoard;
        setCurrentBoardInReplay(activeBoard);
      }

      const activeMedia = activeFrameRef.current;
      if (activeMedia && activeMedia.type.toLowerCase().includes('video')) {
        const target = resolveVideoPlaybackState(activeMedia, sessionMs);
        if (target !== targetVideoPlaybackStateRef.current) {
          targetVideoPlaybackStateRef.current = target;
          setTargetVideoPlaybackState(target);
        }
      }

      if (activeMedia && activeMedia.type.toLowerCase().includes('pdf')) {
        const pdfPage = resolvePdfPage(activeMedia, sessionMs);

        if (pdfPage !== activePdfPageRef.current) {
          activePdfPageRef.current = pdfPage;
          setActivePdfPage(pdfPage);
        }

        const pdfScrollRatio = resolvePdfScrollRatio(activeMedia, sessionMs);
        if (
          pdfScrollRatio !== undefined &&
          (activePdfScrollRatioRef.current === undefined || Math.abs(pdfScrollRatio - activePdfScrollRatioRef.current) > 0.005)
        ) {
          activePdfScrollRatioRef.current = pdfScrollRatio;
          setActivePdfScrollRatio(pdfScrollRatio);
        }
      }

      let dirty = false;

      for (const { stroke, startMs, drawWindow, totalPoints } of timelines) {
        const cursor = strokeCursorsRef.current.get(stroke.id) ?? 0;

        // Not started yet or already complete
        if (sessionMs < startMs || cursor >= totalPoints) continue;

        // How far into this stroke's own draw window
        const strokeElapsed = Math.min(sessionMs - startMs, drawWindow);

        // Proportional cursor — always even to keep x/y pairs aligned
        const targetCursor = Math.min(
          totalPoints,
          Math.round((strokeElapsed / drawWindow) * (totalPoints / 2)) * 2
        );

        if (targetCursor > cursor) {
          strokeCursorsRef.current.set(stroke.id, targetCursor);
          drawnMapRef.current.set(stroke.id, {
            ...stroke,
            points: stroke.points.slice(0, targetCursor),
          });
          dirty = true;
        }
      }

      // One repaint for everything that changed this frame
      if (dirty) setRenderTick(t => t + 1);

      const allDone = timelines.every(
        ({ stroke, totalPoints }) =>
          (strokeCursorsRef.current.get(stroke.id) ?? 0) >= totalPoints
      );
      const hasMediaTimeline = mediaTimelineRef.current.length > 0;
      if (!allDone || hasMediaTimeline || sessionMs < audioTimelineEndMs) {
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    rafRef.current = requestAnimationFrame(frame);
  }, [sessionAudioList, activeSessionId]);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ── Audio batch player ────────────────────────────────────────────────────
  //
  // Before each batch plays, batchStartMsRef is updated by summing the actual
  // durations of all previous batches. This keeps the RAF's sessionMs formula
  // accurate regardless of gaps between batches.
  //
  const _playAudioBatch = useCallback(async (
    batchIndex: number,
    sortedBatches: AudioBatch[],
  ): Promise<void> => {
    if (batchIndex >= sortedBatches.length || stopRef.current) return;

    const batch = sortedBatches[batchIndex];

    const anchorWallMs = audioAnchorWallMsRef.current;
    const batchDurationMs = Math.max(1, Math.round((batch.duration ?? 10) * 1000));
    const batchWallStartMs = batch.timestamp - batchDurationMs;
    const plannedStartMs = anchorWallMs > 0
      ? Math.max(0, batchWallStartMs - anchorWallMs)
      : Math.max(0, playedSessionMsRef.current);

    // Keep monotonic progression and honor seek offset.
    playedSessionMsRef.current = Math.max(playedSessionMsRef.current, plannedStartMs);
    const batchStartMs = Math.max(0, playedSessionMsRef.current);

    const startInsideBatchMs = Math.max(0, batchStartMs - plannedStartMs);
    if (startInsideBatchMs >= batchDurationMs - 20) {
      playedSessionMsRef.current = Math.max(playedSessionMsRef.current, plannedStartMs + batchDurationMs);
      return;
    }

    // sessionMs = batchStartBaseMs + currentTime*1000
    // When seeking inside a chunk, keep base at planned chunk start.
    batchStartMsRef.current = plannedStartMs;

    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    // Preserve MIME type — IDB blobs sometimes lose their type on retrieval
    const blobType = batch.blob.type || 'audio/webm';
    const typedBlob = batch.blob.type ? batch.blob : new Blob([batch.blob], { type: blobType });
    const blobUrl = URL.createObjectURL(typedBlob);
    currentBlobUrlRef.current = blobUrl;
    if (!audioRef.current) throw new Error('Audio element missing');
    setCurrentBatch(batchIndex);

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audioRef.current?.removeEventListener('ended', onEnded);
        audioRef.current?.removeEventListener('error', onError);
      };
      const onEnded = () => {
        const playedMs = Math.max(0, (audioRef.current?.currentTime ?? batch.duration ?? 10) * 1000);
        const actualEndMs = batchStartMs + playedMs;
        const plannedEndMs = anchorWallMs > 0
          ? Math.max(plannedStartMs, batch.timestamp - anchorWallMs)
          : actualEndMs;
        playedSessionMsRef.current = Math.max(actualEndMs, plannedEndMs);
        cleanup();

        // Advance batchStartMsRef through the silent gap between where audio
        // content ended and where the NEXT batch will begin.  This must span
        // the full inter-batch gap (e.g. timestamps 60 s apart but each blob
        // only ~10 s of content) so strokes appear progressively instead of
        // bursting all at once when the next batch fires.
        //
        // fillTargetMs  = start of the next batch in session time
        //   - when a next batch exists:  nextBatch.timestamp - nextDurationMs - anchorWallMs
        //   - last batch:                plannedEndMs (within-batch gap only)
        //
        // Cap real-time fill to 2 s so large gaps don't stall the viewer.
        let fillTargetMs = playedSessionMsRef.current; // fallback: within-batch
        const nextBatchInFill = sortedBatches[batchIndex + 1];
        if (nextBatchInFill && anchorWallMs > 0) {
          const nextDurMs = Math.max(1, Math.round((nextBatchInFill.duration ?? 10) * 1000));
          const nextPlannedStart = Math.max(0, (nextBatchInFill.timestamp - nextDurMs) - anchorWallMs);
          fillTargetMs = Math.max(fillTargetMs, nextPlannedStart);
        }
        const gapMs = fillTargetMs - actualEndMs;
        if (gapMs > 150 && !stopRef.current) {
          const gapStart = performance.now();
          // Adaptive fill speed:
          //  • Short gaps (≤ 3 s) — 1:1 real time so tiny inter-chunk transitions
          //    feel like a natural clock tick rather than a visible jump.
          //  • Long gaps (> 3 s) — 5× speed, capped at 15 s real time.
          //    Silently fast-forwards the board through periods where the teacher
          //    wasn't speaking, so the viewer reaches the next audio section in
          //    ~10 s instead of waiting 47+ s in silence.
          const realFillMs = gapMs <= 3_000
            ? gapMs                               // 1:1 for short gaps
            : Math.min(gapMs / 5, 15_000);        // 5× for long gaps, cap 15 s
          const speedFactor = gapMs / realFillMs;
          const fillGap = () => {
            if (stopRef.current) { resolve(); return; }
            const elapsed = performance.now() - gapStart;
            const sessionProgress = Math.min(elapsed * speedFactor, gapMs);
            const currentAudioMs = (audioRef.current?.currentTime ?? 0) * 1000;
            batchStartMsRef.current = actualEndMs + sessionProgress - currentAudioMs;
            if (sessionProgress >= gapMs) {
              resolve();
            } else {
              requestAnimationFrame(fillGap);
            }
          };
          requestAnimationFrame(fillGap);
        } else {
          resolve();
        }
      };
      const onError = () => {
        const err = audioRef.current?.error;
        const msg = err ? `code ${err.code}: ${err.message}` : 'unknown';
        console.error(`[Replay] batch ${batch.batchId} error: ${msg}, blob type: ${blobType}, size: ${batch.blob.size}`);
        // Keep timeline monotonic even when one batch fails to decode.
        playedSessionMsRef.current = batchStartMs + Math.max(0, (batch.duration ?? 10) * 1000);
        cleanup();
        // Don't reject on decode errors — move to next batch so remaining audio still plays
        resolve();
      };
      audioRef.current?.addEventListener('ended', onEnded);
      audioRef.current?.addEventListener('error', onError);

      // Set src and load AFTER attaching listeners so no events are missed
      audioRef.current!.src = blobUrl;
      audioRef.current!.playbackRate = 1;
      audioRef.current!.defaultPlaybackRate = 1;
      audioRef.current!.preservesPitch = true;
      audioRef.current!.load();
      audioRef.current!.currentTime = Math.max(0, startInsideBatchMs / 1000);
      audioRef.current!.play().catch(e => { cleanup(); reject(e); });
    });
  }, []);
  void _playAudioBatch; // retained for future batch-level playback — reference suppresses TS6133 ──────────────────────────────────────────────────────────────────
  const play = async () => {
    if (isPlaying || isPreloading) return;

    const readyStrokes = preloadedStrokesRef.current;
    const hasStrokes = readyStrokes.length > 0;
    const hasAudio = sessionAudioList.length > 0;
    const hasMedia = mediaTimelineRef.current.length > 0;
    if (!hasStrokes && !hasAudio && !hasMedia) return;

    stopRef.current = false;
    const timerOffsetSessionId = localStorage.getItem('recordingStartSessionId') ?? '';
    replayDisplayOffsetMsRef.current = timerOffsetSessionId === activeSessionId
      ? Math.max(0, parseInt(localStorage.getItem('recordingStartTimerMs') ?? '0', 10))
      : 0;
    const startFromSessionMs = Math.max(0, startFromSessionMsRef.current);
    batchStartMsRef.current = startFromSessionMs;
    playedSessionMsRef.current = startFromSessionMs;
    drawnMapRef.current = new Map();
    strokeCursorsRef.current = new Map();
    mediaEventIndexRef.current = 0;
    activeFrameSigRef.current = '';
    activeFrameRef.current = null;
    activePdfPageRef.current = undefined;
    activePdfScrollRatioRef.current = undefined;
    setActiveFrame(null);
    setActiveFrameUrl(null);
    setIsPdfAutoFollowEnabled(true);
    setIsReplayVideoPlaying(false);
    targetVideoPlaybackStateRef.current = 'pause';
    setTargetVideoPlaybackState('pause');
    setActivePdfPage(undefined);
    setActivePdfScrollRatio(undefined);
    setRenderTick(0);
    setCurrentBatch(0);
    setIsPlaying(true);

    const sortedAudio = [...sessionAudioList].sort((a, b) => a.batchId - b.batchId);
    const anchorSessionId = localStorage.getItem('sessionStartSessionId') ?? '';
    const storedAnchor = anchorSessionId === activeSessionId
      ? parseInt(localStorage.getItem('sessionStartWallMs') ?? '0', 10)
      : 0;
    const firstAudioBatch = sortedAudio[0];
    const reconstructedAnchor = firstAudioBatch
      ? firstAudioBatch.timestamp - Math.max(1, Math.round((firstAudioBatch.duration ?? 10) * 1000))
      : 0;
    audioAnchorWallMsRef.current = storedAnchor || reconstructedAnchor || 0;

    if (hasAudio && hasStrokes) {
      // Schedule every audio batch via AudioContext so audio.currentTime
      // advances continuously — including through silent gaps between batches.
      // The board clock reads (audioCtx.currentTime - offset)*1000, so board
      // and audio are always in sync with zero drift and no fill animation.
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      // Browsers may start AudioContext in "suspended" state when created
      // outside an active user-gesture frame (e.g. from setTimeout during seek).
      // resume() is a no-op when already running, so it is safe to always call.
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      // Park the offset far in the future so sessionMs = max(0, …) = 0 while
      // decoding runs.  AudioContext.currentTime starts advancing immediately
      // on creation, so without this the board would show false progress during
      // the decode phase and then snap back to 0 when the real offset is set.
      audioCtxOffsetRef.current = audioCtx.currentTime + 3600;

      // Decode all batches in parallel (native decoders — fast)
      const anchorWallMs = audioAnchorWallMsRef.current;
      decodeFailureCountRef.current = 0;
      const decoded = await Promise.all(sortedAudio.map(async (batch) => {
        try {
          const ab = await batch.blob.arrayBuffer();
          // Guard: reject blobs that are clearly not audio (e.g. Cloudinary HTML error pages)
          if (ab.byteLength < 32) {
            console.warn(`[Replay] batch ${batch.batchId}: blob too small (${ab.byteLength} bytes) — likely empty Cloudinary asset`);
            decodeFailureCountRef.current++;
            return null;
          }
          const buffer = await audioCtx.decodeAudioData(ab);
          const batchDurationMs = Math.max(1, Math.round((batch.duration ?? 10) * 1000));
          const plannedStartMs = anchorWallMs > 0
            ? Math.max(0, (batch.timestamp - batchDurationMs) - anchorWallMs)
            : 0;
          console.log(`[Replay] batch ${batch.batchId}: decoded ${buffer.duration.toFixed(2)}s @ session ${Math.round(plannedStartMs/1000)}s`);
          return { buffer, plannedStartMs };
        } catch (e) {
          console.warn(`[Replay] batch ${batch.batchId}: decodeAudioData failed — blob type=${batch.blob.type}, size=${batch.blob.size}`, e);
          decodeFailureCountRef.current++;
          return null;
        }
      }));

      // Summary log so it's easy to spot gaps vs failures in DevTools
      const okCount = decoded.filter(Boolean).length;
      const failCount = decodeFailureCountRef.current;
      console.log(`[Replay] decode summary: ${okCount} ok, ${failCount} failed out of ${sortedAudio.length} batches`);
      if (failCount > 0) {
        console.warn('[Replay] Some batches failed to decode. If sizeBytes was >0 on those chunks, the Cloudinary asset may be corrupt or missing.');
      }

      if (stopRef.current) {
        await audioCtx.close();
        audioCtxRef.current = null;
        return;
      }

      // Pad each decoded buffer to its planned duration to eliminate audible
      // silence gaps at batch transitions. If the WAV is more than 500ms
      // shorter than the scheduled time window, append silence so the next
      // batch starts exactly on schedule.
      // Guard: only pad when the buffer is at least 50% of the planned duration
      // (avoids inflating pre-WAV-fix batches that are genuinely short).
      for (let _pi = 0; _pi < decoded.length; _pi++) {
        const _item = decoded[_pi];
        if (!_item) continue;
        const _next = decoded.slice(_pi + 1).find(Boolean);
        const _plannedEndMs = _next
          ? _next.plannedStartMs
          : _item.plannedStartMs + Math.round(_item.buffer.duration * 1000) + 2000;
        const _plannedSec = Math.max(0, _plannedEndMs - _item.plannedStartMs) / 1000;
        const _gapSec = _plannedSec - _item.buffer.duration;
        if (_gapSec > 0.5 && _item.buffer.duration >= _plannedSec * 0.5) {
          const _targetLen = Math.ceil(_plannedSec * _item.buffer.sampleRate);
          const _padded = audioCtx.createBuffer(
            _item.buffer.numberOfChannels, _targetLen, _item.buffer.sampleRate
          );
          for (let _c = 0; _c < _item.buffer.numberOfChannels; _c++) {
            _padded.copyToChannel(_item.buffer.getChannelData(_c), _c, 0);
          }
          _item.buffer = _padded;
        }
      }

      // Build audio-period map so the interval can light up the silence indicator.
      audioPeriodsRef.current = decoded
        .filter(Boolean)
        .map((item) => ({
          startMs: item!.plannedStartMs,
          endMs: item!.plannedStartMs + item!.buffer.duration * 1000,
        }));

      // scheduleBase = context time when the session clock should read startFromSessionMs.
      // audioCtxOffsetRef = scheduleBase - startFromSessionMs/1000
      // → sessionMs = (ctx.currentTime - audioCtxOffsetRef)*1000 = startFromSessionMs at t=scheduleBase ✓
      const scheduleBase = audioCtx.currentTime + 0.1;
      audioCtxOffsetRef.current = scheduleBase - startFromSessionMs / 1000;

      for (const item of decoded) {
        if (!item || stopRef.current) continue;
        const src = audioCtx.createBufferSource();
        src.buffer = item.buffer;
        src.connect(audioCtx.destination);
        if (item.plannedStartMs < startFromSessionMs) {
          // Batch starts before seek position — play from the correct offset
          const playOffset = (startFromSessionMs - item.plannedStartMs) / 1000;
          if (playOffset < item.buffer.duration) {
            src.start(scheduleBase, playOffset);
          }
          // else: entire batch is before seek point, skip
        } else {
          src.start(scheduleBase + (item.plannedStartMs - startFromSessionMs) / 1000);
        }
      }

      startRaf(readyStrokes);

      // Wait until session clock reaches full duration or stop is signalled
      const sessionEndSec = audioCtxOffsetRef.current + replayDurationMs / 1000;
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (stopRef.current || (audioCtxRef.current?.currentTime ?? 0) >= sessionEndSec) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });

      await audioCtx.close();
      // Flush any media hide events that are still pending at session end.
      // The RAF runs at 60 fps and may have been cancelled just before sessionMs
      // reached closedMs, so we process remaining events explicitly here.
      {
        const flushMs = replayDurationMs;
        while (
          mediaEventIndexRef.current < mediaEventsRef.current.length &&
          flushMs >= mediaEventsRef.current[mediaEventIndexRef.current].atMs
        ) {
          const evt = mediaEventsRef.current[mediaEventIndexRef.current];
          if (evt.type === 'hide') {
            activeFrameSigRef.current = '';
            setActiveFrame(null);
            setActivePdfPage(undefined);
          }
          mediaEventIndexRef.current += 1;
        }
      }
      // stopRaf BEFORE nulling the ref so the last RAF frame still reads
      // sessionMs from AudioContext.currentTime (frozen at close).
      stopRaf();
      audioCtxRef.current = null;

    } else if (hasAudio && !hasStrokes) {
      // Audio only (or media + audio) — same AudioContext scheduling approach.
      const audioCtxAO = new AudioContext();
      audioCtxRef.current = audioCtxAO;
      if (audioCtxAO.state === 'suspended') await audioCtxAO.resume();
      audioCtxOffsetRef.current = audioCtxAO.currentTime + 3600; // freeze sessionMs=0 during decode

      const anchorWallMsAO = audioAnchorWallMsRef.current;
      const decodedAO = await Promise.all(sortedAudio.map(async (batch) => {
        try {
          const ab = await batch.blob.arrayBuffer();
          const buffer = await audioCtxAO.decodeAudioData(ab);
          const batchDurationMs = Math.max(1, Math.round((batch.duration ?? 10) * 1000));
          const plannedStartMs = anchorWallMsAO > 0
            ? Math.max(0, (batch.timestamp - batchDurationMs) - anchorWallMsAO)
            : 0;
          return { buffer, plannedStartMs };
        } catch (e) {
          console.warn('[Replay] failed to decode batch (ao)', batch.batchId, e);
          return null;
        }
      }));

      if (stopRef.current) {
        await audioCtxAO.close();
        audioCtxRef.current = null;
        return;
      }

      const scheduleBaseAO = audioCtxAO.currentTime + 0.1;
      audioCtxOffsetRef.current = scheduleBaseAO - startFromSessionMs / 1000;

      for (const item of decodedAO) {
        if (!item || stopRef.current) continue;
        const src = audioCtxAO.createBufferSource();
        src.buffer = item.buffer;
        src.connect(audioCtxAO.destination);
        if (item.plannedStartMs < startFromSessionMs) {
          const playOffset = (startFromSessionMs - item.plannedStartMs) / 1000;
          if (playOffset < item.buffer.duration) src.start(scheduleBaseAO, playOffset);
        } else {
          src.start(scheduleBaseAO + (item.plannedStartMs - startFromSessionMs) / 1000);
        }
      }

      if (hasMedia) startRaf([]);

      const sessionEndSecAO = audioCtxOffsetRef.current + replayDurationMs / 1000;
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (stopRef.current || (audioCtxRef.current?.currentTime ?? 0) >= sessionEndSecAO) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });

      await audioCtxAO.close();
      // Flush remaining media hide events before stopping the RAF.
      if (hasMedia) {
        const flushMs = replayDurationMs;
        while (
          mediaEventIndexRef.current < mediaEventsRef.current.length &&
          flushMs >= mediaEventsRef.current[mediaEventIndexRef.current].atMs
        ) {
          const evt = mediaEventsRef.current[mediaEventIndexRef.current];
          if (evt.type === 'hide') {
            activeFrameSigRef.current = '';
            setActiveFrame(null);
            setActivePdfPage(undefined);
          }
          mediaEventIndexRef.current += 1;
        }
        stopRaf();
      }
      audioCtxRef.current = null;

    } else if ((hasStrokes || hasMedia) && !hasAudio) {
      // Board only — feed performance.now() into batchStartMsRef each frame
      // so the RAF formula still works: sessionMs = batchStartMs + 0 = elapsed
      const wallStart = performance.now();
      const driveRef = () => {
        if (stopRef.current) return;
        batchStartMsRef.current = performance.now() - wallStart;
        rafRef.current = requestAnimationFrame(driveRef);
      };
      startRaf(readyStrokes);
      driveRef();
      const strokeDurationMs = hasStrokes
        ? Math.max(...readyStrokes.map(s => timeToMs(s.endTime)))
        : 0;
      const finiteMediaCloseMs = mediaTimelineRef.current
        .filter((item) => Number.isFinite(item.closeMs))
        .map((item) => item.closeMs);
      const mediaDurationMs = finiteMediaCloseMs.length > 0
        ? Math.max(...finiteMediaCloseMs)
        : mediaTimelineRef.current.length > 0
          ? Math.max(...mediaTimelineRef.current.map((item) => item.showMs)) + 5000
          : 0;
      const totalDurationMs = Math.max(strokeDurationMs, mediaDurationMs, 1000);
      await new Promise<void>(resolve => {
        const check = setInterval(() => {
          if (stopRef.current || (performance.now() - wallStart) >= totalDurationMs) {
            clearInterval(check);
            resolve();
          }
        }, 200);
      });
      stopRaf();
    }

    if (!stopRef.current) setIsPlaying(false);
  };

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stop = () => {
    stopRef.current = true;
    stopRaf();
    setIsPlaying(false);
    playedSessionMsRef.current = 0;
    startFromSessionMsRef.current = 0;
    activeFrameRef.current = null;
    activePdfPageRef.current = undefined;
    activePdfScrollRatioRef.current = undefined;
    setActiveFrame(null);
    setActiveFrameUrl(null);
    setIsPdfAutoFollowEnabled(true);
    setIsReplayVideoPlaying(false);
    targetVideoPlaybackStateRef.current = 'pause';
    setTargetVideoPlaybackState('pause');
    setActivePdfPage(undefined);
    setActivePdfScrollRatio(undefined);
    mediaEventIndexRef.current = 0;
    activeFrameSigRef.current = '';
    audioPeriodsRef.current = [];
    decodeFailureCountRef.current = 0;
    setIsSilentGap(false);
    // Close AudioContext (silences scheduled nodes immediately)
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {/* ignore */});
      audioCtxRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  };

  useEffect(() => {
    const video = replayVideoRef.current;
    if (!video) return;

    if (targetVideoPlaybackState === 'play') {
      video.play().then(() => setIsReplayVideoPlaying(true)).catch(() => setIsReplayVideoPlaying(false));
    } else {
      video.pause();
      setIsReplayVideoPlaying(false);
    }
  }, [targetVideoPlaybackState, activeFrameUrl, activeFrame?.id]);

  // ── Clear ─────────────────────────────────────────────────────────────────
  const Cleardata = async () => {
    setIsClearing(true);
    try {
      await clearAudio();
      await clearClass();
      localStorage.removeItem('currentBatches');
      localStorage.removeItem('recordingStartTimerMs');
      localStorage.removeItem('recordingStartSessionId');
      localStorage.removeItem('sessionStartWallMs');
      localStorage.removeItem('sessionStartSessionId');
      setStrokesList([]);
      setAudioList([]);
      setStrokes([]);
      setReplayMs(0);
      preloadedStrokesRef.current = [];
      drawnMapRef.current = new Map();
      setRenderTick(0);
    } catch (err) {
      console.error('❌ Clear failed:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader className="w-7 h-7 animate-spin text-student-chestnut" />
        <p className="text-sm font-medium">Loading class...</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="max-w-sm rounded-2xl border border-red-200 bg-white p-6 text-center shadow">
        <p className="text-sm font-medium text-slate-800">We couldn't load this class</p>
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      </div>
    </div>
  );
  if (isClearing) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-student-chestnut mx-auto" />
        <p className="mt-4 text-sm text-gray-600">Removing from device...</p>
      </div>
    </div>
  );
  if (strokes.length === 0 && audioList.length === 0) return (
    <div className="p-6 text-center text-slate-400 font-bold font-poppins text-xl flex items-center justify-center min-h-screen bg-slate-50">
      No replay data available
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            <button
              onClick={play}
              disabled={isPlaying || isPreloading}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                isPlaying || isPreloading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-student-chestnut hover:bg-[#4052D6] text-white shadow-sm active:scale-95'
              }`}
            >
              {isPreloading
                ? <><Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /><span className="text-xs sm:text-sm hidden xs:inline">Preparing...</span><span className="text-xs xs:hidden">...</span></>
                : <><PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" /><span className="text-xs sm:text-sm">Play</span></>
              }
            </button>

            <button
              onClick={stop}
              disabled={!isPlaying}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                !isPlaying
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm active:scale-95'
              }`}
            >
              <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">Stop</span>
            </button>

            <button
              disabled={isPlaying || isClearing || isPreloading}
              onClick={Cleardata}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                isPlaying || isClearing || isPreloading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm active:scale-95'
              }`}
            >
              <Trash className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm hidden sm:inline">{isClearing ? 'Removing...' : 'Remove from device'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-student-chestnut/10 border border-student-chestnut/20 rounded-full">
            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 text-student-chestnut" />
            <div className="text-xs sm:text-sm font-semibold text-student-chestnut">
              Board {Math.min(currentBoardInReplay, totalBoards)}/{totalBoards}
            </div>
          </div>

          {isPlaying && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors duration-300 ${
              isSilentGap
                ? 'bg-amber-50 border-amber-300'
                : 'bg-blue-50 border-blue-200'
            }`}>
              {isSilentGap ? (
                <VolumeX className="w-4 h-4 text-amber-500" />
              ) : (
                <Circle className="w-2 h-2 fill-blue-500 text-blue-500 animate-pulse" />
              )}
              <div className={`text-sm font-medium ${isSilentGap ? 'text-amber-700' : 'text-blue-700'}`}>
                {isSilentGap
                  ? decodeFailureCountRef.current > 0
                    ? 'Audio unavailable (load error)'
                    : 'No audio in this segment'
                  : 'Playing'}
              </div>
              {isSilentGap && decodeFailureCountRef.current === 0 && (
                <button
                  onClick={skipToNextAudio}
                  className="ml-1 text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
                >
                  Skip →
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-100 border border-slate-200 rounded-full">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            <div className="font-mono text-lg sm:text-2xl font-bold text-slate-800 tabular-nums">
              {formatReplayMs(replayMs)}
            </div>
          </div>
        </div>
        <div className="px-2 sm:px-4 pb-2 sm:pb-4">
          <input
            type="range"
            min={0}
            max={replayDurationMs}
            step={100}
            value={isSeeking ? scrubMs : replayMs}
            onChange={(e) => {
              const value = Number(e.target.value);
              setIsSeeking(true);
              setScrubMs(value);
              setReplayMs(value);
            }}
            onMouseUp={(e) => {
              const value = Number((e.target as HTMLInputElement).value);
              setIsSeeking(false);
              commitSeek(value);
            }}
            onTouchEnd={(e) => {
              const value = Number((e.target as HTMLInputElement).value);
              setIsSeeking(false);
              commitSeek(value);
            }}
            className="w-full accent-student-chestnut cursor-pointer"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>{formatReplayMs(isSeeking ? scrubMs : replayMs)}</span>
            <span>{formatReplayMs(replayDurationMs)}</span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} />

      {/* ── Canvas ── */}
      <div className="flex-1 min-h-0 p-1 sm:p-4 overflow-hidden">
        <div
          ref={parentRef}
          className="relative h-full bg-[#f0f2f5] rounded-lg shadow-lg border border-gray-200 overflow-hidden"
        >
          {(() => {
            // Scale recorded coordinate space to fit the current display size
            // while preserving aspect ratio (letterboxed on the short axis).
            const recW = recordedBoardDimsRef.current?.width ?? 0;
            const recH = recordedBoardDimsRef.current?.height ?? 0;
            const hasRecordedDims = recW > 0 && recH > 0;
            const boardScale = hasRecordedDims
              ? Math.min(dimensions.width / recW, dimensions.height / recH)
              : 1;
            const boardOffsetX = hasRecordedDims
              ? (dimensions.width - recW * boardScale) / 2
              : 0;
            const boardOffsetY = hasRecordedDims
              ? (dimensions.height - recH * boardScale) / 2
              : 0;
            return (
              <Stage
                width={dimensions.width}
                height={dimensions.height}
                style={{ background: '#f0f2f5' }}
              >
                {/* Outer background + white board area (letterboxed) */}
                <Layer listening={false}>
                  <Rect x={0} y={0} width={dimensions.width} height={dimensions.height} fill="#f0f2f5" />
                  <Rect
                    x={boardOffsetX}
                    y={boardOffsetY}
                    width={hasRecordedDims ? recW * boardScale : dimensions.width}
                    height={hasRecordedDims ? recH * boardScale : dimensions.height}
                    fill="white"
                  />
                </Layer>

                {/* Drawing layer — scaled from recorded coord space to display space */}
                <Layer
                  listening={false}
                  x={boardOffsetX}
                  y={boardOffsetY}
                  scaleX={boardScale}
                  scaleY={boardScale}
                >
                  {drawn.map((stroke) => (
                    <Line
                      key={stroke.id}
                      points={stroke.points}
                      stroke={stroke.type === 'eraser' ? 'white' : stroke.color}
                      strokeWidth={stroke.type === 'eraser' ? 20 : 4}
                      lineCap="round"
                      lineJoin="round"
                      tension={0.4}
                      opacity={stroke.type === 'eraser' ? 1 : 0.9}
                      globalCompositeOperation={
                        stroke.type === 'eraser' ? 'destination-out' : 'source-over'
                      }
                    />
                  ))}
                </Layer>
              </Stage>
            );
          })()}

          {activeFrame && (
            <div className={`pointer-events-none absolute inset-0 flex justify-center p-2 sm:p-4 ${activeFrame.type.toLowerCase().includes('pdf') ? 'items-start' : 'items-center'}`}>
              <div className={`pointer-events-auto relative overflow-hidden border border-slate-200 bg-white shadow-2xl rounded-xl ${getReplayFrameClassByType(activeFrame.type)}`}>
                <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  Frame 1
                </div>

                {activeFrame.type.toLowerCase().includes('pdf') && (
                  <button
                    type="button"
                    className="absolute right-2 top-2 z-10 rounded bg-black/70 px-2 py-1 text-xs text-white hover:bg-black/80"
                    onClick={() => setIsPdfAutoFollowEnabled((prev) => !prev)}
                  >
                    {isPdfAutoFollowEnabled ? 'Manual scroll' : 'Follow replay'}
                  </button>
                )}

                {activeFrame.type.toLowerCase().includes('video') ? (
                  <>
                    <div className="absolute left-2 top-10 z-10 rounded bg-black/60 px-2 py-1 text-xs text-white">
                      Video: {isReplayVideoPlaying ? 'Playing' : 'Paused'}
                    </div>
                    <video
                      ref={replayVideoRef}
                      src={activeFrameUrl ?? activeFrame.url}
                      controls
                      muted={false}
                      playsInline
                      onPlay={() => setIsReplayVideoPlaying(true)}
                      onPause={() => setIsReplayVideoPlaying(false)}
                      onEnded={() => setIsReplayVideoPlaying(false)}
                      className="h-full w-full object-contain bg-black"
                    />
                  </>
                ) : activeFrame.type.toLowerCase().includes('pdf') ? (
                  <PdfScrollViewer
                    fileUrl={activeFrameUrl ?? activeFrame.url}
                    mode="replay"
                    preferIframe={false}
                    controlledPage={isPdfAutoFollowEnabled ? activePdfPage : undefined}
                    controlledScrollRatio={isPdfAutoFollowEnabled ? activePdfScrollRatio : undefined}
                    onScrollRatioChange={() => {
                      if (isPdfAutoFollowEnabled) {
                        setIsPdfAutoFollowEnabled(false);
                      }
                    }}
                    className="bg-white"
                  />
                ) : (
                  <img src={activeFrameUrl ?? activeFrame.url} alt={activeFrame.name} className="h-full w-full object-contain bg-black" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import * as signalR from "@microsoft/signalr";
import { token } from "@/utils";

// ── Wire shapes (hub contract) ───────────────────────────────────────────────

export interface HubStroke {
  id: string;
  pts: [number, number][];
  c: string;
  w: number;
  ts: number;
  currentBoard: number;
  seq?: number;
  author?: string;
  /** "eraser" renders with destination-out compositing. Optional/absent
   * means a normal stroke — additive field, harmless for the hub to just
   * store/relay opaquely alongside the rest of the stroke JSON. */
  strokeType?: "stroke" | "eraser";
}

export interface StudentBoardInfo {
  studentId: string;
  currentBoard: number;
  strokeCount: number;
}

export interface BoardSnapshot {
  currentBoard: number;
  boards: number[];
  strokes: HubStroke[];
  seq: number;
  secondsRemaining: number;
  sharedStudentId: string | null;
  myBoard?: { currentBoard: number; strokes: HubStroke[]; seq: number };
  studentBoards?: StudentBoardInfo[];
}

export interface StudentBoardSnapshot {
  studentId: string;
  currentBoard: number;
  strokes: HubStroke[];
  seq: number;
}

interface ServerEventMap {
  Stroke: HubStroke;
  StrokeRemoved: { strokeId: string; seq: number };
  BoardCleared: { board: number; seq: number };
  BoardChanged: { board: number; seq: number };
  StudentStroke: { studentId: string; stroke: HubStroke };
  StudentStrokeRemoved: { studentId: string; strokeId: string; seq: number };
  StudentBoardCleared: { studentId: string; board: number; seq: number };
  StudentBoardChanged: { studentId: string; board: number; seq: number };
  BoardShared: { studentId: string | null; snapshot: BoardSnapshot };
  Presence: { userId: string; role: string; joined: boolean };
  Warning: { minutesLeft: number };
  SpeakChanged: { studentId: string; canSpeak: boolean };
  ClassEnded: { reason: string };
}

export type LiveBoardEvent = keyof ServerEventMap;
type EventHandler<K extends LiveBoardEvent> = (payload: ServerEventMap[K]) => void;

const EVENT_NAMES: LiveBoardEvent[] = [
  "Stroke",
  "StrokeRemoved",
  "BoardCleared",
  "BoardChanged",
  "StudentStroke",
  "StudentStrokeRemoved",
  "StudentBoardCleared",
  "StudentBoardChanged",
  "BoardShared",
  "Presence",
  "Warning",
  "SpeakChanged",
  "ClassEnded",
];

export type LiveBoardHubStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

/**
 * Thin, framework-agnostic wrapper around the live-board SignalR hub. Kept
 * outside React so non-component code (e.g. a page-unload handler) can reach
 * the same connection without going through a hook.
 *
 * CRITICAL: the server forgets a connection's state on every reconnect, so
 * this class always re-issues JoinClass on (re)connect — callers never have
 * to remember to do it themselves.
 */
export class LiveBoardHubClient {
  private connection: signalR.HubConnection | null = null;
  private liveClassId: string | null = null;
  private status: LiveBoardHubStatus = "disconnected";

  private readonly listeners = new Map<LiveBoardEvent, Set<(payload: unknown) => void>>();
  private readonly statusListeners = new Set<(status: LiveBoardHubStatus) => void>();
  private readonly errorListeners = new Set<(message: string) => void>();
  private readonly snapshotListeners = new Set<(snapshot: BoardSnapshot) => void>();

  getStatus(): LiveBoardHubStatus {
    return this.status;
  }

  onStatusChange(handler: (status: LiveBoardHubStatus) => void): () => void {
    this.statusListeners.add(handler);
    return () => this.statusListeners.delete(handler);
  }

  /** Fires with a gentle, user-presentable message on any hub exception —
   * never let one crash the UI, just surface it (per the hub contract). */
  onError(handler: (message: string) => void): () => void {
    this.errorListeners.add(handler);
    return () => this.errorListeners.delete(handler);
  }

  /** Fires with the fresh snapshot every time JoinClass is (re-)issued —
   * including the automatic rejoin after a reconnect — so callers can
   * replace their local board state wholesale instead of trying to diff it. */
  onSnapshot(handler: (snapshot: BoardSnapshot) => void): () => void {
    this.snapshotListeners.add(handler);
    return () => this.snapshotListeners.delete(handler);
  }

  on<K extends LiveBoardEvent>(event: K, handler: EventHandler<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const set = this.listeners.get(event)!;
    set.add(handler as (payload: unknown) => void);
    return () => set.delete(handler as (payload: unknown) => void);
  }

  private emit<K extends LiveBoardEvent>(event: K, payload: ServerEventMap[K]): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }

  private setStatus(status: LiveBoardHubStatus): void {
    this.status = status;
    this.statusListeners.forEach((handler) => handler(status));
  }

  private emitError(message: string): void {
    this.errorListeners.forEach((handler) => handler(message));
  }

  /** Connects and joins `liveClassId`. Resolves with the initial snapshot.
   * Safe to call once per room mount. */
  async connect(liveClassId: string): Promise<BoardSnapshot> {
    this.liveClassId = liveClassId;
    this.setStatus("connecting");

    const base = (import.meta.env.VITE_API_BASE_URL as string).replace(/\/$/, "");
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${base}/hubs/live-board`, {
        accessTokenFactory: () => token.getToken() ?? "",
      })
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    for (const name of EVENT_NAMES) {
      connection.on(name, (payload: unknown) => {
        this.emit(name, payload as never);
      });
    }

    connection.onreconnecting(() => this.setStatus("reconnecting"));
    connection.onreconnected(() => {
      this.setStatus("connected");
      // Server forgot our previous JoinClass — rejoin immediately so the
      // board state (and anyone watching it) catches back up.
      void this.rejoin();
    });
    connection.onclose(() => this.setStatus("disconnected"));

    this.connection = connection;

    try {
      await connection.start();
    } catch (err) {
      this.setStatus("disconnected");
      throw err instanceof Error ? err : new Error("Could not connect to the live class board.");
    }

    this.setStatus("connected");
    return this.joinClass();
  }

  private async rejoin(): Promise<void> {
    try {
      const snapshot = await this.joinClass();
      this.snapshotListeners.forEach((handler) => handler(snapshot));
    } catch (err) {
      this.emitError(err instanceof Error ? err.message : "Lost the live board connection — retrying…");
    }
  }

  private async joinClass(): Promise<BoardSnapshot> {
    if (!this.connection || !this.liveClassId) {
      throw new Error("Not connected to a live class.");
    }
    return this.connection.invoke<BoardSnapshot>("JoinClass", this.liveClassId);
  }

  /** Forces a fresh JoinClass + snapshot replace outside of the automatic
   * hub-reconnect path — used after a LiveKit reconnect, since the main
   * board's live strokes now travel over the data channel and may have been
   * missed while that connection was dropping, even though the hub itself
   * never disconnected. */
  async resync(): Promise<void> {
    await this.rejoin();
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.liveClassId = null;
    if (connection) {
      try {
        await connection.stop();
      } catch {
        // already closed — nothing to do
      }
    }
    this.setStatus("disconnected");
  }

  private async safeInvoke<T = void>(method: string, ...args: unknown[]): Promise<T | undefined> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      this.emitError("Not connected to the live class — reconnecting…");
      return undefined;
    }
    try {
      return await this.connection.invoke<T>(method, ...args);
    } catch (err) {
      this.emitError(err instanceof Error ? err.message : "Something went wrong with the live board.");
      return undefined;
    }
  }

  // ── Teacher: own/shared board ─────────────────────────────────────────────
  sendStroke(stroke: HubStroke) {
    return this.safeInvoke("SendStroke", this.liveClassId, stroke);
  }
  removeStroke(strokeId: string) {
    return this.safeInvoke("RemoveStroke", this.liveClassId, strokeId);
  }
  clearBoard() {
    return this.safeInvoke("ClearBoard", this.liveClassId);
  }
  switchBoard(boardIndex: number) {
    return this.safeInvoke("SwitchBoard", this.liveClassId, boardIndex);
  }

  // ── Student: own private board ────────────────────────────────────────────
  sendMyStroke(stroke: HubStroke) {
    return this.safeInvoke("SendMyStroke", this.liveClassId, stroke);
  }
  removeMyStroke(strokeId: string) {
    return this.safeInvoke("RemoveMyStroke", this.liveClassId, strokeId);
  }
  clearMyBoard() {
    return this.safeInvoke("ClearMyBoard", this.liveClassId);
  }
  switchMyBoard(boardIndex: number) {
    return this.safeInvoke("SwitchMyBoard", this.liveClassId, boardIndex);
  }

  // ── Teacher acting on any student's board (also used by a student viewing
  // their own board's authoritative state, or the board currently shared) ──
  getStudentBoard(studentId: string) {
    return this.safeInvoke<StudentBoardSnapshot>("GetStudentBoard", this.liveClassId, studentId);
  }
  sendStudentBoardStroke(studentId: string, stroke: HubStroke) {
    return this.safeInvoke("SendStudentBoardStroke", this.liveClassId, studentId, stroke);
  }
  removeStudentBoardStroke(studentId: string, strokeId: string) {
    return this.safeInvoke("RemoveStudentBoardStroke", this.liveClassId, studentId, strokeId);
  }
  clearStudentBoard(studentId: string) {
    return this.safeInvoke("ClearStudentBoard", this.liveClassId, studentId);
  }

  // ── Teacher: "show to class" ──────────────────────────────────────────────
  shareStudentBoard(studentId: string | null) {
    return this.safeInvoke("ShareStudentBoard", this.liveClassId, studentId);
  }
}

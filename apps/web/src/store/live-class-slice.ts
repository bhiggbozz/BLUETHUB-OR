import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LiveClassDto, LiveClassJoinResponse } from "@/services/live-class";

type HubStatus = "disconnected" | "connecting" | "connected" | "reconnecting";
type AudioStatus = "disconnected" | "connecting" | "connected" | "error";

interface LiveClassRuntimeState {
  liveClass: LiveClassDto | null;
  join: LiveClassJoinResponse | null;
  hubStatus: HubStatus;
  audioStatus: AudioStatus;
  sharedStudentId: string | null;
  canSpeak: Record<string, boolean>;
  serverOffsetMs: number;
  secondsRemaining: number;
  warningMinutes: number | null;
  ended: { reason: string } | null;
}

const initialState: LiveClassRuntimeState = {
  liveClass: null,
  join: null,
  hubStatus: "disconnected",
  audioStatus: "disconnected",
  sharedStudentId: null,
  canSpeak: {},
  serverOffsetMs: 0,
  secondsRemaining: 0,
  warningMinutes: null,
  ended: null,
};

const LiveClassSlice = createSlice({
  name: "liveClass",
  initialState,
  reducers: {
    setLiveClass: (state, action: PayloadAction<LiveClassDto>) => {
      state.liveClass = action.payload;
      state.canSpeak = Object.fromEntries(
        action.payload.students.map((s) => [s.studentId, s.canSpeak])
      );
    },
    /** `join`'s `serverTime` is used to derive `serverOffsetMs`; `secondsRemaining`
     * seeds the countdown until the client's own tick takes over. Note `join.canSpeak`
     * is the caller's own permission (no studentId attached) — callers needing the
     * current student's own mic-lock state should read `join.canSpeak` directly rather
     * than `canSpeak[studentId]`, which is only populated from the teacher-facing
     * roster (`setLiveClass`) and per-student `SpeakChanged` events (`setCanSpeak`). */
    setJoinResponse: (state, action: PayloadAction<LiveClassJoinResponse>) => {
      state.join = action.payload;
      state.serverOffsetMs = new Date(action.payload.serverTime).getTime() - Date.now();
      state.secondsRemaining = action.payload.secondsRemaining;
    },
    setHubStatus: (state, action: PayloadAction<HubStatus>) => {
      state.hubStatus = action.payload;
    },
    setAudioStatus: (state, action: PayloadAction<AudioStatus>) => {
      state.audioStatus = action.payload;
    },
    setSharedStudentId: (state, action: PayloadAction<string | null>) => {
      state.sharedStudentId = action.payload;
    },
    setCanSpeak: (state, action: PayloadAction<{ studentId: string; canSpeak: boolean }>) => {
      state.canSpeak[action.payload.studentId] = action.payload.canSpeak;
    },
    setServerOffset: (state, action: PayloadAction<number>) => {
      state.serverOffsetMs = action.payload;
    },
    tickSecondsRemaining: (state, action: PayloadAction<number>) => {
      state.secondsRemaining = action.payload;
    },
    setWarningMinutes: (state, action: PayloadAction<number | null>) => {
      state.warningMinutes = action.payload;
    },
    setEnded: (state, action: PayloadAction<{ reason: string } | null>) => {
      state.ended = action.payload;
    },
    resetLiveClassRuntime: () => initialState,
  },
});

export const {
  setLiveClass,
  setJoinResponse,
  setHubStatus,
  setAudioStatus,
  setSharedStudentId,
  setCanSpeak,
  setServerOffset,
  tickSecondsRemaining,
  setWarningMinutes,
  setEnded,
  resetLiveClassRuntime,
} = LiveClassSlice.actions;

export default LiveClassSlice.reducer;

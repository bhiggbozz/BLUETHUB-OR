import type { CompressedStroke, IActiveMedia } from "@/utils/constant";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface classActiveState {
  value: string;
  type: string;
  fillColor: string;
  classDuration: string;
  currentTime: string;
  pauseTime: boolean;
  timeUp: boolean;
  currentBoard: number;
  availableBoards: number[];
  sessionIdRef: string;
  isRecording: boolean;
  sendQueueRefList: CompressedStroke[];
  classEnded: boolean;
  selectedImage: IActiveMedia | null;
  timerDisplay: string;
  timerRunning: boolean;
  timerElapsedSeconds: number;
}

const initialState: classActiveState = {
  value: "SELECT",
  type: "",
  fillColor: "#000000",
  classDuration: "",
  currentTime: "",
  pauseTime: true,
  timeUp: false,
  currentBoard: 1,
  availableBoards: [1],
  sessionIdRef: "",
  isRecording: false,
  sendQueueRefList: [],
  classEnded: false,
  selectedImage: {
    id: "",
    name: "",
    type: "image",
    url: "",
    show: "",
    closed: "",
  },

  timerDisplay: "00:00",
  timerRunning: false,
  timerElapsedSeconds: 0,
};

const ClassActionSlice = createSlice({
  name: "action",
  initialState,
  reducers: {
    onSetAction: (state, action: PayloadAction<string>) => {
      state.value = action.payload;
      state.type = action.payload;
    },
    onSetFillColor: (state, action: PayloadAction<string>) => {
      state.fillColor = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<string>) => {
      state.classDuration = action.payload;
    },
    holdCurrentTime: (state, action: PayloadAction<string>) => {
      state.currentTime = action.payload;
    },
    pauseCurrentTime: (state) => {
      state.pauseTime = !state.pauseTime;
      state.isRecording = false;
    },
    setPauseTime: (state, action: PayloadAction<boolean>) => {
      state.pauseTime = action.payload;
    },
    setTimeUp: (state) => {
      state.timeUp = true;
    },
    setCurrentBoard: (state, action: PayloadAction<number>) => {
      state.currentBoard = action.payload;
    },
    setAvailableBoards: (state, action: PayloadAction<number[]>) => {
      state.availableBoards = action.payload;
    },
    addNewBoard: (state) => {
      const nextBoardNumber = Math.max(...state.availableBoards, 0) + 1;
      if (!state.availableBoards.includes(nextBoardNumber)) {
        state.availableBoards.push(nextBoardNumber);
        state.availableBoards.sort((a, b) => a - b);
      }
      state.currentBoard = nextBoardNumber;
    },
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setSessionIdRef: (state, action: PayloadAction<string>) => {
      state.sessionIdRef = action.payload;
    },
    setSendQueueRefList: (state, action: PayloadAction<CompressedStroke[]>) => {
      state.sendQueueRefList.push(...action.payload); // batch push
    },
    clearSendQueueRefList: (state) => {
      state.sendQueueRefList = [];
    },
    setEndClass: (state) => {
      state.pauseTime = true;
      state.isRecording = false;
      state.classEnded = true;
      state.timeUp = true;
    },

    setSelectedImage: (state, action: PayloadAction<IActiveMedia>) => {
      state.selectedImage = action.payload;
    },

    clearSelectedImage: (state) => {
      state.selectedImage = null;
    },

    setTimerDisplay: (state, action: PayloadAction<string>) => {
      state.timerDisplay = action.payload;
    },
    setTimerRunning: (state, action: PayloadAction<boolean>) => {
      state.timerRunning = action.payload;
    },
    setTimerElapsed: (state, action: PayloadAction<number>) => {
      state.timerElapsedSeconds = action.payload;
    },
    resetClassRuntime: (state) => {
      state.pauseTime = true;
      state.timeUp = false;
      state.classEnded = false;
      state.isRecording = false;
      state.timerDisplay = "00:00";
      state.timerRunning = false;
      state.timerElapsedSeconds = 0;
      // Redux is a single store that persists across route navigations —
      // without this, opening the board for a brand-new lesson still carries
      // the previous lesson's sessionIdRef, and the board's stroke-loading
      // effect (class.tsx) would fetch and briefly show that old lesson's
      // saved strokes before a real session id gets set for the new one.
      state.sessionIdRef = "";
    },
  },
});

export const {
  onSetAction,
  onSetFillColor,
  holdCurrentTime,
  pauseCurrentTime,
  setPauseTime,
  setCurrentTime,
  setTimeUp,
  setCurrentBoard,
  setAvailableBoards,
  addNewBoard,
  setSessionIdRef,
  setIsRecording,
  setSendQueueRefList,
  clearSendQueueRefList,
  setEndClass,
  setSelectedImage,
  clearSelectedImage,
  setTimerDisplay,
  setTimerRunning,
  setTimerElapsed,
  resetClassRuntime,
} = ClassActionSlice.actions;
export default ClassActionSlice.reducer;

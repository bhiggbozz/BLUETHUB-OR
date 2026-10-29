import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CalendarEntryDto, CalendarSessionDto } from "@/services/calendar";

interface CalendarState {
  sessions: CalendarSessionDto[];
  selectedSessionId: string | null;
  loaded: boolean;
  entries: CalendarEntryDto[];
  entriesLoaded: boolean;
}

const initialState: CalendarState = {
  sessions: [],
  selectedSessionId: null,
  loaded: false,
  entries: [],
  entriesLoaded: false,
};

const CalendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<CalendarSessionDto[]>) => {
      state.sessions = action.payload;
      state.loaded = true;
    },
    selectSession: (state, action: PayloadAction<string | null>) => {
      state.selectedSessionId = action.payload;
    },
    /** A write always returns the whole updated session — replace it in place, no refetch. */
    upsertSession: (state, action: PayloadAction<CalendarSessionDto>) => {
      const idx = state.sessions.findIndex((s) => s.id === action.payload.id);
      if (idx >= 0) {
        state.sessions[idx] = action.payload;
      } else {
        state.sessions.unshift(action.payload);
      }
    },
    removeSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      if (state.selectedSessionId === action.payload) {
        state.selectedSessionId = null;
      }
    },
    setEntries: (state, action: PayloadAction<CalendarEntryDto[]>) => {
      state.entries = action.payload;
      state.entriesLoaded = true;
    },
    /** A write always returns the whole updated entry — replace it in place, no refetch. */
    upsertEntry: (state, action: PayloadAction<CalendarEntryDto>) => {
      const idx = state.entries.findIndex((e) => e.id === action.payload.id);
      if (idx >= 0) {
        state.entries[idx] = action.payload;
      } else {
        state.entries.unshift(action.payload);
      }
    },
    removeEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter((e) => e.id !== action.payload);
    },
    resetCalendar: () => initialState,
  },
});

export const {
  setSessions,
  selectSession,
  upsertSession,
  removeSession,
  setEntries,
  upsertEntry,
  removeEntry,
  resetCalendar,
} = CalendarSlice.actions;
export default CalendarSlice.reducer;

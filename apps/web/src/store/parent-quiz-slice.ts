import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ParentQuizSettingsDto, ParentQuizSubjectDto, ParentQuizSummaryDto } from "@/services/parent-quiz";

interface ParentQuizState {
  settings: ParentQuizSettingsDto | null;
  settingsLoaded: boolean;
  quizzes: ParentQuizSummaryDto[];
  quizzesLoaded: boolean;
  subjectsByChild: Record<string, ParentQuizSubjectDto[]>;
}

const initialState: ParentQuizState = {
  settings: null,
  settingsLoaded: false,
  quizzes: [],
  quizzesLoaded: false,
  subjectsByChild: {},
};

const ParentQuizSlice = createSlice({
  name: "parentQuiz",
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<ParentQuizSettingsDto>) => {
      state.settings = action.payload;
      state.settingsLoaded = true;
    },
    setQuizzes: (state, action: PayloadAction<ParentQuizSummaryDto[]>) => {
      state.quizzes = action.payload;
      state.quizzesLoaded = true;
    },
    /** A write always returns the whole updated quiz — replace it in place, no refetch. */
    upsertQuiz: (state, action: PayloadAction<ParentQuizSummaryDto>) => {
      const idx = state.quizzes.findIndex((q) => q.id === action.payload.id);
      if (idx >= 0) {
        state.quizzes[idx] = action.payload;
      } else {
        state.quizzes.unshift(action.payload);
      }
    },
    removeQuiz: (state, action: PayloadAction<string>) => {
      state.quizzes = state.quizzes.filter((q) => q.id !== action.payload);
    },
    setSubjectsForChild: (state, action: PayloadAction<{ studentId: string; subjects: ParentQuizSubjectDto[] }>) => {
      state.subjectsByChild[action.payload.studentId] = action.payload.subjects;
    },
  },
});

export const { setSettings, setQuizzes, upsertQuiz, removeQuiz, setSubjectsForChild } = ParentQuizSlice.actions;
export default ParentQuizSlice.reducer;

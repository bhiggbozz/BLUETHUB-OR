const PREFIX = "parentQuiz:answers:";

/** The server only saves answers on submit — this keeps a refresh or a tab
 * close from losing what the student already picked. */
export function loadSavedAnswers(attemptId: string): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(PREFIX + attemptId);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAnswers(attemptId: string, answers: Record<string, string | null>) {
  try {
    localStorage.setItem(PREFIX + attemptId, JSON.stringify(answers));
  } catch {
    // Storage full/unavailable — answers still live in React state for this session.
  }
}

export function clearSavedAnswers(attemptId: string) {
  try {
    localStorage.removeItem(PREFIX + attemptId);
  } catch {
    // no-op
  }
}

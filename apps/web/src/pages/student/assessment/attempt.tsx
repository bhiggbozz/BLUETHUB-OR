import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assessmentService, type StartAttemptData } from "@/services/assessment";
import { studentBoardService } from "@/services/student-board";
import { useAuthContext } from "@/contexts/auth-context";
import { saveStudentBoardCache, loadStudentBoardCache, clearStudentBoardCache } from "@/utils/db";
import toast from "react-hot-toast";
import {
  Loader2, ArrowLeft, ArrowRight, CheckCircle2,
  Clock, AlertTriangle, Send, FileQuestion, Pencil, Type,
} from "lucide-react";
import StudentAnswerBoard, { type AnswerBoardMeta, type BoardState } from "./student-answer-board";
import RichTextEditor from "./rich-text-editor";
import MathText from "@/component/math-text";

const AttemptPage = () => {
  const { assessmentId, attemptId } = useParams<{ assessmentId: string; attemptId: string }>();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [attemptData, setAttemptData] = useState<StartAttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [typedAnswers, setTypedAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [drawModeByQuestion, setDrawModeByQuestion] = useState<Record<string, boolean>>({});
  const [questionBoardMeta, setQuestionBoardMeta] = useState<Record<string, AnswerBoardMeta[]>>({});
  const [boardDataByQuestion, setBoardDataByQuestion] = useState<Record<string, Record<number, BoardState>>>({});
  const [savingBoard, setSavingBoard] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studentId = user?.id ?? "unknown";

  // Load board cache from IndexedDB on mount
  useEffect(() => {
    if (!assessmentId || !attemptId) return;
    loadStudentBoardCache(assessmentId, studentId, attemptId).then((cache) => {
      if (cache) {
        setDrawModeByQuestion(cache.drawModeByQuestion);
        setQuestionBoardMeta(cache.questionBoardMeta);
        setBoardDataByQuestion(cache.boardDataByQuestion as any);
      }
    });
  }, [assessmentId, studentId, attemptId]);

  // Debounced auto-save board data to IndexedDB
  useEffect(() => {
    if (!assessmentId || !attemptId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveStudentBoardCache({
        id: `${assessmentId}_${studentId}_${attemptId}`,
        assessmentId, studentId, attemptId,
        drawModeByQuestion, questionBoardMeta, boardDataByQuestion,
      });
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [boardDataByQuestion, drawModeByQuestion, questionBoardMeta, assessmentId, studentId, attemptId]);

  useEffect(() => {
    if (!attemptId) return;
    const state = (window.history.state?.usr as any)?.attemptData;
    if (state) {
      setAttemptData(state);
      if (state.timeLimitMinutes) setTimeLeft(state.timeLimitMinutes * 60);
      setLoading(false);
    } else setLoading(false);
  }, [attemptId]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null || prev <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, submitted]);

  const sessionId = assessmentId && studentId ? `${assessmentId}_${studentId}` : null;
  const questions = attemptData?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  // The backend shuffles each attempt's options (anti-cheat — same content,
  // different label/position per student) but returns them in that shuffled
  // array order too, so the raw array renders as e.g. B,E,D,A,C. Sorting by
  // optionLabel just fixes the *display* order to A,B,C... — it doesn't
  // touch which content each label holds, so it can't undo the shuffle.
  const sortedOptions = useMemo(
    () => [...(currentQuestion?.options ?? [])].sort((a, b) => a.optionLabel.localeCompare(b.optionLabel)),
    [currentQuestion]
  );

  const { totalAutoMarks, hasManualQuestions } = useMemo(() => {
    let auto = 0, manual = false;
    for (const q of questions) {
      if (q.options.length > 0 || q.questionType === 4) auto += q.marksAllocation;
      else manual = true;
    }
    return { totalAutoMarks: auto, hasManualQuestions: manual };
  }, [questions]);

  const answeredCount = useMemo(() => {
    let count = 0;
    for (const q of questions) {
      if (q.options.length > 0) { if (selectedOptions[q.questionId]) count++; }
      else {
        const isDraw = drawModeByQuestion[q.questionId];
        const meta = questionBoardMeta[q.questionId] ?? [];
        if (isDraw) { if (meta.length > 0 || typedAnswers[q.questionId]?.trim()) count++; }
        else { if (typedAnswers[q.questionId]?.trim()) count++; }
      }
    }
    return count;
  }, [questions, selectedOptions, typedAnswers, drawModeByQuestion, questionBoardMeta]);

  const buildAllAnswers = useCallback(() => {
    if (!attemptId) return [];
    return questions.map((q) => {
      const isDraw = drawModeByQuestion[q.questionId];
      const meta = questionBoardMeta[q.questionId] ?? [];
      const hasBoard = meta.length > 0;
      const payload: any = {
        attemptId, questionId: q.questionId,
        selectedOptionId: q.options.length > 0 ? (selectedOptions[q.questionId] ?? null) : null,
        typedAnswer: q.options.length === 0 && !isDraw ? (typedAnswers[q.questionId] ?? null) : null,
        isSkipped: q.options.length > 0 ? !selectedOptions[q.questionId] : isDraw ? !hasBoard && !typedAnswers[q.questionId]?.trim() : !typedAnswers[q.questionId]?.trim(),
      };
      if (isDraw && hasBoard) { if (sessionId) payload.boardSessionId = `${sessionId}_${q.questionId}`; }
      return payload;
    });
  }, [attemptId, questions, selectedOptions, typedAnswers, drawModeByQuestion, questionBoardMeta, sessionId]);

  const flushAllBoardsToServer = useCallback(async () => {
    const promises: Promise<void>[] = [];
    for (const [, boards] of Object.entries(boardDataByQuestion)) {
      for (const [idx, bs] of Object.entries(boards)) {
        const bi = Number(idx);
        if (!bs.sessionId || bs.strokes.length === 0) continue;
        const dtos = bs.strokes.filter(s => s.points.length >= 2).map((s, i) => {
          const now = Date.now();
          return {
            id: `${bs.sessionId}_stroke_${i}_${now}`, sessionId: bs.sessionId,
            type: s.isEraser ? "eraser" : "stroke",
            data: JSON.stringify(s.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }))),
            color: s.color, width: s.width, currentBoard: bi,
            timestamp: now, duration: 5000,
            startTime: new Date(now - 5000).toISOString(), endTime: new Date(now).toISOString(),
          };
        });
        if (dtos.length > 0) promises.push(studentBoardService.saveBatch({ sessionId: bs.sessionId, boardIndex: bi, strokes: dtos }).then(() => {}));
      }
    }
    await Promise.all(promises);
  }, [boardDataByQuestion]);

  const handleSaveBoard = useCallback(async () => {
    if (!assessmentId || !attemptId) return;
    setSavingBoard(true);
    await saveStudentBoardCache({ id: `${assessmentId}_${studentId}_${attemptId}`, assessmentId, studentId, attemptId, drawModeByQuestion, questionBoardMeta, boardDataByQuestion });
    setSavingBoard(false);
    toast.success("Board saved");
  }, [assessmentId, studentId, attemptId, drawModeByQuestion, questionBoardMeta, boardDataByQuestion]);

  const handleNext = async () => { if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1); };
  const handlePrev = async () => { if (currentIndex > 0) setCurrentIndex(i => i - 1); };

  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    try {
      await flushAllBoardsToServer();
      const answers = buildAllAnswers();
      const res = await assessmentService.submitAll({ answers });
      setSubmitResult(res.data?.data ?? null);
      setSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (assessmentId && attemptId) await clearStudentBoardCache(assessmentId, studentId, attemptId);
    } catch {} finally { setSubmitting(false); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin text-[#4255db]" /></div>;

  if (submitted && submitResult) {
    const obtained = submitResult.autoMarksObtained ?? submitResult.marksObtained ?? 0;
    const autoPct = hasManualQuestions && totalAutoMarks > 0 ? (obtained / totalAutoMarks) * 100 : submitResult.finalScorePercent;
    return (
      <div className="mx-auto max-w-[800px] p-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
            <h2 className="text-xl font-bold text-slate-900">Assessment Submitted</h2>
            <p className="text-sm text-slate-500 mt-1">Your attempt has been recorded.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-md mx-auto">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">{hasManualQuestions ? "Auto Score" : "Score"}</p>
              <p className={`text-xl font-bold ${autoPct >= 50 ? "text-emerald-600" : "text-amber-600"}`}>{autoPct.toFixed(0)}%</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Obtained</p>
              <p className="text-xl font-bold text-slate-800">{obtained.toFixed(0)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Total</p>
              <p className="text-xl font-bold text-slate-800">{submitResult.totalMarks?.toFixed(0)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase">Status</p>
              <p className="text-xl font-bold text-amber-600">{hasManualQuestions ? "Pending" : submitResult.isPassed ? "Passed" : "Failed"}</p>
            </div>
          </div>
          {hasManualQuestions && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
              <p className="text-sm font-medium text-amber-800">Theory questions are pending teacher grading</p>
              <p className="text-xs text-amber-600 mt-0.5">Your final score may change after your teacher grades the theory questions.</p>
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => navigate(`/student/assessment/${assessmentId}/result/${attemptId}`)} className="rounded-full bg-[#4255db] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#3447cc] transition-colors">View Details</button>
            <button onClick={() => navigate("/student/assessment")} className="rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Back to List</button>
          </div>
        </div>
      </div>
    );
  }

  if (!attemptData || questions.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-slate-500">
      <AlertTriangle className="h-10 w-10" />
      <p className="text-sm">No questions available.</p>
      <button onClick={() => navigate("/student/assessment")} className="text-[#4255db] text-sm font-semibold">Go back</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[900px] p-4 md:p-6">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#292382] to-[#3D36A8] px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80"><FileQuestion className="w-4 h-4" /><span className="text-sm font-medium">Question {currentIndex + 1} of {questions.length}</span></div>
            <div className="flex items-center gap-4 text-white">
              <span className="text-xs text-white/60">{answeredCount}/{questions.length} answered</span>
              {timeLeft != null && <span className={`flex items-center gap-1 text-sm font-mono font-bold ${timeLeft < 60 ? "text-red-300 animate-pulse" : ""}`}><Clock className="w-4 h-4" />{formatTime(timeLeft)}</span>}
            </div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-white/60 transition-all duration-300" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} /></div>
        </div>
        <div className="p-5 md:p-6">
          <div className="flex gap-2 mb-4">
            {questions.map((q, i) => {
              const isDraw = drawModeByQuestion[q.questionId];
              const meta = questionBoardMeta[q.questionId] ?? [];
              const ans = q.options.length > 0 ? !!selectedOptions[q.questionId] : isDraw ? meta.length > 0 || !!typedAnswers[q.questionId]?.trim() : !!typedAnswers[q.questionId]?.trim();
              return <button key={q.questionId} onClick={() => setCurrentIndex(i)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${i === currentIndex ? "bg-[#4255db] text-white" : ans ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>{i + 1}</button>;
            })}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">{currentQuestion.questionType === 4 ? "True / False" : currentQuestion.options.length > 0 ? "Objective" : "Theory"} Question</span>
              <span className="text-[11px] font-semibold text-slate-400">{currentQuestion.marksAllocation} mark{currentQuestion.marksAllocation !== 1 ? "s" : ""}</span>
            </div>
            <MathText text={currentQuestion.title} className="block text-sm font-semibold text-slate-800 mb-1" />
            <MathText text={currentQuestion.textContent} className="block text-sm text-slate-600 mb-4" />
            {currentQuestion.imageUrl && <div className="mb-4"><img src={currentQuestion.imageUrl} alt="Question image" className="max-w-full max-h-64 rounded-xl border border-slate-200 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div>}
            {currentQuestion.boardSnapshotUrl && <div className="mb-4"><img src={currentQuestion.boardSnapshotUrl} alt="Board snapshot" className="max-w-full max-h-64 rounded-xl border border-slate-200 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /></div>}
            {currentQuestion.options.length > 0 || currentQuestion.questionType === 4 ? (
              <div className="space-y-2">
                {(sortedOptions.length > 0 ? sortedOptions : [{ questionId: currentQuestion.questionId, optionId: "true", optionLabel: "A", optionText: "True" }, { questionId: currentQuestion.questionId, optionId: "false", optionLabel: "B", optionText: "False" }]).map((opt: any) => {
                  const sel = selectedOptions[currentQuestion.questionId] === opt.optionId;
                  return <button key={opt.optionId} onClick={() => setSelectedOptions(prev => ({ ...prev, [currentQuestion.questionId]: opt.optionId }))} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${sel ? "border-[#4255db] bg-[#eef2ff] text-[#4255db]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}><span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${sel ? "bg-[#4255db] text-white" : "bg-slate-100 text-slate-500"}`}>{opt.optionLabel}</span><MathText text={opt.optionText} className="text-sm" /></button>;
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
                  <button type="button" onClick={() => setDrawModeByQuestion(prev => ({ ...prev, [currentQuestion.questionId]: false }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!drawModeByQuestion[currentQuestion.questionId] ? "bg-[#4255db] text-white" : "text-slate-500 hover:bg-slate-50"}`}><Type className="w-3.5 h-3.5" />Type Answer</button>
                  <button type="button" onClick={() => setDrawModeByQuestion(prev => ({ ...prev, [currentQuestion.questionId]: true }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${drawModeByQuestion[currentQuestion.questionId] ? "bg-[#4255db] text-white" : "text-slate-500 hover:bg-slate-50"}`}><Pencil className="w-3.5 h-3.5" />Draw Answer</button>
                </div>
                {!drawModeByQuestion[currentQuestion.questionId] ? (
                  <RichTextEditor
                    value={typedAnswers[currentQuestion.questionId] ?? ""}
                    onChange={(html) => setTypedAnswers(prev => ({ ...prev, [currentQuestion.questionId]: html }))}
                  />
                ) : (
                  <StudentAnswerBoard key={currentQuestion.questionId} questionId={currentQuestion.questionId} sessionId={sessionId ? `${sessionId}_${currentQuestion.questionId}` : undefined} initialBoards={boardDataByQuestion[currentQuestion.questionId] ?? null} onBoardsChange={meta => setQuestionBoardMeta(prev => ({ ...prev, [currentQuestion.questionId]: meta }))} onStrokesChange={strokes => setBoardDataByQuestion(prev => ({ ...prev, [currentQuestion.questionId]: strokes }))} onSaveBoard={handleSaveBoard} saving={savingBoard} />
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <button onClick={handlePrev} disabled={currentIndex === 0} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ArrowLeft className="w-4 h-4" />Previous</button>
              <div className="flex items-center gap-2">
                <button onClick={handleSubmit} disabled={submitting} className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"><Send className="w-4 h-4" />{submitting ? "Submitting…" : "Submit All"}</button>
                {currentIndex < questions.length - 1 && <button onClick={handleNext} className="inline-flex items-center gap-1.5 rounded-full bg-[#4255db] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3447cc] transition-colors">Next<ArrowRight className="w-4 h-4" /></button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttemptPage;

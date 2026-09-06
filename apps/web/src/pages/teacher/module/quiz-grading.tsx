import { quizService, type GradingDetailDto } from "@/services/quiz";
import { Loader2, Star, ChevronDown, ChevronRight, CheckCircle2, MessageSquare, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

const DIFFICULTY_LABELS = ["", "Easy", "Medium", "Hard", "Expert"];

interface GradingItem extends GradingDetailDto {
  starCount: number;
  feedback: string;
  submitting: boolean;
  submitted: boolean;
  error: string;
}

function StarSelector({
  value,
  onChange,
  disabled,
  starValue,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  starValue: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          className={`p-0.5 transition-all ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            size={20}
            fill={s <= value ? "#f59e0b" : "none"}
            stroke={s <= value ? "#f59e0b" : "#d1d5db"}
            strokeWidth={1.5}
          />
        </button>
      ))}
      <span className="text-xs text-gray-500 ml-1">
        {value > 0 ? `${value} × ${starValue} = ${value * starValue} marks` : "Select stars"}
      </span>
    </div>
  );
}

const QuizGrading = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [items, setItems] = useState<GradingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");

    quizService.getGradingDetail()
      .then((res) => {
        const data = res.data.data ?? [];
        setItems(data.map((d) => ({
          ...d,
          starCount: 0,
          feedback: "",
          submitting: false,
          submitted: false,
          error: "",
        })));
      })
      .catch((e) => {
        console.warn("getGradingDetail failed", e);
        setError("Failed to load grading items. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [retryKey]);

  const quizGroups = useMemo(() => {
    const map = new Map<string, GradingItem[]>();
    for (const item of items) {
      const group = map.get(item.quizCode);
      if (group) group.push(item);
      else map.set(item.quizCode, [item]);
    }
    return Array.from(map.entries())
      .map(([quizCode, answers]) => ({
        quizCode,
        lessonTitle: answers[0].lessonTitle,
        studentCount: new Set(answers.map((a) => a.studentId)).size,
        answerCount: answers.length,
        pendingCount: answers.filter((a) => !a.submitted).length,
        gradedCount: answers.filter((a) => a.submitted).length,
        answers,
      }))
      .sort((a, b) => b.pendingCount - a.pendingCount);
  }, [items]);

  const handleStarChange = (answerId: string, starCount: number) => {
    setItems((prev) => prev.map((i) => i.answerId === answerId ? { ...i, starCount } : i));
  };

  const handleFeedbackChange = (answerId: string, feedback: string) => {
    setItems((prev) => prev.map((i) => i.answerId === answerId ? { ...i, feedback } : i));
  };

  const handleGrade = async (item: GradingItem) => {
    if (item.starCount < 1) return;
    setItems((prev) => prev.map((i) => i.answerId === item.answerId ? { ...i, submitting: true, error: "" } : i));
    const starMarks = [0, item.starMarkEasy, item.starMarkMedium, item.starMarkHard, item.starMarkExpert, item.starMarkExpert];
    const marks = item.starCount * starMarks[item.difficultyLevel];

    try {
      await quizService.gradeAnswer(item.answerId, {
        starCount: item.starCount,
        manualMarksObtained: marks,
        teacherFeedback: item.feedback || undefined,
      });
      setItems((prev) => prev.map((i) => i.answerId === item.answerId ? { ...i, submitting: false, submitted: true } : i));
    } catch (e) {
      setItems((prev) => prev.map((i) => i.answerId === item.answerId ? { ...i, submitting: false, error: "Failed to submit grade" } : i));
    }
  };

  const pendingCount = items.filter((i) => !i.submitted).length;
  const gradedCount = items.filter((i) => i.submitted).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-5 md:justify-between">
           <Menu
            className="lg:hidden size-6 text-chestnut cursor-pointer"
            onClick={openMobileNav}  // ✅ not onClick={() => openMobileNav()}
          />
          <div>
            <h1 className="text-2xl font-bold text-[#292382]">Quiz Grading</h1>
            <p className="text-sm text-gray-500 mt-1">Grade student answers that need manual evaluation</p>
          </div>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-white border border-gray-200 rounded-md px-4 py-2">
            <span>Pending: <strong className={pendingCount > 0 ? "text-amber-600" : "text-green-600"}>{pendingCount}</strong></span>
            {gradedCount > 0 && <span>Graded: <strong className="text-green-600">{gradedCount}</strong></span>}
            <span>Total: <strong>{items.length}</strong></span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#292382]" />
            <span className="ml-2 text-sm text-gray-500">Loading grading items...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* No items */}
        {!loading && !error && items.length === 0 && (
          <div className="bg-white rounded-md border border-gray-200 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No answers pending manual grading.</p>
          </div>
        )}

        {/* Grading Items — Grouped by Quiz */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {quizGroups.map((group) => {
              const isQuizOpen = expandedQuiz === group.quizCode;

              return (
                <div key={group.quizCode} className="bg-white rounded-md border border-gray-200 overflow-hidden">
                  {/* ── Quiz Group Header ──────────────────────────────────── */}
                  <button
                    type="button"
                    onClick={() => setExpandedQuiz(isQuizOpen ? null : group.quizCode)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isQuizOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#292382] truncate">{group.lessonTitle}</p>
                        <p className="text-xs text-gray-500">
                          Code: {group.quizCode} · {group.studentCount} student{group.studentCount !== 1 ? "s" : ""} · {group.answerCount} answer{group.answerCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {group.pendingCount > 0 && (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            {group.pendingCount} pending
                          </span>
                        )}
                        {group.gradedCount > 0 && (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            {group.gradedCount} graded
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* ── Answers within Quiz ───────────────────────────────── */}

                  {isQuizOpen && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {group.answers.map((item) => {
                        const isAnswerOpen = expandedAnswer === item.answerId;
                        const marks = [0, item.starMarkEasy, item.starMarkMedium, item.starMarkHard, item.starMarkExpert, item.starMarkExpert];

                        if (item.submitted) {
                          return (
                            <div key={item.answerId} className="bg-green-50/50 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-green-800 truncate">{item.studentName}</p>
                                  <p className="text-xs text-green-600">{item.questionTitle}</p>
                                </div>
                                <span className="text-xs text-green-700 font-semibold shrink-0">{item.starCount} stars · {item.starCount * marks[item.difficultyLevel]} marks</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.answerId}>
                            {/* Answer header */}
                            <button
                              type="button"
                              onClick={() => setExpandedAnswer(isAnswerOpen ? null : item.answerId)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isAnswerOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                                <div className="text-left min-w-0 flex-1">
                                  <p className="text-sm font-medium text-[#292382] truncate">{item.studentName}</p>
                                  <p className="text-xs text-gray-500 truncate">{item.questionTitle}</p>
                                </div>
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                  item.difficultyLevel <= 2 ? "bg-green-100 text-green-700" :
                                  item.difficultyLevel === 3 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {DIFFICULTY_LABELS[item.difficultyLevel] ?? "Unknown"}
                                </span>
                              </div>
                            </button>

                            {/* Expanded answer detail + grading */}
                            {isAnswerOpen && (
                              <div className="border-t border-gray-50 bg-gray-50/50">
                                <div className="p-4 space-y-4">
                                  {/* Question */}
                                  <div>
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Question</p>
                                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                                      <p className="text-sm font-medium text-[#292382]">{item.questionTitle}</p>
                                      <p className="text-sm text-gray-700 mt-1">{item.questionTextContent}</p>
                                    </div>
                                  </div>

                                  {/* Student's answer */}
                                  <div>
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Student's Answer</p>
                                    <textarea
                                      readOnly
                                      value={item.typedAnswer || "(no typed answer)"}
                                      rows={Math.max(3, (item.typedAnswer?.match(/\n/g)?.length ?? 0) + 2)}
                                      className="w-full text-sm text-gray-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 resize-none focus:outline-none"
                                    />
                                    {item.audioUrl && (
                                      <div className="mt-2">
                                        <audio controls src={item.audioUrl} className="w-full h-8" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Grading controls */}
                                  <div>
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                      Grade · Max {item.maxMarks} marks · {DIFFICULTY_LABELS[item.difficultyLevel]} difficulty
                                    </p>
                                    <StarSelector
                                      value={item.starCount}
                                      onChange={(v) => handleStarChange(item.answerId, v)}
                                      disabled={item.submitting}
                                      starValue={marks[item.difficultyLevel]}
                                    />
                                  </div>

                                  {/* Feedback */}
                                  <div>
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                      <MessageSquare className="w-3 h-3 inline-block mr-1" />
                                      Feedback (optional)
                                    </p>
                                    <textarea
                                      value={item.feedback}
                                      onChange={(e) => handleFeedbackChange(item.answerId, e.target.value)}
                                      placeholder="Add feedback for the student..."
                                      rows={2}
                                      disabled={item.submitting}
                                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#292382]/20 resize-none"
                                    />
                                  </div>

                                  {/* Error */}
                                  {item.error && (
                                    <p className="text-xs text-red-600">{item.error}</p>
                                  )}

                                  {/* Submit */}
                                  <button
                                    type="button"
                                    disabled={item.starCount < 1 || item.submitting}
                                    onClick={() => handleGrade(item)}
                                    className="w-full text-sm font-semibold text-white bg-[#292382] rounded-lg py-2.5 hover:bg-[#1f1d6e] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                  >
                                    {item.submitting ? (
                                      <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                                      </span>
                                    ) : (
                                      `Submit Grade${item.starCount > 0 ? ` (${item.starCount} stars · ${item.starCount * marks[item.difficultyLevel]} marks)` : ""}`
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGrading;

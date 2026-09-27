import { useMemo, useState } from "react";
import { AxiosError } from "axios";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { useParentChildren } from "@/contexts/parent-children-context";
import {
  parentAssessmentService,
  type TaughtTopic,
  type DifficultyAvailability,
  type QuickCreateResponseData,
} from "@/services/parent-assessment";

// ── Helpers ──────────────────────────────────────────────────────────────────
const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
const defaultFromDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return toIsoDate(d);
};

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof AxiosError) {
    return err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback;
  }
  return (err as Error)?.message || fallback;
};

const STEP_LABELS = ["Topics", "Difficulty", "Settings"] as const;

// ── Main component ───────────────────────────────────────────────────────────
const ParentQuickAssessment = () => {
  const {
    children: childList,
    loading: childrenLoading,
    error: childrenError,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
  } = useParentChildren();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [result, setResult] = useState<QuickCreateResponseData | null>(null);
  const [blockingError, setBlockingError] = useState<string | null>(null);

  // ── Step 1: taught topics ─────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState(defaultFromDate());
  const [toDate, setToDate] = useState(toIsoDate(new Date()));
  const [topics, setTopics] = useState<TaughtTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicsSearched, setTopicsSearched] = useState(false);

  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const findTopics = async () => {
    if (!selectedChildId) return;
    setTopicsLoading(true);
    setTopicsError(null);
    setTopicsSearched(false);
    try {
      const res = await parentAssessmentService.getTaughtTopics(selectedChildId, fromDate, toDate);
      const list = res.data?.data?.topics ?? [];
      setTopics(list);
      setSelectedTopicIds(new Set());
      setTopicsSearched(true);
    } catch (err) {
      setTopicsError(extractErrorMessage(err, "Failed to load taught topics."));
    } finally {
      setTopicsLoading(false);
    }
  };

  // ── Step 2: question availability ─────────────────────────────────────────
  const [availability, setAvailability] = useState<DifficultyAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [counts, setCounts] = useState<Record<number, number>>({});

  const goToDifficultyStep = async () => {
    if (!selectedChildId || selectedTopicIds.size === 0) return;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const res = await parentAssessmentService.getQuestionAvailability(
        selectedChildId,
        Array.from(selectedTopicIds),
      );
      const list = res.data?.data?.byDifficulty ?? [];
      setAvailability(list);
      // Reset counts, but pre-fill a sane default (min(available, 5)) for any level with questions.
      const nextCounts: Record<number, number> = {};
      for (const d of list) {
        if (d.availableCount > 0) nextCounts[d.difficultyLevel] = Math.min(5, d.availableCount);
      }
      setCounts(nextCounts);
      setStep(2);
    } catch (err) {
      setAvailabilityError(extractErrorMessage(err, "Failed to load question availability."));
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Re-check availability right before showing the count picker again if the
  // parent navigates back to step 2 after already having been there — keeps
  // the counts fresh per the spec's guidance, minimizing the requested/included
  // mismatch window at creation time.
  const refreshAvailabilityAndAdvance = async () => {
    if (step === 1) {
      await goToDifficultyStep();
    } else {
      setStep(2);
    }
  };

  const setCountFor = (level: number, value: number, max: number) => {
    setCounts((prev) => ({ ...prev, [level]: Math.max(0, Math.min(value, max)) }));
  };

  const totalRequested = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + (n || 0), 0),
    [counts],
  );

  // ── Step 3: settings + create ──────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [passMarkPercent, setPassMarkPercent] = useState(50);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedChildId) return;
    const difficultySelections = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([difficultyLevel, count]) => ({ difficultyLevel: Number(difficultyLevel), count }));

    if (difficultySelections.length === 0) {
      setBlockingError("Select at least one question for at least one difficulty level.");
      return;
    }

    setCreating(true);
    setBlockingError(null);
    try {
      const res = await parentAssessmentService.quickCreate(selectedChildId, {
        topicIds: Array.from(selectedTopicIds),
        difficultySelections,
        title: title.trim() || undefined,
        timeLimitMinutes,
        passMarkPercent,
        showResultImmediately,
        showCorrectAnswers,
        expiresAt: expiresAt || null,
      });
      setResult(res.data?.data ?? null);
    } catch (err) {
      setBlockingError(extractErrorMessage(err, "Couldn't create the assessment. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const startOver = () => {
    setResult(null);
    setBlockingError(null);
    setStep(1);
    setTopics([]);
    setTopicsSearched(false);
    setSelectedTopicIds(new Set());
    setAvailability([]);
    setCounts({});
    setTitle("");
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
        <h1 className="text-lg sm:text-2xl font-bold text-[#12122A] flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-chestnut" />
          Quick Assessment
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Build a quick assessment from what your child has been taught recently — pick topics, choose
          how many questions of each difficulty, and it's assigned to them right away.
        </p>

        {childList.length > 1 && !result && (
          <div className="flex flex-wrap gap-2 mt-4">
            {childList.map((c) => {
              const active = c.studentId === selectedChildId;
              return (
                <button
                  key={c.studentId}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(c.studentId);
                    startOver();
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    active
                      ? "bg-chestnut text-white border-chestnut"
                      : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {c.firstName} {c.lastName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {childrenLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading your children...</span>
        </div>
      ) : childrenError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-red-600 font-medium">{childrenError}</p>
        </div>
      ) : !selectedChild ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-10 text-center">
          <p className="text-sm text-slate-500">No children linked to your account yet.</p>
        </div>
      ) : result ? (
        <SuccessPanel result={result} childName={`${selectedChild.firstName} ${selectedChild.lastName}`} onStartOver={startOver} />
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const active = n === step;
              const done = n < step;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      active
                        ? "bg-chestnut text-white"
                        : done
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : <span>{n}</span>}
                    {label}
                  </div>
                  {i < STEP_LABELS.length - 1 && <div className="h-px flex-1 bg-slate-200" />}
                </div>
              );
            })}
          </div>

          {blockingError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{blockingError}</p>
            </div>
          )}

          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">From</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    max={toDate}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">To</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate}
                    max={toIsoDate(new Date())}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={findTopics}
                disabled={topicsLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {topicsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                Find Taught Topics
              </button>

              {topicsError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {topicsError}
                </p>
              )}

              {topicsSearched && topics.length === 0 && !topicsError && (
                <p className="text-sm text-slate-400 py-4 text-center">
                  No taught topics found in that date range — try widening it.
                </p>
              )}

              {topics.length > 0 && (
                <>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Select one or more topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((t) => {
                        const active = selectedTopicIds.has(t.topicId);
                        return (
                          <button
                            key={t.topicId}
                            type="button"
                            onClick={() => toggleTopic(t.topicId)}
                            className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors text-left ${
                              active
                                ? "bg-chestnut text-white border-chestnut"
                                : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                            }`}
                          >
                            {t.topicName}
                            <span className={active ? "text-white/70" : "text-slate-400"}> · {t.subjectName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={refreshAvailabilityAndAdvance}
                    disabled={selectedTopicIds.size === 0 || availabilityLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-chestnut hover:bg-chestnut/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {availabilityLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Continue with {selectedTopicIds.size} topic{selectedTopicIds.size !== 1 ? "s" : ""}
                  </button>
                  {availabilityError && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {availabilityError}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-chestnut"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to topics
              </button>

              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                How many questions of each difficulty?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availability.map((d) => {
                  const disabled = d.availableCount === 0;
                  return (
                    <div
                      key={d.difficultyLevel}
                      className={`rounded-xl border p-3.5 ${disabled ? "border-slate-100 bg-slate-50 opacity-50" : "border-slate-200"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[#12122A]">{d.difficultyLevelName}</span>
                        <span className="text-[11px] text-slate-400">{d.availableCount} available</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={d.availableCount}
                        disabled={disabled}
                        value={counts[d.difficultyLevel] ?? 0}
                        onChange={(e) => setCountFor(d.difficultyLevel, Number(e.target.value), d.availableCount)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none disabled:bg-slate-100"
                      />
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={totalRequested === 0}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-chestnut hover:bg-chestnut/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                Continue with {totalRequested} question{totalRequested !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-chestnut"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to difficulty
              </button>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Title <span className="normal-case font-normal">(optional — auto-generated if left blank)</span>
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${selectedChild.firstName} — ${Array.from(selectedTopicIds)
                    .map((id) => topics.find((t) => t.topicId === id)?.topicName)
                    .filter(Boolean)
                    .join(", ")}`}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Time Limit (minutes)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Math.max(1, Number(e.target.value)))}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Pass Mark (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passMarkPercent}
                    onChange={(e) => setPassMarkPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Deadline <span className="normal-case font-normal">(optional — no deadline if left blank)</span>
                </span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-chestnut focus:ring-2 focus:ring-chestnut/10 outline-none"
                />
              </label>

              <div className="flex flex-col gap-2.5 pt-1">
                <ToggleRow
                  label="Show result immediately after submission"
                  checked={showResultImmediately}
                  onChange={setShowResultImmediately}
                />
                <ToggleRow
                  label="Show correct answers after submission"
                  checked={showCorrectAnswers}
                  onChange={setShowCorrectAnswers}
                />
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Create Assessment
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Small presentational helpers ─────────────────────────────────────────────
const ToggleRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
    <span className="text-sm text-slate-600">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${checked ? "bg-chestnut" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0"
        }`}
      />
    </button>
  </label>
);

const SuccessPanel = ({
  result,
  childName,
  onStartOver,
}: {
  result: QuickCreateResponseData;
  childName: string;
  onStartOver: () => void;
}) => {
  const partial = result.byDifficulty.filter((d) => d.included < d.requested);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6 text-center space-y-4">
      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
      <div>
        <h2 className="text-base font-bold text-[#12122A]">Assessment created and assigned</h2>
        <p className="text-sm text-slate-500 mt-1">
          "{result.title}" has been assigned to {childName} — {result.totalQuestions} question
          {result.totalQuestions !== 1 ? "s" : ""} in total.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {result.byDifficulty.map((d) => (
          <span
            key={d.difficultyLevel}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600"
          >
            {d.difficultyLevelName}: {d.included}
          </span>
        ))}
      </div>

      {partial.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
          <p className="text-xs font-semibold text-amber-700 mb-1">Some difficulty levels had fewer questions available than requested:</p>
          {partial.map((d) => (
            <p key={d.difficultyLevel} className="text-xs text-amber-700">
              Only {d.included} of {d.requested} {d.difficultyLevelName} questions were available and included.
            </p>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">Assessment code: <span className="font-mono font-semibold text-slate-600">{result.code}</span></p>

      <button
        type="button"
        onClick={onStartOver}
        className="px-5 py-2.5 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white text-sm font-semibold transition-colors"
      >
        Create Another
      </button>
    </div>
  );
};

export default ParentQuickAssessment;

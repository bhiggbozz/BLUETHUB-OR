import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "lucide-react";
import type { ParentChild } from "@/services/parent";
import {
  parentAssessmentService,
  type DifficultyAvailability,
  type QuickCreateResponseData,
  type TaughtTopic,
} from "@/services/parent-assessment";
import { ChildrenGate } from "../component/ui/children-gate";
import { IconButton } from "../component/ui/button";
import { InlineNotice, Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { smooth, stagger } from "../component/ui/motion";
import { childName, extractErrorMessage } from "../lib/format";
import { DifficultyStep } from "./parts/difficulty-step";
import { SettingsStep, validateSettings, type AssessmentSettings } from "./parts/settings-step";
import { Stepper, type StepNumber } from "./parts/stepper";
import { SuccessPanel } from "./parts/success-panel";
import { SummaryAside } from "./parts/summary-aside";
import { TopicsStep, presetRange, type RangePreset } from "./parts/topics-step";

const DEFAULT_PRESET: Exclude<RangePreset, "custom"> = "90";
const DEFAULT_COUNT_PER_LEVEL = 5;

const DEFAULT_SETTINGS: AssessmentSettings = {
  title: "",
  timeLimitMinutes: 20,
  passMarkPercent: 50,
  showResultImmediately: true,
  showCorrectAnswers: true,
  expiresAt: "",
};

const ParentQuickAssessment = () => (
  <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
    <ChildrenGate
      skeleton={
        <div className="space-y-5" aria-busy="true">
          <Skeleton className="h-20 w-2/3 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-72 rounded-[20px]" />
        </div>
      }
    >
      {(child) => <Wizard child={child} />}
    </ChildrenGate>
  </motion.div>
);

function Wizard({ child }: { child: ParentChild }) {
  const first = child.firstName || "your child";
  const [step, setStep] = useState<StepNumber>(1);
  const [direction, setDirection] = useState(1);
  const [result, setResult] = useState<QuickCreateResponseData | null>(null);
  const [switchedNotice, setSwitchedNotice] = useState<string | null>(null);

  // ── Step 1: taught topics ───────────────────────────────────────────────
  const initialRange = presetRange(DEFAULT_PRESET);
  const [preset, setPreset] = useState<RangePreset>(DEFAULT_PRESET);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [topics, setTopics] = useState<TaughtTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicsSearched, setTopicsSearched] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  // ── Step 2: availability ────────────────────────────────────────────────
  const [availability, setAvailability] = useState<DifficultyAvailability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});

  // ── Step 3: settings ────────────────────────────────────────────────────
  const [settings, setSettings] = useState<AssessmentSettings>(DEFAULT_SETTINGS);
  const [showErrors, setShowErrors] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const go = (n: StepNumber) => {
    setDirection(n > step ? 1 : -1);
    setStep(n);
  };

  const startOver = () => {
    setResult(null);
    setCreateError(null);
    setShowErrors(false);
    setStep(1);
    setDirection(-1);
    setTopics([]);
    setTopicsSearched(false);
    setTopicsError(null);
    setSelectedTopicIds(new Set());
    setAvailability([]);
    setAvailabilityError(null);
    setCounts({});
    setSettings(DEFAULT_SETTINGS);
  };

  // The child is chosen globally. A different child invalidates topics and counts,
  // so reset — and say so if the parent had already made progress.
  const prevChild = useRef(child.studentId);
  const hasProgress = topicsSearched || step > 1 || result !== null;
  const progressRef = useRef(hasProgress);
  progressRef.current = hasProgress;
  useEffect(() => {
    if (prevChild.current === child.studentId) return;
    prevChild.current = child.studentId;
    if (progressRef.current) setSwitchedNotice(`You switched to ${childName(child)}, so we started a fresh assessment.`);
    startOver();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the child changes
  }, [child.studentId]);

  const choosePreset = (p: RangePreset) => {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p);
      setFromDate(r.from);
      setToDate(r.to);
    }
  };

  const findTopics = async () => {
    setTopicsLoading(true);
    setTopicsError(null);
    setTopicsSearched(false);
    try {
      const res = await parentAssessmentService.getTaughtTopics(child.studentId, fromDate, toDate);
      setTopics(res.data?.data?.topics ?? []);
      setSelectedTopicIds(new Set());
      setTopicsSearched(true);
    } catch (err) {
      setTopicsError(extractErrorMessage(err, "Failed to load taught topics."));
    } finally {
      setTopicsLoading(false);
    }
  };

  const toggleTopic = (id: string) =>
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setManyTopics = (ids: string[], on: boolean) =>
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  // Availability is re-checked every time the parent leaves step 1, so counts stay
  // fresh and the requested/included mismatch window at creation stays small.
  const goToDifficulty = async () => {
    if (selectedTopicIds.size === 0) return;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const res = await parentAssessmentService.getQuestionAvailability(child.studentId, Array.from(selectedTopicIds));
      const list = res.data?.data?.byDifficulty ?? [];
      setAvailability(list);
      const next: Record<number, number> = {};
      for (const d of list) {
        if (d.availableCount > 0) next[d.difficultyLevel] = Math.min(DEFAULT_COUNT_PER_LEVEL, d.availableCount);
      }
      setCounts(next);
      go(2);
    } catch (err) {
      setAvailabilityError(extractErrorMessage(err, "Failed to load question availability."));
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const setCountFor = (level: number, value: number, max: number) =>
    setCounts((prev) => ({ ...prev, [level]: Math.max(0, Math.min(Math.round(value), max)) }));

  const totalRequested = useMemo(() => Object.values(counts).reduce((s, n) => s + (n || 0), 0), [counts]);

  const selectedTopicNames = useMemo(
    () =>
      Array.from(selectedTopicIds)
        .map((id) => topics.find((t) => t.topicId === id)?.topicName)
        .filter((n): n is string => Boolean(n)),
    [selectedTopicIds, topics],
  );

  const handleCreate = async () => {
    setShowErrors(true);
    if (Object.keys(validateSettings(settings)).length > 0) return;

    const difficultySelections = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([difficultyLevel, count]) => ({ difficultyLevel: Number(difficultyLevel), count }));
    if (difficultySelections.length === 0) {
      setCreateError("Select at least one question for at least one difficulty level.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await parentAssessmentService.quickCreate(child.studentId, {
        topicIds: Array.from(selectedTopicIds),
        difficultySelections,
        title: settings.title.trim() || undefined,
        timeLimitMinutes: settings.timeLimitMinutes,
        passMarkPercent: settings.passMarkPercent,
        showResultImmediately: settings.showResultImmediately,
        showCorrectAnswers: settings.showCorrectAnswers,
        expiresAt: settings.expiresAt || null,
      });
      const data = res.data?.data ?? null;
      if (!data) {
        setCreateError("The server didn't confirm the assessment. Please check with your school before trying again.");
        return;
      }
      setResult(data);
    } catch (err) {
      setCreateError(extractErrorMessage(err, "Couldn't create the assessment. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const titlePlaceholder = `${child.firstName} — ${selectedTopicNames.join(", ") || "practice"}`;

  return (
    <>
      <PageHeader
        eyebrow="Practice at home"
        title="Practice assessment"
        description={`Build a short quiz from what ${first} was actually taught. It's assigned to them as soon as you create it.`}
      />

      <AnimatePresence>
        {switchedNotice && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={smooth}>
            <InlineNotice
              icon={<Info className="size-4 text-(--pp-iris)" />}
              action={
                <IconButton label="Dismiss" onClick={() => setSwitchedNotice(null)} className="-my-2 -mr-2 size-8">
                  <X className="size-3.5" />
                </IconButton>
              }
            >
              {switchedNotice}
            </InlineNotice>
          </motion.div>
        )}
      </AnimatePresence>

      {result ? (
        <SuccessPanel result={result} firstName={first} onStartOver={startOver} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <Stepper step={step} onJump={go} />
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 1 && (
                  <TopicsStep
                    firstName={first}
                    preset={preset}
                    onPreset={choosePreset}
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDate={setFromDate}
                    onToDate={setToDate}
                    topics={topics}
                    searched={topicsSearched}
                    loading={topicsLoading}
                    error={topicsError}
                    onFind={findTopics}
                    selected={selectedTopicIds}
                    onToggle={toggleTopic}
                    onSetMany={setManyTopics}
                    onContinue={goToDifficulty}
                    continuing={availabilityLoading}
                    continueError={availabilityError}
                  />
                )}
                {step === 2 && (
                  <DifficultyStep
                    availability={availability}
                    counts={counts}
                    onCount={setCountFor}
                    total={totalRequested}
                    onBack={() => go(1)}
                    onContinue={() => go(3)}
                  />
                )}
                {step === 3 && (
                  <SettingsStep
                    value={settings}
                    onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
                    titlePlaceholder={titlePlaceholder}
                    firstName={first}
                    showErrors={showErrors}
                    onBack={() => go(2)}
                    onCreate={handleCreate}
                    creating={creating}
                    createError={createError}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lg:col-span-4">
            <SummaryAside
              child={child}
              fromDate={fromDate}
              toDate={toDate}
              topicNames={selectedTopicNames}
              totalQuestions={totalRequested}
              timeLimitMinutes={settings.timeLimitMinutes}
              passMarkPercent={settings.passMarkPercent}
              step={step}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ParentQuickAssessment;

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { BookOpen, Check, ClipboardList, Plus } from "lucide-react";
import toast from "react-hot-toast";
import type { RootState } from "@/store";
import { setSettings, setSubjectsForChild, upsertQuiz } from "@/store/parent-quiz-slice";
import parentQuizService, { type CreateParentQuizResponse } from "@/services/parent-quiz";
import type { ParentChild } from "@/services/parent";
import { ChildrenGate } from "../component/ui/children-gate";
import { Button } from "../component/ui/button";
import { ErrorState, InlineNotice, Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { fadeUp, stagger } from "../component/ui/motion";
import { extractErrorMessage } from "../lib/format";
import { SubjectCard } from "./components/subject-card";
import { AdvancedPanel, type AdvancedOverrides } from "./components/advanced-panel";
import { SettingsDialog } from "./components/settings-dialog";
import { computeSelectedTotal, emptySelection, isSelectionEmpty, MIN_QUESTIONS, selectableSubTopicIds, summarizeSettings, type SubjectSelection } from "./lib";

interface CreateDeepLink {
  subjectId?: string;
  subTopicId?: string;
}

const ParentPracticeQuizCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const deepLink = (location.state as CreateDeepLink | null) ?? null;

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Practice at home"
        title="Practice quizzes"
        description="Pick a subject. We'll pull questions straight from the school's question bank and send them to your child's account."
        actions={
          <>
            <Button variant="secondary" icon={<BookOpen className="size-4" />} onClick={() => navigate("/parent/practice-quiz/taught")}>
              What was taught
            </Button>
            <Button variant="secondary" icon={<ClipboardList className="size-4" />} onClick={() => navigate("/parent/practice-quiz/quizzes")}>
              My quizzes
            </Button>
          </>
        }
      />
      <ChildrenGate skeleton={<CreateSkeleton />}>{(child) => <Create child={child} deepLink={deepLink} />}</ChildrenGate>
    </motion.div>
  );
};

function CreateSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading subjects">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  );
}

function Create({ child, deepLink }: { child: ParentChild; deepLink: CreateDeepLink | null }) {
  const dispatch = useDispatch();
  const settings = useSelector((s: RootState) => s.parentQuiz.settings);
  const settingsLoaded = useSelector((s: RootState) => s.parentQuiz.settingsLoaded);
  const subjects = useSelector((s: RootState) => s.parentQuiz.subjectsByChild[child.studentId]);

  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SubjectSelection>(emptySelection());
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedOverrides>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateParentQuizResponse | null>(null);

  useEffect(() => {
    if (settingsLoaded) return;
    parentQuizService
      .getSettings()
      .then((res) => {
        if (res.data?.data) dispatch(setSettings(res.data.data));
      })
      .catch(() => undefined);
  }, [settingsLoaded, dispatch]);

  useEffect(() => {
    if (subjects) return;
    let cancelled = false;
    setSubjectsLoading(true);
    setSubjectsError(null);
    parentQuizService
      .getChildSubjects(child.studentId)
      .then((res) => {
        if (cancelled) return;
        dispatch(setSubjectsForChild({ studentId: child.studentId, subjects: res.data?.data ?? [] }));
      })
      .catch((err) => {
        if (!cancelled) setSubjectsError(extractErrorMessage(err, "Couldn't load this child's subjects."));
      })
      .finally(() => {
        if (!cancelled) setSubjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retryTick forces a refetch on "Try again"
  }, [child.studentId, subjects, dispatch, retryTick]);

  const prevChild = useRef(child.studentId);
  useEffect(() => {
    if (prevChild.current === child.studentId) return;
    prevChild.current = child.studentId;
    setSelectedSubjectId(null);
    setSelection(emptySelection());
    setAdvanced({});
    setAdvancedOpen(false);
    setCreated(null);
    setCreateError(null);
  }, [child.studentId]);

  // Arrived via "Set a quiz on this" from the "What was taught" screen —
  // pre-select that subject and sub-topic once the subject list has loaded.
  const appliedDeepLinkRef = useRef(false);
  useEffect(() => {
    if (appliedDeepLinkRef.current || !deepLink?.subjectId || !subjects) return;
    const subject = subjects.find((s) => s.subjectId === deepLink.subjectId);
    if (!subject) return;
    appliedDeepLinkRef.current = true;
    setSelectedSubjectId(subject.subjectId);
    if (deepLink.subTopicId) {
      setSelection({ topicIds: new Set(), subTopicIds: new Set([deepLink.subTopicId]) });
    }
  }, [deepLink, subjects]);

  const selectSubject = (subjectId: string) => {
    if (selectedSubjectId === subjectId) {
      setSelectedSubjectId(null);
      setSelection(emptySelection());
      return;
    }
    setSelectedSubjectId(subjectId);
    setSelection(emptySelection());
  };

  const toggleWholeTopic = (topicId: string) =>
    setSelection((prev) => {
      const next = new Set(prev.topicIds);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return { ...prev, topicIds: next };
    });

  const toggleSubTopic = (subTopicId: string) =>
    setSelection((prev) => {
      const next = new Set(prev.subTopicIds);
      if (next.has(subTopicId)) next.delete(subTopicId);
      else next.add(subTopicId);
      return { ...prev, subTopicIds: next };
    });

  const toggleAllSubTopics = (topicId: string) => {
    const subject = subjects?.find((s) => s.subjectId === selectedSubjectId);
    const topic = subject?.topics.find((t) => t.topicId === topicId);
    if (!topic) return;
    const selectable = selectableSubTopicIds(topic);
    setSelection((prev) => {
      const allSelected = selectable.length > 0 && selectable.every((id) => prev.subTopicIds.has(id));
      const next = new Set(prev.subTopicIds);
      for (const id of selectable) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return { ...prev, subTopicIds: next };
    });
  };

  const selectedSubject = subjects?.find((s) => s.subjectId === selectedSubjectId) ?? null;
  const selectedTotal = selectedSubject ? computeSelectedTotal(selectedSubject, selection) : 0;
  const canCreate = Boolean(selectedSubjectId) && selectedTotal >= MIN_QUESTIONS;

  const handleCreate = async () => {
    if (!selectedSubjectId || !canCreate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await parentQuizService.createQuiz({
        studentId: child.studentId,
        subjectId: selectedSubjectId,
        ...(selection.topicIds.size > 0 ? { topicIds: Array.from(selection.topicIds) } : {}),
        ...(selection.subTopicIds.size > 0 ? { subTopicIds: Array.from(selection.subTopicIds) } : {}),
        ...(advanced.questionCount !== undefined ? { questionCount: advanced.questionCount } : {}),
        ...(advanced.mode !== undefined ? { mode: advanced.mode } : {}),
        ...(advanced.timeLimitMinutes !== undefined ? { timeLimitMinutes: advanced.timeLimitMinutes } : {}),
        ...(advanced.title?.trim() ? { title: advanced.title.trim() } : {}),
      });
      const data = res.data?.data;
      if (!data) {
        setCreateError(res.data?.responseMessage || "The server didn't confirm the quiz. Please try again.");
        return;
      }
      dispatch(upsertQuiz(data.quiz));
      toast.success(`Quiz sent to ${child.firstName || "your child"}`);
      setCreated(data);
    } catch (err) {
      setCreateError(extractErrorMessage(err, "Couldn't create the quiz. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  const startOver = () => {
    setCreated(null);
    setCreateError(null);
    setSelectedSubjectId(null);
    setSelection(emptySelection());
    setAdvanced({});
    setAdvancedOpen(false);
  };

  if (created) {
    return <CreatedPanel result={created} firstName={child.firstName} onCreateAnother={startOver} />;
  }

  return (
    <motion.div variants={fadeUp} className="space-y-5">
      {subjectsLoading && !subjects ? (
        <CreateSkeleton />
      ) : subjectsError ? (
        <ErrorState
          title="We couldn't load this child's subjects"
          message={subjectsError}
          onRetry={() => {
            setSubjectsError(null);
            setRetryTick((t) => t + 1);
          }}
        />
      ) : (
        <div className="space-y-3" role="radiogroup" aria-label="Subject">
          {(subjects ?? []).map((subject) => (
            <SubjectCard
              key={subject.subjectId}
              subject={subject}
              active={selectedSubjectId === subject.subjectId}
              selection={selectedSubjectId === subject.subjectId ? selection : emptySelection()}
              onSelect={() => selectSubject(subject.subjectId)}
              onToggleWholeTopic={toggleWholeTopic}
              onToggleSubTopic={toggleSubTopic}
              onToggleAllSubTopics={toggleAllSubTopics}
              initialExpandedTopicId={
                deepLink?.subjectId === subject.subjectId && deepLink.subTopicId
                  ? subject.topics.find((t) => (t.subTopics ?? []).some((s) => s.subTopicId === deepLink.subTopicId))?.topicId
                  : null
              }
            />
          ))}
        </div>
      )}

      {selectedSubject && !isSelectionEmpty(selection) && (
        <p className="text-center text-[12px] text-(--pp-subtle)" aria-live="polite">
          {selectedTotal} question{selectedTotal === 1 ? "" : "s"} available from what's selected
          {selectedTotal < MIN_QUESTIONS && ` — at least ${MIN_QUESTIONS} are needed`}
        </p>
      )}

      {createError && (
        <div role="alert" aria-live="polite">
          <ErrorState title="Couldn't create the quiz" message={createError} />
        </div>
      )}

      {settings && (
        <AdvancedPanel
          open={advancedOpen}
          onToggleOpen={() => setAdvancedOpen((o) => !o)}
          value={advanced}
          defaults={settings}
          onChange={(patch) => setAdvanced((a) => ({ ...a, ...patch }))}
        />
      )}

      <div className="space-y-2">
        <Button
          onClick={() => void handleCreate()}
          loading={creating}
          disabled={!canCreate}
          size="lg"
          className="w-full"
          icon={<Plus className="size-4" />}
        >
          Create quiz
        </Button>
        {settings && (
          <p className="text-center text-[12px] text-(--pp-subtle)">
            {summarizeSettings(settings)} ·{" "}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="font-semibold text-(--pp-iris) underline-offset-2 hover:underline"
            >
              Change
            </button>
          </p>
        )}
      </div>

      {settings && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} />}
    </motion.div>
  );
}

function CreatedPanel({
  result,
  firstName,
  onCreateAnother,
}: {
  result: CreateParentQuizResponse;
  firstName: string;
  onCreateAnother: () => void;
}) {
  const navigate = useNavigate();
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pp-surface overflow-hidden">
      <div className="pp-spotlight rounded-none! px-6 pt-10 pb-8 text-center shadow-none!">
        <div className="mx-auto mb-5 inline-flex size-16 items-center justify-center rounded-full bg-(--pp-present) text-white shadow-[0_0_30px_-4px_rgba(12,143,99,0.8)]">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <p className="pp-eyebrow text-white/50!">Sent to {firstName || "your child"}</p>
        <h2 className="pp-display mt-2 text-[24px] font-semibold text-white">{result.quiz.title}</h2>
        <p className="mt-1.5 text-[14px] text-white/60">
          {result.quiz.questionCount} question{result.quiz.questionCount === 1 ? "" : "s"} · {result.quiz.subjectName}
        </p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {result.notice && (
          <InlineNotice tone="warn" icon={<Check className="size-4" />}>
            {result.notice}
          </InlineNotice>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onCreateAnother} icon={<Plus className="size-4" />}>
            Create another
          </Button>
          <Button variant="secondary" onClick={() => navigate("/parent/practice-quiz/quizzes")} icon={<ClipboardList className="size-4" />}>
            View my quizzes
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

export default ParentPracticeQuizCreate;

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardList, Eye } from "lucide-react";
import type { RootState } from "@/store";
import { setSubjectsForChild } from "@/store/parent-quiz-slice";
import parentQuizService from "@/services/parent-quiz";
import { lessonService, type TopicsTaughtResponse, type TopicsTaughtTopic } from "@/services/lesson";
import calendarService, { type CalendarSessionDto } from "@/services/calendar";
import type { ParentChild } from "@/services/parent";
import { ChildrenGate } from "../component/ui/children-gate";
import { Button } from "../component/ui/button";
import { EmptyState, ErrorState, Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { fadeUp, stagger } from "../component/ui/motion";
import { extractErrorMessage } from "../lib/format";
import { findSubTopicAvailable, formatTaughtDate } from "./lib";

const ParentPracticeQuizTaught = () => {
  const navigate = useNavigate();
  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
      <button
        type="button"
        onClick={() => navigate("/parent/practice-quiz")}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-(--pp-muted) hover:text-(--pp-text)"
      >
        <ArrowLeft className="size-3.5" /> Create a quiz
      </button>
      <PageHeader eyebrow="Practice at home" title="What was taught" description="Browse lessons by term, then set a practice quiz straight from a topic." />
      <ChildrenGate skeleton={<TaughtSkeleton />}>{(child) => <Taught child={child} />}</ChildrenGate>
    </motion.div>
  );
};

function TaughtSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}

function Taught({ child }: { child: ParentChild }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const subjectsAvailability = useSelector((s: RootState) => s.parentQuiz.subjectsByChild[child.studentId]);

  const [sessions, setSessions] = useState<CalendarSessionDto[]>([]);
  const [termIdOverride, setTermIdOverride] = useState<string | null>(null);
  const [sessionWide, setSessionWide] = useState(false);
  const [taught, setTaught] = useState<TopicsTaughtResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    calendarService
      .getSessions()
      .then((res) => setSessions(res.data?.data ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (subjectsAvailability) return;
    parentQuizService
      .getChildSubjects(child.studentId)
      .then((res) => dispatch(setSubjectsForChild({ studentId: child.studentId, subjects: res.data?.data ?? [] })))
      .catch(() => undefined);
  }, [child.studentId, subjectsAvailability, dispatch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    lessonService
      .getTopicsTaught({
        studentId: child.studentId,
        termId: termIdOverride ?? undefined,
        sessionId: !termIdOverride && sessionWide ? taught?.sessionId : undefined,
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data) {
          setTaught(data);
          setEmptyMessage(data.totalLessons === 0 ? res.data?.responseMessage || "Nothing was taught in this period." : null);
        } else {
          setError(res.data?.responseMessage || "Couldn't load what's been taught.");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, "Couldn't load what's been taught."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retryTick forces a refetch; taught.sessionId read, not depended on, to avoid refetch loops
  }, [child.studentId, termIdOverride, sessionWide, retryTick]);

  const currentSessionTerms = useMemo(
    () => sessions.find((s) => s.id === taught?.sessionId)?.terms ?? [],
    [sessions, taught?.sessionId],
  );

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const setQuizFor = (subjectId: string, subTopicId: string) => {
    navigate("/parent/practice-quiz", { state: { subjectId, subTopicId } });
  };

  return (
    <motion.div variants={fadeUp} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="taught-scope" className="text-[12px] font-semibold text-(--pp-text)">
          Showing
        </label>
        <select
          id="taught-scope"
          value={termIdOverride ?? (sessionWide ? "session" : "current")}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "current") {
              setTermIdOverride(null);
              setSessionWide(false);
            } else if (value === "session") {
              setTermIdOverride(null);
              setSessionWide(true);
            } else {
              setTermIdOverride(value);
              setSessionWide(false);
            }
          }}
          className="pp-input h-9 w-auto text-[13px]"
        >
          <option value="current">This term</option>
          {currentSessionTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
          <option value="session" disabled={!taught}>
            Whole session
          </option>
        </select>
      </div>

      {loading && !taught ? (
        <TaughtSkeleton />
      ) : error ? (
        <ErrorState
          title="We couldn't load what's been taught"
          message={error}
          onRetry={() => {
            setError(null);
            setRetryTick((t) => t + 1);
          }}
        />
      ) : !taught || taught.totalLessons === 0 ? (
        <EmptyState icon={<ClipboardList className="size-5" />} title="Nothing taught in this period" description={emptyMessage ?? undefined} />
      ) : (
        <div className="space-y-4">
          {taught.terms.map((term, termIdx) => {
            if (term.subjects.length === 0) return null;
            const termKey = term.termId ?? `between-${termIdx}`;
            const termLabel = term.termName ?? "Between terms";
            return (
              <section key={termKey} className="pp-surface overflow-hidden">
                <div className="border-b border-(--pp-line) px-4 py-3">
                  <p className="pp-eyebrow">{termLabel}</p>
                  <p className="mt-0.5 text-[12px] text-(--pp-subtle)">
                    {term.lessonCount} lesson{term.lessonCount === 1 ? "" : "s"} · {term.topicCount} topic{term.topicCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="divide-y divide-(--pp-line)">
                  {term.subjects.map((subject) => (
                    <div key={subject.subjectId} className="p-4">
                      <p className="text-[13px] font-semibold text-(--pp-text)">{subject.subjectName}</p>
                      <div className="mt-2 space-y-1.5">
                        {subject.topics.map((topic) => (
                          <TopicRow
                            key={topic.topicId}
                            topic={topic}
                            expanded={expanded.has(`${termKey}:${topic.topicId}`)}
                            onToggle={() => toggleExpanded(`${termKey}:${topic.topicId}`)}
                            onSetQuiz={(subTopicId) => setQuizFor(subject.subjectId, subTopicId)}
                            availabilityFor={(subTopicId) => findSubTopicAvailable(subjectsAvailability, subject.subjectId, subTopicId)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function TopicRow({
  topic,
  expanded,
  onToggle,
  onSetQuiz,
  availabilityFor,
}: {
  topic: TopicsTaughtTopic;
  expanded: boolean;
  onToggle: () => void;
  onSetQuiz: (subTopicId: string) => void;
  availabilityFor: (subTopicId: string) => number | null;
}) {
  return (
    <div className="rounded-xl border border-(--pp-line)">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-(--pp-text)">{topic.topicName}</p>
          <p className="text-[11px] text-(--pp-subtle)">
            {topic.lessonCount} lesson{topic.lessonCount === 1 ? "" : "s"} · last taught {formatTaughtDate(topic.lastTaughtOn)}
          </p>
        </div>
        {expanded ? <ChevronDown className="size-4 shrink-0 text-(--pp-subtle)" /> : <ChevronRight className="size-4 shrink-0 text-(--pp-subtle)" />}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-(--pp-line) px-3 py-2.5">
          {topic.lessons.map((lesson) => {
            const available = lesson.subTopicId ? availabilityFor(lesson.subTopicId) : null;
            const canSetQuiz = lesson.subTopicId && available !== null && available >= 5;
            return (
              <div key={lesson.lessonId} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] text-(--pp-text)">
                    {lesson.subTopicName ?? lesson.aim}
                    {lesson.watched !== null && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-(--pp-present)">
                        {lesson.watched && (
                          <>
                            <Check className="size-2.5" /> watched
                          </>
                        )}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-(--pp-subtle)">
                    {lesson.teacherName} · {formatTaughtDate(lesson.taughtOn)}
                  </p>
                </div>
                {lesson.subTopicId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canSetQuiz}
                    title={canSetQuiz ? undefined : "No questions yet"}
                    icon={<Eye className="size-3.5" />}
                    onClick={() => lesson.subTopicId && onSetQuiz(lesson.subTopicId)}
                    className="shrink-0"
                  >
                    Set a quiz on this
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ParentPracticeQuizTaught;

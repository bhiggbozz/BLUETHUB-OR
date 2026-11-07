import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";
import type { RootState } from "@/store";
import { setQuizzes } from "@/store/parent-quiz-slice";
import parentQuizService, { type ParentQuizSummaryDto } from "@/services/parent-quiz";
import { useParentChildren } from "@/contexts/parent-children-context";
import { EmptyState, ErrorState, Skeleton } from "../component/ui/feedback";
import { PageHeader } from "../component/ui/panel";
import { Segmented } from "../component/ui/segmented";
import { fadeUp, stagger } from "../component/ui/motion";
import { childName, extractErrorMessage } from "../lib/format";
import { QuizRow } from "./components/quiz-row";
import { CancelQuizDialog } from "./components/cancel-quiz-dialog";

const ParentPracticeQuizList = () => {
  const dispatch = useDispatch();
  const { children, loading: childrenLoading } = useParentChildren();
  const quizzes = useSelector((s: RootState) => s.parentQuiz.quizzes);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ParentQuizSummaryDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    parentQuizService
      .getQuizzes()
      .then((res) => {
        if (cancelled) return;
        dispatch(setQuizzes(res.data?.data ?? []));
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, "Couldn't load your quizzes."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (activeChildId || children.length === 0) return;
    setActiveChildId(children[0].studentId);
  }, [children, activeChildId]);

  const sorted = useMemo(
    () => [...quizzes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quizzes],
  );

  const visible = children.length > 1 && activeChildId ? sorted.filter((q) => q.studentId === activeChildId) : sorted;
  const activeChild = children.find((c) => c.studentId === activeChildId);

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow="Practice at home" title="My quizzes" description="Every practice quiz you've sent, newest first." />

      {children.length > 1 && (
        <motion.div variants={fadeUp}>
          <Segmented
            value={activeChildId ?? children[0]?.studentId ?? ""}
            onChange={setActiveChildId}
            label="Child"
            options={children.map((c) => ({ value: c.studentId, label: c.firstName || childName(c) }))}
          />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        {loading || childrenLoading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setError(null);
              setLoading(true);
              parentQuizService
                .getQuizzes()
                .then((res) => dispatch(setQuizzes(res.data?.data ?? [])))
                .catch((err) => setError(extractErrorMessage(err, "Couldn't load your quizzes.")))
                .finally(() => setLoading(false));
            }}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-5" />}
            title="No quizzes yet"
            description={`Pick a subject to test ${activeChild ? activeChild.firstName || childName(activeChild) : "your child"}.`}
          />
        ) : (
          <div className="space-y-3">
            {visible.map((quiz) => (
              <QuizRow key={quiz.id} quiz={quiz} onCancel={setCancelTarget} />
            ))}
          </div>
        )}
      </motion.div>

      <CancelQuizDialog quiz={cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)} />
    </motion.div>
  );
};

export default ParentPracticeQuizList;

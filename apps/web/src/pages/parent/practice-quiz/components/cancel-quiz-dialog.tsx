import { useState } from "react";
import { useDispatch } from "react-redux";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@bluethub/ui-kit";
import parentQuizService, { type ParentQuizSummaryDto } from "@/services/parent-quiz";
import { removeQuiz, setQuizzes } from "@/store/parent-quiz-slice";
import { Button } from "../../component/ui/button";
import { ErrorState } from "../../component/ui/feedback";
import { extractErrorMessage } from "../../lib/format";

interface CancelQuizDialogProps {
  quiz: ParentQuizSummaryDto | null;
  onOpenChange: (open: boolean) => void;
}

export function CancelQuizDialog({ quiz, onOpenChange }: CancelQuizDialogProps) {
  const dispatch = useDispatch();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!quiz) return;
    setCancelling(true);
    setError(null);
    try {
      await parentQuizService.cancelQuiz(quiz.id);
      dispatch(removeQuiz(quiz.id));
      onOpenChange(false);
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't cancel this quiz."));
      // The quiz may have just moved past "Pending" (e.g. the child just
      // started it) — refetch so the list reflects its real status.
      parentQuizService
        .getQuizzes()
        .then((res) => dispatch(setQuizzes(res.data?.data ?? [])))
        .catch(() => undefined);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AlertDialog open={quiz !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <AlertDialogContent className="parent-ui rounded-3xl border-(--pp-line) bg-(--pp-surface) p-6 shadow-(--pp-shadow-lg) data-[size=default]:sm:max-w-[400px]">
        <AlertDialogHeader className="items-start text-left">
          <span className="mb-2 inline-flex size-11 items-center justify-center rounded-2xl bg-(--pp-absent-soft) text-(--pp-absent)">
            <X className="size-5" />
          </span>
          <AlertDialogTitle className="pp-display text-lg font-semibold text-(--pp-text)">Cancel this quiz?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-5 text-(--pp-muted)">
            "{quiz?.title}" will be removed from {quiz?.studentName || "your child"}'s account. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <ErrorState message={error} className="mt-2" />}

        <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={cancelling}>
            Keep quiz
          </Button>
          <Button variant="danger" onClick={() => void handleCancel()} loading={cancelling}>
            Cancel quiz
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CancelQuizDialog;

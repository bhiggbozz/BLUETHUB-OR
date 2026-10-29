import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
} from "@bluethub/ui-kit";
import calendarService, { type CalendarSessionDto, type CalendarTermDto } from "@/services/calendar";

interface DeleteTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: CalendarTermDto;
  onDeleted: (session: CalendarSessionDto) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function DeleteTermDialog({ open, onOpenChange, term, onDeleted }: DeleteTermDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await calendarService.deleteTerm(term.id);
      onDeleted(res.data.data);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {term.name}?</AlertDialogTitle>
          <AlertDialogDescription>This removes the term from the academic year. This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={deleting} onClick={handleDelete}>
            {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {deleting ? "Deleting…" : "Delete term"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteTermDialog;

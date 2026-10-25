import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@bluethub/ui-kit";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="parent-ui rounded-3xl data-[size=default]:sm:max-w-[400px] border-(--pp-line) bg-(--pp-surface) p-6 shadow-(--pp-shadow-lg)">
        <AlertDialogHeader className="items-start text-left">
          <span className="mb-2 inline-flex size-11 items-center justify-center rounded-2xl bg-(--pp-absent-soft) text-(--pp-absent)">
            <LogOut className="size-5" />
          </span>
          <AlertDialogTitle className="pp-display text-lg font-semibold text-(--pp-text)">Log out of Bluethub?</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] leading-5 text-(--pp-muted)">
            You'll need your email and password to sign back in. Anything in progress on this page will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
          <AlertDialogCancel className="h-11 rounded-xl border-(--pp-line)! bg-(--pp-surface)! font-semibold text-(--pp-text)! hover:bg-(--pp-sunken)!">Stay signed in</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-11 rounded-xl bg-(--pp-absent)! font-semibold text-white! hover:bg-(--pp-absent)/90!"
          >
            Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

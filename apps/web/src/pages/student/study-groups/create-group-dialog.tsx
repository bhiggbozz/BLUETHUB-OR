import { useState } from "react";
import { AxiosError } from "axios";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from "@bluethub/ui-kit";
import { AlertCircle, Loader2, UsersRound } from "lucide-react";
import { groupService } from "@/services/groups";

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (groupId: string) => void;
}

const CreateGroupDialog = ({ open, onOpenChange, onCreated }: CreateGroupDialogProps) => {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setName("");
      setErrorMsg("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Give your group a name.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await groupService.createGroup({ name: trimmed });
      setName("");
      onCreated(res.data.data.groupId);
    } catch (err) {
      setErrorMsg(extractMsg(err, "Failed to create group."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 bg-gradient-to-r from-student-chestnut to-student-chestnut/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <UsersRound className="w-4 h-4 text-white" />
            </div>
            <DialogTitle className="text-sm font-semibold text-white">
              Create a Study Group
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">
              Group name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="e.g. Chemistry Study Squad"
              className="text-sm"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") void handleSubmit();
              }}
            />
            <p className="text-[10px] text-gray-400">
              Your classroom is set automatically. You'll be able to invite classmates once it's approved.
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full h-10 rounded-lg bg-student-chestnut hover:bg-student-chestnut/90 text-white font-semibold text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {submitting ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;

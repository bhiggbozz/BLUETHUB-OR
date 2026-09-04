import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@bluethub/ui-kit";
import { AlertCircle, Check, Loader2, Search, UserPlus } from "lucide-react";
import { moduleService, type ModuleStudent } from "@/services/module";
import { groupService } from "@/services/groups";

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  classroomId: string;
  existingMemberIds: Set<string>;
  onInvited: () => void;
}

const InviteMembersDialog = ({
  open,
  onOpenChange,
  groupId,
  classroomId,
  existingMemberIds,
  onInvited,
}: InviteMembersDialogProps) => {
  const [students, setStudents] = useState<ModuleStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open || !classroomId) return;
    setStudentsLoading(true);
    setErrorMsg("");
    setSelectedIds(new Set());
    moduleService
      .getStudentsByClassroom(classroomId)
      .then((res) => {
        const payload = (res.data as any)?.data ?? [];
        const rows: ModuleStudent[] = Array.isArray(payload) ? payload : [];
        setStudents(rows.filter((s) => s.isActive && !existingMemberIds.has(s.id)));
      })
      .catch((err) => {
        setStudents([]);
        setErrorMsg(extractMsg(err, "Couldn't load classmates."));
      })
      .finally(() => setStudentsLoading(false));
    // existingMemberIds is a Set recreated each render — read only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classroomId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.firstName, s.lastName, s.userName].join(" ").toLowerCase().includes(q)
    );
  }, [students, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) setErrorMsg("");
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await groupService.inviteMembers(groupId, { studentIds: Array.from(selectedIds) });
      onInvited();
      onOpenChange(false);
    } catch (err) {
      setErrorMsg(extractMsg(err, "Failed to invite classmates."));
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
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <DialogTitle className="text-sm font-semibold text-white">
              Invite Classmates
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classmates..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-student-chestnut/20"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="border border-gray-100 rounded-xl max-h-64 overflow-y-auto divide-y divide-gray-50">
            {studentsLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading classmates...</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">
                {students.length === 0 ? "No other classmates to invite." : "No matches."}
              </p>
            ) : (
              filtered.map((s) => {
                const checked = selectedIds.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${checked ? "bg-student-chestnut/5" : "hover:bg-student-chestnut/5"
                      }`}
                  >
                    <div
                      onClick={() => toggle(s.id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? "bg-student-chestnut border-student-chestnut" : "border-gray-300"
                        }`}
                    >
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="min-w-0 flex-1" onClick={() => toggle(s.id)}>
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{s.userName}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <Button
            type="button"
            disabled={submitting || selectedIds.size === 0}
            onClick={handleSubmit}
            className="w-full h-10 rounded-lg bg-student-chestnut hover:bg-student-chestnut/90 text-white font-semibold text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {submitting ? "Inviting..." : `Invite${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMembersDialog;

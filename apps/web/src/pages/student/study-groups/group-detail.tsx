import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  Mic,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { groupService, type GroupDetail as GroupDetailDto } from "@/services/groups";
import { useAuthContext } from "@/contexts/auth-context";
import InviteMembersDialog from "./invite-members-dialog";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Published: "bg-emerald-50 text-emerald-600 border-emerald-200",
    PendingApproval: "bg-amber-50 text-amber-600 border-amber-200",
    Rejected: "bg-red-50 text-red-500 border-red-200",
  };
  const labels: Record<string, string> = {
    Approved: "Approved",
    Published: "Published",
    PendingApproval: "Pending Approval",
    Rejected: "Rejected",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${styles[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

interface GroupDetailLocationState {
  isCreator?: boolean;
}

const GroupDetailPage = () => {
  const { groupId = "" } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const stateIsCreator = (location.state as GroupDetailLocationState | null)?.isCreator;

  const [detail, setDetail] = useState<GroupDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadDetail = useCallback(() => {
    if (!groupId) return;
    setLoading(true);
    setErrorMsg("");
    groupService
      .getGroupDetail(groupId)
      .then((res) => {
        const raw = res.data?.data;
        setDetail(raw ? { ...raw, members: raw.members ?? [], content: raw.content ?? [] } : null);
      })
      .catch((err) => {
        const status = err instanceof AxiosError ? err.response?.status : undefined;
        if (status === 403) setErrorMsg("You're not a member of this group.");
        else if (status === 404) setErrorMsg("This group couldn't be found.");
        else setErrorMsg(extractMsg(err, "Couldn't load this group."));
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Prefer the flag the my-groups list already resolved server-side (passed
  // through router state) — matching GUIDs client-side is a fallback for
  // direct navigation, and GUIDs can come back in different casing between
  // the JWT-decoded user id and the members list, so compare case-insensitively.
  const membersIsCreator = !!detail?.members?.find(
    (m) => user?.id && m.studentId?.toLowerCase() === user.id.toLowerCase()
  )?.isCreator;
  const isCreator = stateIsCreator ?? membersIsCreator;
  const existingMemberIds = new Set((detail?.members ?? []).map((m) => m.studentId));

  return (
    <div className="pt-[13px] px-2 lg:px-0 font-Poppins pb-6">
      <button
        type="button"
        onClick={() => navigate("/student/study-groups")}
        className="flex items-center gap-1 text-xs text-[#6B6B85] hover:text-student-chestnut transition-colors mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> My Groups
      </button>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[#6B6B85]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-xs">Loading group...</p>
        </div>
      ) : errorMsg || !detail ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <AlertCircle className="w-8 h-8 text-red-300" />
          <p className="text-sm font-medium text-[#3A3A3A]">{errorMsg || "Couldn't load this group."}</p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="rounded-[10px] h-10 w-10 flex items-center justify-center bg-student-chestnut/10 shrink-0">
                <Users className="w-5 h-5 text-student-chestnut" />
              </div>
              <div className="min-w-0">
                {isCreator && detail.status === "Approved" ? (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    title="Click to add classmates"
                    className="flex items-center gap-1.5 group"
                  >
                    <h2 className="text-[#3A3A3A] font-semibold text-sm truncate group-hover:text-student-chestnut transition-colors">
                      {detail.name}
                    </h2>
                    <UserPlus className="w-3.5 h-3.5 text-student-chestnut shrink-0" />
                  </button>
                ) : (
                  <h2 className="text-[#3A3A3A] font-semibold text-sm truncate">{detail.name}</h2>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusBadge status={detail.status} />
                  <span className="text-[11px] text-[#6B6B85]">
                    {detail.members.length} member{detail.members.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {detail.status === "PendingApproval" && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Waiting on your class teacher's approval. You'll be able to invite classmates once this group is approved.</span>
            </div>
          )}
          {detail.status === "Rejected" && (
            <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>This group was rejected by your class teacher, so classmates can't be added.</span>
            </div>
          )}

          {/* Members */}
          <section className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#3A3A3A] uppercase tracking-wide">Members</h3>
              {isCreator && (
                detail.status === "Approved" ? (
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-student-chestnut hover:opacity-70 transition-opacity"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite
                  </button>
                ) : (
                  <span
                    title="You can invite classmates once your class teacher approves this group"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-300 cursor-not-allowed"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite
                  </span>
                )
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {detail.members.map((m) => (
                <span
                  key={m.studentId}
                  className="inline-flex items-center gap-1.5 bg-white border border-[#E4E4EC] text-xs font-medium text-[#3A3A3A] px-2.5 py-1 rounded-full"
                >
                  {m.firstName} {m.lastName}
                  {m.isCreator && (
                    <span className="text-[9px] font-semibold text-student-chestnut bg-student-chestnut/10 px-1.5 py-0.5 rounded-full">
                      Creator
                    </span>
                  )}
                </span>
              ))}
            </div>
          </section>

          {/* Content feed */}
          <section className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#3A3A3A] uppercase tracking-wide">Content</h3>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-300 cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" /> Add Content
              </button>
            </div>

            {detail.content.length === 0 ? (
              <p className="text-xs text-[#6B6B85] py-6 text-center border border-dashed border-[#E4E4EC] rounded-xl">
                No content yet. Content sharing is coming soon.
              </p>
            ) : (
              <div className="space-y-2">
                {detail.content.map((item) => (
                  <div
                    key={item.contentId}
                    className="bg-white border border-[#E4E4EC] rounded-xl px-3.5 py-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-student-chestnut/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-student-chestnut" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#3A3A3A] truncate">{item.aim}</p>
                      <p className="text-[11px] text-[#6B6B85] mt-0.5">
                        {item.subjectName} · {item.mediaCount} file{item.mediaCount === 1 ? "" : "s"}
                        {item.hasRecording && (
                          <span className="inline-flex items-center gap-0.5 ml-1.5">
                            <Mic className="w-3 h-3 inline" /> recording
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <InviteMembersDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            groupId={detail.groupId}
            classroomId={detail.classroomId}
            existingMemberIds={existingMemberIds}
            onInvited={() => {
              toast.success("Classmates invited.");
              loadDetail();
            }}
          />
        </>
      )}
    </div>
  );
};

export default GroupDetailPage;

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Plus, Users, UsersRound } from "lucide-react";
import { groupService, type MyGroupItem } from "@/services/groups";
import CreateGroupDialog from "./create-group-dialog";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
    PendingApproval: "bg-amber-50 text-amber-600 border-amber-200",
    Rejected: "bg-red-50 text-red-500 border-red-200",
  };
  const labels: Record<string, string> = {
    Approved: "Approved",
    PendingApproval: "Pending Approval",
    Rejected: "Rejected",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${styles[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
      {labels[status] ?? status}
    </span>
  );
}

const StudyGroupsIndex = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<MyGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const loadGroups = useCallback(() => {
    setLoading(true);
    setLoadError("");
    groupService
      .getMyGroups()
      .then((res) => setGroups(res.data?.data ?? []))
      .catch((err) => {
        console.error("Failed to load study groups", err);
        setLoadError("Couldn't load your study groups. Please try again.");
        toast.error("Couldn't load your study groups. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreated = (groupId: string) => {
    setCreateOpen(false);
    toast.success("Group created — pending your class teacher's approval.");
    loadGroups();
    navigate(`/student/study-groups/${groupId}`, { state: { isCreator: true } });
  };

  return (
    <div className="pt-[13px] px-2 lg:px-0 font-Poppins">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-[3px]">
          <h2 className="text-[#3A3A3A] font-medium text-xs leading-5">
            Study Groups
          </h2>
          <h4 className="text-[#6B6B85] font-medium text-xs leading-5">
            Create a group with classmates and share study content together
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 bg-student-chestnut text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> Create Group
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[#6B6B85]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p className="text-xs">Loading your study groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <UsersRound className="w-8 h-8 text-[#6B6B85]/40" />
            <p className="text-sm font-medium text-[#3A3A3A]">
              {loadError || "You're not in any study groups yet."}
            </p>
            <p className="text-xs text-[#6B6B85]">
              Create one and invite classmates to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((group) => (
              <button
                key={group.groupId}
                type="button"
                onClick={() => navigate(`/student/study-groups/${group.groupId}`, { state: { isCreator: group.isCreator } })}
                className="text-left bg-white border border-[#E4E4EC] p-[14px] rounded-[16px] hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-[9px] h-[34px] w-[34px] flex items-center justify-center bg-student-chestnut/10 shrink-0">
                    <Users className="w-4 h-4 text-student-chestnut" />
                  </div>
                  <StatusBadge status={group.status} />
                </div>

                <h3 className="text-[#3A3A3A] font-medium text-[13px] leading-[20px] mt-3">
                  {group.name}
                </h3>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-[#6B6B85]">
                    {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                  </span>
                  {group.isCreator && (
                    <span className="text-[10px] font-semibold text-student-chestnut bg-student-chestnut/10 px-2 py-0.5 rounded-full">
                      Creator
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default StudyGroupsIndex;

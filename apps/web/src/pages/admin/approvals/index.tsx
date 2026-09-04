import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Loader2,
  Menu,
} from "lucide-react";
import toast from "react-hot-toast";
import { approvalService, getApprovalDisplay, type Approval, type ApprovalPayload } from "@/services/approval";
import { useOutletContext } from "react-router-dom";
import ApprovalReviewModal from "./approval-review-modal";

type Tab = "all" | "pending" | "approved" | "rejected";

export const getPayload = (raw: ApprovalPayload | string | null): Record<string, any> => {
  let parsed: Record<string, any> = {};
  if (!raw) return parsed;
  if (typeof raw === "string") {
    try { parsed = JSON.parse(raw); } catch { return {}; }
  } else {
    parsed = raw as Record<string, any>;
  }
  const normalized: Record<string, any> = { ...parsed };
  for (const key of Object.keys(parsed)) {
    const camel = key.charAt(0).toLowerCase() + key.slice(1);
    if (camel !== key && !(camel in normalized)) {
      normalized[camel] = parsed[key];
    }
  }
  return normalized;
};

export const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase();
  if (s === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
      </span>
    );
  if (s === "approved")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Rejected
    </span>
  );
};



const ApprovalsPage = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await approvalService.getPendingApprovals();
      const items = (res.data as any)?.data?.items;
      setApprovals(Array.isArray(items) ? items : []);
    } catch {
      toast.error("Could not load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleRespond = async (id: string, approved: boolean, rejectionReason?: string) => {
    setResponding(id);
    try {
      const res = await approvalService.respondToApproval(id, { approved, rejectionReason });
      const ok = (res.data as any)?.status === "successful" || res.status === 200;
      if (ok) {
        toast.success(approved ? "Approval granted" : "Approval rejected");
        setApprovals((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: approved ? "Approved" : "Rejected", respondedAt: new Date().toISOString() }
              : a
          )
        );
      } else {
        toast.error((res.data as any)?.responseMessage || "Response failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.responseMessage || "Failed to respond");
    } finally {
      setResponding(null);
    }
  };

  const pending = approvals.filter((a) => a.status?.toLowerCase() === "pending");
  const approved = approvals.filter((a) => a.status?.toLowerCase() === "approved");
  const rejected = approvals.filter((a) => a.status?.toLowerCase() === "rejected");

  const shown =
    activeTab === "all" ? approvals :
      activeTab === "pending" ? pending :
        activeTab === "approved" ? approved :
          rejected;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All lessons", count: approvals.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "approved", label: "Approved", count: approved.length },
    { key: "rejected", label: "Rejected", count: rejected.length },
  ];

  return (
    <div className="font-poppins h-screen">
      <div className="backdrop-blur-sm lg:rounded-2xl border border-white/20 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 bg-chestnut">
          <div className="flex items-center gap-4">
            <Menu
              className="lg:hidden w-5 h-5 text-white cursor-pointer"
              onClick={openMobileNav}
            />
            <div>
              <p className="text-white font-semibold text-sm">Lesson approvals</p>
              <p className="text-white/60 text-[10px]">
                Review and approve or reject teacher lesson submissions
              </p>
            </div>
          </div>

          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Body */}
        <div className="bg-white/70 backdrop-blur-sm p-3 lg:p-6">
          <div className="max-w-5xl mx-auto">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl p-4 bg-chestnut text-white">
                <p className="text-2xl font-bold">{approvals.length}</p>
                <p className="text-xs text-white/70 mt-0.5">Total submissions</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-gray-100">
                <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Awaiting review</p>
                <p className="text-[11px] font-medium text-amber-600 mt-0.5">Pending</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-gray-100">
                <p className="text-2xl font-bold text-gray-900">{approved.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Approved</p>
              </div>
              <div className="rounded-2xl p-4 bg-white border border-gray-100">
                <p className="text-2xl font-bold text-gray-900">{rejected.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Rejected</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${activeTab === tab.key
                    ? "bg-chestnut text-white"
                      : "bg-[#D9D9D9BF] text-gray-500 hover:text-gray-700 border border-[#3A3A3A80]"
                    }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 text-chestnut animate-spin" />
                <p className="text-sm text-gray-400">Loading approvals...</p>
              </div>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <CheckCircle2 className="w-10 h-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">No submissions in this view</p>
              </div>
            ) : (
              <div className="rounded-2xl border min-h-screen md:h-[70vh] lg:min-h-auto border-gray-300 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F5F5F1] text-[12px] uppercase tracking-wide text-[#29238280]">
                      <th className="px-4 py-3 font-semibold">Lesson title</th>
                      <th className="px-4 py-3 font-semibold">Teacher</th>
                      <th className="px-4 py-3 font-semibold">Class</th>
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((approval) => {
                      const payload = getPayload(approval.payload);
                      const display = getApprovalDisplay(approval);
                      const className = display.className || "—";
                      const subjectName = display.subjectName || "—";
                      const s = approval.status?.toLowerCase();
                      const borderColor =
                        s === "pending" ? "border-l-[#C47C0A]" :
                          s === "approved" ? "border-l-emerald-400" :
                            "border-l-red-400";
                      return (
                        <tr
                          key={approval.id}
                          className={`border-t-[#D9D9D9] border-t border-gray-50 border-l-2 ${borderColor} hover:bg-gray-50/50 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {display.title}
                            </p>
                            {payload.Term && (
                              <p className="text-[11px] text-gray-400">{payload.Term}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{approval.requestedByName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{className}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{subjectName}</td>
                          <td className="px-4 py-3"><StatusBadge status={approval.status} /></td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setSelectedApproval(approval)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedApproval && (
        <ApprovalReviewModal
          approval={selectedApproval as any}
          onClose={() => setSelectedApproval(null)}
          onRespond={async (id, approved, reason, feedback) => {
            if (approved) {
              await handleRespond(id, true);
            } else {
              if (!reason && !feedback) {
                toast.error("Please provide a rejection reason");
                return;
              }
              await handleRespond(id, false, [reason, feedback].filter(Boolean).join(" — "));
            }
          }}
          responding={responding}
        />
      )}
    </div>
  );
};

export default ApprovalsPage;

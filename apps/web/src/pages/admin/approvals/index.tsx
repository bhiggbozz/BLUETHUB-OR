import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Loader2,
  Menu,
} from "lucide-react";
import toast from "react-hot-toast";
import { approvalService, getApprovalDisplay, type Approval, type ApprovalPayload } from "@/services/approval";
import { useLocation, useOutletContext } from "react-router-dom";
import ApprovalReviewModal from "./approval-review-modal";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@bluethub/ui-kit";
import { cn } from "@/lib/utils";

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
  if (s === "pending") return <Badge variant="warning">Pending</Badge>;
  if (s === "approved") return <Badge variant="success">Approved</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
};



const ApprovalsPage = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const location = useLocation();
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

  // Arriving from a link elsewhere (e.g. the dashboard's pending-approvals
  // list) that names a specific item — open its review modal once loaded.
  useEffect(() => {
    const openApprovalId = (location.state as { openApprovalId?: string } | null)?.openApprovalId;
    if (!openApprovalId || approvals.length === 0) return;
    const match = approvals.find((a) => a.id === openApprovalId);
    if (match) setSelectedApproval(match);
  }, [location.state, approvals]);

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
    <div className="font-poppins">
      <div className="backdrop-blur-sm border border-border overflow-hidden">

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
        <div className="bg-background/70 backdrop-blur-sm p-3 lg:p-6 min-h-screen">
          <div className="max-w-5xl mx-auto">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-md p-4 bg-chestnut text-white">
                <p className="text-2xl font-bold">{approvals.length}</p>
                <p className="text-xs text-white/70 mt-0.5">Total submissions</p>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border">
                <p className="text-2xl font-bold text-foreground">{pending.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Awaiting review</p>
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">Pending</p>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border">
                <p className="text-2xl font-bold text-foreground">{approved.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Approved</p>
              </div>
              <div className="rounded-2xl p-4 bg-card border border-border">
                <p className="text-2xl font-bold text-foreground">{rejected.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Rejected</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-chestnut text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                  )}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-6 h-6 text-chestnut animate-spin" />
                <p className="text-sm text-muted-foreground">Loading approvals...</p>
              </div>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No submissions in this view</p>
              </div>
            ) : (
              <div className="rounded-2xl border min-h-screen md:h-[70vh] lg:min-h-auto border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lesson title</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((approval) => {
                      const payload = getPayload(approval.payload);
                      const display = getApprovalDisplay(approval);
                      const className = display.className || "—";
                      const subjectName = display.subjectName || "—";
                      const s = approval.status?.toLowerCase();
                      const borderColor =
                        s === "pending" ? "border-l-amber-500" :
                          s === "approved" ? "border-l-emerald-400" :
                            "border-l-red-400";
                      return (
                        <TableRow
                          key={approval.id}
                          className={cn("border-l-2", borderColor)}
                        >
                          <TableCell className="whitespace-normal">
                            <p className="text-sm font-semibold text-foreground">
                              {display.title}
                            </p>
                            {payload.Term && (
                              <p className="text-[11px] text-muted-foreground">{payload.Term}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{approval.requestedByName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{className}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{subjectName}</TableCell>
                          <TableCell><StatusBadge status={approval.status} /></TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => setSelectedApproval(approval)}>
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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

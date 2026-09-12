import { useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Menu,
  User,
  UserPlus,
  UserX,
} from "lucide-react";
import { parentService, type CreateParentData } from "@/services/parent";
import StudentMultiSelect from "@/component/student-multi-select";

const MAX_STUDENTS = 10;

const inputCls =
  "w-full ring-2 ring-chestnut/15 focus:ring-chestnut/40 border-0 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-300 outline-none bg-white";

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

const CreateParentPage = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  // ── Form ─────────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_STUDENTS) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [invalidStudentIds, setInvalidStudentIds] = useState<string[]>([]);
  const [result, setResult] = useState<CreateParentData | null>(null);

  const canSubmit = firstName.trim() && lastName.trim() && email.trim() && selectedStudentIds.size > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg("");
    setInvalidStudentIds([]);
    setResult(null);
    try {
      const res = await parentService.createParent({
        parentFirstName: firstName.trim(),
        parentLastName: lastName.trim(),
        parentEmail: email.trim(),
        studentIds: Array.from(selectedStudentIds),
      });
      setResult(res.data.data);
      setManageParentId(res.data.data.parentId);
      // Reset the form so the admin can register another parent right away.
      setFirstName("");
      setLastName("");
      setEmail("");
      setSelectedStudentIds(new Set());
    } catch (err) {
      const anyErr = err as AxiosError<{ data?: { invalidStudentIds?: string[] } }>;
      setInvalidStudentIds(anyErr.response?.data?.data?.invalidStudentIds ?? []);
      setErrorMsg(extractMsg(err, "Failed to create parent."));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Manage an existing parent (unlink student / deactivate) ───────────────
  // Operates on a parentId — from a creation above, from Search Parents
  // (which deep-links here via ?parentId=), or entered manually.
  const [searchParams] = useSearchParams();
  const [manageParentId, setManageParentId] = useState(searchParams.get("parentId") ?? "");
  const [unlinkStudentId, setUnlinkStudentId] = useState("");
  const [unlinking, setUnlinking] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [manageMsg, setManageMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleUnlink = async () => {
    if (!manageParentId.trim() || !unlinkStudentId.trim()) return;
    setUnlinking(true);
    setManageMsg(null);
    try {
      await parentService.removeStudentParent({
        parentId: manageParentId.trim(),
        studentId: unlinkStudentId.trim(),
      });
      setManageMsg({ ok: true, text: "Student unlinked from this parent." });
      setUnlinkStudentId("");
    } catch (err) {
      setManageMsg({ ok: false, text: extractMsg(err, "Failed to unlink student.") });
    } finally {
      setUnlinking(false);
    }
  };

  const handleDeactivate = async () => {
    if (!manageParentId.trim()) return;
    setDeactivating(true);
    setManageMsg(null);
    try {
      await parentService.deactivateParent(manageParentId.trim());
      setManageMsg({ ok: true, text: "Parent account deactivated — they can no longer log in." });
    } catch (err) {
      setManageMsg({ ok: false, text: extractMsg(err, "Failed to deactivate parent.") });
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="font-poppins min-h-screen">
      <div className="backdrop-blur-sm lg:rounded-2xl border border-white/20 overflow-hidden bg-white/70">
        <div className="flex gap-2 items-center px-5 h-20 bg-chestnut">
          <Menu className="lg:hidden text-white" onClick={openMobileNav} />
          <div className="">
            <h2 className="font-semibold text-base text-white leading-none">Attach Student to Parent</h2>
            <p className="text-white/60 text-[11px] mt-1">
              Link students to a parent account that already exists — this does not create a parent.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
          {/* ── Result banner ── */}
          {result && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-700">
                <p className="font-semibold">
                  {result.parentCreated
                    ? "New parent account created — credentials emailed to them."
                    : "Added to existing parent account — no email sent."}
                </p>
                {result.parentCreated && result.username && (
                  <p className="mt-0.5 text-xs">
                    Username: <span className="font-mono font-semibold">{result.username}</span>
                  </p>
                )}
                <p className="mt-0.5 text-xs">
                  {result.linkedStudentIds.length} student(s) newly linked
                  {result.alreadyLinkedStudentIds.length > 0 &&
                    ` · ${result.alreadyLinkedStudentIds.length} already linked`}
                </p>
                <p className="mt-0.5 text-[11px] font-mono text-emerald-600/80">Parent ID: {result.parentId}</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-600">
                <p>{errorMsg}</p>
                {invalidStudentIds.length > 0 && (
                  <p className="mt-0.5 text-xs">Invalid student ids: {invalidStudentIds.join(", ")}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Form ── */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> First Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Adaeze"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Funmi"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                className={inputCls}
              />
              <p className="text-[10px] text-gray-400">
                If this email already belongs to a parent in this school, the students below are linked to that
                existing account instead of creating a new one.
              </p>
            </div>

            {/* ── Student multi-select ── */}
            <StudentMultiSelect selectedIds={selectedStudentIds} onToggle={toggleStudent} maxStudents={MAX_STUDENTS} />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-chestnut hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {submitting ? "Creating..." : "Create / Link Parent"}
            </button>
          </section>

          {/* ── Manage existing parent ── */}
          <section className="border-t border-gray-100 pt-6 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Manage an existing parent</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Find a parent via Search Parents and click "Manage", or paste a Parent ID directly.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Parent ID</label>
              <input
                value={manageParentId}
                onChange={(e) => setManageParentId(e.target.value)}
                placeholder="Paste a parent id"
                className={inputCls}
              />
            </div>

            {manageMsg && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs ${manageMsg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                  }`}
              >
                {manageMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                {manageMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Student ID to unlink</label>
                <input
                  value={unlinkStudentId}
                  onChange={(e) => setUnlinkStudentId(e.target.value)}
                  placeholder="Paste a student id"
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={!manageParentId.trim() || !unlinkStudentId.trim() || unlinking}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {unlinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                Unlink
              </button>
            </div>

            <button
              type="button"
              onClick={handleDeactivate}
              disabled={!manageParentId.trim() || deactivating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              Deactivate this parent
            </button>
            <p className="text-[10px] text-gray-400">
              Blocks login. Student links are left intact — there is no reactivate endpoint yet.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CreateParentPage;

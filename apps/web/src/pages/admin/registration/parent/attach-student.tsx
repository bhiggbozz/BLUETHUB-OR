import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { AlertCircle, CheckCircle2, Link2, Loader2, Menu, Search, UserCircle2, X } from "lucide-react";
import { parentService, type AttachStudentsData, type ParentSearchResult } from "@/services/parent";
import StudentMultiSelect from "@/component/student-multi-select";

const MAX_STUDENTS = 10;

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

interface SelectedParent {
  id: string;
  name: string;
  email?: string;
}

const AttachStudentPage = () => {
  const [searchParams] = useSearchParams();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();

  // ── Parent picker — type-ahead against GET /api/User/parents/search ──────
  const deepLinkedId = searchParams.get("parentId");
  const deepLinkedName = searchParams.get("parentName");
  const [selectedParent, setSelectedParent] = useState<SelectedParent | null>(
    deepLinkedId ? { id: deepLinkedId, name: deepLinkedName || deepLinkedId } : null,
  );
  const [parentQuery, setParentQuery] = useState("");
  const [parentResults, setParentResults] = useState<ParentSearchResult[]>([]);
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  useEffect(() => {
    const q = parentQuery.trim();
    if (q.length < 2) {
      setParentResults([]);
      return;
    }
    let cancelled = false;
    setParentSearchLoading(true);
    const timer = setTimeout(() => {
      parentService
        .searchParents({ q, pageSize: 8 })
        .then((res) => {
          if (!cancelled) setParentResults(res.data.data.parents);
        })
        .catch(() => {
          if (!cancelled) setParentResults([]);
        })
        .finally(() => {
          if (!cancelled) setParentSearchLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parentQuery]);

  const pickParent = (p: ParentSearchResult) => {
    setSelectedParent({ id: p.parentId, name: `${p.firstName} ${p.lastName}`, email: p.email });
    setParentQuery("");
    setParentResults([]);
    setShowParentDropdown(false);
  };

  // ── Student picker ─────────────────────────────────────────────────────
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
  const [result, setResult] = useState<AttachStudentsData | null>(null);

  const canSubmit = !!selectedParent && selectedStudentIds.size > 0;

  const handleSubmit = async () => {
    if (!selectedParent || !canSubmit) return;
    setSubmitting(true);
    setErrorMsg("");
    setInvalidStudentIds([]);
    setResult(null);
    try {
      const res = await parentService.attachStudents({
        parentId: selectedParent.id,
        studentIds: Array.from(selectedStudentIds),
      });
      setResult(res.data.data);
      setSelectedStudentIds(new Set());
    } catch (err) {
      const anyErr = err as AxiosError<{ data?: { invalidStudentIds?: string[] } }>;
      setInvalidStudentIds(anyErr.response?.data?.data?.invalidStudentIds ?? []);
      if (anyErr.response?.status === 404) {
        setErrorMsg("That parent could not be found. This page only links students to an existing parent.");
      } else if (anyErr.response?.status === 409) {
        setErrorMsg(extractMsg(err, "This would exceed the maximum of 10 active students per parent."));
      } else {
        setErrorMsg(extractMsg(err, "Failed to attach students."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-poppins min-h-screen">
      <div className="backdrop-blur-sm lg:rounded-2xl border border-white/20 overflow-hidden bg-white/70">

        <div className="flex gap-2 items-center px-5 h-20 bg-chestnut">
          <Menu className="lg:hidden text-white" onClick={openMobileNav} />
          <div className="">
            <h2 className="font-semibold text-base text-white leading-none">Attach Student to Parent</h2>
            <p className="text-white/60 text-[11px] mt-1 ">
              Link students to a parent account that already exists — this does not create a parent.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
          {result && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-700">
                <p className="font-semibold">Students attached to parent.</p>
                <p className="mt-0.5 text-xs">
                  {result.linkedStudentIds.length} newly linked
                  {result.alreadyLinkedStudentIds.length > 0 &&
                    ` · ${result.alreadyLinkedStudentIds.length} already linked (skipped)`}
                </p>
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

          <section className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Parent <span className="text-red-500">*</span>
              </label>

              {selectedParent ? (
                <div className="flex items-center justify-between gap-2 ring-2 ring-chestnut/15 rounded-lg px-3 py-2.5 bg-white">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chestnut to-chestnut/70 flex items-center justify-center text-white shrink-0">
                      <UserCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{selectedParent.name}</p>
                      {selectedParent.email && (
                        <p className="text-[11px] text-gray-400 truncate">{selectedParent.email}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedParent(null)}
                    className="shrink-0 text-xs font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={parentQuery}
                    onChange={(e) => setParentQuery(e.target.value)}
                    onFocus={() => setShowParentDropdown(true)}
                    onBlur={() => setTimeout(() => setShowParentDropdown(false), 150)}
                    placeholder="Search by parent name or email..."
                    className="w-full ring-2 ring-chestnut/15 focus:ring-chestnut/40 border-0 rounded-lg pl-10 pr-3 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-300 outline-none bg-white"
                  />

                  {showParentDropdown && (parentQuery.trim().length >= 2 || parentSearchLoading) && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-lg max-h-72 overflow-y-auto">
                      {parentSearchLoading ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Searching...</span>
                        </div>
                      ) : parentResults.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-6">
                          No parents match "{parentQuery.trim()}".
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {parentResults.map((p) => (
                            <button
                              key={p.parentId}
                              type="button"
                              onMouseDown={() => pickParent(p)}
                              className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-chestnut/5 text-left transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {p.firstName} {p.lastName}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">{p.email}</p>
                              </div>
                              <span className="shrink-0 text-[10px] font-semibold text-gray-400">
                                {p.studentCount} student{p.studentCount === 1 ? "" : "s"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[10px] text-gray-400">
                Matches by name or email — if a surname isn't specific enough, the email shown alongside each
                result disambiguates same-name parents.
              </p>
            </div>

            <StudentMultiSelect selectedIds={selectedStudentIds} onToggle={toggleStudent} maxStudents={MAX_STUDENTS} />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-chestnut hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {submitting ? "Attaching..." : "Attach Students"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AttachStudentPage;

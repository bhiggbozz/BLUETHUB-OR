import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AxiosError } from "axios";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Link2,
  Loader2,
  Menu,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import { parentService, type ParentSearchResult } from "@/services/parent";
import { moduleService } from "@/services/module";

type SearchScope = "parent" | "student";

interface Option {
  id: string;
  name: string;
}

function extractMsg(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message ?? fallback
    : (err as Error).message ?? fallback;
}

const PAGE_SIZE = 20;

const SearchParentsPage = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();  
  const navigate = useNavigate();
  const [scope, setScope] = useState<SearchScope>("parent");
  const [query, setQuery] = useState(""); // "By Parent" scope only
  const [page, setPage] = useState(1);

  // ── "By Student" scope: narrow by class first, then pick the student ──────
  const [classes, setClasses] = useState<Option[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState<Option[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
    if (scope !== "student" || classes.length > 0) return;
    setClassesLoading(true);
    moduleService
      .getClassrooms({ pageNumber: 1, pageSize: 200 })
      .then((res) => {
        // This endpoint sometimes wraps the list in { classrooms: [...] }
        // instead of returning it flat — handle both.
        const payload = (res.data as any)?.data ?? {};
        const rows: any[] = Array.isArray(payload)
          ? payload
          : (payload.classrooms ?? payload.Classrooms ?? []);
        setClasses(
          rows
            .map((c) => ({ id: String(c.id ?? c.Id ?? ""), name: String(c.name ?? c.Name ?? c.className ?? "") }))
            .filter((c) => c.id),
        );
      })
      .catch(() => setClasses([]))
      .finally(() => setClassesLoading(false));
  }, [scope, classes.length]);

  useEffect(() => {
    setSelectedStudentId("");
    if (!selectedClassId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setStudentsLoading(true);
    moduleService
      .getStudentsByClassroom(selectedClassId)
      .then((res) => {
        if (cancelled) return;
        const payload = (res.data as any)?.data ?? res.data ?? [];
        const rows = Array.isArray(payload) ? payload : [];
        setStudents(
          rows
            .map((s: any) => ({
              id: String(s.id ?? ""),
              name: [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || String(s.userName ?? ""),
            }))
            .filter((s) => s.id),
        );
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  const [results, setResults] = useState<ParentSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // In "By Student" mode, wait for an actual student pick before searching —
  // narrowing by class is the point, not showing every parent by default.
  const canSearch = scope === "parent" || !!selectedStudentId;

  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setTotalCount(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMsg("");
    parentService
      .searchParents({
        q: scope === "parent" ? query.trim() : undefined,
        studentId: scope === "student" ? selectedStudentId : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        setResults(data?.parents ?? []);
        setTotalCount(data?.totalCount ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setTotalCount(0);
        setErrorMsg(extractMsg(err, "Failed to search parents."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canSearch, scope, query, selectedStudentId, page]);

  // Reset to page 1 whenever the search itself changes.
  useEffect(() => {
    setPage(1);
  }, [scope, query, selectedStudentId]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectClassCls =
    "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 font-medium outline-none focus:ring-2 focus:ring-chestnut/20 bg-white disabled:opacity-50";

  return (
    <div className="font-poppins min-h-screen">
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden bg-white/70">
        <div className="flex gap-2 items-center px-5 h-20 bg-chestnut">
          <Menu className="lg:hidden text-white" onClick={openMobileNav} />
          <div className="">
            <h2 className="font-semibold text-base text-white leading-none">Search Parents</h2>
            <p className="text-white/60 text-[11px] mt-1">
              Find a parent by name/email, or narrow down by class then pick their child — results include
              attached students.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
          {/* ── Scope + search input ── */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => setScope("parent")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${scope === "parent" ? "bg-chestnut text-white shadow-sm" : "text-gray-500 hover:text-chestnut"
                  }`}
              >
                By Parent
              </button>
              <button
                type="button"
                onClick={() => setScope("student")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${scope === "student" ? "bg-chestnut text-white shadow-sm" : "text-gray-500 hover:text-chestnut"
                  }`}
              >
                By Student
              </button>
            </div>

            {scope === "parent" ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by parent name or email..."
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-chestnut/20"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                    Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className={selectClassCls}
                  >
                    <option value="">{classesLoading ? "Loading classes..." : "Choose a class..."}</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                    Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={!selectedClassId}
                    className={selectClassCls}
                  >
                    <option value="">
                      {!selectedClassId
                        ? "Choose a class first..."
                        : studentsLoading
                          ? "Loading students..."
                          : students.length === 0
                            ? "No students in this class"
                            : "Choose a student..."}
                    </option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          )}

          {/* ── Results ── */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Searching...</span>
              </div>
            ) : !canSearch ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Pick a class, then a student</p>
                <p className="text-xs text-slate-400 mt-1">Their parent(s), if any, will show up here.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {scope === "student" ? "No parent linked to this student" : query.trim() ? "No parents found" : "No parents yet"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {scope === "student"
                    ? "This student hasn't been linked to a parent account yet."
                    : query.trim()
                      ? "Try a different name or email."
                      : "Registered parents will show up here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {results.map((parent) => {
                  const isOpen = expandedId === parent.parentId;
                  return (
                    <div key={parent.parentId}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : parent.parentId)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-chestnut to-chestnut/70 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {parent.firstName?.[0]}
                            {parent.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {parent.firstName} {parent.lastName}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{parent.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${parent.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                              }`}
                          >
                            {parent.isActive ? "Active" : "Deactivated"}
                          </span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {parent.studentCount}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-3.5 bg-gray-50/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            Attached Students
                          </p>
                          {parent.students.length === 0 ? (
                            <p className="text-xs text-gray-400">No students linked.</p>
                          ) : (
                            <div className="space-y-1 mb-3">
                              {parent.students.map((s) => (
                                <div
                                  key={s.studentId}
                                  className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded-lg px-3 py-1.5"
                                >
                                  <span className="font-medium text-gray-700">
                                    {s.firstName} {s.lastName}
                                  </span>
                                  <span className="text-gray-400">{s.classroomName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/registration/parent?parentId=${parent.parentId}`)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-chestnut hover:opacity-70 transition-opacity"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              Manage this parent (unlink / deactivate)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/admin/registration/parent/attach?parentId=${parent.parentId}&parentName=${encodeURIComponent(
                                    `${parent.firstName} ${parent.lastName}`,
                                  )}`,
                                )
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-chestnut hover:opacity-70 transition-opacity"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Attach students
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {!loading && totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Page {page} of {totalPages} · {totalCount} parent{totalCount !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchParentsPage;

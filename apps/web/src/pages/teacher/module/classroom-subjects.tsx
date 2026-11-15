import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import {
  Menu,
  School,
  GraduationCap,
  Loader2,
  Plus,
  LayoutGrid,
  Lock,
  BookOpen,
} from "lucide-react";
import { Checkbox, Button, Dialog, DialogContent, DialogTitle } from "@bluethub/ui-kit";
import { useAuthContext, isTeacherRoleData } from "@/contexts/auth-context";
import { schoolService } from "@/services/school";

interface ClassroomOption {
  classroomId: string;
  className: string;
}

/** Shape returned by `getSubjectsByClassroomId` — distinct from the catalog
 * shape below (`category`/`classCategory` come back as human strings here,
 * not the numeric codes `registerSubject` expects). */
interface ClassroomSubjectItem {
  id: string;
  subject: string;
  category: "Major" | "Minor";
  classCategory: string;
  isActive: boolean;
}

/** Shape returned by `getAllSubject` (the school-wide catalog). */
interface CatalogSubject {
  id: string;
  name: string;
  subjectCategoryName: "Major" | "Minor";
}

const extractErrorMessage = (error: unknown): string =>
  error instanceof AxiosError
    ? (error.response?.data?.responseMessage ?? error.response?.data?.message ?? error.message)
    : (error as Error).message;

export default function ModuleClassroomSubjects() {
  const { user } = useAuthContext();
  const outletContext = useOutletContext<{ openMobileNav?: () => void } | null>();
  const openMobileNav = outletContext?.openMobileNav ?? (() => {});

  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [majorList, setMajorList] = useState<ClassroomSubjectItem[]>([]);
  const [minorList, setMinorList] = useState<ClassroomSubjectItem[]>([]);
  const [majorChecked, setMajorChecked] = useState<Set<string>>(new Set());
  const [minorChecked, setMinorChecked] = useState<Set<string>>(new Set());
  const [savingChanges, setSavingChanges] = useState(false);

  // ── Add-subject picker ────────────────────────────────────────────────────
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [allSubjects, setAllSubjects] = useState<CatalogSubject[]>([]);
  const [loadingAllSubjects, setLoadingAllSubjects] = useState(false);
  const [pendingAddIds, setPendingAddIds] = useState<Set<string>>(new Set());
  const [addingSubjects, setAddingSubjects] = useState(false);

  const isHeadTeacher = user?.roleName === "HeadTeacher";

  // Only a HeadTeacher's own assigned classrooms — same source just fixed in
  // create-syllabus.tsx. Never read `c.subjects` from roleData here; it's
  // stale/empty for HeadTeacher, always fetch live per classroom below.
  useEffect(() => {
    if (!isHeadTeacher) return;
    const roleData = user?.roleData;
    if (roleData && isTeacherRoleData(roleData)) {
      const options = roleData.classrooms.map((c) => ({ classroomId: c.classroomId, className: c.className }));
      setClassrooms(options);
      setSelectedClassroomId((prev) => prev || options[0]?.classroomId || "");
    }
  }, [isHeadTeacher, user?.roleData]);

  const loadClassroomSubjects = async (classroomId: string) => {
    setLoadingSubjects(true);
    try {
      const res = await schoolService.getSubjectsByClassroomId(classroomId);
      const data = (res.data as any)?.data;
      const majors: ClassroomSubjectItem[] = data?.majorSubjects ?? [];
      const minors: ClassroomSubjectItem[] = data?.minorSubjects ?? [];
      setMajorList(majors);
      setMinorList(minors);
      setMajorChecked(new Set(majors.map((s) => s.id)));
      setMinorChecked(new Set(minors.map((s) => s.id)));
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Could not load this classroom's subjects.");
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    if (selectedClassroomId) void loadClassroomSubjects(selectedClassroomId);
  }, [selectedClassroomId]);

  const toggleMajor = (id: string) =>
    setMajorChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleMinor = (id: string) =>
    setMinorChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSaveChanges = async () => {
    if (!selectedClassroomId) return;
    // Anything left unchecked gets detached from this classroom — attaching
    // happens immediately through the add-subject picker instead, so there's
    // nothing to add here.
    const uncheckedIds = [
      ...majorList.filter((s) => !majorChecked.has(s.id)),
      ...minorList.filter((s) => !minorChecked.has(s.id)),
    ].map((s) => s.id);

    if (uncheckedIds.length === 0) {
      toast("Nothing to save.");
      return;
    }

    setSavingChanges(true);
    try {
      const res = await schoolService.deleteSubjects({ subjectIds: uncheckedIds, classroomId: selectedClassroomId });
      if ((res.data as any)?.status === "failed") {
        toast.error((res.data as any)?.message ?? (res.data as any)?.responseMessage ?? "Could not save changes.");
        return;
      }
      toast.success("Classroom subjects updated.");
      await loadClassroomSubjects(selectedClassroomId);
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Could not save changes.");
    } finally {
      setSavingChanges(false);
    }
  };

  const openAddSubjectDialog = async () => {
    setAddSubjectOpen(true);
    setPendingAddIds(new Set());
    if (allSubjects.length > 0) return;
    setLoadingAllSubjects(true);
    try {
      const res = await schoolService.getAllSubject();
      setAllSubjects((res.data as any)?.data?.subjects ?? []);
    } catch {
      // Non-fatal — the picker just shows no options.
    } finally {
      setLoadingAllSubjects(false);
    }
  };

  const togglePendingAdd = (id: string) =>
    setPendingAddIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirmAddSubjects = async () => {
    if (!selectedClassroomId || pendingAddIds.size === 0) {
      setAddSubjectOpen(false);
      return;
    }
    setAddingSubjects(true);
    try {
      const res = await schoolService.registerClassroomSubject({
        classroomId: selectedClassroomId,
        subjectIds: Array.from(pendingAddIds),
      });
      if ((res.data as any)?.status === "failed") {
        toast.error((res.data as any)?.responseMessage ?? (res.data as any)?.message ?? "Could not add subjects.");
        return;
      }
      setAddSubjectOpen(false);
      setPendingAddIds(new Set());
      toast.success("Subjects added to this classroom.");
      await loadClassroomSubjects(selectedClassroomId);
    } catch (error) {
      toast.error(extractErrorMessage(error) || "Could not add subjects.");
    } finally {
      setAddingSubjects(false);
    }
  };

  if (!isHeadTeacher) {
    return (
      <div className="font-poppins p-4 md:p-6">
        <div className="rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
            <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
            <School className="w-5 h-5 text-white/90 shrink-0" />
            <h1 className="text-white font-semibold text-sm sm:text-base">Manage Subjects</h1>
          </div>
          <div className="p-12 text-center">
            <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">This page is only available to Head Teachers.</p>
          </div>
        </div>
      </div>
    );
  }

  if (classrooms.length === 0) {
    return (
      <div className="font-poppins p-4 md:p-6">
        <div className="rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
            <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
            <School className="w-5 h-5 text-white/90 shrink-0" />
            <h1 className="text-white font-semibold text-sm sm:text-base">Manage Subjects</h1>
          </div>
          <div className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No classrooms assigned yet.</p>
            <p className="text-slate-400 text-sm mt-1">Contact your administrator to be assigned to a classroom.</p>
          </div>
        </div>
      </div>
    );
  }

  const existingIds = new Set([...majorList.map((s) => s.id), ...minorList.map((s) => s.id)]);

  return (
    <div className="font-poppins p-2 sm:p-4 md:p-6">
      <div className="rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#292382] to-[#3D36A8]">
          <Menu className="lg:hidden text-white shrink-0 cursor-pointer" onClick={openMobileNav} />
          <School className="w-5 h-5 hidden lg:inline text-white/90 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm sm:text-base truncate">Manage Subjects</h1>
            <p className="text-white/60 text-xs truncate hidden sm:block">
              Attach or remove subjects for the classrooms you're assigned to
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {classrooms.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {classrooms.map((c) => (
                <button
                  key={c.classroomId}
                  onClick={() => setSelectedClassroomId(c.classroomId)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedClassroomId === c.classroomId
                      ? "bg-[#292382] text-white shadow-md"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-[#292382]/30"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 inline mr-1.5" />
                  {c.className}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-chestnut/8 to-transparent border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-chestnut flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Subjects</h2>
                  <p className="text-xs text-gray-400">Uncheck to remove, or add from the catalog below</p>
                </div>
              </div>
              <button
                onClick={openAddSubjectDialog}
                className="flex items-center gap-1.5 text-xs font-semibold text-chestnut bg-chestnut/8 hover:bg-chestnut/15 px-3.5 py-2 rounded-xl transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add subject
              </button>
            </div>

            <div className="p-5">
              {loadingSubjects ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                  <Loader2 size={18} className="animate-spin text-chestnut" />
                  <p className="text-xs font-medium">Loading subjects…</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-chestnut mb-2.5">Major</p>
                    <div className="flex flex-col gap-1">
                      {majorList.length === 0 && <p className="text-xs text-gray-300">No major subjects yet.</p>}
                      {majorList.map((s) => {
                        const checked = majorChecked.has(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleMajor(s.id)}
                              className="data-[state=checked]:bg-chestnut data-[state=checked]:border-chestnut"
                            />
                            <span className={`text-xs font-medium ${checked ? "text-chestnut font-bold" : "text-gray-400 line-through"}`}>
                              {s.subject}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-px bg-chestnut/10 self-stretch hidden sm:block" />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-500 mb-2.5">Minor</p>
                    <div className="flex flex-col gap-1">
                      {minorList.length === 0 && <p className="text-xs text-gray-300">No minor subjects yet.</p>}
                      {minorList.map((s) => {
                        const checked = minorChecked.has(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleMinor(s.id)}
                              className="data-[state=checked]:bg-chestnut data-[state=checked]:border-chestnut"
                            />
                            <span className={`text-xs font-medium ${checked ? "text-chestnut font-bold" : "text-gray-400 line-through"}`}>
                              {s.subject}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100 bg-white">
              <Button
                onClick={handleSaveChanges}
                disabled={loadingSubjects || savingChanges}
                className="flex items-center gap-1.5 px-6 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-opacity bg-chestnut disabled:opacity-60"
              >
                {savingChanges && <Loader2 size={14} className="animate-spin" />}
                {savingChanges ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Subject picker ──────────────────────────────────────────── */}
      <Dialog open={addSubjectOpen} onOpenChange={(o) => { if (!o) { setAddSubjectOpen(false); setPendingAddIds(new Set()); } }}>
        <DialogContent className="md:max-w-lg w-[90%] rounded-2xl p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <DialogTitle className="text-sm font-bold text-chestnut">Add Subject</DialogTitle>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Choose subjects to add to this classroom's curriculum
            </p>
          </div>

          <div className="flex gap-0 px-6 py-5">
            {(["Major", "Minor"] as const).map((category, idx) => {
              const options = allSubjects.filter((s) => s.subjectCategoryName === category && !existingIds.has(s.id));
              return (
                <div key={category} className={`flex-1 ${idx === 0 ? "pr-5 border-r border-gray-100" : "pl-5"}`}>
                  <p className={`text-[10px] font-bold mb-3 uppercase tracking-wide flex items-center gap-1.5 ${category === "Major" ? "text-chestnut" : "text-gray-400"}`}>
                    <LayoutGrid className="w-3 h-3" />
                    {category}
                  </p>
                  <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
                    {loadingAllSubjects ? (
                      <div className="flex items-center gap-2 text-gray-400 py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs">Loading...</span>
                      </div>
                    ) : options.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Nothing to add</p>
                    ) : (
                      options.map((s) => (
                        <label
                          key={s.id}
                          onClick={() => togglePendingAdd(s.id)}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                        >
                          <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${pendingAddIds.has(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"}`}>
                            {pendingAddIds.has(s.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className={`text-xs select-none ${pendingAddIds.has(s.id) ? "text-chestnut font-semibold" : "text-gray-600 font-medium"}`}>
                            {s.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400 font-medium">
              {pendingAddIds.size} subject{pendingAddIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-5 py-2 hover:bg-gray-50"
                onClick={() => { setAddSubjectOpen(false); setPendingAddIds(new Set()); }}
              >
                Cancel
              </Button>
              <Button
                className="text-white text-xs font-semibold rounded-lg px-5 py-2 hover:opacity-90 transition-opacity bg-chestnut"
                onClick={confirmAddSubjects}
                disabled={pendingAddIds.size === 0 || addingSubjects}
              >
                {addingSubjects ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

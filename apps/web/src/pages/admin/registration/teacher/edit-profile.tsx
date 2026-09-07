import { Button, Dialog, DialogContent, DialogTitle, Input, Label } from "@bluethub/ui-kit";
import { authService } from "@/services/auth";
import { schoolService } from "@/services/school";
import { ArrowLeft, BookOpen, GraduationCap, LayoutGrid, Loader2, Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

// ── Types ──────────────────────────────────────────────────────────────────────

type SubjectDto = {
  subjectId: string;
  subjectName: string;
  subjectCategory: string;
};

type ClassroomDto = {
  classroomId: string;
  className: string;
  subjects?: SubjectDto[];
};

type SchoolClassroomDto = {
  id: string;
  name: string;
};

type FullUserDto = {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  emailAddress: string;
  roleId: number;
  roleName?: string;
  isActive: boolean;
  hasAccess: boolean;
  profileImage?: string | null;
  guardianName?: string | null;
  roleData?: {
    classrooms?: ClassroomDto[];
  };
};

const ADMIN_ROLE_ID = 2;

const roleLabel: Record<string, string> = {
  teacher: "Subject Teacher",
  "class-teacher": "Class Teacher",
  "head-teacher": "Head Teacher",
  "admin-user": "Admin User",
};

// ── Component ──────────────────────────────────────────────────────────────────

const TeacherEditProfile = () => {
  const location = useLocation();
  const { rolePath } = useParams<{ rolePath: string }>();
  const userId = (location.state as { userId?: string } | null)?.userId;

  // ── loading / error ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // ── raw user from API ──────────────────────────────────────────────────────
  const [userData, setUserData] = useState<FullUserDto | null>(null);

  // ── profile form ───────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    emailAddress: "",
    isActive: true,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // ── assignments state ──────────────────────────────────────────────────────
  const [keptClassrooms, setKeptClassrooms] = useState<ClassroomDto[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [assignMsg, setAssignMsg] = useState({ type: "", text: "" });
  const [allClassrooms, setAllClassrooms] = useState<SchoolClassroomDto[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");

  // ── add-subject dialog (subject teacher only) ─────────────────────────────
  // Subjects are scoped per-classroom — a subject teacher assigned to
  // multiple classrooms can have a different subject catalog in each, so
  // this is fetched fresh (per classroom) each time the dialog opens rather
  // than once for the whole school.
  type DialogSubject = { id: string; name: string; category: "Major" | "Minor" };
  const [dialogSubjects, setDialogSubjects] = useState<DialogSubject[]>([]);
  const [loadingDialogSubjects, setLoadingDialogSubjects] = useState(false);
  const [addSubjectClassroomId, setAddSubjectClassroomId] = useState<string | null>(null);
  const [pendingSubjectIds, setPendingSubjectIds] = useState<string[]>([]);

  // ── derived ───────────────────────────────────────────────────────────────
  const isAdmin = useMemo(() => userData?.roleId === ADMIN_ROLE_ID, [userData]);
  const isSubjectTeacher = useMemo(() => userData?.roleId === 4, [userData]);
  const isClassOrHeadTeacher = useMemo(
    () => userData?.roleId === 1 || userData?.roleId === 5,
    [userData],
  );

  const pageTitle = useMemo(() => {
    if (userData?.roleName) return `Edit ${userData.roleName}`;
    return `Edit ${roleLabel[rolePath ?? ""] ?? "User"}`;
  }, [rolePath, userData]);

  // ── fetch user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!userId) {
        setErrorMsg("Missing user id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMsg("");
      try {
        const { data } = await authService.getUserById(userId);
        const payload: FullUserDto =
          (data as any)?.data ?? (data as any)?.Data;
        if (!payload?.id) throw new Error("User data was not returned.");
        setUserData(payload);
        setProfileForm({
          firstName: payload.firstName ?? "",
          lastName: payload.lastName ?? "",
          emailAddress: payload.emailAddress ?? "",
          isActive: !!payload.isActive,
        });
        const existingClassrooms = payload.roleData?.classrooms ?? [];
        setKeptClassrooms(existingClassrooms);
        if (existingClassrooms.length > 0) {
          setSelectedClassroomId(existingClassrooms[0].classroomId);
        }
      } catch (err: any) {
        setErrorMsg(
          err?.response?.data?.responseMessage ??
          err?.message ??
          "Failed to load user profile.",
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!isClassOrHeadTeacher) return;

    const loadClassrooms = async () => {
      setLoadingClassrooms(true);
      try {
        const { data } = await schoolService.getAllClassRooms({
          pageNumber: 1,
          pageSize: 200,
        });
        const payload = (data as any)?.data ?? (data as any)?.Data ?? {};
        const classes = (payload?.classrooms ?? payload?.Classrooms ?? []) as SchoolClassroomDto[];
        setAllClassrooms(classes);

        if (!selectedClassroomId && classes.length > 0) {
          setSelectedClassroomId(classes[0].id);
        }
      } catch {
        setAssignMsg({
          type: "error",
          text: "Unable to load classrooms for assignment.",
        });
      } finally {
        setLoadingClassrooms(false);
      }
    };

    loadClassrooms();
  }, [isClassOrHeadTeacher, selectedClassroomId]);

  // ── save profile ───────────────────────────────────────────────────────────
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setSavingProfile(true);
    setProfileMsg({ type: "", text: "" });
    try {
      // Do not send hashPassword here — this form has no password field, and
      // the backend applies whatever non-empty value it's given as a real
      // password change (see EditUser). Sending a hash of the username was
      // silently resetting the account's password on every save.
      await authService.editUser({
        id: userData.id,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        emailAddress: profileForm.emailAddress,
        isActive: profileForm.isActive,
        hasAccess: userData.hasAccess,
        roleId: userData.roleId,
        profileImage: userData.profileImage ?? "",
        guardianName: userData.guardianName ?? "",
      });
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err: any) {
      setProfileMsg({
        type: "error",
        text:
          err?.response?.data?.responseMessage ??
          err?.message ??
          "Failed to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── assignment helpers ─────────────────────────────────────────────────────
  const removeClassroom = (classroomId: string) => {
    setKeptClassrooms((prev) =>
      prev.filter((c) => c.classroomId !== classroomId),
    );
  };

  const removeSubject = (classroomId: string, subjectId: string) => {
    setKeptClassrooms((prev) =>
      prev.map((c) =>
        c.classroomId === classroomId
          ? {
            ...c,
            subjects: (c.subjects ?? []).filter(
              (s) => s.subjectId !== subjectId,
            ),
          }
          : c,
      ),
    );
  };

  const openAddSubjectDialog = async (classroomId: string) => {
    setAddSubjectClassroomId(classroomId);
    setPendingSubjectIds([]);
    setDialogSubjects([]);
    setLoadingDialogSubjects(true);
    try {
      const { data } = await schoolService.getSubjectsByClassroomId(classroomId);
      const payload = (data as any)?.data ?? {};
      const normalize = (rows: any[], category: "Major" | "Minor"): DialogSubject[] =>
        (rows ?? []).map((s: any) => ({
          id: String(s.id ?? s.subjectId ?? ""),
          name: String(s.subject ?? s.subjectName ?? s.name ?? ""),
          category,
        }));
      setDialogSubjects([
        ...normalize(payload.majorSubjects, "Major"),
        ...normalize(payload.minorSubjects, "Minor"),
      ]);
    } catch {
      // Non-fatal — the dialog will just show "Nothing to add" for both columns.
    } finally {
      setLoadingDialogSubjects(false);
    }
  };

  const togglePendingSubject = (subjectId: string) => {
    setPendingSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const confirmAddSubjects = () => {
    if (addSubjectClassroomId && pendingSubjectIds.length > 0) {
      setKeptClassrooms((prev) =>
        prev.map((c) => {
          if (c.classroomId !== addSubjectClassroomId) return c;
          const existingIds = new Set((c.subjects ?? []).map((s) => s.subjectId));
          const added: SubjectDto[] = dialogSubjects
            .filter((s) => pendingSubjectIds.includes(s.id) && !existingIds.has(s.id))
            .map((s) => ({
              subjectId: s.id,
              subjectName: s.name,
              subjectCategory: s.category,
            }));
          return { ...c, subjects: [...(c.subjects ?? []), ...added] };
        }),
      );
    }
    setAddSubjectClassroomId(null);
    setPendingSubjectIds([]);
    setDialogSubjects([]);
  };

  // ── save assignments ───────────────────────────────────────────────────────
  const saveAssignments = async () => {
    if (!userData) return;
    setSavingAssign(true);
    setAssignMsg({ type: "", text: "" });

    if (isClassOrHeadTeacher) {
      if (!selectedClassroomId) {
        setAssignMsg({
          type: "error",
          text: "Please select a classroom.",
        });
        setSavingAssign(false);
        return;
      }

      try {
        const res = await authService.assignTeacherToClassroom({
          teacherId: userData.id,
          classroomId: selectedClassroomId,
          isPrimary: false,
        });

        if (res.data.status === "failed") return setAssignMsg({ type: "error", text: res.data.responseMessage });
        

        setAssignMsg({
          type: "success",
          text: "Classroom assignment updated successfully.",
        });

        const selected = allClassrooms.find((c) => c.id === selectedClassroomId);
        if (selected) {
          setKeptClassrooms([{ classroomId: selected.id, className: selected.name }]);
        }
      } catch (err: any) {
        setAssignMsg({
          type: "error",
          text:
            err?.response?.data?.responseMessage ??
            err?.message ??
            "Failed to update classroom assignment.",
        });
      } finally {
        setSavingAssign(false);
      }
      return;
    }

    // Note: classroom removal has no backend endpoint yet (EditUser's
    // removeClassroom/userClassroomsId fields are silently ignored — the
    // ViewModel it binds to has no such properties), so only the per-classroom
    // subject list is persisted below. Removing a teacher from a classroom
    // entirely still needs its own endpoint.

    try {
      // See saveProfile above — no password field on this form either, so
      // hashPassword must not be sent.
      await authService.editUser({
        id: userData.id,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        emailAddress: profileForm.emailAddress,
        isActive: profileForm.isActive,
        hasAccess: userData.hasAccess,
        roleId: userData.roleId,
        profileImage: userData.profileImage ?? "",
        guardianName: userData.guardianName ?? "",
      });

      // PUT api/User/teacher/{teacherId}/subject is per-classroom, so one call
      // per kept classroom — each call replaces that classroom's subject list.
      await Promise.all(
        keptClassrooms.map((cls) =>
          authService.updateTeacherSubject(userData.id, {
            classroomId: cls.classroomId,
            subjectIds: (cls.subjects ?? []).map((s) => s.subjectId),
          }),
        ),
      );

      setAssignMsg({
        type: "success",
        text: "Assignments updated successfully.",
      });
    } catch (err: any) {
      setAssignMsg({
        type: "error",
        text:
          err?.response?.data?.responseMessage ??
          err?.message ??
          "Failed to update assignments.",
      });
    } finally {
      setSavingAssign(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 py-5 font-poppins">
      <div className=" space-y-5">
        {/* header */}
        <div className="rounded-md bg-chestnut px-6 py-4 text-white">
          <h1 className="text-base sm:text-lg font-semibold">{pageTitle}</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-white/80">
            Update profile details or manage assignments below.
          </p>
        </div>

        <Link
          to="/admin/registration/teacher"
          className="inline-flex items-center gap-2 text-sm font-medium text-chestnut hover:text-chestnut/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teacher Registration
        </Link>

        {/* loading / global error */}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading profile…
          </div>
        )}

        {!loading && errorMsg && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        {!loading && !errorMsg && userData && (
          <>
            {/* ── CARD 1: Profile ── */}
            <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                <GraduationCap className="h-4 w-4 text-chestnut" />
                <h2 className="text-sm font-semibold text-slate-700">Profile</h2>
              </div>

              <form onSubmit={saveProfile} className="px-5 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-chestnut">
                      First Name
                    </Label>
                    <Input
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm((p) => ({
                          ...p,
                          firstName: e.target.value,
                        }))
                      }
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-chestnut">
                      Last Name
                    </Label>
                    <Input
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm((p) => ({
                          ...p,
                          lastName: e.target.value,
                        }))
                      }
                      className="mt-1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-chestnut">
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      value={profileForm.emailAddress}
                      readOnly
                      disabled
                      className="mt-1 bg-slate-100 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-chestnut">
                      Username
                    </Label>
                    <Input
                      value={userData.userName}
                      readOnly
                      className="mt-1 bg-slate-100 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileForm.isActive}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Active User
                </label>

                {profileMsg.text && (
                  <p
                    className={`rounded-lg border px-3 py-2 text-sm ${profileMsg.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                      }`}
                  >
                    {profileMsg.text}
                  </p>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="h-10 rounded-lg bg-chestnut hover:bg-chestnut/90 text-white px-4"
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Save Profile
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* ── CARD 2: Assignments (hidden for Admin) ── */}
            {!isAdmin && (
              <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                  <BookOpen className="h-4 w-4 text-chestnut" />
                  <h2 className="text-sm font-semibold text-slate-700">
                    {isSubjectTeacher
                      ? "Classrooms & Subjects"
                      : "Assigned Classrooms"}
                  </h2>
                </div>

                <div className="px-5 py-5 space-y-3">
                  {isClassOrHeadTeacher && (
                    <div className="space-y-2">
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Select one classroom and save. This updates the active assignment.
                      </p>
                      <div>
                        <Label className="text-sm font-medium text-chestnut">Classroom</Label>
                        <select
                          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white"
                          value={selectedClassroomId}
                          onChange={(e) => setSelectedClassroomId(e.target.value)}
                          disabled={loadingClassrooms}
                        >
                          <option value="">Select classroom</option>
                          {allClassrooms.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {keptClassrooms.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">
                      No classrooms currently assigned.
                    </p>
                  ) : (
                    keptClassrooms.map((cls) => (
                      <div
                        key={cls.classroomId}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 space-y-2"
                      >
                        {/* Classroom row */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">
                            {cls.className}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeClassroom(cls.classroomId)}
                            className="rounded-full p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Remove classroom"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Subjects — Subject Teacher only */}
                        {isSubjectTeacher && (
                          <div className="space-y-1.5 pl-1">
                            {(cls.subjects ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {(cls.subjects ?? []).map((sub) => (
                                  <span
                                    key={sub.subjectId}
                                    className="inline-flex items-center gap-1 rounded-full border border-chestnut/20 bg-chestnut/5 px-2.5 py-0.5 text-xs font-medium text-chestnut"
                                  >
                                    {sub.subjectName}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeSubject(
                                          cls.classroomId,
                                          sub.subjectId,
                                        )
                                      }
                                      className="ml-0.5 text-chestnut/50 hover:text-red-500 transition-colors"
                                      title="Remove subject"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => openAddSubjectDialog(cls.classroomId)}
                              className="flex items-center gap-1 text-xs font-semibold text-chestnut hover:opacity-70 transition-opacity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add subject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {assignMsg.text && (
                    <p
                      className={`rounded-lg border px-3 py-2 text-sm ${assignMsg.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-red-200 bg-red-50 text-red-700"
                        }`}
                    >
                      {assignMsg.text}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      onClick={saveAssignments}
                      className="h-10 rounded-lg bg-[#292382] hover:bg-[#292382]/90 text-white px-4"
                      disabled={savingAssign}
                    >
                      {savingAssign ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Subject Dialog (Subject Teacher only) ── */}
      <Dialog
        open={!!addSubjectClassroomId}
        onOpenChange={(open) => {
          if (!open) {
            setAddSubjectClassroomId(null);
            setPendingSubjectIds([]);
            setDialogSubjects([]);
          }
        }}
      >
        <DialogContent className="md:max-w-lg w-[90%] rounded-2xl p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <DialogTitle className="text-sm font-bold text-chestnut">
              Add Subject
            </DialogTitle>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {keptClassrooms.find((c) => c.classroomId === addSubjectClassroomId)?.className
                ? `Choose subjects to add for ${keptClassrooms.find((c) => c.classroomId === addSubjectClassroomId)?.className}`
                : "Choose subjects to add"}
            </p>
          </div>

          <div className="flex gap-0 px-6 py-5">
            {(["Major", "Minor"] as const).map((category, idx) => {
              const existingIds = new Set(
                (keptClassrooms.find((c) => c.classroomId === addSubjectClassroomId)?.subjects ?? [])
                  .map((s) => s.subjectId),
              );
              const options = dialogSubjects.filter(
                (s) => s.category === category && !existingIds.has(s.id),
              );
              return (
                <div
                  key={category}
                  className={`flex-1 ${idx === 0 ? "pr-5 border-r border-gray-100" : "pl-5"}`}
                >
                  <p
                    className={`text-[10px] font-bold mb-3 uppercase tracking-wide flex items-center gap-1.5 ${category === "Major" ? "text-chestnut" : "text-gray-400"
                      }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    {category}
                  </p>
                  <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-1">
                    {loadingDialogSubjects ? (
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
                          onClick={() => togglePendingSubject(s.id)}
                          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${pendingSubjectIds.includes(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"
                              }`}
                          >
                            {pendingSubjectIds.includes(s.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className={`text-xs select-none ${pendingSubjectIds.includes(s.id) ? "text-chestnut font-semibold" : "text-gray-600 font-medium"}`}>
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
              {pendingSubjectIds.length} subject{pendingSubjectIds.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-5 py-2 hover:bg-gray-50"
                onClick={() => {
                  setAddSubjectClassroomId(null);
                  setPendingSubjectIds([]);
                  setDialogSubjects([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="text-white text-xs font-semibold rounded-lg px-5 py-2 hover:opacity-90 transition-opacity bg-chestnut"
                onClick={confirmAddSubjects}
                disabled={pendingSubjectIds.length === 0}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherEditProfile;

import { Button, Input, Label } from "@bluethub/ui-kit";
import {
  authService,
  type IEditUserRequest,
  type IUpdateStudentAssignmentRequest,
} from "@/services/auth";
import { schoolService } from "@/services/school";
import { UserRole } from "@/utils/validate";
import { AxiosError } from "axios";
import { ArrowLeft, Loader2, Save, SquarePen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

type StudentClassroom = {
  classroomId: string;
  className: string;
  ClassName?: string;
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
};

type StudentRoleData = {
  classroom?: StudentClassroom;
  Classroom?: StudentClassroom;
  classrooms?: StudentClassroom[];
  Classrooms?: StudentClassroom[];
  subjects?: Array<{ subjectId: string; subjectName: string }>;
  Subjects?: Array<{ subjectId: string; subjectName: string }>;
};

type StudentDto = {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  emailAddress: string;
  guardianName?: string | null;
  isActive: boolean;
  hasAccess: boolean;
  roleId: number;
  profileImage?: string | null;
  roleData?: StudentRoleData;
};

type SubjectOption = {
  subjectId: string;
  subjectName: string;
};

type SchoolClassroomOption = {
  id: string;
  name: string;
};

const normalizeStudent = (payload: any): StudentDto | null => {
  if (!payload) return null;
  return {
    id: String(payload.id ?? payload.Id ?? ""),
    firstName: String(payload.firstName ?? payload.FirstName ?? ""),
    lastName: String(payload.lastName ?? payload.LastName ?? ""),
    userName: String(payload.userName ?? payload.UserName ?? ""),
    emailAddress: String(payload.emailAddress ?? payload.EmailAddress ?? ""),
    guardianName: payload.guardianName ?? payload.GuardianName ?? null,
    isActive: Boolean(payload.isActive ?? payload.IsActive ?? false),
    hasAccess: Boolean(payload.hasAccess ?? payload.HasAccess ?? false),
    roleId: Number(payload.roleId ?? payload.RoleId ?? UserRole.Student),
    profileImage: payload.profileImage ?? payload.ProfileImage ?? null,
    roleData: payload.roleData ?? payload.RoleData ?? undefined,
  };
};

const normalizeClassroom = (roleData?: StudentRoleData): StudentClassroom | null => {
  if (!roleData) return null;
  const classroom = roleData.classroom ?? roleData.Classroom ?? roleData.classrooms?.[0] ?? roleData.Classrooms?.[0] ?? null;
  if (!classroom) return null;
  return {
    classroomId: String(classroom.classroomId ?? classroom.id ?? classroom.Id ?? ""),
    className: String(classroom.className ?? classroom.ClassName ?? classroom.name ?? classroom.Name ?? ""),
  };
};

const EditStudent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId: routeStudentId } = useParams<{ studentId: string }>();
  const studentId = (location.state as { studentId?: string } | null)?.studentId ?? routeStudentId;

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [student, setStudent] = useState<StudentDto | null>(null);
  const [allClassrooms, setAllClassrooms] = useState<SchoolClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [initialClassroomId, setInitialClassroomId] = useState("");
  const [availableMinorSubjects, setAvailableMinorSubjects] = useState<SubjectOption[]>([]);
  const [initialMinorSubjectIds, setInitialMinorSubjectIds] = useState<string[]>([]);
  const [selectedMinorSubjectIds, setSelectedMinorSubjectIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    guardianName: "",
    isActive: true,
  });

  const assignedClass = useMemo(() => normalizeClassroom(student?.roleData), [student?.roleData]);

  const selectedClassName = useMemo(() => {
    if (!selectedClassroomId) return "-";
    return allClassrooms.find((classroom) => classroom.id === selectedClassroomId)?.name ?? "-";
  }, [allClassrooms, selectedClassroomId]);

  const loadMinorSubjectsForClassroom = async (
    userId: string,
    classroomId: string,
    options?: { seedInitialSelection?: boolean },
  ) => {
    const { seedInitialSelection = false } = options ?? {};
    const [minorResponse, classroomSubjectsResponse] = await Promise.all([
      authService.getStudentMinorSubjects(userId, classroomId),
      schoolService.getSubjectsByClassroomId(classroomId),
    ]);

    const minorPayload =
      (minorResponse.data as any)?.data ?? (minorResponse.data as any)?.Data ?? {};
    const minorRows =
      minorPayload?.subjects ?? minorPayload?.Subjects ?? minorPayload?.data?.subjects ?? [];

    const normalizedMinorIds = (Array.isArray(minorRows) ? minorRows : [])
      .map((subject: any) => String(subject?.subjectId ?? subject?.SubjectId ?? ""))
      .filter((id: string) => !!id);

    const classroomPayload =
      (classroomSubjectsResponse.data as any)?.data ??
      (classroomSubjectsResponse.data as any)?.Data ??
      {};
    const minors = classroomPayload?.minorSubjects ?? classroomPayload?.MinorSubjects ?? [];

    const normalizedOptions = (Array.isArray(minors) ? minors : [])
      .map((subject: any) => ({
        subjectId: String(subject?.subjectId ?? subject?.id ?? ""),
        subjectName: String(subject?.subjectName ?? subject?.subject ?? subject?.name ?? "Unnamed Subject"),
      }))
      .filter((subject: SubjectOption) => !!subject.subjectId);

    const optionIds = normalizedOptions.map((subject) => subject.subjectId);

    setAvailableMinorSubjects(normalizedOptions);
    if (seedInitialSelection) {
      const filteredInitial = normalizedMinorIds.filter((id: string) => optionIds.includes(id));
      setInitialMinorSubjectIds(filteredInitial);
      setSelectedMinorSubjectIds(filteredInitial);
      return;
    }

    setSelectedMinorSubjectIds((prev) => prev.filter((id) => optionIds.includes(id)));
  };

  useEffect(() => {
    const load = async () => {
      if (!studentId) {
        setErrorMsg("Missing student id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await authService.getUserById(studentId);
        const payload = normalizeStudent((data as any)?.data ?? (data as any)?.Data ?? data);
        if (!payload?.id) {
          throw new Error("Student record not found.");
        }

        setStudent(payload);
        setForm({
          firstName: payload.firstName ?? "",
          lastName: payload.lastName ?? "",
          guardianName: payload.guardianName ?? "",
          isActive: payload.isActive,
        });

        const classroom = normalizeClassroom(payload.roleData);
        const classroomId = classroom?.classroomId;

        const classroomsResponse = await schoolService.getAllClassRooms({
          pageNumber: 1,
          pageSize: 200,
        });
        const classroomListPayload =
          (classroomsResponse.data as any)?.data ?? (classroomsResponse.data as any)?.Data ?? {};
        const classroomRows = classroomListPayload?.classrooms ?? classroomListPayload?.Classrooms ?? [];
        const normalizedClassrooms = (Array.isArray(classroomRows) ? classroomRows : [])
          .map((entry: any) => ({
            id: String(entry?.id ?? entry?.Id ?? ""),
            name: String(entry?.name ?? entry?.Name ?? ""),
          }))
          .filter((entry: SchoolClassroomOption) => !!entry.id);

        setAllClassrooms(normalizedClassrooms);
        if (classroomId) {
          setSelectedClassroomId(classroomId);
          setInitialClassroomId(classroomId);
        } else if (normalizedClassrooms.length > 0) {
          setSelectedClassroomId(normalizedClassrooms[0].id);
          setInitialClassroomId(normalizedClassrooms[0].id);
        }

        if (classroomId) {
          await loadMinorSubjectsForClassroom(payload.id, classroomId, { seedInitialSelection: true });
        }
      } catch (error) {
        const msg =
          error instanceof AxiosError
            ? error.response?.data?.responseMessage ??
              error.response?.data?.message ??
              error.message
            : (error as Error).message;
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [studentId]);

  useEffect(() => {
    if (!student?.id || !selectedClassroomId) return;
    if (selectedClassroomId === initialClassroomId) return;

    const loadForChangedClassroom = async () => {
      try {
        await loadMinorSubjectsForClassroom(student.id, selectedClassroomId);
      } catch {
        // Keep previous state; save will still surface API errors.
      }
    };

    void loadForChangedClassroom();
  }, [student?.id, selectedClassroomId, initialClassroomId]);

  const handleSaveProfile = async () => {
    if (!student) return;

    try {
      setSavingProfile(true);
      setErrorMsg("");

      // Do not send hashPassword — this form has no password field, and the
      // backend applies whatever non-empty value it's given as a real
      // password change. Hashing the username was silently resetting the
      // student's password on every profile save.
      const payload: IEditUserRequest = {
        id: student.id,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        emailAddress: "",
        isActive: form.isActive,
        hasAccess: student.hasAccess,
        roleId: student.roleId || UserRole.Student,
        profileImage: student.profileImage ?? "",
        guardianName: form.guardianName.trim(),
      };

      await authService.editUser(payload);
      toast.success("Student profile updated successfully");
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              firstName: payload.firstName,
              lastName: payload.lastName,
              emailAddress: payload.emailAddress,
              guardianName: payload.guardianName,
              isActive: payload.isActive,
            }
          : prev,
      );
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? error.response?.data?.responseMessage ??
            error.response?.data?.message ??
            error.message
          : (error as Error).message;
      setErrorMsg(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!student) return;

    try {
      setSavingAssignment(true);
      setErrorMsg("");

      const toAdd = selectedMinorSubjectIds.filter((id) => !initialMinorSubjectIds.includes(id));
      const toRemove = initialMinorSubjectIds.filter((id) => !selectedMinorSubjectIds.includes(id));
      const assignmentChanged =
        (selectedClassroomId || "") !== (initialClassroomId || "") ||
        toAdd.length > 0 ||
        toRemove.length > 0;

      if (assignmentChanged) {
        const assignmentPayload: IUpdateStudentAssignmentRequest = {
          classroomId: selectedClassroomId || assignedClass?.classroomId,
          minorSubjectIds: selectedMinorSubjectIds,
          addSubjects: toAdd,
          removeSubjects: toRemove,
        };

        await authService.updateStudentAssignment(student.id, assignmentPayload);
        setInitialClassroomId(selectedClassroomId);
        setInitialMinorSubjectIds(selectedMinorSubjectIds);
        toast.success("Classroom and subjects updated successfully");
      } else {
        toast("No classroom/subject changes to save");
      }
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? error.response?.data?.responseMessage ??
            error.response?.data?.message ??
            error.message
          : (error as Error).message;
      setErrorMsg(msg);
    } finally {
      setSavingAssignment(false);
    }
  };

  if (loading) {
    return (
      <div className="md:p-6 p-3 font-poppins">
        <div className="rounded-2xl bg-chestnut px-5 py-4 text-white">
          <div className="h-4 w-40 rounded bg-white/20" />
          <div className="mt-2 h-3 w-64 rounded bg-white/15" />
        </div>
      </div>
    );
  }

  if (errorMsg || !student) {
    return (
      <div className="md:p-6 p-3 font-poppins">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg || "Unable to load student."}
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/registration/student")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 font-poppins">
      <div className="overflow-hidden border border-white/20 bg-white/75 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-4 bg-chestnut text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <SquarePen className="h-5 w-5" />
            <div>
              <h1 className="font-semibold text-sm">Edit Student</h1>
              <p className="text-xs text-white/70">Update student profile details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/registration/student")}
            className="text-white/90 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-chestnut text-sm font-semibold">First Name</Label>
              <Input value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} className="border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-chestnut text-sm font-semibold">Last Name</Label>
              <Input value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} className="border-slate-200" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-chestnut text-sm font-semibold">Guardian Name</Label>
              <Input value={form.guardianName} onChange={(e) => setForm((prev) => ({ ...prev, guardianName: e.target.value }))} className="border-slate-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-chestnut text-sm font-semibold">Username</Label>
              <Input value={student.userName} readOnly className="bg-slate-50 text-slate-500 border-slate-200" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-chestnut text-sm font-semibold">Assigned Class</Label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white"
            >
              <option value="">Select classroom</option>
              {allClassrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Current class: {selectedClassName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-chestnut text-sm font-semibold">Minor Subjects</Label>
            {availableMinorSubjects.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                No minor subjects available for this class.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                {availableMinorSubjects.map((subject) => (
                  <label
                    key={subject.subjectId}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="text-sm text-slate-700">{subject.subjectName}</span>
                    <input
                      type="checkbox"
                      checked={selectedMinorSubjectIds.includes(subject.subjectId)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedMinorSubjectIds((prev) =>
                          checked
                            ? Array.from(new Set([...prev, subject.subjectId]))
                            : prev.filter((id) => id !== subject.subjectId),
                        );
                      }}
                      className="accent-chestnut"
                    />
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500">
              Major subjects remain class-based. Only minor subjects are editable here.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            Active Student
          </label>

          {errorMsg && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/admin/registration/student")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
            <div className="flex w-full sm:w-auto flex-col sm:flex-row items-center gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile || savingAssignment}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-chestnut px-5 py-2.5 text-white font-semibold hover:opacity-90"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </Button>
              <Button
                onClick={handleSaveAssignment}
                disabled={savingAssignment || savingProfile}
                variant="outline"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-chestnut/30 bg-[#F3F4FF] px-5 py-2.5 text-chestnut font-semibold hover:bg-[#E8EAFF]"
              >
                {savingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Classroom & Subjects
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditStudent;

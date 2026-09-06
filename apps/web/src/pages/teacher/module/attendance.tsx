import { useMemo } from "react";
import { UserSearch } from "lucide-react";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import StudentRecords from "../attendance/student-records";

interface Option {
  id: string;
  name: string;
}

interface ClassroomOption extends Option {
  subjects: Option[];
}

const ModuleAttendance = () => {
  const { user } = useAuthContext();

  const classrooms = useMemo<ClassroomOption[]>(() => {
    const rd = user?.roleData;
    if (!rd || !isTeacherRoleData(rd)) return [];
    return rd.classrooms.map((c) => ({
      id: String(c.classroomId),
      name: c.className ?? "Class",
      subjects: (c.subjects ?? []).map((s) => ({
        id: String(s.subjectId),
        name: s.subjectName ?? "",
      })),
    }));
  }, [user]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <UserSearch className="w-5 h-5 text-[#292382]" />
            <h1 className="text-base font-semibold text-[#292382]">Attendance Records</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Look up a student's attendance history across your classes and subjects.
          </p>
        </div>

        <StudentRecords classrooms={classrooms} roleId={user?.roleId} />
      </div>
    </div>
  );
};

export default ModuleAttendance;

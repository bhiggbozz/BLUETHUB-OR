import { useEffect, useMemo, useState } from "react";
import { useAuthContext, isTeacherRoleData } from "@/contexts/auth-context";
import { schoolService } from "@/services/school";
import type { CalendarEntryScope } from "@/services/calendar";
import { useCanManageCalendar } from "./use-can-manage-calendar";

export interface ClassroomOption {
  classroomId: string;
  className: string;
}

export interface SubjectOption {
  subjectId: string;
  subjectName: string;
}

export type EntryWriteAccess =
  | { status: "loading" }
  | { status: "denied" }
  | {
      status: "granted";
      /** Scopes this role is allowed to pick when creating a new entry. */
      scopes: CalendarEntryScope[];
      /** Whether this role may add the admin-only Holiday type. */
      canAddHolidays: boolean;
      classroomOptions: ClassroomOption[];
      subjectOptions: SubjectOption[];
    };

/**
 * Decides, per role, whether the signed-in user may create a calendar entry
 * and what scope/classroom/subject choices they get to pick from:
 *  - Admin level (SuperAdministrator, or Administrator with ManageCalendar):
 *    School, Classroom or Subject, for any classroom/subject in the school.
 *  - HeadTeacher: Classroom or Subject, limited to the classes they're
 *    assigned to.
 *  - ClassTeacher: Classroom only, limited to their own class.
 *  - SubjectTeacher: Subject only, limited to their own subjects (optionally
 *    naming one of their classes).
 *  - Student/Parent: read-only — never granted.
 * The server re-checks all of this; this only gates which controls the UI
 * offers.
 */
export function useEntryWriteAccess(): EntryWriteAccess {
  const { user } = useAuthContext();
  const adminAccess = useCanManageCalendar();
  const [adminClassrooms, setAdminClassrooms] = useState<ClassroomOption[]>([]);
  const [adminSubjects, setAdminSubjects] = useState<SubjectOption[]>([]);
  const [adminOptionsLoaded, setAdminOptionsLoaded] = useState(false);

  const isAdminLevel = adminAccess.status === "granted";

  useEffect(() => {
    if (!isAdminLevel) return;
    let cancelled = false;
    Promise.all([schoolService.getAllClassRooms({ pageSize: 500 }), schoolService.getAllSubject()])
      .then(([classroomRes, subjectRes]) => {
        if (cancelled) return;
        const classroomRows: any[] = (classroomRes.data as any)?.data?.classrooms ?? [];
        setAdminClassrooms(
          classroomRows
            .map((c: any) => ({ classroomId: String(c.id ?? c.classroomId ?? ""), className: String(c.name ?? c.className ?? "") }))
            .filter((c) => !!c.classroomId),
        );
        const subjectRows: any[] = (subjectRes.data as any)?.data?.subjects ?? [];
        setAdminSubjects(
          subjectRows
            .map((s: any) => ({ subjectId: String(s.id ?? s.subjectId ?? ""), subjectName: String(s.name ?? s.subjectName ?? "") }))
            .filter((s) => !!s.subjectId),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setAdminClassrooms([]);
          setAdminSubjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) setAdminOptionsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminLevel]);

  const teacherClassrooms = useMemo(() => {
    if (!user?.roleData || !isTeacherRoleData(user.roleData)) return [];
    return user.roleData.classrooms ?? [];
  }, [user]);

  return useMemo<EntryWriteAccess>(() => {
    if (!user) return { status: "loading" };

    if (adminAccess.status === "loading") return { status: "loading" };

    if (isAdminLevel) {
      if (!adminOptionsLoaded) return { status: "loading" };
      return {
        status: "granted",
        scopes: ["School", "Classroom", "Subject"],
        canAddHolidays: true,
        classroomOptions: adminClassrooms,
        subjectOptions: adminSubjects,
      };
    }

    if (user.roleName === "HeadTeacher") {
      const classroomOptions = teacherClassrooms.map((c) => ({ classroomId: c.classroomId, className: c.className ?? "" }));
      const subjectOptions = uniqueSubjects(teacherClassrooms.flatMap((c) => c.subjects ?? []));
      return { status: "granted", scopes: ["Classroom", "Subject"], canAddHolidays: false, classroomOptions, subjectOptions };
    }

    if (user.roleName === "ClassTeacher") {
      const classroomOptions = teacherClassrooms.map((c) => ({ classroomId: c.classroomId, className: c.className ?? "" }));
      return { status: "granted", scopes: ["Classroom"], canAddHolidays: false, classroomOptions, subjectOptions: [] };
    }

    if (user.roleName === "SubjectTeacher") {
      const classroomOptions = teacherClassrooms.map((c) => ({ classroomId: c.classroomId, className: c.className ?? "" }));
      const subjectOptions = uniqueSubjects(teacherClassrooms.flatMap((c) => c.subjects ?? []));
      return { status: "granted", scopes: ["Subject"], canAddHolidays: false, classroomOptions, subjectOptions };
    }

    // Student, Parent, and anything else: read-only.
    return { status: "denied" };
  }, [user, adminAccess.status, isAdminLevel, adminOptionsLoaded, adminClassrooms, adminSubjects, teacherClassrooms]);
}

function uniqueSubjects(subjects: { subjectId: string; subjectName: string }[]): SubjectOption[] {
  const seen = new Map<string, SubjectOption>();
  for (const s of subjects) {
    if (!seen.has(s.subjectId)) seen.set(s.subjectId, { subjectId: s.subjectId, subjectName: s.subjectName });
  }
  return [...seen.values()];
}

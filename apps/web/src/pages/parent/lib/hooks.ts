import { useCallback, useEffect, useState } from "react";
import { attendanceService, type AttendanceHistoryItem, type StudentAttendanceStats } from "@/services/attendance";
import { schoolService } from "@/services/school";
import { AttendanceType } from "@/utils/constant";
import { extractErrorMessage } from "./format";

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/* In-memory cache so moving between dashboard and attendance shows data instantly
 * while a fresh copy loads in the background. Cleared on full page reload. */
const historyCache = new Map<string, AttendanceHistoryItem[]>();

export function useAttendanceHistory(studentId: string | null): AsyncState<AttendanceHistoryItem[]> {
  const [data, setData] = useState<AttendanceHistoryItem[]>(() =>
    studentId ? historyCache.get(studentId) ?? [] : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!studentId) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = historyCache.get(studentId);
    setData(cached ?? []);
    setLoading(!cached);
    setError(null);
    attendanceService
      .getStudentAttendance(studentId)
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data ?? [];
        historyCache.set(studentId, list);
        setData(list);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, "We couldn't load attendance history."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

export interface StatsQuery {
  studentId: string | null;
  classroomId: string | null;
  fromMonth: string;
  toMonth: string;
  scope: "class" | "subject";
  subjectId?: string;
}

export function useAttendanceStats(
  q: StatsQuery,
): AsyncState<StudentAttendanceStats | null> & { ready: boolean } {
  const [data, setData] = useState<StudentAttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const needsSubject = q.scope === "subject";
  const validRange = q.fromMonth !== "" && q.toMonth !== "" && q.fromMonth <= q.toMonth;
  const ready = Boolean(q.studentId && q.classroomId && validRange && (!needsSubject || q.subjectId));

  useEffect(() => {
    if (!ready || !q.studentId || !q.classroomId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    attendanceService
      .getStudentStats(q.studentId, {
        period: 3,
        month: q.toMonth,
        fromMonth: q.fromMonth,
        toMonth: q.toMonth,
        attendanceType: needsSubject ? AttendanceType.SUBJECT : AttendanceType.CLASS,
        classroomId: q.classroomId,
        subjectId: needsSubject ? q.subjectId : undefined,
      })
      .then((res) => {
        if (!cancelled) setData(res.data?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, "We couldn't load attendance stats."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, q.studentId, q.classroomId, q.fromMonth, q.toMonth, needsSubject, q.subjectId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload, ready };
}

export interface SubjectOption {
  id: string;
  name: string;
}

interface RawSubject {
  id?: string | number;
  subjectId?: string | number;
  subject?: string;
  subjectName?: string;
  name?: string;
}

interface SubjectsPayload {
  data?: { majorSubjects?: RawSubject[]; minorSubjects?: RawSubject[] };
}

const subjectCache = new Map<string, SubjectOption[]>();

export function useClassroomSubjects(classroomId: string | null) {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classroomId) {
      setSubjects([]);
      return;
    }
    const cached = subjectCache.get(classroomId);
    if (cached) {
      setSubjects(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    schoolService
      .getSubjectsByClassroomId(classroomId)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data as SubjectsPayload;
        const raw = [...(payload?.data?.majorSubjects ?? []), ...(payload?.data?.minorSubjects ?? [])];
        const list = raw
          .map((s) => ({
            id: String(s.id ?? s.subjectId ?? ""),
            name: String(s.subject ?? s.subjectName ?? s.name ?? ""),
          }))
          .filter((s) => s.id && s.name);
        subjectCache.set(classroomId, list);
        setSubjects(list);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  return { subjects, loading };
}

/** Persists a small per-viewer preference. Storage failures fall back to memory. */
export function useLocalFlag(key: string, initial = false): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initial : raw === "1";
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* storage unavailable: keep the in-memory value only */
      }
    },
    [key],
  );
  return [value, set];
}

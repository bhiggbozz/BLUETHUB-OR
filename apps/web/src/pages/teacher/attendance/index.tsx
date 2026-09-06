import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOutletContext } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  CloudOff,
  History,
  Loader2,
  Menu,
  RefreshCw,
  ScanLine,
  Square,
  UserCheck,
  UserSearch,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useAuthContext, isTeacherRoleData } from "@/contexts/auth-context";
import { UserRole } from "@/utils/validate";
import {
  attendanceService,
  type AttendanceSessionDto,
  type AttendanceSummaryDto,
} from "@/services/attendance";
import { moduleService } from "@/services/module";
import { schoolService } from "@/services/school";
import {
  deleteAttendanceScan,
  findOpenAttendanceSession,
  getAllAttendanceScans,
  getAttendanceScanByDedupe,
  getAttendanceScansBySession,
  putAttendanceScan,
  putAttendanceSession,
  retryFailedAttendanceScans,
  updateAttendanceSession,
} from "@/utils/db";
import type {
  AttendanceScanRecord,
  AttendanceType,
  LocalAttendanceSession,
} from "@/utils/constant";
import { AttendanceType as AT } from "@/utils/constant";
import {
  buildDedupeKey,
  buildScopeKey,
  extractErrorMessage,
  isoNow,
  parseQrValue,
  toDateKey,
} from "@/utils/attendance";
import { flushAttendanceSync, getUnsentAttendanceCount } from "@/utils/attendance-sync";
import QrScannerModal, { type ScanFeedback } from "./qr-scanner-modal";
import StudentRecords from "./student-records";

// ── Types & constants ────────────────────────────────────────────────────────

interface Option {
  id: string;
  name: string;
}

interface ClassroomOption extends Option {
  subjects: Option[];
}

const MODE_OPTIONS: Array<{
  value: AttendanceType;
  label: string;
  description: string;
}> = [
  { value: AT.CLASS, label: "By Class", description: "Student present at school today" },
  { value: AT.SUBJECT, label: "By Subject", description: "Student attended the subject class" },
  {
    value: AT.SUBTOPIC,
    label: "By Subtopic / Lesson",
    description: "Student attended the specific lesson",
  },
];

const MODE_LABEL: Record<AttendanceType, string> = {
  [AT.CLASS]: "Class",
  [AT.SUBJECT]: "Subject",
  [AT.SUBTOPIC]: "Subtopic / Lesson",
};

const SYNC_BADGE: Record<
  AttendanceScanRecord["syncStatus"],
  { label: string; className: string }
> = {
  pending: { label: "Queued", className: "bg-amber-50 text-amber-700" },
  uploading: { label: "Syncing…", className: "bg-blue-50 text-blue-700" },
  sent: { label: "Synced", className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
};

function mapOptions(items: any[]): Option[] {
  return (items ?? [])
    .map((it: any) => ({
      id: String(it.id ?? it.subTopicId ?? it.topicId ?? it.subjectId ?? ""),
      name: String(it.name ?? it.subTopicName ?? it.topicName ?? it.subjectName ?? ""),
    }))
    .filter((o) => o.id);
}

/** Pulls the attendance token out of a /qr-token response (any casing). */
function readQrTokenFromResponse(res: unknown): string {
  const root = res as any;
  const payload = root?.data ?? root?.Data ?? root ?? {};
  if (typeof payload === "string") return payload;
  return String(
    payload?.qrToken ?? payload?.token ?? payload?.QrToken ?? payload?.value ?? "",
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TeacherAttendance = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { user } = useAuthContext();

  // ── Sources (teacher classrooms / subjects) ─────────────────────────────
  const roleClasses = useMemo<ClassroomOption[]>(() => {
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

  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [topics, setTopics] = useState<Option[]>([]);
  const [curriculumTopics, setCurriculumTopics] = useState<
    Record<string, { id: string; name: string; subTopics: Option[] }>
  >({});

  const [mode, setMode] = useState<AttendanceType>(AT.CLASS);
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subTopicId, setSubTopicId] = useState("");

  // ── Session / records ────────────────────────────────────────────────────
  const activeSessionRef = useRef<LocalAttendanceSession | null>(null);
  const [activeSession, setActiveSession] = useState<LocalAttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceScanRecord[]>([]);
  const [todayScans, setTodayScans] = useState<AttendanceScanRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // ── Connectivity / sync ──────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [syncing, setSyncing] = useState(false);
  const syncLockRef = useRef(false);
  const rosterMapRef = useRef<Record<string, string>>({});
  // Maps a student's backend attendance QR token → "First Last" name. The QR
  // value is usually the backend-issued token (not the student id), so we build
  // this reverse map to always show a real name instead of a raw id.
  const rosterTokenMapRef = useRef<Record<string, string>>({});

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);

  // ── Backend history (recent attendance records) ─────────────────────────
  const [history, setHistory] = useState<AttendanceSessionDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReloadKey, setHistoryReloadKey] = useState(0);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, AttendanceSummaryDto>>({});
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Submenu view: scan flow vs student records ──────────────────────────
  const [viewTab, setViewTab] = useState<"scan" | "records">("scan");

  // Resolves the best display name for a scanned QR token: the stored name,
  // then the token→name map, then the id→name roster map.
  const resolveName = useCallback(
    (qrToken: string, storedName?: string) =>
      storedName ?? rosterTokenMapRef.current[qrToken] ?? rosterMapRef.current[qrToken] ?? "",
    [],
  );

  // ── Access scope ─────────────────────────────────────────────────────────
  // Teachers may only take attendance for classes assigned to them (from their
  // role data). Only administrators / super administrators see every class.
  const isAdmin =
    user?.roleId === UserRole.Administrator ||
    user?.roleId === UserRole.SuperAdministrator;
  const hasAssignedClasses = roleClasses.length > 0;

  // Role-based scope: ClassTeacher → class only, SubjectTeacher → subject only,
  // HeadTeacher → class + subject, admins → everything (incl. subtopic).
  const allowedModes = useMemo<AttendanceType[]>(() => {
    if (isAdmin) return [AT.CLASS, AT.SUBJECT, AT.SUBTOPIC];
    switch (user?.roleId) {
      case UserRole.ClassTeacher:
        return [AT.CLASS];
      case UserRole.SubjectTeacher:
        return [AT.SUBJECT];
      case UserRole.HeadTeacher:
        return [AT.CLASS, AT.SUBJECT];
      default:
        return [AT.CLASS, AT.SUBJECT];
    }
  }, [isAdmin, user?.roleId]);

  const teacherId = user?.id;
  const teacherName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.userName
    : "";

  // Keep the selected mode within the teacher's allowed scope.
  useEffect(() => {
    if (!allowedModes.includes(mode)) {
      setMode(allowedModes[0] ?? AT.CLASS);
      setSubjectId("");
      setTopicId("");
      setSubTopicId("");
    }
  }, [allowedModes, mode]);

  // ── Derived labels ───────────────────────────────────────────────────────
  const classroomName = classrooms.find((c) => c.id === classroomId)?.name ?? "";
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
  const subTopicName = curriculumTopics[topicId]?.subTopics.find((s) => s.id === subTopicId)?.name ?? "";
  const subTopicOptions = curriculumTopics[topicId]?.subTopics ?? [];

  // ── Classroom list (role-scoped) ──────────────────────────────────────────
  // Teachers: always driven by their roleData (assigned classes only). The
  // roleData is fetched after auth, so keep the list in sync as it hydrates.
  useEffect(() => {
    if (isAdmin) return;
    setClassrooms(roleClasses);
    if (roleClasses.length === 0) {
      setClassroomId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, roleClasses]);

  // Admins: can see every class in the school.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setClassroomsLoading(true);
    moduleService
      .getClassrooms({ pageNumber: 1, pageSize: 200 })
      .then((res) => {
        const payload = (res.data as any)?.data ?? res.data ?? {};
        const rows: any[] = payload.classrooms ?? payload.Classrooms ?? [];
        if (!cancelled && Array.isArray(rows)) {
          setClassrooms(
            rows
              .map((c) => ({
                id: String(c.id ?? c.classroomId ?? ""),
                name: String(c.name ?? c.className ?? ""),
                subjects: [] as Option[],
              }))
              .filter((c) => c.id),
          );
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load classrooms.");
      })
      .finally(() => {
        if (!cancelled) setClassroomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ── Load subjects for the selected class (subject / subtopic mode) ───────
  useEffect(() => {
    if ((mode !== AT.SUBJECT && mode !== AT.SUBTOPIC) || !classroomId) {
      setSubjects([]);
      setSubjectId("");
      return;
    }
    setSubjectId("");
    const fromRole = classrooms.find((c) => c.id === classroomId)?.subjects ?? [];
    if (fromRole.length > 0) {
      setSubjects(fromRole);
      return;
    }
    schoolService
      .getSubjectsByClassroomId(classroomId)
      .then((res) => {
        const payload = (res as any).data?.data ?? (res as any).data ?? [];
        const mapped = (Array.isArray(payload) ? payload : [])
          .map((s: any) => ({
            id: String(s.id ?? s.subjectId ?? ""),
            name: String(s.name ?? s.subjectName ?? ""),
          }))
          .filter((o: Option) => o.id);
        setSubjects(mapped);
      })
      .catch(() => toast.error("Failed to load subjects."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, classroomId, classrooms]);

  // ── Load topics / subtopics for subtopic mode ────────────────────────────
  useEffect(() => {
    if (mode !== AT.SUBTOPIC || !subjectId || !classroomId) {
      setTopics([]);
      setCurriculumTopics({});
      setTopicId("");
      setSubTopicId("");
      return;
    }
    setTopics([]);
    setTopicId("");
    setSubTopicId("");
    schoolService
      .getSubjectCurriculum(subjectId, classroomId)
      .then((res) => {
        const raw = (res.data as any)?.data ?? (res.data as any)?.Data ?? {};
        const rawTopics: any[] = raw.Topics ?? raw.topics ?? [];
        const map: Record<string, { id: string; name: string; subTopics: Option[] }> = {};
        const list: Option[] = rawTopics
          .map((t: any) => {
            const id = String(t.Id ?? t.id ?? t.topicId ?? "");
            const subTopics = mapOptions(t.SubTopics ?? t.subTopics ?? []);
            if (id) map[id] = { id, name: String(t.Name ?? t.name ?? ""), subTopics };
            return { id, name: String(t.Name ?? t.name ?? "") };
          })
          .filter((t: Option) => t.id);
        setTopics(list);
        setCurriculumTopics(map);
      })
      .catch(() => toast.error("Failed to load topics."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, subjectId, classroomId]);

  // ── Roster map for name enrichment ───────────────────────────────────────
  useEffect(() => {
    if (!classroomId) {
      rosterMapRef.current = {};
      rosterTokenMapRef.current = {};
      return;
    }
    moduleService
      .getStudentsByClassroom(classroomId)
      .then(async (res) => {
        const payload = (res.data as any)?.data ?? [];
        const rows = Array.isArray(payload) ? payload : [];
        const map: Record<string, string> = {};
        for (const s of rows) {
          const key = String(s.id ?? s.userId ?? "");
          if (!key) continue;
          map[key] = [s.firstName, s.lastName].filter(Boolean).join(" ") || String(s.userName ?? key);
        }
        rosterMapRef.current = map;

        // Best-effort: resolve each student's attendance QR token to a name so
        // every scan confirms with the student's name instead of a raw id.
        const tokenMap: Record<string, string> = {};
        await Promise.allSettled(
          rows.map(async (s: any) => {
            const key = String(s.id ?? s.userId ?? "");
            const name = map[key];
            if (!key || !name) return;
            try {
              const { data } = await attendanceService.getQrToken(key);
              const token = readQrTokenFromResponse(data);
              if (token) tokenMap[String(token)] = name;
            } catch {
              // Offline or no permission — fall back to id-based lookup.
            }
          }),
        );
        rosterTokenMapRef.current = tokenMap;
      })
      .catch(() => {
        rosterMapRef.current = {};
        rosterTokenMapRef.current = {};
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  // ── Data reload ──────────────────────────────────────────────────────────
  const reloadData = useCallback(async () => {
    const scans = await getAllAttendanceScans();
    setTodayScans(scans);
    setPendingCount(await getUnsentAttendanceCount());
    if (activeSessionRef.current) {
      setRecords(await getAttendanceScansBySession(activeSessionRef.current.id));
    }
  }, []);

  // ── Session management ───────────────────────────────────────────────────
  const ensureSession = useCallback(async (): Promise<LocalAttendanceSession | null> => {
    const scopeKey = buildScopeKey({
      attendanceType: mode,
      classroomId,
      subjectId: mode !== AT.CLASS ? subjectId : undefined,
      subTopicId: mode === AT.SUBTOPIC ? subTopicId : undefined,
    });
    const dateKey = toDateKey();
    let session = await findOpenAttendanceSession(dateKey, scopeKey);
    if (!session) {
      session = {
        id: uuidv4(),
        attendanceType: mode,
        teacherId: teacherId || undefined,
        teacherName: teacherName || undefined,
        classroomId: classroomId || undefined,
        classroomName,
        subjectId: mode !== AT.CLASS ? subjectId : undefined,
        subjectName: mode !== AT.CLASS ? subjectName : undefined,
        subTopicId: mode === AT.SUBTOPIC ? subTopicId : undefined,
        subTopicName: mode === AT.SUBTOPIC ? subTopicName : undefined,
        dateKey,
        scopeKey,
        backendSessionId: null,
        status: "open",
        startedAt: isoNow(),
        endSyncRequested: false,
        createdAt: isoNow(),
      };
      await putAttendanceSession(session);
    }

    // Open the backend session now when online so scans land immediately.
    if (!session.backendSessionId && navigator.onLine) {
      try {
        const { data } = await attendanceService.startSession({
          attendanceType: session.attendanceType,
          classroomId: session.classroomId,
          subjectId: session.subjectId,
          subTopicId: session.subTopicId,
        });
        const d = (data as any)?.data ?? data ?? {};
        const backendId = String(d.id ?? d.sessionId ?? d.attendanceSessionId ?? "");
        if (backendId) {
          const updated = { ...session, backendSessionId: backendId };
          await updateAttendanceSession(session.id, { backendSessionId: backendId });
          session = updated;
        }
      } catch {
        // Offline — the sync engine will open it when the network returns.
      }
    }

    activeSessionRef.current = session;
    setActiveSession(session);
    setRecords(await getAttendanceScansBySession(session.id));
    return session;
  }, [mode, classroomId, subjectId, subTopicId, classroomName, subjectName, subTopicName, teacherId, teacherName]);

  // ── Scan handling ────────────────────────────────────────────────────────
  const scanStudent = useCallback(
    async ({ decodedText }: { decodedText: string }) => {
      const parsed = parseQrValue(decodedText);
      if (!parsed.ok) {
        setScanFeedback({ id: uuidv4(), tone: "error", message: parsed.reason });
        toast.error(parsed.reason);
        return;
      }
      const session = activeSessionRef.current ?? (await ensureSession());
      if (!session) {
        toast.error("Start a session by choosing a class / subtopic first.");
        return;
      }

      const dateKey = toDateKey();
      const dedupeKey = buildDedupeKey(dateKey, session.scopeKey, parsed.qrToken);
      const existing = await getAttendanceScanByDedupe(dedupeKey);
      if (existing) {
        const existingName = resolveName(existing.qrToken, existing.studentName);
        setScanFeedback({
          id: uuidv4(),
          tone: "info",
          message: existingName ? `${existingName} — already marked present` : "Already marked present",
        });
        toast(
          existingName ? `${existingName} — already marked present.` : "Already marked present.",
          { icon: "✋", id: dedupeKey },
        );
        return;
      }

      const studentName = resolveName(parsed.qrToken);
      const record: AttendanceScanRecord = {
        id: uuidv4(),
        sessionId: session.id,
        backendSessionId: session.backendSessionId,
        qrToken: parsed.qrToken,
        studentName,
        teacherId: teacherId || undefined,
        teacherName: teacherName || undefined,
        scannedAt: isoNow(),
        dateKey,
        scopeKey: session.scopeKey,
        dedupeKey,
        syncStatus: "pending",
        permanentlyFailed: false,
        attempts: 0,
      };

      await putAttendanceScan(record);
      setScanFeedback({
        id: uuidv4(),
        tone: "success",
        message: studentName ? `${studentName} marked present` : "Marked present",
      });
      toast.success(
        studentName ? `${studentName} marked present` : "Marked present ✔",
        { id: dedupeKey },
      );
      await reloadData();
    },
    [ensureSession, reloadData, resolveName, teacherId, teacherName],
  );

  // ── Sync engine wrapper ──────────────────────────────────────────────────
  const runSync = useCallback(async (opts?: { silent?: boolean }) => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setSyncing(true);
    try {
      const result = await flushAttendanceSync();
      await reloadData();
      if (result.synced > 0 || result.alreadyRecorded > 0) {
        setHistoryReloadKey((k) => k + 1);
      }
      if (!opts?.silent) {
        if (result.offline) {
          toast.error("You are offline — records saved and will sync automatically.");
        } else if (result.failed > 0) {
          toast.error(`Synced ${result.synced}, ${result.failed} still failing.`);
        } else if (result.synced > 0 || result.alreadyRecorded > 0) {
          const registered = result.synced + result.alreadyRecorded;
          toast.success(
            `Sync complete — ${registered} student${registered === 1 ? "" : "s"} registered.`,
            { duration: 4000 },
          );
        } else if (result.pending > 0) {
          toast.error(
            result.lastStartError
              ? `${result.pending} record${result.pending === 1 ? "" : "s"} waiting to sync — ${result.lastStartError}`
              : `${result.pending} record${result.pending === 1 ? "" : "s"} still waiting to sync — retrying automatically.`,
            { duration: 5000 },
          );
        } else {
          toast("Nothing to sync.");
        }
      }
    } catch {
      if (!opts?.silent) toast.error("Sync failed — retrying later automatically.");
    } finally {
      syncLockRef.current = false;
      setSyncing(false);
    }
  }, [reloadData]);

  // Manual escape hatch for records stuck as "failed" (e.g. from an expired
  // token during a previous sync, or any other error the auto-retry gave up
  // on) — puts them back in the queue and immediately retries, instead of
  // leaving the teacher with no way to push them again.
  const retryFailed = useCallback(async () => {
    await retryFailedAttendanceScans();
    await reloadData();
    void runSync({ silent: false });
  }, [reloadData, runSync]);

  // ── Online / offline ──────────────────────────────────────────────────────
  // Records are pushed only when the teacher presses “Push to backend”. The one
  // exception: scans captured offline are pushed automatically the moment the
  // network returns, so offline data is never stranded.
  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      void runSync({ silent: true });
    };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void reloadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Backend history: fetch recent attendance sessions ────────────────────
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    attendanceService
      .getSessions({ pageSize: 500 })
      .then((res) => {
        const d = (res.data as any)?.data ?? res.data ?? [];
        const rows = Array.isArray(d) ? d : [];
        if (!cancelled) setHistory(rows);
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(extractErrorMessage(err, "Failed to load attendance records."));
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyReloadKey]);

  // Date-range filtering is applied client-side (the sessions endpoint has no
  // date params), so the teacher can narrow the records to a period.
  const filteredHistory = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return history
      .filter((s) => {
        const t = new Date(s.startedAt).getTime();
        if (Number.isNaN(t)) return false;
        if (from != null && t < from) return false;
        if (to != null && t > to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [history, dateFrom, dateTo]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleStartScan = useCallback(async () => {
    if (mode === AT.CLASS && !classroomId) {
      toast.error("Choose a class before scanning.");
      return;
    }
    if (mode !== AT.CLASS && !subjectId) {
      toast.error("Choose a subject before scanning.");
      return;
    }
    if (mode === AT.SUBTOPIC && !subTopicId) {
      toast.error("Choose a subtopic before scanning.");
      return;
    }
    const session = await ensureSession();
    if (session) setScannerOpen(true);
  }, [mode, classroomId, subjectId, subTopicId, ensureSession]);

  const endSession = useCallback(async () => {
    const session = activeSessionRef.current;
    if (!session) return;
    await updateAttendanceSession(session.id, { status: "ended", endedAt: isoNow() });
    activeSessionRef.current = null;
    setActiveSession(null);
    toast.success("Session closed — records will sync when online.");
    void runSync({ silent: true });
  }, [runSync]);

  const handleCloseScanner = useCallback(() => setScannerOpen(false), []);

  // Remove a scanned student from the review list before it has been pushed.
  // Already-synced records are kept (removing them server-side needs a backend
  // delete, which the API doesn't expose).
  const removeScan = useCallback(
    async (record: AttendanceScanRecord) => {
      if (record.syncStatus === "sent") return;
      await deleteAttendanceScan(record.id);
      await reloadData();
      toast("Removed from the list.", { icon: "🗑" });
    },
    [reloadData],
  );

  // Toggle a session row and lazily fetch its present / absent students.
  const toggleSession = useCallback(
    async (sessionId: string) => {
      if (expandedSessionId === sessionId) {
        setExpandedSessionId(null);
        return;
      }
      setExpandedSessionId(sessionId);
      if (summaries[sessionId]) return;
      setSummaryLoadingId(sessionId);
      try {
        const { data } = await attendanceService.getSummary(sessionId);
        setSummaries((prev) => ({ ...prev, [sessionId]: (data as any)?.data ?? null }));
      } catch {
        toast.error("Failed to load session details.");
      } finally {
        setSummaryLoadingId(null);
      }
    },
    [expandedSessionId, summaries],
  );

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const unique = new Set(todayScans.map((r) => r.dedupeKey)).size;
    const synced = todayScans.filter((r) => r.syncStatus === "sent").length;
    const failed = todayScans.filter((r) => r.syncStatus === "failed").length;
    const queued = todayScans.filter(
      (r) => r.syncStatus !== "sent" && !(r.syncStatus === "failed" && r.permanentlyFailed),
    ).length;
    return { unique, synced, failed, queued: Math.max(pendingCount, queued) };
  }, [todayScans, pendingCount]);

  // Scans that are still waiting to sync and have a recorded reason — shown so a
  // stuck sync is never silent.
  const stuckPending = useMemo(
    () => todayScans.filter((r) => r.syncStatus !== "sent" && r.lastError),
    [todayScans],
  );

  const modeEligible =
    (mode === AT.CLASS && !!classroomId) ||
    (mode === AT.SUBJECT && !!classroomId && !!subjectId) ||
    (mode === AT.SUBTOPIC && !!classroomId && !!subjectId && !!subTopicId);

  return (
    <div className="font-poppins">
      <div className="border border-white/20 overflow-hidden bg-white/75 backdrop-blur-sm">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-30 bg-chestnut">
          <div className="flex items-center gap-2.5 min-w-0">
            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
            <ScanLine className="w-5 h-5 hidden lg:inline text-white" />
            <span className="text-white font-semibold text-sm truncate">Attendance</span>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
                <Wifi className="h-3.5 w-3.5" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950">
                <WifiOff className="h-3.5 w-3.5" /> Offline — will queue
              </span>
            )}
          </div>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-medium text-amber-800">
            <CloudOff className="h-4 w-4 shrink-0" />
            No network right now. Every scan is saved on this device and pushed
            automatically when the network returns — no data is lost.
          </div>
        )}

        <div className="flex gap-1.5 border-b border-slate-100 px-5 pt-3">
          <button
            type="button"
            onClick={() => setViewTab("scan")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors ${
              viewTab === "scan"
                ? "border-b-2 border-chestnut bg-chestnut/[0.06] text-chestnut"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ScanLine className="h-4 w-4" />
            Take attendance
          </button>
          <button
            type="button"
            onClick={() => setViewTab("records")}
            className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-sm font-semibold transition-colors ${
              viewTab === "records"
                ? "border-b-2 border-chestnut bg-chestnut/[0.06] text-chestnut"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <UserSearch className="h-4 w-4" />
            Student records
          </button>
        </div>

        {viewTab === "scan" ? (
          <div className="p-5 sm:p-6 space-y-5">
          {/* ── Mode selection ── */}
          <section>
            <h2 className="text-sm font-semibold text-[#12122A] mb-3">1 · Choose attendance type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODE_OPTIONS.filter((m) => allowedModes.includes(m.value)).map((m) => {
                const selected = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      setMode(m.value);
                      setSubjectId("");
                      setTopicId("");
                      setSubTopicId("");
                    }}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-chestnut/60 bg-chestnut/[0.06] ring-1 ring-chestnut/40"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#12122A]">{m.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Context pickers ── */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-[#12122A]">
                Select the {mode === AT.CLASS ? "class" : "class and lesson scope"} for this attendance
              </h3>
              {!isAdmin && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Only the classes assigned to you are listed here.
                </p>
              )}
            </div>

            {user && !isAdmin && !hasAssignedClasses ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No classes are assigned to your account yet.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Attendance can only be taken for classes assigned to you. Contact
                  an administrator if you think this is a mistake.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectField
                  label="Class"
                  value={classroomId}
                  onChange={(v) => {
                    setClassroomId(v);
                    setSubjectId("");
                    setTopicId("");
                    setSubTopicId("");
                  }}
                  options={classrooms}
                  placeholder={
                    classrooms.length
                      ? "Choose a class…"
                      : classroomsLoading
                        ? "Loading classes…"
                        : "No classes available"
                  }
                />
                {mode !== AT.CLASS && (
                  <SelectField
                    label="Subject"
                    value={subjectId}
                    onChange={(v) => {
                      setSubjectId(v);
                      setTopicId("");
                      setSubTopicId("");
                    }}
                    options={subjects}
                    placeholder="Choose a subject…"
                  />
                )}
                {mode === AT.SUBTOPIC && (
                  <>
                    <SelectField
                      label="Topic"
                      value={topicId}
                      onChange={(v) => {
                        setTopicId(v);
                        setSubTopicId("");
                      }}
                      options={topics}
                      placeholder="Choose a topic…"
                    />
                    <SelectField
                      label="Subtopic / Lesson"
                      value={subTopicId}
                      onChange={setSubTopicId}
                      options={subTopicOptions}
                      placeholder="Choose a subtopic…"
                    />
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!modeEligible}
                onClick={() => void handleStartScan()}
                className="inline-flex items-center gap-2 rounded-lg bg-chestnut px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Camera className="h-4 w-4" />
                Scan students
              </button>
              <button
                type="button"
                disabled={!activeSession}
                onClick={() => void endSession()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Square className="h-3.5 w-3.5" />
                End session
              </button>
              <button
                type="button"
                onClick={() => void runSync({ silent: false })}
                disabled={syncing || stats.queued === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing
                  ? "Pushing…"
                  : stats.queued > 0
                    ? `Push to backend (${stats.queued})`
                    : "Push to backend"}
              </button>
              {stats.failed > 0 && (
                <button
                  type="button"
                  onClick={() => void retryFailed()}
                  disabled={syncing}
                  title="Puts failed records back in the queue and pushes them again — use this after a re-login or once your connection is back."
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  Retry failed ({stats.failed})
                </button>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Scanned students are saved on this device. Review the names below, then press{" "}
              <span className="font-semibold text-emerald-700">“Push to backend”</span> to send them
              to the server.
            </p>

            {!modeEligible && (
              <p className="mt-3 text-xs text-slate-400">
                {mode === AT.CLASS
                  ? "Pick a class to begin."
                  : mode === AT.SUBJECT
                    ? "Pick a class and subject to begin."
                    : "Pick a class, subject, topic and subtopic to begin."}
              </p>
            )}
          </section>

          {/* ── Active session ── */}
          {activeSession && (
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-semibold text-[#12122A]">
                      Session in progress · {MODE_LABEL[activeSession.attendanceType]}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {activeSession.classroomName ?? activeSession.classroomId}
                    {activeSession.subjectName && ` · ${activeSession.subjectName}`}
                    {activeSession.subTopicName && ` · ${activeSession.subTopicName}`}
                    {activeSession.teacherName && ` · by ${activeSession.teacherName}`}
                    {activeSession.backendSessionId
                      ? " · connected to server"
                      : isOnline
                        ? " · connecting…"
                        : " · will push when online"}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  {records.length} scanned
                </span>
              </div>

              {records.length > 0 && (
                <div className="mt-4 max-h-64 overflow-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {records
                    .slice()
                    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {resolveName(r.qrToken, r.studentName) || "Unknown student"}
                            </p>
                            <p className="text-[11px] text-slate-400">{formatTime(r.scannedAt)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {r.syncStatus !== "sent" && (
                            <button
                              type="button"
                              onClick={() => void removeScan(r)}
                              title="Remove from list before pushing"
                              className="rounded-full p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SYNC_BADGE[r.syncStatus].className}`}
                          >
                            {SYNC_BADGE[r.syncStatus].label}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          {/* ── Summary ── */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Users className="h-4 w-4 text-[#4255db]" />}
              label="Marked today"
              value={stats.unique}
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              label="Synced"
              value={stats.synced}
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              label="Waiting to sync"
              value={stats.queued}
              highlight={stats.queued > 0}
            />
            <StatCard
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              label="Failed"
              value={stats.failed}
              highlight={stats.failed > 0}
            />
          </section>

          {/* ── Recent attendance records (from backend) ── */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#4255db]" />
                <h3 className="text-sm font-semibold text-[#12122A]">Recent attendance records</h3>
                <span className="text-[11px] text-slate-400">
                  {history.length} session{history.length === 1 ? "" : "s"}
                  {dateFrom || dateTo
                    ? ` · ${filteredHistory.length} in range`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryReloadKey((k) => k + 1)}
                disabled={historyLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block min-w-0">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-[#12122A] font-medium focus:outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-transparent"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-[#12122A] font-medium focus:outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-transparent"
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="self-end justify-self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:self-auto"
                >
                  Clear range
                </button>
              )}
            </div>

            {historyLoading && history.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-[#4255db]" />
                <p className="text-xs text-slate-500">Loading attendance records…</p>
              </div>
            ) : historyError && history.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs text-red-600/80">{historyError}</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <ClipboardList className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">No attendance records yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Records appear here after a session has been synced to the server.
                </p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                <CalendarDays className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">No records in this date range</p>
                <p className="mt-1 text-xs text-slate-400">
                  Try widening the “From” / “To” dates above.
                </p>
              </div>
            ) : (
              <div className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                {filteredHistory.map((s) => {
                    const expanded = expandedSessionId === s.id;
                    const summary = summaries[s.id];
                    const isClosed = s.status === "ended" || s.status === "closed";
                    const label = sessionLabel(s);
                    return (
                      <div key={s.id}>
                        <button
                          type="button"
                          onClick={() => void toggleSession(s.id)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50"
                        >
                          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {label || "Attendance session"}
                            </p>
                            <p className="text-[11px] text-slate-400">{formatDateTime(s.startedAt)}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isClosed ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isClosed ? "Closed" : s.status === "open" ? "Open" : s.status}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-slate-600">
                            {s.presentCount ?? 0} present
                          </span>
                        </button>
                        {expanded && (
                          <div className="border-t border-slate-50 bg-slate-50/60 px-3 py-3">
                            {summaryLoadingId === s.id ? (
                              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
                              </div>
                            ) : summary ? (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                    {summary.presentCount ?? 0} present
                                  </span>
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                                    {summary.absentCount ?? 0} absent
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                    {summary.rosterCount ?? 0} on roster
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                                      Present
                                    </p>
                                    {summary.present && summary.present.length > 0 ? (
                                      <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                                        {summary.present.map((p) => (
                                          <p key={p.studentId} className="truncate text-xs font-medium text-slate-700">
                                            {p.studentName}
                                          </p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400">None recorded</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                                      Absent
                                    </p>
                                    {summary.absent && summary.absent.length > 0 ? (
                                      <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                                        {summary.absent.map((p) => (
                                          <p key={p.studentId} className="truncate text-xs font-medium text-slate-500">
                                            {p.studentName}
                                          </p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400">None</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="py-3 text-center text-xs text-slate-400">
                                No details available for this session.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {stuckPending.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <CloudOff className="h-4 w-4" />
                Some records are waiting to sync
              </div>
              <p className="mt-1 text-xs text-amber-700/90">
                {stuckPending.length} record{stuckPending.length === 1 ? "" : "s"} could not reach
                the server yet. {stuckPending[0].lastError} Press “Push to backend” above to retry
                — they are kept safely on this device.
              </p>
            </section>
          )}

          {stats.failed > 0 && (
            <section className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Some records failed to sync
              </div>
              <p className="mt-1 text-xs text-red-600/80">
                Failed records are kept on this device and are never deleted. Press “Retry
                failed” above to put them back in the queue and push them again — useful after a
                spotty connection or a re-login.
              </p>
            </section>
          )}
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            <StudentRecords
              classrooms={classrooms}
              classroomsLoading={classroomsLoading}
              roleId={user?.roleId}
              initialClassroomId={classroomId}
              initialSubjectId={mode !== AT.CLASS ? subjectId : undefined}
            />
          </div>
        )}
      </div>

      <QrScannerModal
        open={scannerOpen}
        onClose={handleCloseScanner}
        onDetected={scanStudent}
        scanFeedback={scanFeedback}
      />
    </div>
  );
};

// ── Small presentational helpers ─────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-[#12122A] font-medium focus:outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-transparent disabled:opacity-50"
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 ${
        highlight ? "ring-1 ring-amber-300" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">{icon}</div>
      <p className="text-2xl font-bold text-[#12122A] leading-none">{value}</p>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return "";
  }
}

/** Builds a human label for a backend session (type · class · subject · subtopic). */
function sessionLabel(s: any): string {
  const parts: string[] = [];
  if (s.attendanceType != null && MODE_LABEL[s.attendanceType as AttendanceType]) {
    parts.push(MODE_LABEL[s.attendanceType as AttendanceType]);
  }
  for (const key of ["classroomName", "subjectName", "subTopicName"]) {
    if (s[key]) parts.push(String(s[key]));
  }
  return parts.join(" · ");
}

export default TeacherAttendance;

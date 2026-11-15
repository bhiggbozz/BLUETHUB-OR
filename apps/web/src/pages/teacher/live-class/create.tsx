import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  File as FileIcon,
  Loader2,
  RefreshCw,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button, Input, Label } from "@bluethub/ui-kit";
import {
  liveClassService,
  type ScheduleLiveClassRequest,
  type ScheduleMediaFilePayload,
} from "@/services/live-class";
import {
  lessonService,
  resolveMediaType,
  type CloudinarySignature,
  type SupabaseUploadToken,
  type LessonMediaTypeValue,
} from "@/services/lesson";
import { schoolService } from "@/services/school";
import { moduleService, type ModuleStudent } from "@/services/module";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { runConcurrent, uploadToCloudinary, uploadToSupabase } from "@/utils/media-upload-helpers";
import { getErrorMessage } from "@/utils/errors";

const MAX_STUDENTS = 3;
const MIN_DURATION = 5;
const MAX_DURATION = 40;
const DEFAULT_DURATION = 40;
const UPLOAD_CONCURRENCY = 2;

interface SelectItem {
  id: string;
  label: string;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

interface UploadFile {
  uid: string;
  file: File;
  status: UploadStatus;
  progress: number;
  result?: ScheduleMediaFilePayload;
  error?: string;
}

/** `datetime-local` has no timezone of its own — its value is read as
 * whatever the browser's local time is. `/schedule` (unlike this app's
 * other live-class endpoints, which read a bare value as school time/WAT)
 * wants that same wall-clock moment stated explicitly with its UTC offset,
 * so the backend doesn't have to guess which "local" was meant. */
const toOffsetIso = (localDatetimeValue: string): string => {
  const [datePart, timePart] = localDatetimeValue.split("T");
  const withSeconds = timePart.length === 5 ? `${timePart}:00` : timePart;
  const offsetMinutes = -new Date(localDatetimeValue).getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${datePart}T${withSeconds}${sign}${hh}:${mm}`;
};

const toLocalDatetimeMin = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const inputCls =
  "h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-chestnut/20 bg-white disabled:bg-gray-50 disabled:text-gray-400";

const CreateLiveClass = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // ── Classroom → Subject → Topic → Subtopic ──────────────────────────────
  const [classrooms, setClassrooms] = useState<SelectItem[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [subjects, setSubjects] = useState<SelectItem[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [topics, setTopics] = useState<SelectItem[]>([]);
  const [topicsData, setTopicsData] = useState<any[]>([]);
  const [topicId, setTopicId] = useState("");
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [subTopics, setSubTopics] = useState<SelectItem[]>([]);
  const [subTopicId, setSubTopicId] = useState("");
  const [subTopicValue, setSubTopicValue] = useState("");

  // ── Lesson content ───────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [aim, setAim] = useState("");
  const [description, setDescription] = useState("");
  const [quizCode, setQuizCode] = useState("");

  // ── Media ────────────────────────────────────────────────────────────────
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);

  // ── Students ─────────────────────────────────────────────────────────────
  const [classStudents, setClassStudents] = useState<ModuleStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // ── Scheduling ───────────────────────────────────────────────────────────
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load the teacher's own classrooms (from roleData — no extra call) ───
  useEffect(() => {
    const roleData = user?.roleData;
    if (roleData && isTeacherRoleData(roleData)) {
      setClassrooms(roleData.classrooms.map((c) => ({ id: c.classroomId, label: c.className || "Classroom" })));
    }
  }, [user?.roleData]);

  // ── Subjects + students for the picked classroom ────────────────────────
  useEffect(() => {
    setSubjectId(""); setTopicId(""); setSubTopicId(""); setSubTopicValue("");
    setSubjects([]); setTopics([]); setSubTopics([]);
    setSelectedStudentIds(new Set());
    if (!classroomId) { setClassStudents([]); return; }

    const roleData = user?.roleData;
    if (user?.roleName === "HeadTeacher") {
      setLoadingSubjects(true);
      schoolService.getSubjectsByClassroomId(classroomId)
        .then((res) => {
          const data = (res.data as any)?.data;
          const all = [...(data?.majorSubjects ?? []), ...(data?.minorSubjects ?? [])];
          setSubjects(all.map((r: any) => ({
            id: String(r.subjectId ?? r.id),
            label: String(r.subjectName ?? r.name ?? r.subject ?? ""),
          })));
        })
        .catch(() => toast.error("Could not load subjects"))
        .finally(() => setLoadingSubjects(false));
    } else if (roleData && isTeacherRoleData(roleData)) {
      const classroom = roleData.classrooms.find((c) => c.classroomId === classroomId);
      setSubjects((classroom?.subjects ?? []).map((s) => ({ id: s.subjectId, label: s.subjectName })));
    }

    setStudentsLoading(true);
    moduleService.getStudentsByClassroom(classroomId)
      .then((res) => {
        const rows = (res.data as any)?.data ?? [];
        setClassStudents((Array.isArray(rows) ? rows : []).filter((s: ModuleStudent) => s.id && s.isActive !== false));
      })
      .catch(() => { setClassStudents([]); toast.error("Could not load students for this class"); })
      .finally(() => setStudentsLoading(false));
  }, [classroomId, user?.roleData, user?.roleName]);

  // ── Topics for the picked subject ───────────────────────────────────────
  useEffect(() => {
    setTopicId(""); setSubTopicId(""); setSubTopicValue("");
    setTopics([]); setTopicsData([]); setSubTopics([]);
    if (!subjectId || !classroomId) return;

    setLoadingTopics(true);
    schoolService.getSubjectCurriculum(subjectId, classroomId)
      .then((res) => {
        const raw = (res.data as any)?.data ?? {};
        const topicRows: any[] = raw.Topics ?? raw.topics ?? [];
        setTopicsData(topicRows);
        setTopics(topicRows.map((t: any) => ({
          id: String(t.Id ?? t.id ?? t.topicId),
          label: String(t.Name ?? t.name ?? t.topicName ?? ""),
        })));
      })
      .catch(() => toast.error("Could not load topics"))
      .finally(() => setLoadingTopics(false));
  }, [subjectId, classroomId]);

  // ── Subtopics derived from the picked topic ─────────────────────────────
  useEffect(() => {
    setSubTopicId(""); setSubTopicValue("");
    if (!topicId) { setSubTopics([]); return; }
    const matched = topicsData.find((t: any) => String(t.Id ?? t.id ?? t.topicId) === topicId);
    setSubTopics((matched?.SubTopics ?? matched?.subTopics ?? []).map((s: any) => ({
      id: String(s.Id ?? s.id ?? s.subTopicId),
      label: String(s.Name ?? s.name ?? ""),
    })));
  }, [topicId, topicsData]);

  // ── Media upload ─────────────────────────────────────────────────────────
  const runUpload = useCallback(
    async (uid: string, file: File, sig: CloudinarySignature | SupabaseUploadToken) => {
      setUploadFiles((p) => p.map((f) => (f.uid === uid ? { ...f, status: "uploading" } : f)));
      try {
        const isPdf = file.type === "application/pdf";
        let result: ScheduleMediaFilePayload;
        if (isPdf && "uploadUrl" in sig) {
          const res = await uploadToSupabase(file, sig, (pct) =>
            setUploadFiles((p) => p.map((f) => (f.uid === uid ? { ...f, progress: pct } : f)))
          );
          result = {
            fileName: file.name,
            originalFileName: file.name,
            fileExtension: "pdf",
            cloudinaryUrl: res.publicUrl,
            publicId: res.bucketPath,
            fileSizeBytes: file.size,
            displayOrder: 0,
            metaData: "",
          };
        } else {
          const res = await uploadToCloudinary(file, sig as CloudinarySignature, (pct) =>
            setUploadFiles((p) => p.map((f) => (f.uid === uid ? { ...f, progress: pct } : f)))
          );
          const ext = res.format || file.name.split(".").pop() || "";
          result = {
            fileName: `${res.original_filename}.${ext}`,
            originalFileName: file.name,
            fileExtension: ext,
            cloudinaryUrl: res.secure_url,
            publicId: res.public_id,
            fileSizeBytes: res.bytes,
            displayOrder: 0,
            metaData: "",
            ...(res.duration != null ? { duration: Math.round(res.duration) } : {}),
          };
        }
        setUploadFiles((p) => p.map((f) => (f.uid === uid ? { ...f, status: "done", progress: 100, result } : f)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadFiles((p) => p.map((f) => (f.uid === uid ? { ...f, status: "error", error: msg, progress: 0 } : f)));
      }
    },
    []
  );

  const handleFilesPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const incoming: UploadFile[] = Array.from(fileList).map((file) => ({
      uid: uuidv4(), file, status: "idle", progress: 0,
    }));
    setUploadFiles((p) => [...p, ...incoming]);
    e.target.value = "";

    const hasOthers = Array.from(fileList).some((f) => f.type !== "application/pdf");
    let cloudinarySig: CloudinarySignature | null = null;
    if (hasOthers) {
      try {
        const firstOther = Array.from(fileList).find((f) => f.type !== "application/pdf");
        const r = await lessonService.getUploadSignature(
          resolveMediaType(firstOther?.type ?? "video/mp4") as LessonMediaTypeValue
        );
        cloudinarySig = (r.data as any).data as CloudinarySignature;
      } catch {
        const uids = new Set(incoming.filter((f) => f.file.type !== "application/pdf").map((f) => f.uid));
        setUploadFiles((p) => p.map((f) => (uids.has(f.uid) ? { ...f, status: "error", error: "Could not get upload credentials" } : f)));
        toast.error("Could not get upload credentials");
      }
    }

    await runConcurrent(incoming, UPLOAD_CONCURRENCY, async ({ uid, file }) => {
      const isPdf = file.type === "application/pdf";
      if (!isPdf) {
        if (!cloudinarySig) {
          // Without this, a falsy signature (fetch resolved but came back
          // empty, rather than throwing) left the file silently stuck in
          // "idle" forever — no error, no retry button — which blocked the
          // submit button with no way for the user to tell why.
          setUploadFiles((p) =>
            p.map((f) => (f.uid === uid ? { ...f, status: "error", error: "Could not get upload credentials" } : f))
          );
          return;
        }
        return runUpload(uid, file, cloudinarySig);
      }
      try {
        const r = await lessonService.getSupabaseUploadToken(file.name || "live-class-material");
        const sig = ((r.data as any).data ?? r.data) as SupabaseUploadToken;
        return runUpload(uid, file, sig);
      } catch {
        setUploadFiles((p) => p.map((f) => (f.uid === uid ? { ...f, status: "error", error: "Could not get upload credentials" } : f)));
      }
    });
  };

  const handleRetry = async (uid: string) => {
    const entry = uploadFiles.find((f) => f.uid === uid);
    if (!entry) return;
    const isPdf = entry.file.type === "application/pdf";
    try {
      if (isPdf) {
        const r = await lessonService.getSupabaseUploadToken("live-class-material");
        await runUpload(uid, entry.file, (r.data as any).data as SupabaseUploadToken);
      } else {
        const r = await lessonService.getUploadSignature(resolveMediaType(entry.file.type) as LessonMediaTypeValue);
        await runUpload(uid, entry.file, (r.data as any).data as CloudinarySignature);
      }
    } catch {
      toast.error("Could not get upload credentials");
    }
  };

  const handleRemoveFile = (uid: string) => setUploadFiles((p) => p.filter((f) => f.uid !== uid));

  const buildMediaPayload = (): ScheduleMediaFilePayload[] =>
    uploadFiles
      .filter((f) => f.status === "done" && f.result)
      .map((f, idx) => ({ ...f.result!, displayOrder: idx + 1 }));

  // ── Students ─────────────────────────────────────────────────────────────
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_STUDENTS) {
        next.add(id);
      } else {
        toast.error(`A live class can have at most ${MAX_STUDENTS} students.`);
      }
      return next;
    });
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const hasUploadErrors = uploadFiles.some((f) => f.status === "error");
  const hasPendingUploads = uploadFiles.some((f) => f.status === "uploading" || f.status === "idle");
  const formValid =
    !!classroomId && !!subjectId && !!topicId && subTopicValue.trim().length > 0 &&
    aim.trim().length > 0 && description.trim().length > 0 &&
    selectedStudentIds.size > 0 && !!scheduledStart;
  const canSubmit = formValid && !hasUploadErrors && !hasPendingUploads && !submitting;

  const handleSubmit = async () => {
    if (!formValid) {
      setError("Fill in the class details, pick at least one student, and choose a start time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: ScheduleLiveClassRequest = {
        classroomId, subjectId, topicId, subTopicId,
        aim: aim.trim(),
        description: description.trim(),
        title: title.trim() || undefined,
        studentIds: Array.from(selectedStudentIds),
        scheduledStart: toOffsetIso(scheduledStart),
        durationMinutes,
        mediaFiles: buildMediaPayload(),
        quizCode: quizCode.trim() || null,
      };
      await liveClassService.schedule(payload);
      toast.success("Live class scheduled.");
      navigate("/teacher/live-class");
    } catch (err) {
      setError(getErrorMessage(err, "Could not schedule the live class."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-3 font-poppins">
      <button
        onClick={() => navigate("/teacher/live-class")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chestnut/10">
            <Video size={22} className="text-chestnut" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Schedule a live class</h1>
            <p className="text-sm text-gray-500">Pick a class, write what it's about, then set the time.</p>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Classroom</Label>
              <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className={inputCls}>
                <option value="">Choose a classroom...</option>
                {classrooms.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Subject</Label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!classroomId || loadingSubjects}
                className={inputCls}
              >
                <option value="">{loadingSubjects ? "Loading..." : "Choose a subject..."}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Topic</Label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!subjectId || loadingTopics}
                className={inputCls}
              >
                <option value="">{loadingTopics ? "Loading..." : "Choose a topic..."}</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Subtopic</Label>
              <select
                value={subTopicId}
                onChange={(e) => {
                  setSubTopicId(e.target.value);
                  setSubTopicValue(subTopics.find((s) => s.id === e.target.value)?.label ?? "");
                }}
                disabled={!topicId}
                className={inputCls}
              >
                <option value="">Choose a subtopic...</option>
                {subTopics.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Title (optional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={aim || "Defaults to the aim"} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Aim</Label>
            <Input value={aim} onChange={(e) => setAim(e.target.value)} placeholder="What should students take away?" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="What will you cover in this session?"
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-chestnut/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Quiz code (optional)</Label>
            <Input
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              placeholder="e.g. QZ-AB12CD — from Generate Quiz"
            />
            <p className="text-[10px] text-gray-400">
              Attach a quiz you created. Students can't answer it in class yet.
            </p>
          </div>

          {/* Media */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-700">Supporting media (optional)</Label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-4 text-sm text-gray-500 hover:border-chestnut/40 hover:text-chestnut">
              <Upload className="size-4" /> Add files
              <input type="file" multiple className="hidden" onChange={handleFilesPicked} />
            </label>
            {uploadFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadFiles.map((f) => (
                  <div key={f.uid} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs">
                    <FileIcon className="size-3.5 shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate text-gray-700">{f.file.name}</span>
                    {f.status === "uploading" && <span className="text-gray-400">{f.progress}%</span>}
                    {f.status === "done" && <Check className="size-3.5 text-emerald-500" />}
                    {f.status === "error" && (
                      <button onClick={() => handleRetry(f.uid)} className="flex items-center gap-1 text-red-500 hover:underline">
                        <RefreshCw className="size-3 shrink-0" /> Retry
                      </button>
                    )}
                    <button onClick={() => handleRemoveFile(f.uid)} className="text-gray-400 hover:text-red-500">
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <CalendarIcon className="size-3.5" /> Starts at
              </Label>
              <Input
                type="datetime-local"
                value={scheduledStart}
                min={toLocalDatetimeMin()}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Length (minutes)</Label>
              <Input
                type="number"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Math.min(MAX_DURATION, Math.max(MIN_DURATION, Number(e.target.value) || DEFAULT_DURATION)))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-700">Students</Label>
              <span className={`text-[11px] font-semibold ${selectedStudentIds.size >= MAX_STUDENTS ? "text-amber-600" : "text-gray-400"}`}>
                {selectedStudentIds.size}/{MAX_STUDENTS} selected
              </span>
            </div>
            <div className="rounded-xl border border-gray-100 max-h-56 overflow-y-auto divide-y divide-gray-50">
              {!classroomId ? (
                <p className="py-8 text-center text-xs text-gray-400">Choose a classroom above first.</p>
              ) : studentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                  <Loader2 className="size-4 animate-spin" /> <span className="text-xs">Loading students...</span>
                </div>
              ) : classStudents.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-400">No active students found in this class.</p>
              ) : (
                classStudents.map((s) => {
                  const checked = selectedStudentIds.has(s.id);
                  const capped = !checked && selectedStudentIds.size >= MAX_STUDENTS;
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${capped ? "opacity-40 cursor-not-allowed" : "hover:bg-chestnut/5"}`}
                    >
                      <div
                        onClick={() => !capped && toggleStudent(s.id)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${checked ? "bg-chestnut border-chestnut" : "border-gray-300"}`}
                      >
                        {checked && <Check className="size-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1" onClick={() => !capped && toggleStudent(s.id)}>
                        <p className="truncate text-sm font-medium text-gray-700">{s.firstName} {s.lastName}</p>
                        <p className="truncate text-[11px] text-gray-400">{s.userName}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            Only the students you pick here can join. To change students, quiz, or media after scheduling, cancel and
            schedule again.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 bg-chestnut text-white hover:bg-chestnut/90"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            {submitting ? "Scheduling..." : "Schedule live class"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateLiveClass;

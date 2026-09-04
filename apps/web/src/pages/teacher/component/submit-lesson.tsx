import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import {
  Check,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Loader2,
  Upload,
  X,
  FileVideo,
  FileAudio,
  FileImage,
  File as FileIcon,
  RefreshCw,
  Info,
  Save,
  RotateCcw,
  BookOpen,
  Layers,
  FolderOpen,
  Clock,
  Timer,
  Menu,
  Sparkles,
  CalendarIcon,
} from "lucide-react";
import {
  Button,
  Label,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Calendar,
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@bluethub/ui-kit";
import { cn } from "@/lib/utils";
import {
  lessonService,
  resolveMediaType,
  type CloudinarySignature,
  type SupabaseUploadToken,
  type MediaFilePayload,
  type DraftLessonPayload,
  type SubmitLessonPayload,
} from "@/services/lesson";
import { schoolService } from "@/services/school";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { localData } from "@/utils";
import toast from "react-hot-toast";
import {
  imageGenerationService,
  AI_IMAGE_FEATURE_KEY,
  type GeneratedLessonImage,
  type GenerationStatusResponse,
} from "@/services/image-generation";

// ── Constants ────────────────────────────────────────────────────────────────

const UPLOAD_CONCURRENCY = 2;

interface SubjectItem {
  subjectId: string;
  subjectName: string;
  classroomId: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadStatus = "idle" | "uploading" | "done" | "error";

interface UploadFile {
  uid: string;
  file?: File;
  displayName: string;
  displaySize: number;
  displayMimeType: string;
  status: UploadStatus;
  progress: number;
  result?: MediaFilePayload;
  error?: string;
}


interface DraftFile {
  uid: string;
  name: string;
  size: number;
  mimeType: string;
  result: MediaFilePayload;
}

interface LessonDraft {
  savedAt: string;
  classroomId: string;
  classroomLabel: string;
  subjectId: string;
  subjectLabel: string;
  topicId: string;
  topicLabel: string;
  subTopicId: string;
  subTopicValue: string;
  aim: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: string;
  uploadedFiles: DraftFile[];
}

const draftKey = (userId: string) => `lesson_draft_${userId}`;

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateInput(value: string): string {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const extractLabel = (item: object | undefined): string => {
  if (!item) return "";
  const value = item as Record<string, unknown>;
  return String(
    value.name ?? value.subjectName ?? value.subject ?? value.className ??
    value.topicName ?? value.subTopicName ?? value.title ?? ""
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("video/"))
    return <FileVideo className="w-5 h-5 text-violet-500" />;
  if (mimeType.startsWith("audio/"))
    return <FileAudio className="w-5 h-5 text-blue-500" />;
  if (mimeType.startsWith("image/"))
    return <FileImage className="w-5 h-5 text-emerald-500" />;
  if (mimeType === "application/pdf")
    return <FileIcon className="w-5 h-5 text-red-400" />;
  return <FileIcon className="w-5 h-5 text-gray-400" />;
}

async function runConcurrent<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift()!;
        await fn(item).catch(() => { });
      }
    }
  );
  await Promise.all(workers);
}

function uploadToCloudinary(
  file: File,
  sig: CloudinarySignature,
  onProgress: (pct: number) => void
): Promise<{
  public_id: string;
  secure_url: string;
  bytes: number;
  duration?: number;
  format: string;
  original_filename: string;
}> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    if (sig.uploadPreset) fd.append("upload_preset", sig.uploadPreset);
    if (sig.resourceType) fd.append("resource_type", sig.resourceType);

    const uploadUrl = sig.resourceType
      ? `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`
      : `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        onProgress(100);
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.open("POST", uploadUrl);
    xhr.send(fd);
  });
}



// ── Upload to Supabase (for PDFs) ────────────────────────────────────────
function uploadToSupabase(
  file: File,
  token: SupabaseUploadToken,
  onProgress: (pct: number) => void
): Promise<{
  publicUrl: string;
  bucketPath: string;
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        if (!token.publicUrl) {
          reject(new Error("Supabase upload succeeded but no public URL was returned"));
          return;
        }
        resolve({
          publicUrl: token.publicUrl,
          bucketPath: token.bucketPath,
        });
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.open("POST", token.uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${token.token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}

// ── FieldSelect Component ────────────────────────────────────────────────────

// ── Generic item shape ─────────────────────────────────────
export interface SelectItem {
  id: string;
  label: string;
}

// ── Adapter — converts any shape to SelectItem ─────────────
export function toSelectItems(items: any[], idKey: string, labelKey: string): SelectItem[] {
  return items.map(i => ({ id: i[idKey], label: i[labelKey] }));
}

// ── Single reusable component ──────────────────────────────
interface FieldSelectProps {
  label: string;
  placeholder: string;
  value: string;
  items: SelectItem[];
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
  emptyMessage?: string;
  icon?: React.ReactNode;
  onChange: (id: string, label: string) => void;
}

export function FieldSelect({
  label, placeholder, value, items, loading, disabled, required,
  emptyMessage = "No options available", icon, onChange,
}: FieldSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = items.find(i => i.id === value);
  const isDisabled = disabled || loading;

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          {icon}{label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <DropdownMenu onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between rounded-xl text-sm transition-all h-12 px-4 border-2",
              selected ? "border-blue-200 text-gray-900 bg-blue-50/50" : "border-gray-200 text-gray-400 bg-white",
              "hover:border-blue-300 hover:bg-blue-50/30 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400",
              isDisabled && "opacity-50 cursor-not-allowed pointer-events-none bg-gray-50"
            )}
          >
            <span className={cn("truncate text-left", selected ? "text-gray-900 font-medium" : "text-gray-400")}>
              {loading ? "Loading…" : selected?.label ?? placeholder}
            </span>
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
              : <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200", open && "rotate-180")} />
            }
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-(--radix-dropdown-menu-trigger-width) rounded-xl border border-gray-200 shadow-xl bg-white p-1.5 max-h-64 overflow-y-auto z-50"
          align="start" sideOffset={4}
        >
          <DropdownMenuGroup>
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-400">{emptyMessage}</div>
            ) : items.map(item => (
              <DropdownMenuItem
                key={item.id}
                className={cn(
                  "rounded-lg py-3 px-3 text-sm cursor-pointer transition-colors",
                  value === item.id ? "bg-blue-600 text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                )}
                onClick={() => onChange(item.id, item.label)}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{item.label}</span>
                  {value === item.id && <Check className="w-4 h-4 shrink-0" />}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── FileRow Component ────────────────────────────────────────────────────────

interface FileRowProps {
  entry: UploadFile;
  index: number;
  onRemove: (uid: string) => void;
  onRetry: (uid: string) => void;
  onDragStart: (e: DragEvent<HTMLDivElement>, idx: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, idx: number) => void;
  onDrop: (e: DragEvent<HTMLDivElement>, idx: number) => void;
  isDragTarget: boolean;
}

function FileRow({ entry, index, onRemove, onRetry, onDragStart, onDragOver, onDrop, isDragTarget }: FileRowProps) {
  const { uid, displayName, displaySize, displayMimeType, status, progress, error } = entry;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={cn(
        "group flex items-center gap-3 rounded-xl border-2 bg-white p-3 transition-all select-none",
        isDragTarget && "border-blue-400 bg-blue-50 scale-[1.01] shadow-lg",
        !isDragTarget && status === "error" && "border-red-200 bg-red-50/50",
        !isDragTarget && status === "done" && "border-green-200 bg-green-50/30",
        !isDragTarget && status !== "error" && status !== "done" && "border-gray-200 hover:border-gray-300"
      )}
    >
      <GripVertical className="hidden md:block w-4 h-4 text-gray-300 group-hover:text-gray-400 cursor-grab shrink-0" />

      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
        status === "done" ? "bg-green-100" : status === "error" ? "bg-red-100" : "bg-gray-100"
      )}>
        {getFileIcon(displayMimeType)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
          <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
            {formatBytes(displaySize)}
          </span>
        </div>
        {status === "error" ? (
          <p className="text-xs text-red-600 truncate">{error}</p>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  status === "done" ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-12 text-right shrink-0">
              {status === "done" ? "Done" : status === "idle" ? "Queued" : `${progress}%`}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-1">
        {status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        {status === "idle" && <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />}
        {status === "done" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {status === "error" && (
          <button
            onClick={() => onRetry(uid)}
            title="Retry"
            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-red-500" />
          </button>
        )}
      </div>

      <button
        onClick={() => onRemove(uid)}
        disabled={status === "uploading"}
        title="Remove"
        className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
}

// ── SetQuestionsModal Component ──────────────────────────────────────────────

interface SetQuestionsModalProps {
  open: boolean;
  subjectLabel?: string | null;
  classroomLabel?: string | null;
  onSkip: () => void;
  onConfirm: (quizId: string) => void;
  onDismiss: () => void;
  isSubmitting: boolean;
}

function SetQuestionsModal({
  open, subjectLabel, classroomLabel, onSkip, onConfirm, onDismiss, isSubmitting,
}: SetQuestionsModalProps) {
  const [quizId, setQuizId] = useState("");
  const safeSubjectLabel = (subjectLabel ?? "").trim();
  const safeClassroomLabel = (classroomLabel ?? "").trim();

  useEffect(() => {
    if (!open) return;
    // console.log("[SetQuestionsModal] open", {
    //   subjectLabel,
    //   classroomLabel,
    //   safeSubjectLabel,
    //   safeClassroomLabel,
    // });
  }, [open, subjectLabel, classroomLabel, safeSubjectLabel, safeClassroomLabel]);

  if (!open) return null;

  const abbr = safeSubjectLabel
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold text-white">Set Questions</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                {abbr || "CL"}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Current Class</p>
                <p className="text-sm font-semibold text-gray-900">{safeSubjectLabel || "—"}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg">
              {safeClassroomLabel || "—"}
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Add a Quiz?
            </h3>
            <p className="text-sm text-gray-500">
              Attach a quiz for students to complete after the lesson
            </p>
          </div>

          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full text-sm text-gray-500 hover:text-blue-600 font-medium mb-6 transition-colors disabled:opacity-50"
          >
            Skip — submit without a quiz
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && quizId.trim() && onConfirm(quizId.trim())}
              placeholder="Enter quiz ID"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
            />
            <button
              type="button"
              onClick={() => quizId.trim() && onConfirm(quizId.trim())}
              disabled={!quizId.trim() || isSubmitting}
              className={cn(
                "px-6 py-3 rounded-xl text-sm font-semibold transition-all",
                quizId.trim() && !isSubmitting
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const SubmitLesson = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const isAdminRole = user?.roleName === "Administrator" || user?.roleName === "SuperAdministrator" || user?.roleName === "HeadTeacher";
  const DEBUG_SUBMIT_LESSON = true;

  const debugLog = useCallback((label: string, payload?: unknown) => {
    if (!DEBUG_SUBMIT_LESSON) return;
    const ts = new Date().toISOString();
    if (payload !== undefined) {
      console.log(`[SubmitLesson][${ts}] ${label}`, payload);
      return;
    }
    console.log(`[SubmitLesson][${ts}] ${label}`);
  }, [DEBUG_SUBMIT_LESSON]);

  // ── Data State ──
  const [classrooms, setClassrooms] = useState<SelectItem[]>([]);
  const [subjects, setSubjects] = useState<SelectItem[]>([]);
  const [roleDataClassrooms, setRoleDataClassrooms] = useState<any[]>([]);
  const [topics, setTopics] = useState<SelectItem[]>([]);
  const [subTopics, setSubTopics] = useState<SelectItem[]>([]);
  const [topicsData, setTopicsData] = useState<any[]>([]);

  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingSubTopics] = useState(false);

  // ── Form State ──
  const [classroomId, setClassroomId] = useState("");
  const [classroomLabel, setClassroomLabel] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjectLabel, setSubjectLabel] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topicLabel, setTopicLabel] = useState("");
  const [subTopicValue, setSubTopicValue] = useState("");
  const [subTopicId, setSubTopicId] = useState("");
  const [aim, setAim] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [fetchedSubjects, setFetchedSubjects] = useState<SubjectItem[]>([]);

  // ── Upload State ──
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── AI Material Request State ──
  const [aiFeatureEnabled, setAiFeatureEnabled] = useState<boolean | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [shouldGenerateImage, setShouldGenerateImage] = useState(true);
  const [imageMaterialWords, setImageMaterialWords] = useState("");
  const [imageCount, setImageCount] = useState(1);

  // ── Post-submit generation tracking ──
  const [submittedLesson, setSubmittedLesson] = useState<{
    lessonId: string;
    status: string;
  } | null>(null);
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [genImages, setGenImages] = useState<GeneratedLessonImage[]>([]);
  const [genImagesLoading, setGenImagesLoading] = useState(false);



  const dragItemIdx = useRef<number | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);

  // ── Draft State ──
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<LessonDraft | null>(null);
  const draftRestored = useRef(false);

  // ── Submission State ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [serverDraftSaved, setServerDraftSaved] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [attachedQuizId, setAttachedQuizId] = useState<string | null>(null);
  // const [loading, setLoading] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);


  // fetch class teacher subject
  useEffect(() => {
    if (!user?.id) return;
    const roleData = user?.roleData;
    const htClassrooms = roleData && isTeacherRoleData(roleData) ? roleData.classrooms : [];
    const classroomIds = htClassrooms.map((c) => c.classroomId).filter(Boolean);
    if (classroomIds.length === 0) return;
    // setLoading(true)
    setIsLoadingSubjects(true)
    Promise.all(
      classroomIds.map((id) =>
        schoolService.getSubjectsByClassroomId(id)
          .then((res) => {
            const data = (res.data as any)?.data;
            return [
              ...(data?.majorSubjects ?? []),
              ...(data?.minorSubjects ?? []),
            ].map((s: any) => ({
              subjectId: String(s.id ?? s.subjectId ?? ""),
              subjectName: String(s.subject ?? s.subjectName ?? s.name ?? ""),
              classroomId: id,
            }));
          })
          .catch(() => [] as SubjectItem[])
          .finally(() => {
            // setLoading(false);
            setIsLoadingSubjects(false);
          })
      )
    ).then((results) => {
      const seen = new Set<string>();
      const all: SubjectItem[] = [];

      for (const batch of results) {
        for (const item of batch) {
          if (!item.subjectId || !item.subjectName) {
            continue;
          }
          if (seen.has(item.subjectId)) continue;
          seen.add(item.subjectId);
          all.push(item);
        }
      }
      setFetchedSubjects(all);
    });
  }, [user?.id, user?.roleData, classroomId]);

  // ── Draft Logic ──
  useEffect(() => {
    if (!user?.id || draftRestored.current) return;
    const saved = localData.retrieve<LessonDraft>(draftKey(user.id));
    if (saved && (saved.aim || saved.classroomId || saved.uploadedFiles?.length > 0)) {
      setPendingDraft(saved);
    }
  }, [user?.id]);

  const completedCount = uploadFiles.filter((f) => f.status === "done").length;

  useEffect(() => {
    if (!user?.id || !draftRestored.current) return;
    if (!classroomId && !aim && !description && completedCount === 0) return;

    const draft: LessonDraft = {
      savedAt: new Date().toISOString(),
      classroomId, classroomLabel,
      subjectId, subjectLabel,
      topicId, topicLabel,
      subTopicId, subTopicValue, aim, description,
      scheduledDate, scheduledTime, durationMinutes,
      uploadedFiles: uploadFiles
        .filter((f) => f.status === "done" && f.result)
        .map((f) => ({
          uid: f.uid,
          name: f.displayName,
          size: f.displaySize,
          mimeType: f.displayMimeType,
          result: f.result!,
        })),
    };

    localData.save(draftKey(user.id), draft);
    setDraftTimestamp(draft.savedAt);
  }, [classroomId, subjectId, topicId, subTopicId, subTopicValue, aim, description, scheduledDate, scheduledTime, durationMinutes, completedCount]);

  const restoreDraft = (draft: LessonDraft) => {
    setClassroomId(draft.classroomId ?? "");
    setClassroomLabel(draft.classroomLabel ?? "");
    setSubjectId(draft.subjectId ?? "");
    setSubjectLabel(draft.subjectLabel ?? "");
    setTopicId(draft.topicId ?? "");
    setTopicLabel(draft.topicLabel ?? "");
    setSubTopicId(draft.subTopicId ?? "");
    setSubTopicValue(draft.subTopicValue ?? "");
    setAim(draft.aim ?? "");
    setDescription(draft.description ?? "");
    setScheduledDate(normalizeDateInput(draft.scheduledDate ?? ""));
    setScheduledTime(draft.scheduledTime ?? "");
    setDurationMinutes(draft.durationMinutes ?? "");

    if (draft.uploadedFiles.length > 0) {
      const restored: UploadFile[] = draft.uploadedFiles.map((f) => ({
        uid: f.uid,
        displayName: f.name,
        displaySize: f.size,
        displayMimeType: f.mimeType,
        status: "done" as const,
        progress: 100,
        result: f.result,
      }));
      setUploadFiles(restored);
    }

    setDraftTimestamp(draft.savedAt);
    setPendingDraft(null);
    draftRestored.current = true;
    toast.success("Draft restored");
  };

  const discardDraft = () => {
    if (user?.id) localData.remove(draftKey(user.id));
    setPendingDraft(null);
    setDraftTimestamp(null);
    draftRestored.current = true;
  };

  useEffect(() => {
    if (!user?.id) return;
    const saved = localData.retrieve<LessonDraft>(draftKey(user.id));
    if (!saved) draftRestored.current = true;
  }, [user?.id]);

  // ── Data Fetching ──
  useEffect(() => {
    if (!user?.id) return;

    const fetchUserData = async () => {
      try {
        if (user?.roleName === "Administrator" || user?.roleName === "SuperAdministrator") {
          const classroomsRes = await schoolService.getAllClassRooms();
          const raw: Record<string, unknown>[] =
            (classroomsRes.data as any)?.data?.classrooms ?? (classroomsRes.data as any)?.data ?? [];
          setClassrooms(raw.map((r) => ({ id: String(r.id), label: extractLabel(r) })));
          setLoadingClassrooms(false);
          return;
        }

        // Use roleData already loaded by AuthContext — no extra API call needed
        const roleData = user.roleData;

        if (roleData && isTeacherRoleData(roleData)) {
          const classroomsData = roleData.classrooms;

          if (classroomsData.length > 0) {
            setRoleDataClassrooms(classroomsData);
            setClassrooms(
              classroomsData.map((c, index) => ({
                id: c.classroomId,
                label: c.className || `Classroom ${index + 1}`,
              }))
            );
          } else {
            setClassrooms([]);
          }
        } else {
          setClassrooms([]);
        }
        setLoadingClassrooms(false);
      } catch {
        toast.error("Could not load user data");
        setLoadingClassrooms(false);
      }
    };

    fetchUserData();
  }, [user?.id, user?.roleData, isAdminRole]);

  useEffect(() => {
    if (!classroomId) return;
    setSubjectId(""); setSubjectLabel("");
    setTopicId(""); setTopicLabel("");
    setSubTopicId(""); setSubTopicValue("");
    setSubjects([]); setTopics([]); setSubTopics([]);

    if (user?.roleName === "Administrator" || user?.roleName === "SuperAdministrator" || user?.roleName === "HeadTeacher") {
      setLoadingSubjects(true);
      schoolService.getSubjectsByClassroomId(classroomId)
        .then((res) => {
          const data = (res.data as any)?.data;
          const major: any[] = data?.majorSubjects ?? [];
          const minor: any[] = data?.minorSubjects ?? [];
          const all = [...major, ...minor];
          setSubjects(all.map((r: any) => ({
            id: String(r.subjectId ?? r.id),
            label: String(r.subjectName ?? r.name ?? r.subject ?? ""),
          })));
        })
        .catch(() => toast.error("Could not load subjects"))
        .finally(() => setLoadingSubjects(false));
      return;
    }

    if (roleDataClassrooms.length > 0) {
      const selectedClass = roleDataClassrooms.find(
        (c: any) => String(c.classroomId) === classroomId
      );
      const subjectsData = selectedClass?.subjects;
      if (subjectsData && Array.isArray(subjectsData) && subjectsData.length > 0) {
        setSubjects(subjectsData.map((s: any) => ({ id: String(s.subjectId), label: s.subjectName })));
        return;
      }
    }

    setSubjects([]);
  }, [classroomId, roleDataClassrooms, isAdminRole]);

  useEffect(() => {
    if (!subjectId) return;
    setTopicId(""); setTopicLabel("");
    setSubTopicValue("");
    setTopics([]); setSubTopics([]); setTopicsData([]);
    setLoadingTopics(true);

    schoolService.getSubjectCurriculum(subjectId, classroomId)
      .then((res) => {
        const raw = (res.data as any)?.data ?? (res.data as any)?.Data ?? {};
        // Support both PascalCase (curriculum API) and camelCase
        const topics: any[] = raw.Topics ?? raw.topics ?? [];
        setTopicsData(topics);
        setTopics(topics.map((t: any) => ({
          id: String(t.Id ?? t.id ?? t.topicId),
          label: String(t.Name ?? t.name ?? t.topicName ?? ""),
        })));
      })
      .catch(() => { setTopics([]); toast.error("Could not load topics"); })
      .finally(() => setLoadingTopics(false));
  }, [subjectId, classroomId]);

  useEffect(() => {
    if (!topicId) { setSubTopics([]); return; }
    setSubTopicId("");
    setSubTopicValue("");
    const matched = topicsData.find(
      (t: any) => String(t.Id ?? t.id ?? t.topicId) === topicId
    );
    const subs: SelectItem[] = (matched?.SubTopics ?? matched?.subTopics ?? []).map((s: any) => ({
      id: String(s.Id ?? s.id ?? s.subTopicId),
      label: String(s.Name ?? s.name ?? ""),
    }));
    setSubTopics(subs);
  }, [topicId, topicsData]);

  // ── AI Image Feature Gate ──
  useEffect(() => {
    if (!user?.id) return;
    if (aiFeatureEnabled !== null) return;
    setAiChecking(true);
    imageGenerationService
      .checkFeature(AI_IMAGE_FEATURE_KEY)
      .then((res) => setAiFeatureEnabled(res.data?.data?.isEnabled ?? false))
      .catch(() => setAiFeatureEnabled(false))
      .finally(() => setAiChecking(false));
  }, [user?.id, aiFeatureEnabled]);

  // ── Upload Logic ──
  const runUpload = useCallback(async (uid: string, file: File, sig: CloudinarySignature | SupabaseUploadToken | null) => {
    setUploadFiles((p) => p.map((f) => f.uid === uid ? { ...f, status: "uploading" } : f));
    try {
      const isPdf = file.type === "application/pdf";
      let result: MediaFilePayload;

      if (isPdf && sig && 'uploadUrl' in sig) {
        // Upload PDF to Supabase
        const res = await uploadToSupabase(file, sig as SupabaseUploadToken, (pct) =>
          setUploadFiles((p) => p.map((f) => f.uid === uid ? { ...f, progress: pct } : f))
        );
        // console.log("[SubmitLesson] supabase upload result", res);
        result = {
          fileName: file.name,
          originalFileName: file.name,
          fileExtension: "pdf",
          mediaType: resolveMediaType(file.type),
          cloudinaryUrl: res.publicUrl,   // Supabase public URL → stored in CloudinaryUrl field
          publicId: res.bucketPath,        // Supabase bucket path → stored in PublicId field
          fileSizeBytes: file.size,
          displayOrder: 0,
        };
      } else {
        // Upload to Cloudinary (audio, video, image, documents)
        const res = await uploadToCloudinary(file, sig as CloudinarySignature, (pct) =>
          setUploadFiles((p) => p.map((f) => f.uid === uid ? { ...f, progress: pct } : f))
        );
        const ext = res.format || file.name.split(".").pop() || "";
        result = {
          fileName: `${res.original_filename}.${ext}`,
          originalFileName: file.name,
          fileExtension: ext,
          mediaType: resolveMediaType(file.type),
          cloudinaryUrl: res.secure_url,
          publicId: res.public_id,
          fileSizeBytes: res.bytes,
          displayOrder: 0,
          ...(res.duration != null ? { duration: Math.round(res.duration) } : {}),
        };
      }

      setUploadFiles((p) =>
        p.map((f) => f.uid === uid ? { ...f, status: "done", progress: 100, result } : f)
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadFiles((p) =>
        p.map((f) => f.uid === uid ? { ...f, status: "error", error: msg, progress: 0 } : f)
      );
    }
  }, []);

  const processFiles = useCallback(async (fileList: FileList) => {
    const incoming: UploadFile[] = Array.from(fileList).map((file) => ({
      uid: uuidv4(),
      file,
      displayName: file.name,
      displaySize: file.size,
      displayMimeType: file.type,
      status: "idle" as const,
      progress: 0,
    }));


    setUploadFiles((p) => [...p, ...incoming]);

    // Cloudinary signatures are general-purpose (no destination baked in) and
    // safe to share across every non-PDF file in this batch. Supabase tokens
    // are the opposite — uploadUrl/bucketPath point at one specific object,
    // so each PDF must fetch its own token or concurrent uploads would all
    // land on the same path and silently overwrite each other.
    const hasOthers = Array.from(fileList).some(f => f.type !== "application/pdf");

    let cloudinarySig: CloudinarySignature | null = null;

    try {
      if (hasOthers) {
        const firstOther = Array.from(fileList).find(f => f.type !== "application/pdf");
        const r = await lessonService.getUploadSignature(resolveMediaType(firstOther?.type ?? "video/mp4") as import("@/services/lesson").LessonMediaTypeValue);
        cloudinarySig = (r.data as any).data as CloudinarySignature;
      }
    } catch {
      const uids = new Set(incoming.filter((f) => f.file?.type !== "application/pdf").map((f) => f.uid));
      setUploadFiles((p) =>
        p.map((f) => uids.has(f.uid) ? { ...f, status: "error", error: "Could not get upload credentials" } : f)
      );
      toast.error("Could not get upload credentials");
    }

    await runConcurrent(incoming, UPLOAD_CONCURRENCY, async ({ uid, file }) => {
      const isPdf = file!.type === "application/pdf";
      if (!isPdf) {
        if (!cloudinarySig) return;
        return runUpload(uid, file!, cloudinarySig);
      }
      try {
        const r = await lessonService.getSupabaseUploadToken(file!.name || "lesson-material");
        // Support both TResponse<T> wrapper ({ data: {...} }) and bare response
        const sig = ((r.data as any).data ?? r.data) as SupabaseUploadToken;
        return runUpload(uid, file!, sig);
      } catch {
        setUploadFiles((p) =>
          p.map((f) => f.uid === uid ? { ...f, status: "error", error: "Could not get upload credentials" } : f)
        );
      }
    });
  }, [runUpload]);

  const handleRetry = useCallback(async (uid: string) => {
    const entry = uploadFiles.find((f) => f.uid === uid);
    if (!entry?.file) return;
    const isPdf = entry.file.type === "application/pdf";
    let sig: CloudinarySignature | SupabaseUploadToken | null = null;
    try {
      if (isPdf) {
        const r = await lessonService.getSupabaseUploadToken("lesson-material");
        sig = (r.data as any).data as SupabaseUploadToken;
      } else {
        const r = await lessonService.getUploadSignature(resolveMediaType(entry.file.type) as import("@/services/lesson").LessonMediaTypeValue);
        sig = (r.data as any).data as CloudinarySignature;
      }
    } catch {
      toast.error("Could not get upload credentials");
      return;
    }
    await runUpload(uid, entry.file, sig);
  }, [uploadFiles, runUpload]);

  const handleRemove = useCallback((uid: string) =>
    setUploadFiles((p) => p.filter((f) => f.uid !== uid)), []);

  // ── Drag & Drop ──
  const handleDZDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDZDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false);
  };
  const handleDZDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDraggingOver(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleRowDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    dragItemIdx.current = idx; e.dataTransfer.effectAllowed = "move";
  };
  const handleRowDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragTargetIdx(idx);
  };
  const handleRowDrop = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault(); setDragTargetIdx(null);
    if (dragItemIdx.current === null || dragItemIdx.current === idx) return;
    setUploadFiles((p) => {
      const arr = [...p];
      const [moved] = arr.splice(dragItemIdx.current!, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    dragItemIdx.current = null;
  };

  // ── Validation ──
  const allUploaded = uploadFiles.length > 0 && uploadFiles.every((f) => f.status === "done");
  const isUploading = uploadFiles.some((f) => f.status === "uploading" || f.status === "idle");
  const busy = isSubmitting || isSavingDraft;

  const formValid = !!classroomId && !!subjectId && !!topicId && subTopicValue.trim().length > 0 &&
    aim.trim().length > 0 && description.trim().length > 0;

  // Save Draft: requires form completion only (media is optional)
  const canSaveDraft = formValid && !busy;

  const hasUploadErrors = uploadFiles.some((f) => f.status === "error");
  const hasPendingUploads = uploadFiles.some((f) => f.status === "uploading" || f.status === "idle");

  // Submit: requires form completion, and no active/failed upload states
  // (media remains optional)
  const canSubmit = formValid && !hasUploadErrors && !hasPendingUploads && !busy;

  useEffect(() => {
    debugLog("Date state changed", {
      scheduledDate,
      localMinDate: toLocalDateInputValue(new Date()),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    });
  }, [scheduledDate, debugLog]);

  useEffect(() => {
    debugLog("Submit gate state", {
      formValid,
      hasUploadErrors,
      hasPendingUploads,
      busy,
      canSubmit,
      showQuizModal,
      uploadFiles: uploadFiles.map((f) => ({ uid: f.uid, status: f.status })),
    });
  }, [formValid, hasUploadErrors, hasPendingUploads, busy, canSubmit, showQuizModal, uploadFiles, debugLog]);

  const step1Done = !!classroomId && !!subjectId && !!topicId && subTopicValue.trim().length > 0;
  const step2Done = aim.trim().length > 0 && description.trim().length > 0;
  const step3Done = allUploaded;

  // scheduledDate is stored as a full ISO datetime (Calendar's onSelect uses
  // date.toISOString()), so strip any existing time before appending our own
  // — otherwise this produces "...T00:00:00.000ZT00:00:00", which .NET's
  // DateTime parser rejects.
  const buildAccessDate = (): string | null =>
    scheduledDate ? `${normalizeDateInput(scheduledDate)}T00:00:00` : null;

  const buildAccessTime = (): string | null =>
    scheduledTime ? `${scheduledTime}:00` : null;

  const buildMediaPayload = (): MediaFilePayload[] =>
    uploadFiles
      .filter((f) => f.status === "done" && f.result)
      .map((f, idx) => ({ ...f.result!, displayOrder: idx + 1 }));

  // ── AI Material Request ──
  // The request ships with POST api/lessons/submit (shouldGenerateImage /
  // imageMaterialWords / imageCount). Generation runs async on the backend
  // (immediately for auto-published lessons, after approval otherwise) and the
  // teacher tracks progress via the status/images endpoints.
  const aiRequestValid =
    imageMaterialWords.trim().length <= 2000 &&
    imageCount >= 1 && imageCount <= 5;

  const setImageCountSafe = (value: number) => {
    setImageCount(Math.min(5, Math.max(1, value)));
  };

  const handleLoadStatus = async (lessonId: string) => {
    setGenStatus(null);
    try {
      const res = await imageGenerationService.getStatus(lessonId);
      const data = res.data?.data as GenerationStatusResponse | undefined;
      setGenStatus(data?.status ?? null);
      return data?.status ?? null;
    } catch {
      return null;
    }
  };

  const handleLoadImages = async (lessonId: string) => {
    setGenImagesLoading(true);
    try {
      const res = await imageGenerationService.getImages(lessonId);
      setGenImages(res.data?.data?.images ?? []);
    } catch {
      // Ignore — user can refresh the status screen
    } finally {
      setGenImagesLoading(false);
    }
  };

  // Poll generation status while the success screen is open and generation
  // is still in flight (pending/queued/processing). Polling stops once the
  // status resolves or after a short budget for approval-pending lessons,
  // since generation won't start until an approver acts.
  useEffect(() => {
    if (!submittedLesson?.lessonId) return;
    const lessonId = submittedLesson.lessonId;
    const awaitingApproval = submittedLesson.status === "PendingApproval";
    const maxPolls = awaitingApproval ? 8 : 120;
    let polls = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;
      const status = await handleLoadStatus(lessonId);
      if (stopped) return;
      if (status === "Completed" || status === "Failed") {
        if (status === "Completed") await handleLoadImages(lessonId);
        return;
      }
      polls += 1;
      if (polls >= maxPolls) return;
      timer = setTimeout(tick, 5000);
    };

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [submittedLesson?.lessonId]);

  // ── Submission ──
  const handleSaveDraft = async () => {
    if (!canSaveDraft) return;
    setIsSavingDraft(true);
    setServerDraftSaved(false);

    const mediaFiles = buildMediaPayload();
    const payload: DraftLessonPayload = {
      classroomId, subjectId, topicId,
      subTopicId,
      subTopic: subTopicValue.trim(),
      aim: aim.trim(),
      description: description.trim(),
      accessDate: buildAccessDate(),
      accessTime: buildAccessTime(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      ...(mediaFiles.length > 0 ? { mediaFiles } : {}),
    };
    try {
      await lessonService.saveDraft(payload);
      setServerDraftSaved(true);
      setDraftTimestamp(new Date().toISOString());
      toast.success("Draft saved to server");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { responseMessage?: string } }; message?: string };
      toast.error(e?.response?.data?.responseMessage ?? e?.message ?? "Could not save draft");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = () => {
    debugLog("Submit clicked", {
      canSubmit,
      formValid,
      hasPendingUploads,
      hasUploadErrors,
      busy,
      showQuizModal,
    });

    if (!canSubmit) {
      if (!formValid) {
        debugLog("Submit blocked: form invalid");
        toast.error("Fill all required fields first");
        return;
      }
      if (hasPendingUploads) {
        debugLog("Submit blocked: uploads pending");
        toast.error("Please wait for uploads to complete");
        return;
      }
      if (hasUploadErrors) {
        debugLog("Submit blocked: upload errors");
        toast.error("Fix or remove failed uploads before submitting");
        return;
      }
      debugLog("Submit blocked: unknown gate state");
      return;
    }
    debugLog("Opening quiz modal");
    // If a quiz code was already attached, submit directly without re-opening the modal
    if (attachedQuizId !== null) {
      void handleConfirmSubmit(attachedQuizId);
      return;
    }
    setShowQuizModal(true);
  };

  const handleConfirmSubmit = async (quizId: string | null) => {
    debugLog("Confirm submit", { quizId });
    setShowQuizModal(false);
    setIsSubmitting(true);
    try {
      const mediaFiles = buildMediaPayload();

      // Guard: reject before hitting the API if any file is missing required URL fields
      const invalidFile = mediaFiles.find(f => !f.cloudinaryUrl || !f.publicId);
      if (invalidFile) {
        toast.error(`File "${invalidFile.fileName}" is missing upload URL. Please re-upload and try again.`);
        setIsSubmitting(false);
        return;
      }

      const payload: SubmitLessonPayload = {
        classroomId, subjectId, topicId,
        subTopicId,
        subTopic: subTopicValue.trim(),
        aim: aim.trim(),
        description: description.trim(),
        mediaFiles,
        accessDate: buildAccessDate(),
        accessTime: buildAccessTime(),
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        quizId,
        // AI material generation request — only sent when the feature is
        // enabled for the school so existing behavior is unchanged otherwise.
        ...(aiFeatureEnabled === true
          ? {
            shouldGenerateImage,
            imageMaterialWords: imageMaterialWords.trim() ? imageMaterialWords.trim() : null,
            imageCount,
          }
          : {}),
      };

      // console.log("[SubmitLesson] submitting payload", JSON.stringify(payload, null, 2));
      const res = await lessonService.submitLesson(payload);
      const resData = (res.data as any)?.data as {
        lessonId?: string;
        status?: string;
      } | undefined;
      if (user?.id) localData.remove(draftKey(user.id));
      debugLog("Lesson submitted successfully");
      const lessonId = resData?.lessonId;
      const lessonStatus = resData?.status ?? "PendingApproval";
      if (lessonId && aiFeatureEnabled === true && shouldGenerateImage) {
        // Show status tracking screen for the requested AI materials.
        setSubmittedLesson({
          lessonId,
          status: lessonStatus,
        });
        void handleLoadStatus(lessonId);
        if (lessonStatus !== "PendingApproval") void handleLoadImages(lessonId);
        return;
      }
      toast.success(lessonStatus === "Approved" ? "Lesson published" : "Lesson submitted for approval");
      navigate("/teacher/my-lessons", { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { responseMessage?: string } }; message?: string };
      debugLog("Lesson submit failed", {
        responseMessage: e?.response?.data?.responseMessage,
        message: e?.message,
      });
      toast.error(e?.response?.data?.responseMessage ?? e?.message ?? "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseStatus = () => {
    setSubmittedLesson(null);
    setGenStatus(null);
    setGenImages([]);
    navigate("/teacher/my-lessons", { replace: true });
  };

  // ── Render ──
  return (

    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <button
                  className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Menu className="lg:hidden  w-5 h-5 text-gray-600" onClick={openMobileNav} />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Submit Lesson</h1>
                  {(classroomLabel || subjectLabel) && (
                    <p className="text-xs text-gray-500 hidden sm:block">
                      {[classroomLabel, subjectLabel].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {draftTimestamp && (
                  <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                    <Save className="w-3 h-3" />
                    {serverDraftSaved ? "Saved" : "Auto-saved"} {relativeTime(draftTimestamp)}
                  </span>
                )}
                {isAdminRole && (
                  <span className="hidden md:flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                    <Info className="w-3 h-3" />
                    Admin View
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Draft Restore Banner */}
        {pendingDraft && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Unsaved draft found</p>
                    <p className="text-xs text-amber-700">
                      Saved {relativeTime(pendingDraft.savedAt)}
                      {pendingDraft.uploadedFiles.length > 0 && ` • ${pendingDraft.uploadedFiles.length} files`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={discardDraft}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => restoreDraft(pendingDraft)}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                  >
                    Restore
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-3xl mx-auto px-2 sm:px-6 lg:px-8 py-6 pb-32 sm:pb-8">
          <div className="space-y-6">
            {/* Step 1: Class & Topic */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    step1Done ? "bg-green-500 text-white" : "bg-blue-500 text-white"
                  )}>
                    {step1Done ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-gray-900">Class & Topic</h2>
                    <p className="text-xs text-gray-500">Select the class and topic for this lesson</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldSelect
                    label="Classroom"
                    placeholder="Select classroom"
                    value={classroomId}
                    items={classrooms}
                    loading={loadingClassrooms}
                    required
                    onChange={(id, label) => { setClassroomId(id); setClassroomLabel(label); draftRestored.current = true; }}
                  />
                  <FieldSelect
                    label="Subject"
                    placeholder={classroomId ? "Select subject" : "Select classroom first"}
                    value={subjectId}
                    items={
                      subjects.length > 0
                        ? subjects // already { id, label } shape
                        : fetchedSubjects.map(s => ({ id: s.subjectId, label: s.subjectName }))
                    }
                    loading={loadingSubjects || isLoadingSubjects}
                    disabled={!classroomId}
                    required
                    onChange={(id, label) => { setSubjectId(id); setSubjectLabel(label); }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldSelect
                    label="Topic"
                    placeholder={subjectId ? "Select topic" : "Select subject first"}
                    value={topicId}
                    items={topics}
                    loading={loadingTopics}
                    disabled={!subjectId}
                    required
                    onChange={(id, label) => { setTopicId(id); setTopicLabel(label); }}
                  />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Sub-Topic <span className="text-red-500">*</span>
                    </Label>
                    {subTopics.length > 0 ? (
                      <FieldSelect
                        label=""
                        placeholder="Select sub-topic"
                        value={subTopicId}
                        items={subTopics}
                        loading={loadingSubTopics}
                        disabled={!topicId}
                        onChange={(id, label) => { setSubTopicId(id); setSubTopicValue(label); }}
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={subTopicValue}
                          onChange={(e) => setSubTopicValue(e.target.value)}
                          placeholder={loadingSubTopics ? "Loading…" : topicId ? "Type sub-topic" : "Select topic first"}
                          disabled={!topicId || loadingSubTopics}
                          className={cn(
                            "w-full h-12 rounded-xl border-2 px-4 text-sm text-gray-900",
                            "border-gray-200 placeholder:text-gray-400",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all",
                            (!topicId || loadingSubTopics) && "opacity-50 cursor-not-allowed bg-gray-50"
                          )}
                        />
                        {loadingSubTopics && (
                          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {topicLabel && (
                  <p className="text-xs text-gray-500 flex items-center gap-2 pt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {[classroomLabel, subjectLabel, topicLabel].filter(Boolean).join(" → ")}
                  </p>
                )}
              </div>
            </section>

            {/* Schedule & Duration */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="lg:px-5 py-4 px-4 bg-gradient-to-r from-sky-50 to-cyan-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-sky-500 text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-gray-900">Schedule & Duration</h2>
                    <p className="text-xs text-gray-500">Optional — set when and how long the class runs</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Class Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between rounded-xl text-sm h-12 px-4 border-2 transition-all"
                        >
                          <span className="truncate">
                            {scheduledDate ? new Date(scheduledDate).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }) : "Select date"}
                          </span>
                          <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate ? new Date(scheduledDate) : undefined}
                          onSelect={(date) => setScheduledDate(date?.toISOString() ?? "")}
                          initialFocus
                          captionLayout="dropdown"
                          fromYear={2020}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Start Time
                    </Label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      disabled={!scheduledDate}
                      className={cn(
                        "w-full h-12 rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all bg-white",
                        !scheduledDate && "opacity-50 cursor-not-allowed bg-gray-50"
                      )}
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-gray-400" />
                      Duration (minutes)
                    </Label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || (Number(v) > 0 && Number(v) <= 480)) setDurationMinutes(v);
                      }}
                      placeholder="e.g. 60"
                      min={1}
                      max={480}
                      className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
                    />
                  </div>
                </div>

                {scheduledDate && scheduledTime && (
                  <p className="mt-3 text-xs text-sky-600 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Scheduled for{" "}
                    {new Date(`${normalizeDateInput(scheduledDate)}T${scheduledTime}`).toLocaleString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                    {durationMinutes && ` · ${durationMinutes} min`}
                  </p>
                )}
              </div>
            </section>

            {/* Step 2: Lesson Content */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    step2Done ? "bg-green-500 text-white" : "bg-purple-500 text-white"
                  )}>
                    {step2Done ? <Check className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-gray-900">Lesson Content</h2>
                    <p className="text-xs text-gray-500">Describe the lesson objectives and content</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Aim & Objectives <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    rows={3}
                    value={aim}
                    onChange={(e) => setAim(e.target.value)}
                    placeholder="e.g. Students will understand the role of photosynthesis in plant nutrition…"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Lesson Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a detailed overview of lesson content, activities, and expected outcomes…"
                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Step 3: Media Files */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      step3Done ? "bg-green-500 text-white" : "bg-emerald-500 text-white"
                    )}>
                      {step3Done ? <Check className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm text-gray-900">Media Files</h2>
                      <p className="text-xs text-gray-500">Upload lesson materials</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline text-xs text-gray-400">
                    Drag to reorder
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Drop Zone */}
                <div
                  onDragOver={handleDZDragOver}
                  onDragLeave={handleDZDragLeave}
                  onDrop={handleDZDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-all",
                    isDraggingOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="video/*,audio/*,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        processFiles(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                    isDraggingOver ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-600"
                  )}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">
                      {isDraggingOver ? "Drop files here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Video, Audio, Images, PDF, Documents
                    </p>
                  </div>
                </div>

                {/* File List */}
                {uploadFiles.length > 0 && (
                  <div
                    className="space-y-2"
                    onDragEnd={() => { dragItemIdx.current = null; setDragTargetIdx(null); }}
                  >
                    {uploadFiles.map((entry, idx) => (
                      <FileRow
                        key={entry.uid}
                        entry={entry}
                        index={idx}
                        onRemove={handleRemove}
                        onRetry={handleRetry}
                        onDragStart={handleRowDragStart}
                        onDragOver={handleRowDragOver}
                        onDrop={handleRowDrop}
                        isDragTarget={dragTargetIdx === idx}
                      />
                    ))}
                  </div>
                )}

                {/* Status Banner */}
                {uploadFiles.length > 0 && (
                  <div className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm",
                    allUploaded && "bg-green-50 text-green-700 border border-green-200",
                    isUploading && "bg-blue-50 text-blue-700 border border-blue-200",
                    !allUploaded && !isUploading && "bg-amber-50 text-amber-700 border border-amber-200"
                  )}>
                    {allUploaded && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                    {isUploading && <Loader2 className="w-5 h-5 shrink-0 animate-spin" />}
                    {!allUploaded && !isUploading && <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span className="font-medium">
                      {allUploaded && `${uploadFiles.length} file${uploadFiles.length > 1 ? "s" : ""} ready`}
                      {isUploading && "Uploading files..."}
                      {!allUploaded && !isUploading && "Some files failed. Retry or remove them."}
                    </span>
                  </div>
                )}

                {/* AI Material Request */}
                <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50/40 p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      aiChecking ? "bg-gray-100 text-gray-400" : "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                    )}>
                      {aiChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Learning Materials</h3>
                      <p className="text-xs text-gray-500">Pick what the system should create to help your students learn the topic with confidence</p>
                    </div>
                  </div>

                  {aiFeatureEnabled === false && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Automatic material generation is not enabled for your school. Ask your administrator to enable it.
                    </p>
                  )}

                  {aiFeatureEnabled === null && aiChecking && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking availability…
                    </p>
                  )}

                  {/* Material type selection — always visible */}
                  <div className={cn(
                    "grid grid-cols-2 gap-2",
                    aiFeatureEnabled === false && "opacity-50 pointer-events-none select-none"
                  )}>
                    <button
                      type="button"
                      onClick={() => setShouldGenerateImage((prev) => !prev)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                        shouldGenerateImage
                          ? "border-violet-400 bg-violet-50/60 ring-1 ring-violet-500/20"
                          : "border-gray-200 bg-white hover:border-violet-300"
                      )}
                    >
                      <span className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                        shouldGenerateImage ? "bg-violet-600 border-violet-600" : "border-gray-300 bg-white"
                      )}>
                        {shouldGenerateImage && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900">Images</span>
                        <span className="block text-[11px] text-gray-500 truncate">Diagrams & illustrations</span>
                      </span>
                    </button>

                    <div
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 p-3 text-left select-none",
                        "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      )}
                      role="button"
                      aria-disabled="true"
                      title="Video materials are not available yet"
                    >
                      <span className="w-5 h-5 rounded-md border-2 border-gray-300 bg-gray-100 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-500">Videos</span>
                        <span className="block text-[11px] text-gray-400 truncate">
                          Coming soon <span className="text-gray-500">•</span> <span className="text-amber-500 font-medium">Not available</span>
                        </span>
                      </span>
                    </div>
                  </div>

                  {shouldGenerateImage && (
                    <div className={cn(
                      "space-y-4",
                      aiFeatureEnabled === false && "opacity-50 pointer-events-none select-none"
                    )}>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">
                          Describe the specific materials you want <span className="text-gray-400">(optional)</span>
                        </Label>
                        <textarea
                          rows={3}
                          value={imageMaterialWords}
                          onChange={(e) => setImageMaterialWords(e.target.value.slice(0, 2000))}
                          placeholder="e.g. A labelled diagram of the water cycle, a cross-section of a plant leaf, and a 3D illustration of the solar system…"
                          className="w-full rounded-xl border-2 border-violet-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                        />
                        <p className={cn(
                          "text-[11px] text-right",
                          imageMaterialWords.length > 2000 ? "text-red-500" : "text-gray-400"
                        )}>
                          {imageMaterialWords.length}/2000
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Number of images</Label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setImageCountSafe(imageCount - 1)}
                              disabled={imageCount <= 1}
                              className="w-8 h-8 rounded-lg border-2 border-violet-200 bg-white text-violet-600 font-bold hover:bg-violet-50 disabled:opacity-30 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-gray-900">{imageCount}</span>
                            <button
                              type="button"
                              onClick={() => setImageCountSafe(imageCount + 1)}
                              disabled={imageCount >= 5}
                              className="w-8 h-8 rounded-lg border-2 border-violet-200 bg-white text-violet-600 font-bold hover:bg-violet-50 disabled:opacity-30 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-400 flex-1 min-w-[160px] flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          {submittedLesson
                            ? "Request sent — track its status below."
                            : "Ships with your submission. Generated after approval, then added to this lesson's media."}
                        </p>
                      </div>

                      {!aiRequestValid && (
                        <p className="text-xs text-red-600 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {imageCount < 1 || imageCount > 5
                            ? "Number of images must be between 1 and 5."
                            : "Keep the description under 2000 characters."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                {!formValid && "Fill all required fields to continue"}
                {formValid && hasPendingUploads && "Please wait for uploads to complete"}
                {formValid && hasUploadErrors && "Fix or remove failed uploads"}
                {formValid && !hasPendingUploads && !hasUploadErrors && "Ready to submit for approval"}
              </p>
              {/* {DEBUG_SUBMIT_LESSON && (
                <p className="text-[11px] text-amber-600">
                  debug: modal={String(showQuizModal)} canSubmit={String(canSubmit)} formValid={String(formValid)} pending={String(hasPendingUploads)} errors={String(hasUploadErrors)}
                </p>
              )} */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  disabled={busy}
                  className="rounded-xl px-5 h-11 border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                {/* Save Draft — media is optional, button enabled when form is complete */}
                <Button
                  onClick={handleSaveDraft}
                  disabled={!canSaveDraft}
                  className={cn(
                    "rounded-xl px-5 h-11 font-medium transition-all",
                    canSaveDraft
                      ? "bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                      : "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                  title="Save your lesson draft (media files optional)"
                >
                  {isSavingDraft ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Draft
                    </span>
                  )}
                </Button>
                {/* Submit — requires form complete + media uploaded */}
                <div className="flex flex-col items-end gap-2">
                  {attachedQuizId && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-sm">
                      <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-blue-700 font-semibold tracking-wide">{attachedQuizId}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedQuizId(null)}
                        className="ml-1 text-blue-400 hover:text-blue-700 transition-colors"
                        title="Remove quiz"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={cn(
                      "rounded-xl px-6 h-11 font-semibold text-white transition-all min-w-[160px]",
                      canSubmit
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
                        : "bg-gray-300 cursor-not-allowed"
                    )}
                    title={!canSubmit && !formValid
                      ? "Fill all required fields first"
                      : !canSubmit && hasPendingUploads
                        ? "Wait for uploads to finish"
                        : !canSubmit && hasUploadErrors
                          ? "Fix or remove failed uploads"
                          : ""}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : attachedQuizId ? (
                      "Submit with Quiz"
                    ) : (
                      "Submit for Approval"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-2 safe-area-pb">
          <div className="flex gap-2">
            {/* Mobile Save Draft — media is optional */}
            <button
              onClick={handleSaveDraft}
              disabled={!canSaveDraft}
              className={cn(
                "flex-1 h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border-2 transition-all",
                canSaveDraft
                  ? "border-blue-500 text-blue-600 bg-white active:bg-blue-50"
                  : "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
              )}
              title="Save your lesson draft (media files optional)"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : serverDraftSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Draft
                </>
              )}
            </button>
            {/* Mobile Submit — requires form + media */}
            <div className="flex-[2] flex flex-col gap-1">
              {attachedQuizId && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-blue-700 font-semibold tracking-wide">{attachedQuizId}</span>
                  </div>
                  <button type="button" onClick={() => setAttachedQuizId(null)} className="text-blue-400 hover:text-blue-700">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all",
                  canSubmit
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 active:from-blue-700 active:to-blue-800 shadow-lg shadow-blue-500/25"
                    : "bg-gray-300 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : attachedQuizId ? (
                  "Submit with Quiz"
                ) : !formValid ? (
                  "Fill all fields"
                ) : hasPendingUploads ? (
                  "Uploading files..."
                ) : hasUploadErrors ? (
                  "Fix uploads"
                ) : (
                  "Submit for Approval"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Modal */}
      <SetQuestionsModal
        open={showQuizModal}
        subjectLabel={subjectLabel}
        classroomLabel={classroomLabel}
        onSkip={() => handleConfirmSubmit(null)}
        onConfirm={(id) => { setAttachedQuizId(id); setShowQuizModal(false); }}
        onDismiss={() => setShowQuizModal(false)}
        isSubmitting={isSubmitting}
      />

      {/* AI Materials Status Screen */}
      {submittedLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-semibold text-white">Materials</span>
                  <p className="text-xs text-white/70">
                    {submittedLesson.status === "Approved" ? "Lesson published — generating your images" : "Lesson submitted — tracking your request"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-200 p-3">
                {isGeneratingStatus(genStatus) ? (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600 shrink-0" />
                ) : genStatus === "Failed" ? (
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                ) : genStatus === "Completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {genStatus === "Failed" ? "Generation failed" : genStatus === "Completed" ? "Images ready" : "Generating your images…"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {submittedLesson.status === "PendingApproval"
                      ? "Your lesson is awaiting approval. Images will be generated once the lesson is approved."
                      : genStatus === "Completed"
                        ? "The generated images have been added to your lesson's media."
                        : "This usually takes a few minutes. You can leave and check back on the lesson."}
                  </p>
                </div>
              </div>

              {genStatus === "Failed" && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Something went wrong while generating the images. You can retry from the lesson page.
                </p>
              )}

              {genImages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generated images</p>
                  {genImagesLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading images…
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {genImages.map((img) => (
                        <div key={img.id} className="rounded-xl overflow-hidden border-2 border-violet-200 bg-white">
                          <img src={img.imageUrl} alt={img.promptText} className="w-full h-24 object-cover" />
                          <p className="text-[10px] text-gray-500 px-2 py-1.5 line-clamp-2">{img.promptText}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseStatus}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                >
                  Go to my lessons
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function isGeneratingStatus(status: string | null): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s !== "completed" && s !== "failed" && s !== "error";
}

export default SubmitLesson;

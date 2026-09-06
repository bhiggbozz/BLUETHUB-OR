import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import {
  CheckCircle2, Loader2, Plus, Trash2, X,
} from "lucide-react";
import {
  questionJobService,
  type JobSummaryDto,
  type JobPreviewResponseData,
  type QuestionPreviewResponse,
  type OptionPreviewDto,
} from "@/services/question-job";
import { questionService, type CreateOptionPayload } from "@/services/question";
import { schoolService } from "@/services/school";
import { useAuthContext, isTeacherRoleData } from "@/contexts/auth-context";
import { Button, Dialog, DialogContent, DialogTitle } from "@bluethub/ui-kit";
import TitleBar from "@/shared/title-bar";
import { useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SelectItem { id: string; name: string; }

interface ContentPart {
  type: "text" | "latex" | "image";
  value?: string;
  display?: "block" | "inline";
}

interface EditableOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

interface EditableQuestion {
  localId: string;
  id: string;
  questionNumber: number;
  questionType: number;
  questionTypeName: string;
  questionHtml: string;
  questionText: string;
  contentParts: ContentPart[];
  hasLatex: boolean;
  hasImages: boolean;
  hasMedia: boolean;
  correctAnswer: string | null;
  difficultyLevel: number;
  marksAllocation: number;
  status: number;
  statusName: string;
  subTopicName?: string;
  topicName?: string;
  creationDate: string;
  options: EditableOption[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const QUESTION_TYPE_CHOICES = [
  { value: 1, label: "Multiple Choice" },
  { value: 2, label: "Short Answer" },
  { value: 3, label: "Essay" },
  { value: 4, label: "True / False" },
];

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Expert" };

// ── Utilities ──────────────────────────────────────────────────────────────────
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const nextOptionLabel = (index: number) => String.fromCharCode(65 + index);

const sanitizePlainTextInput = (text: string) =>
  text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const sanitizeQuestionTextForSave = (text: string) =>
  text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

// Curriculum responses vary: array, { topics: [] }, or { data: { topics: [] } }
const extractTopicsList = (payload: unknown): any[] => {
  const obj = (payload ?? {}) as any;
  const candidates = [
    obj?.data?.topics,
    obj?.data?.Topics,
    obj?.topics,
    obj?.Topics,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return Array.isArray(obj) ? obj : [];
};

const isOptionQuestionType = (questionType: number) => questionType === 1 || questionType === 4;

const parseContentParts = (parts: unknown): ContentPart[] => {
  if (!Array.isArray(parts)) return [];
  return (parts as Record<string, unknown>[]).map((part) => ({
    type: (part?.type as ContentPart["type"]) ?? "text",
    value: String(part?.value ?? part?.text ?? ""),
    display: part?.display as ContentPart["display"],
  }));
};

const renderLatex = (expr: string, displayMode: boolean) => {
  try { return katex.renderToString(expr, { displayMode, throwOnError: false }); }
  catch { return expr; }
};

const getQuestionTypeName = (type: number) => {
  switch (type) {
    case 1: return "MultipleChoice";
    case 2: return "ShortAnswer";
    case 3: return "Essay";
    case 4: return "TrueFalse";
    default: return "Unknown";
  }
};

// Convert string questionType from API ("Objective", "Theory", "TrueFalse") → number
const parseQuestionTypeFromApi = (raw: unknown): number => {
  if (typeof raw === "number") return raw;
  switch (String(raw ?? "").toLowerCase()) {
    case "objective": case "multiplechoice": return 1;
    case "shortanswer": return 2;
    case "essay": return 3;
    case "trueorfalse": case "truefalse": return 4;
    default: return 1;
  }
};

// Convert string difficultyLevel from API ("Easy", "Medium", "Hard", "Expert") → number
const parseDifficultyFromApi = (raw: unknown): number => {
  if (typeof raw === "number") return Math.min(4, Math.max(1, raw));
  switch (String(raw ?? "").toLowerCase()) {
    case "easy": return 1;
    case "medium": return 2;
    case "hard": return 3;
    case "expert": return 4;
    default: return 1;
  }
};

// Parse contentParts which may arrive as a JSON string or already an array
const parseContentPartsFromApi = (raw: unknown): ContentPart[] => {
  if (Array.isArray(raw)) return parseContentParts(raw);
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try { return parseContentParts(JSON.parse(raw)); } catch { /* fall through */ }
  }
  return [];
};

const statusPillClass = (status: string) => {
  switch (status) {
    case "Completed":          return "bg-emerald-50 text-emerald-600 border-emerald-200";
    case "Failed":             return "bg-red-50 text-red-500 border-red-200";
    case "Processing":         return "bg-blue-50 text-blue-600 border-blue-200";
    case "PartiallyCompleted": return "bg-amber-50 text-amber-600 border-amber-200";
    default:                   return "bg-slate-50 text-slate-500 border-slate-200";
  }
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const FilterSelect = ({
  label, value, options, placeholder, onChange, disabled, loading,
}: {
  label: string;
  value: string;
  options: SelectItem[];
  placeholder?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-slate-500">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className="h-9 rounded-lg border border-slate-200 px-3 text-sm disabled:opacity-50 bg-white"
    >
      <option value="">{loading ? "Loading…" : placeholder ?? `Select ${label}`}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>{opt.name}</option>
      ))}
    </select>
  </div>
);

const SummaryCard = ({
  label, value, tone,
}: {
  label: string;
  value: number;
  tone: "default" | "pending" | "processing" | "completed" | "failed";
}) => {
  const cls = {
    default:    "bg-slate-50 text-slate-600 border-slate-200",
    pending:    "bg-amber-50 text-amber-600 border-amber-200",
    processing: "bg-blue-50 text-blue-600 border-blue-200",
    completed:  "bg-emerald-50 text-emerald-600 border-emerald-200",
    failed:     "bg-red-50 text-red-500 border-red-200",
  }[tone];
  return (
    <div className={`rounded-md border p-3 flex flex-col gap-1 ${cls}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
};

const DifficultyPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <select
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
  >
    {[1, 2, 3, 4].map((d) => (
      <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
    ))}
  </select>
);

// ── KaTeX renderer ──────────────────────────────────────────────────────────
const renderKatex = (html: string): string => {
  // Replace block math: $$...$$ or \[...\]
  let out = html
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return _; }
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return _; }
    });
  // Replace inline math: $...$ or \(...\)
  out = out
    .replace(/\$([^$\n]+?)\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
      catch { return _; }
    })
    .replace(/\\\((.+?)\\\)/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
      catch { return _; }
    });
  return out;
};

// ── RenderedHtml ─────────────────────────────────────────────────────────────
const RenderedHtml = ({ html, className = "" }: { html: string; className?: string }) => {
  const processed = renderKatex(html);
  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
};

// ── Preview Modal ─────────────────────────────────────────────────────────────
const PreviewModal = ({
  preview,
  onClose,
}: {
  preview: QuestionPreviewResponse;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      {/* Modal header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={18} className="text-emerald-500" />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Question Preview</h3>
            <p className="text-[11px] text-slate-400">
              {preview.questionType} · {preview.marksAllocation} mark{preview.marksAllocation !== 1 ? "s" : ""}
              {preview.difficultyLevel ? ` · ${preview.difficultyLevel}` : ""}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors">
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Modal body */}
      <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">
        {/* Question HTML */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Question</p>
          <RenderedHtml
            html={preview.questionHtml}
            className="text-slate-800"
          />
        </div>

        {/* Options (Objective only) */}
        {preview.options && preview.options.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Options</p>
            {preview.options
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((opt: OptionPreviewDto) => (
                <div
                  key={opt.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    opt.isCorrect
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                      opt.isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {opt.optionLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <RenderedHtml
                      html={opt.optionHtml || opt.optionText}
                      className="text-slate-700"
                    />
                  </div>
                  {opt.isCorrect && (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal footer */}
      <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-lg bg-chestnut text-white text-sm font-semibold hover:bg-chestnut/90 transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────
const MyUploads = () => {
  const navigate= useNavigate()
  const { user, isLoading: authLoading } = useAuthContext();
  const [jobs, setJobs] = useState<JobSummaryDto[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [summary, setSummary] = useState({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 });
  const [preview, setPreview] = useState<QuestionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingEditedQuestions, setIsSavingEditedQuestions] = useState(false);
  const [previewScanSessionId, setPreviewScanSessionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editableQuestions, setEditableQuestions] = useState<EditableQuestion[]>([]);
  const [previewJob, setPreviewJob] = useState<JobSummaryDto | null>(null);
  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [subTopicId, setSubTopicId] = useState("");
  const [topics, setTopics] = useState<SelectItem[]>([]);
  const [topicsData, setTopicsData] = useState<any[]>([]);
  const [subTopics, setSubTopics] = useState<SelectItem[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = async (silent = false) => {
    if (!silent) setLoadingJobs(true);
    try {
      const { data } = await questionJobService.getMyJobs();
      const jobList = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(jobList);
      setSummary({
        total: data.totalCount ?? jobList.length,
        pending: data.pendingCount ?? 0,
        processing: jobList.filter((j) => j.status === "Processing").length,
        completed: data.completedCount ?? 0,
        failed: data.failedCount ?? 0,
      });
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      if (!silent) setLoadingJobs(false);
    }
  };

  const fetchStatuses = () => fetchJobs(true);

  const confirmProcessedJobDirect = async (jobId: string) => {
    await questionJobService.confirmJob(jobId);
  };

  const autoDetectFilters = async (job: JobSummaryDto) => {
    const roleData = user?.roleData;
    if (!roleData || !isTeacherRoleData(roleData)) return;
    const topicName = job.topicName?.toLowerCase().trim();
    if (topicName) {
      for (const classroom of roleData.classrooms) {
        const cId = String(classroom.classroomId);
        const subjects = classroom.subjects ?? [];
        for (const subject of subjects) {
          const sId = String(subject.subjectId);
          try {
            const { data } = await schoolService.getTopicsWithSubTopics(sId, cId);
            const list = extractTopicsList((data as any)?.data ?? data);
            const match = list.find((t: any) =>
              String(t?.name ?? t?.topicName ?? "").toLowerCase().trim() === topicName
            );
            if (match) {
              setClassroomId(cId);
              setSubjectId(sId);
              setTopicId(String(match?.id ?? match?.topicId ?? ""));
              setSubTopicId("");
              return;
            }
          } catch { /* continue searching */ }
        }
      }
    }

    // Fallback: when the job has no topic name (or no match), pre-select a single
    // classroom + first subject so saving still works.
    if (roleData.classrooms.length === 1) {
      const firstClassroom = roleData.classrooms[0];
      const cId = String(firstClassroom?.classroomId ?? "");
      const firstSubject = (firstClassroom?.subjects ?? [])[0];
      if (cId && firstSubject) {
        setClassroomId(cId);
        setSubjectId(String(firstSubject.subjectId));
      }
    }
  };

  const handleOpenJobPreview = async (job: JobSummaryDto) => {
    setPreviewJob(job);
    setIsEditMode(false);
    setEditableQuestions([]);
    setPreviewLoading(true);
    try {
      const { data } = await questionJobService.getJobPreview(job.jobId);
      const jobData = (data.data ?? data) as unknown as JobPreviewResponseData;
      const rawQuestions = jobData?.questions ?? [];
      setPreviewScanSessionId(jobData?.scanSessionId ?? null);
      const mapped: EditableQuestion[] = rawQuestions.map((q, index) => {
        // The API may return questionType as a string ("Objective") or number
        const questionType = parseQuestionTypeFromApi((q as unknown as Record<string, unknown>).questionType ?? q.questionType);
        const difficultyLevel = parseDifficultyFromApi((q as unknown as Record<string, unknown>).difficultyLevel ?? q.difficultyLevel);
        // contentParts may be a JSON string on the wire
        const rawParts = (q as unknown as Record<string, unknown>).contentParts;
        const parsedParts = parseContentPartsFromApi(rawParts);
        // questionHtml comes directly from the API
        const questionHtml = String((q as unknown as Record<string, unknown>).questionHtml ?? "");
        // Use the HTML-stripped text for the editable text field; fall back to title/textContent
        const questionText = stripHtml(questionHtml) || (q.textContent ?? (q as unknown as Record<string, unknown>).title as string ?? "");
        const hasLatex = !!((q as unknown as Record<string, unknown>).hasLatex ?? false);
        const hasImages = !!((q as unknown as Record<string, unknown>).hasImages ?? false);
        // questionNumber may come from the API
        const questionNumber = Number((q as unknown as Record<string, unknown>).questionNumber ?? index + 1);

        return {
          localId: crypto.randomUUID(),
          id: "",
          questionNumber,
          questionType,
          questionTypeName: getQuestionTypeName(questionType),
          questionHtml,
          questionText,
          contentParts: parsedParts,
          hasLatex,
          hasImages,
          hasMedia: hasImages,
          correctAnswer: null,
          difficultyLevel,
          marksAllocation: q.marksAllocation ?? 1,
          status: 1,
          statusName: "Draft",
          subTopicName: job.subTopicName ?? "",
          topicName: job.topicName ?? "",
          creationDate: new Date().toISOString(),
          options: (q.options ?? []).map((opt, i) => ({
            id: crypto.randomUUID(),
            label: nextOptionLabel(i),
            text: opt.optionText ?? "",
            isCorrect: opt.isCorrect ?? false,
          })),
        };
      });
      setEditableQuestions(mapped);
      void autoDetectFilters(job);
    } catch (err) {
      const e = err as AxiosError<{ responseMessage?: string }>;
      toast.error(e.response?.data?.responseMessage ?? "Failed to load job questions");
      setPreviewJob(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const renumberQuestions = (questions: EditableQuestion[]) =>
    questions.map((question, index) => ({
      ...question,
      questionNumber: index + 1,
      options: question.options.map((option, optionIndex) => ({
        ...option,
        label: nextOptionLabel(optionIndex),
      })),
    }));

  const updateQuestion = (localId: string, updates: Partial<EditableQuestion>) => {
    setEditableQuestions((prev) =>
      prev.map((question) => (question.localId === localId ? { ...question, ...updates } : question)),
    );
  };

  const updateQuestionType = (localId: string, questionType: number) => {
    setEditableQuestions((prev) =>
      prev.map((question) => {
        if (question.localId !== localId) return question;

        if (questionType === 4) {
          return {
            ...question,
            questionType,
            questionTypeName: "TrueFalse",
            options: [
              { id: crypto.randomUUID(), label: "A", text: "True", isCorrect: question.options[0]?.isCorrect ?? false },
              { id: crypto.randomUUID(), label: "B", text: "False", isCorrect: question.options[1]?.isCorrect ?? false },
            ],
          };
        }

        if (questionType === 1) {
          const base = question.options.length >= 2 ? question.options : [
            { id: crypto.randomUUID(), label: "A", text: "", isCorrect: false },
            { id: crypto.randomUUID(), label: "B", text: "", isCorrect: false },
          ];
          return {
            ...question,
            questionType,
            questionTypeName: "MultipleChoice",
            options: base.map((option, index) => ({ ...option, label: nextOptionLabel(index) })),
          };
        }

        return {
          ...question,
          questionType,
          questionTypeName:
            questionType === 2 ? "ShortAnswer" : questionType === 3 ? "Essay" : question.questionTypeName,
          options: [],
        };
      }),
    );
  };

  const updateOption = (localId: string, optionId: string, text: string) => {
    setEditableQuestions((prev) =>
      prev.map((question) => {
        if (question.localId !== localId) return question;
        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId ? { ...option, text: sanitizePlainTextInput(text) } : option,
          ),
        };
      }),
    );
  };

  const setCorrectOption = (localId: string, optionId: string) => {
    setEditableQuestions((prev) =>
      prev.map((question) => {
        if (question.localId !== localId) return question;
        return {
          ...question,
          options: question.options.map((option) => ({
            ...option,
            isCorrect: option.id === optionId,
          })),
        };
      }),
    );
  };

  const addOption = (localId: string) => {
    setEditableQuestions((prev) =>
      prev.map((question) => {
        if (question.localId !== localId) return question;
        const nextOptions = [
          ...question.options,
          {
            id: crypto.randomUUID(),
            label: nextOptionLabel(question.options.length),
            text: "",
            isCorrect: false,
          },
        ];
        return { ...question, options: nextOptions };
      }),
    );
  };

  const removeOption = (localId: string, optionId: string) => {
    setEditableQuestions((prev) =>
      prev.map((question) => {
        if (question.localId !== localId) return question;
        const filtered = question.options.filter((option) => option.id !== optionId);
        return {
          ...question,
          options: filtered.map((option, index) => ({ ...option, label: nextOptionLabel(index) })),
        };
      }),
    );
  };

  const addQuestion = () => {
    setEditableQuestions((prev) =>
      renumberQuestions([
        ...prev,
        {
          localId: crypto.randomUUID(),
          id: "",
          questionNumber: prev.length + 1,
          questionType: 1,
          questionTypeName: "MultipleChoice",
          questionHtml: "",
          questionText: "",
          contentParts: [],
          hasLatex: false,
          hasImages: false,
          hasMedia: false,
          correctAnswer: null,
          difficultyLevel: 1,
          marksAllocation: 1,
          status: 0,
          statusName: "Draft",
          subTopicName: prev[0]?.subTopicName ?? "",
          topicName: prev[0]?.topicName ?? "",
          creationDate: new Date().toISOString(),
          options: [
            { id: crypto.randomUUID(), label: "A", text: "", isCorrect: false },
            { id: crypto.randomUUID(), label: "B", text: "", isCorrect: false },
          ],
        },
      ]),
    );
  };

  const removeQuestion = (localId: string) => {
    setEditableQuestions((prev) => {
      const next = prev.filter((question) => question.localId !== localId);
      return renumberQuestions(next);
    });
  };

  const buildOptionsPayload = (question: EditableQuestion): CreateOptionPayload[] => {
    if (!isOptionQuestionType(question.questionType)) return [];
    return question.options.map((option, index) => ({
      optionLabel: option.label || nextOptionLabel(index),
      optionText: sanitizePlainTextInput(option.text),
      isCorrect: !!option.isCorrect,
      orderIndex: index + 1,
    }));
  };

  const validateQuestionForSave = (question: EditableQuestion, index: number): string | null => {
    if (!sanitizePlainTextInput(question.questionText)) {
      return `Question ${index + 1}: question text is required.`;
    }

    if ((question.marksAllocation ?? 0) <= 0) {
      return `Question ${index + 1}: marks must be greater than zero.`;
    }

    if (isOptionQuestionType(question.questionType)) {
      const nonEmptyOptions = question.options.filter((option) => sanitizePlainTextInput(option.text));
      if (nonEmptyOptions.length < 2) {
        return `Question ${index + 1}: add at least 2 options.`;
      }

      const correctCount = nonEmptyOptions.filter((option) => option.isCorrect).length;
      if (correctCount !== 1) {
        return `Question ${index + 1}: select exactly one correct answer.`;
      }
    }

    return null;
  };

  const normalizeName = (value?: string | null) => (value ?? "").trim().toLowerCase();

  const resolveTopicIdByName = (name?: string | null) => {
    const target = normalizeName(name);
    if (!target) return "";
    const found = topics.find((topic) => normalizeName(topic.name) === target);
    return found?.id ?? "";
  };

  const resolveSubTopicIdByName = (name?: string | null) => {
    const target = normalizeName(name);
    if (!target) return "";

    for (const topic of topicsData) {
      const nested = (topic?.SubTopics ?? topic?.subTopics ?? []) as any[];
      const found = nested.find((sub) => normalizeName(String(sub?.Name ?? sub?.name ?? sub?.subTopicName ?? "")) === target);
      if (found) {
        return String(found?.Id ?? found?.id ?? found?.subTopicId ?? "");
      }
    }

    const foundFlat = subTopics.find((sub) => normalizeName(sub.name) === target);
    return foundFlat?.id ?? "";
  };

  const handleSaveEditedQuestions = async () => {
    // Everything below runs synchronously up to setIsSavingEditedQuestions(true)
    // — the button's disabled state doesn't take effect until React repaints,
    // so a fast double-click could otherwise start two full save loops (each
    // POSTing every question) before the first one flips the flag.
    if (isSavingEditedQuestions) return;
    setSaveError(null);

    if (!previewJob) {
      const message = "No active upload job selected.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    if (!classroomId) {
      const message = "Select a classroom before saving.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    if (!subjectId) {
      const message = "Select a subject before saving.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    const resolvedTopicId = topicId || resolveTopicIdByName(previewJob.topicName);
    const resolvedSubTopicId =
      subTopicId ||
      resolveSubTopicIdByName(previewJob.subTopicName) ||
      resolveSubTopicIdByName(editableQuestions[0]?.subTopicName);

    if (!resolvedSubTopicId || resolvedSubTopicId === EMPTY_GUID) {
      const message = "Could not resolve sub-topic for this job. Select a sub-topic, then save again.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    if (editableQuestions.length === 0) {
      const message = "No questions to save.";
      setSaveError(message);
      toast.error(message);
      return;
    }

    for (let i = 0; i < editableQuestions.length; i++) {
      const validationError = validateQuestionForSave(editableQuestions[i], i);
      if (validationError) {
        setSaveError(validationError);
        toast.error(validationError);
        return;
      }
    }

    const selectedTopicName = topics.find((topic) => topic.id === resolvedTopicId)?.name ?? previewJob.topicName ?? "";

    setIsSavingEditedQuestions(true);
    let successfulSaves = 0;

    try {
      for (let index = 0; index < editableQuestions.length; index++) {
        const question = editableQuestions[index];
        const plainText = sanitizeQuestionTextForSave(question.questionText);
        const firstImageUrl = parseContentParts(question.contentParts)
          .find((part) => part.type === "image" && typeof part.value === "string" && /^https?:\/\//i.test(part.value ?? ""))
          ?.value;

        const payload = {
          clientId: `upload-${previewJob.jobId}-${question.localId}`,
          originDevice: "web",
          createdAtDevice: new Date().toISOString(),
          subjectId,
          topicId: resolvedTopicId || null,
          topic: [selectedTopicName, question.topicName, previewJob.topicName]
            .map((value) => (value ?? "").trim())
            .find((value) => value.length > 0) ?? "General",
          subTopic: resolvedSubTopicId,
          classroomId,
          title: plainText || `Question ${index + 1}`,
          textContent: plainText,
          questionType: question.questionType,
          difficultyLevel: Math.max(1, Math.min(4, Number(question.difficultyLevel) || 1)),
          marksAllocation: Math.max(1, Math.min(4, Number(question.marksAllocation || question.difficultyLevel) || 1)),
          correctAnswer: null,
          options: buildOptionsPayload(question),
          boardSessionId: null,
          snapshotUrl: null,
          snapshotPublicId: null,
          scanSessionId: previewScanSessionId,
          isScanned: true,
          extractedQuestionIndex: (question.questionNumber ?? index + 1) - 1,
          aiConfidenceScore: null,
          imageUrl: typeof firstImageUrl === "string" ? firstImageUrl : null,
          imagePublicId: null,
        };

        const response = await questionService.createQuestion(payload);
        const rawResponse = response.data as any;
        const nested = rawResponse?.data ?? {};
        const responseCode = String(rawResponse?.responseCode ?? nested?.responseCode ?? "").toLowerCase();
        const responseStatus = String(rawResponse?.status ?? nested?.status ?? "").toLowerCase();
        const isDuplicate = !!(rawResponse?.isDuplicate ?? nested?.isDuplicate);
        const hasQuestionId = !!(rawResponse?.questionId ?? nested?.questionId);
        const isSuccessful =
          responseStatus === "successful" ||
          responseCode === "successful" ||
          hasQuestionId ||
          isDuplicate;

        if (isSuccessful) {
          successfulSaves += 1;
        } else {
          throw new Error(rawResponse?.responseMessage ?? nested?.responseMessage ?? "Create question failed");
        }
      }

      if (successfulSaves !== editableQuestions.length) {
        toast.error("Some questions could not be saved. Please retry.");
        return;
      }

      const savedJobId = previewJob.jobId;
      console.info("[MyUploads] Confirming processed job", savedJobId);
      await confirmProcessedJobDirect(savedJobId);
      console.info("[MyUploads] Job confirmed", savedJobId);

      setJobs((prev) => prev.filter((job) => job.jobId !== savedJobId));
      setIsEditMode(false);
      setPreviewJob(null);
      setSaveError(null);
      toast.success("Questions saved and job processed.");

      void fetchStatuses();

      setTimeout(() => {
        window.location.reload();
      }, 250);
    } catch (error) {
      const err = error as { response?: { data?: { responseMessage?: string } }; message?: string };
      const message = err?.response?.data?.responseMessage ?? err?.message ?? "Failed to save edited questions.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSavingEditedQuestions(false);
    }
  };

  const classrooms = useMemo<SelectItem[]>(() => {
    const roleData = user?.roleData;
    if (!roleData || !isTeacherRoleData(roleData)) return [];
    return roleData.classrooms.map((c) => ({
      id: String(c.classroomId),
      name: String(c.className),
    }));
  }, [user?.roleData]);

  const subjects = useMemo<SelectItem[]>(() => {
    const roleData = user?.roleData;
    if (!roleData || !isTeacherRoleData(roleData)) return [];
    const selectedClassroom = roleData.classrooms.find(
      (c) => String(c.classroomId) === classroomId
    );
    return (selectedClassroom?.subjects ?? []).map((s) => ({
      id: String(s.subjectId),
      name: String(s.subjectName),
    }));
  }, [user?.roleData, classroomId]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const hasPending = jobs.some(j => j.status === "Pending" || j.status === "Processing");
    if (hasPending) {
      pollRef.current = setInterval(() => fetchJobs(true), 8000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobs]);

  useEffect(() => {
    if (!subjectId || !classroomId) {
      setTopics([]);
      setTopicsData([]);
      setSubTopics([]);
      setTopicId("");
      setSubTopicId("");
      return;
    }
    setLoadingTopics(true);
    schoolService.getTopicsWithSubTopics(subjectId, classroomId)
      .then(({ data }) => {
        const list = extractTopicsList((data as any)?.data ?? data);
        setTopicsData(list);
        setTopics(list.map((t: any) => ({
          id: String(t?.id ?? t?.topicId ?? ""),
          name: String(t?.name ?? t?.topicName ?? ""),
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingTopics(false));
  }, [subjectId, classroomId]);

  useEffect(() => {
    if (!topicId) { setSubTopics([]); return; }
    const topic = topicsData.find((t: any) => String(t?.id ?? t?.topicId ?? "") === topicId);
    const nested = ((topic?.SubTopics ?? topic?.subTopics ?? []) as any[]).map((sub: any) => ({
      id: String(sub?.Id ?? sub?.id ?? sub?.subTopicId ?? ""),
      name: String(sub?.Name ?? sub?.name ?? sub?.subTopicName ?? ""),
    }));
    setSubTopics(nested);
  }, [topicId, topicsData]);

  return (
    <div className="font-poppins">
      <div className="border min-h-screen  border-white/20 overflow-hidden bg-white/80 backdrop-blur-sm">
        <TitleBar title="My Uploads" hasVertical hasBackIcons onBack={() => navigate(-1)} />

        <div className="p-3 space-y-5">
          <div className="rounded-md bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff] border border-[#f3dccb] p-4 sm:p-5">
            <h1 className="text-sm font-bold text-chestnut leading-tight">Question Upload Status</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track pending, processing, completed and failed question extraction jobs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterSelect
              label="Classroom"
              value={classroomId}
              options={classrooms}
              placeholder="Select classroom"
              onChange={(v) => {
                setClassroomId(v);
                setSubjectId("");
                setTopicId("");
                setSubTopicId("");
              }}
              loading={authLoading}
            />
            <FilterSelect
              label="Subject"
              value={subjectId}
              options={subjects}
              placeholder={classroomId ? "Select subject" : "Select classroom first"}
              onChange={(v) => {
                setSubjectId(v);
                setTopicId("");
                setSubTopicId("");
              }}
              disabled={!classroomId}
              loading={authLoading}
            />
            <FilterSelect
              label="Topic"
              value={topicId}
              options={topics}
              placeholder={subjectId ? "Select topic (optional)" : "Select subject first"}
              onChange={(v) => {
                setTopicId(v);
                setSubTopicId("");
              }}
              disabled={!subjectId}
              loading={loadingTopics}
            />
            <FilterSelect
              label="Sub-topic"
              value={subTopicId}
              options={subTopics}
              placeholder={topicId ? "Select sub-topic (optional)" : "Select topic first"}
              onChange={setSubTopicId}
              disabled={!topicId}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryCard label="Total" value={summary.total} tone="default" />
            <SummaryCard label="Pending" value={summary.pending} tone="pending" />
            <SummaryCard label="Processing" value={summary.processing} tone="processing" />
            <SummaryCard label="Completed" value={summary.completed} tone="completed" />
            <SummaryCard label="Failed" value={summary.failed} tone="failed" />
          </div>

          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Jobs</h2>
              {loadingJobs && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            {!loadingJobs && jobs.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                No upload jobs found for the selected filters.
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const canViewQuestions = job.status === "Completed";

                return (
                  <article
                    key={job.jobId}
                    className="px-4 py-3 sm:py-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {job.topicName} • {job.subTopicName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Type: {job.questionType} • Extracted: {job.extractedCount} • Attempts: {job.attemptCount}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Created: {job.createdAt}</p>
                        {job.completedAt && (
                          <p className="text-xs text-slate-400">Completed: {job.completedAt}</p>
                        )}
                        {job.failureReason && (
                          <p className="text-xs text-red-600 mt-1">Reason: {job.failureReason}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusPillClass(job.status)}`}>
                          {job.status}
                        </span>
                        <Button
                          type="button"
                          onClick={() => void handleOpenJobPreview(job)}
                          disabled={!canViewQuestions}
                          className="h-8 rounded-md bg-chestnut hover:bg-chestnut/90 text-white text-xs font-semibold px-3 disabled:bg-slate-200 disabled:text-slate-500"
                        >
                          View Questions
                        </Button>
                      </div>
                    </div>
                    {!canViewQuestions && (
                      <p className="text-[11px] text-slate-400 mt-2">
                        Questions can be viewed after this job is completed.
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          </div>

          <Dialog open={!!previewJob} onOpenChange={(open) => !open && setPreviewJob(null)}>
            <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden w-[90%] lg:w-full">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
                <DialogTitle className="text-base font-semibold text-slate-800">Uploaded Job Questions</DialogTitle>
                {previewJob && (
                  <p className="text-xs text-slate-500 mt-1">
                    {previewJob.topicName} • {previewJob.subTopicName} • {previewJob.questionType}
                  </p>
                )}
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {previewLoading && (
                  <div className="py-10 flex items-center justify-center text-slate-500 text-sm gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading questions...
                  </div>
                )}

                {!previewLoading && editableQuestions.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    No questions returned for this job.
                  </div>
                )}

                {!previewLoading && editableQuestions.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    {saveError && (
                      <p className="text-xs text-rose-600 font-medium">{saveError}</p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-600 font-medium">
                        {editableQuestions.length} question{editableQuestions.length !== 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        {!isEditMode && (
                        <Button
                          type="button"
                          onClick={() => setIsEditMode((prev) => !prev)}
                          className={`h-8 rounded-lg border px-3 text-xs font-semibold ${isEditMode ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-700"}`}
                        >
                          Edit Questions
                        </Button>
                        )}
                        {isEditMode && (
                          <Button
                            type="button"
                            onClick={addQuestion}
                            className="h-8 rounded-lg bg-chestnut hover:bg-chestnut/90 text-white px-3 text-xs font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Question
                          </Button>
                        )}
                        {isEditMode && (
                          <Button
                            type="button"
                            onClick={() => void handleSaveEditedQuestions()}
                            disabled={isSavingEditedQuestions}
                            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 text-xs font-semibold disabled:bg-slate-300 disabled:text-slate-500"
                          >
                            {isSavingEditedQuestions ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                              </span>
                            ) : (
                              "Save"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!previewLoading && editableQuestions.map((question, index) => (
                  <article key={question.localId} className="rounded-xl border border-slate-200 p-4  space-y-3">
                    <div className="flex items-center justify-between md:hidden">
                      <p className="text-sm font-semibold text-slate-800 leading-6 shrink-0 md:hidden">
                        {question.questionNumber ?? index + 1}.
                      </p>
                      <div className="flex items-center md:hidden gap-2 shrink-0">
                        <span className="rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-1">
                          {question.questionTypeName || `Type ${question.questionType}`}
                        </span>
                        {isEditMode && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(question.localId)}
                            className="h-8 w-8 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                            title="Remove question"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>


                    <div className="">
                      <div className="text-sm font-semibold text-slate-800 leading-6 w-full">
                        <div className="hidden md:flex items-center justify-between  ">
                          <p className="hidden md:block">{question.questionNumber ?? index + 1}.</p>
                          <div className="hidden md:flex items-center gap-2 shrink-0">
                            <span className="rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-1">
                              {question.questionTypeName || `Type ${question.questionType}`}
                            </span>
                            {isEditMode && (
                              <button
                                type="button"
                                onClick={() => removeQuestion(question.localId)}
                                className="h-8 w-8 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                                title="Remove question"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            )}
                          </div>
                        </div>


                        {!isEditMode && !!question.questionHtml?.trim() ? (
                          <div
                            className="mt-1 prose prose-sm max-w-none text-slate-700"
                            dangerouslySetInnerHTML={{
                              __html: renderKatex(question.questionHtml),
                            }}
                          />
                        ) : !isEditMode ? (
                          <div className="mt-1 space-y-2 text-slate-700 font-normal">
                            {parseContentParts(question.contentParts).length === 0 ? (
                              <p
                                dangerouslySetInnerHTML={{
                                  __html: renderKatex(question.questionText || stripHtml(question.questionHtml || "")),
                                }}
                              />
                            ) : parseContentParts(question.contentParts).map((part, partIndex) => {
                              const key = `${question.id}-${partIndex}`;
                              if (part.type === "latex") {
                                const isBlock = part.display === "block";
                                return (
                                  <span
                                    key={key}
                                    className={isBlock ? "block my-2" : "inline"}
                                    dangerouslySetInnerHTML={{ __html: renderLatex(part.value ?? "", isBlock) }}
                                  />
                                );
                              }

                              if (part.type === "image") {
                                const src = part.value ?? "";
                                if (/^https?:\/\//i.test(src)) {
                                  return (
                                    <img
                                      key={key}
                                      src={src}
                                      alt="Question visual"
                                      className="my-2 rounded-lg border border-slate-200 max-h-64 w-auto"
                                      loading="lazy"
                                    />
                                  );
                                }
                                return (
                                  <p key={key} className="text-xs italic text-slate-500">
                                    [Image placeholder: {part.value ?? "image"}]
                                  </p>
                                );
                              }

                              return <p key={key}>{part.value ?? ""}</p>;
                            })}
                          </div>
                        ) : (
                          <div className="space-y-3 mt-2">
                            <div>

                              <div className="grid w-full grid-cols-1 sm:grid-cols-3 gap-3">
                                <select
                                  value={question.questionType}
                                  onChange={(e) => updateQuestionType(question.localId, Number(e.target.value))}
                                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                                >
                                  {QUESTION_TYPE_CHOICES.map((choice) => (
                                    <option key={choice.value} value={choice.value}>{choice.label}</option>
                                  ))}
                                </select>

                                <DifficultyPicker
                                  value={question.marksAllocation || question.difficultyLevel}
                                  onChange={(nextDifficulty) =>
                                    updateQuestion(question.localId, {
                                      difficultyLevel: Math.max(1, Math.min(4, nextDifficulty)),
                                      marksAllocation: Math.max(1, Math.min(4, nextDifficulty)),
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Question</p>
                              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Live Preview</p>
                            </div>

                            <div
                              className="prose prose-sm max-w-none rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2 text-sm text-slate-700 min-h-[44px]"
                              dangerouslySetInnerHTML={{
                                __html: renderKatex(question.questionText || ""),
                              }}
                            />

                            <textarea
                              rows={4}
                              value={question.questionText}
                              onChange={(e) => {
                                const safeText = sanitizePlainTextInput(e.target.value);
                                updateQuestion(question.localId, {
                                  questionText: safeText,
                                  questionHtml: "",
                                  contentParts: [],
                                });
                              }}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                              placeholder="Edit question text"
                            />

                            {isOptionQuestionType(question.questionType) && (
                              <div className="space-y-2 rounded-lg border border-slate-200 p-2 md:p-3 bg-slate-50/60">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Options</p>

                                {question.options.map((option) => (
                                  <div key={option.id} className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setCorrectOption(question.localId, option.id)}
                                      className={`flex items-center justify-center shrink-0 rounded-full border text-xs font-bold h-7 w-7 sm:h-8 sm:w-8 aspect-square ${option.isCorrect
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white border-slate-300 text-slate-500"
                                        }`}
                                      title="Mark as correct"
                                    >
                                      {option.label}
                                    </button>

                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(e) => updateOption(question.localId, option.id, e.target.value)}
                                      className="h-9 flex-1 min-w-0 rounded-lg border border-slate-200 px-3 text-sm"
                                      placeholder={`Option ${option.label}`}
                                    />

                                    {question.questionType !== 4 && question.options.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => removeOption(question.localId, option.id)}
                                        className="flex items-center justify-center shrink-0 h-7 w-7 sm:h-8 sm:w-8 aspect-square rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                                        title="Remove option"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}

                                {question.questionType !== 4 && (
                                  <button
                                    type="button"
                                    onClick={() => addOption(question.localId)}
                                    className="h-8 rounded-lg border border-slate-300 bg-white text-slate-600 px-3 text-xs font-semibold"
                                  >
                                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                                    Add Option
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                  </article>
                ))}

                {/* Preview loading overlay */}
                {previewLoading && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl px-8 py-6 flex items-center gap-3 shadow-xl">
                      <Loader2 size={20} className="animate-spin text-indigo-500" />
                      <span className="text-sm font-semibold text-slate-700">Loading preview…</span>
                    </div>
                  </div>
                )}

                {/* Preview modal */}
                {preview && <PreviewModal preview={preview} onClose={() => setPreview(null)} />}
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
};

export default MyUploads;

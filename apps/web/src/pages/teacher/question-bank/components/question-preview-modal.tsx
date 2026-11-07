/**
 * Question Preview Modal - Mobile-first design
 * Full screen on mobile for better review experience
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Label,
} from "@bluethub/ui-kit";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Pencil,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  type JobPreviewResponseData,
  type ExtractedQuestionPreview,
} from "@/services/question-job";
import { questionJobService } from "@/services/question-job";
import { getErrorMessage } from "@/utils/errors";
import {
  QuestionTypeEnum,
  DifficultyLevelEnum,
} from "@/services/question";

// ── Types ────────────────────────────────────────────────────────────────────

interface QuestionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  data: JobPreviewResponseData | null;
  loading: boolean;
}

interface QuestionState {
  status: "pending" | "approved" | "rejected" | "editing";
  edits?: Partial<ExtractedQuestionPreview>;
  rejectReason?: string;
}

interface ContentPart {
  type: "text" | "latex" | "image";
  value?: string;
  display?: "block" | "inline";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const parseContentParts = (raw: unknown): ContentPart[] => {
  let parts: unknown = raw;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      parts = JSON.parse(raw);
    } catch {
      parts = raw;
    }
  }
  if (!Array.isArray(parts)) return [];
  return (parts as Record<string, unknown>[]).map((part) => ({
    type: (part?.type as ContentPart["type"]) ?? "text",
    value: String(part?.value ?? part?.text ?? ""),
    display: part?.display as ContentPart["display"],
  }));
};

// The classroom/subject/topic/sub-topic were chosen once, at scan-submit
// time — this is read-only display text, never an input. Missing segments
// (topicName can be empty on older jobs) are skipped rather than shown blank.
const buildFilingLabel = (data: JobPreviewResponseData | null): string =>
  !data
    ? ""
    : [data.classroomName, data.subjectName, data.topicName, data.subTopicName]
        .map((v) => (v ?? "").trim())
        .filter(Boolean)
        .join(" · ");

const renderLatex = (expr: string, displayMode: boolean) => {
  try {
    return katex.renderToString(expr, { displayMode, throwOnError: false });
  } catch {
    return expr;
  }
};

const renderKatex = (html: string): string => {
  let out = html
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return _; }
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => {
      try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
      catch { return _; }
    });
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

// API returns questionType as a string ("Objective") or a number
const toQuestionTypeNumber = (raw: number | string): number => {
  if (typeof raw === "number") return raw;
  switch (String(raw).toLowerCase()) {
    case "objective": case "multiplechoice": return QuestionTypeEnum.MultipleChoice;
    case "shortanswer": return QuestionTypeEnum.ShortAnswer;
    case "essay": case "theory": return QuestionTypeEnum.Essay;
    case "trueorfalse": case "truefalse": return QuestionTypeEnum.TrueOrFalse;
    case "fillintheblank": return QuestionTypeEnum.FillInTheBlank;
    default: return QuestionTypeEnum.MultipleChoice;
  }
};

// API returns difficultyLevel as a string ("Medium") or a number
const toDifficultyNumber = (raw: number | string): number => {
  if (typeof raw === "number") return raw;
  switch (String(raw).toLowerCase()) {
    case "easy": return DifficultyLevelEnum.Easy;
    case "medium": return DifficultyLevelEnum.Medium;
    case "hard": return DifficultyLevelEnum.Hard;
    case "expert": return DifficultyLevelEnum.Expert;
    default: return DifficultyLevelEnum.Medium;
  }
};

const getQuestionTypeName = (raw: number | string): string => {
  switch (toQuestionTypeNumber(raw)) {
    case QuestionTypeEnum.MultipleChoice:
      return "MCQ";
    case QuestionTypeEnum.ShortAnswer:
      return "Short";
    case QuestionTypeEnum.Essay:
      return "Essay";
    case QuestionTypeEnum.TrueOrFalse:
      return "T/F";
    case QuestionTypeEnum.FillInTheBlank:
      return "Fill";
    default:
      return "Other";
  }
};

function getDifficultyConfig(raw: number | string) {
  switch (toDifficultyNumber(raw)) {
    case DifficultyLevelEnum.Easy:
      return { label: "Easy", color: "text-green-600", bg: "bg-green-100" };
    case DifficultyLevelEnum.Medium:
      return { label: "Medium", color: "text-amber-600", bg: "bg-amber-100" };
    case DifficultyLevelEnum.Hard:
      return { label: "Hard", color: "text-red-600", bg: "bg-red-100" };
    case DifficultyLevelEnum.Expert:
      return { label: "Expert", color: "text-purple-600", bg: "bg-purple-100" };
    default:
      return { label: "?", color: "text-gray-600", bg: "bg-gray-100" };
  }
}

// Plain-text fallback for editing (HTML stripped from questionHtml/contentParts)
function getQuestionPlainText(question: ExtractedQuestionPreview): string {
  const parts = parseContentParts(question.contentParts);
  if (parts.length > 0) {
    return parts.map((p) => p.value ?? "").join(" ");
  }
  return (
    stripHtml(question.questionHtml ?? "") ||
    question.textContent ||
    question.title ||
    ""
  );
}

// Question body with LaTeX rendering
function QuestionContent({ question }: { question: ExtractedQuestionPreview }) {
  const parts = parseContentParts(question.contentParts);

  if (question.questionHtml) {
    return (
      <div
        className="prose prose-sm max-w-none text-base font-medium text-gray-900 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderKatex(question.questionHtml) }}
      />
    );
  }

  if (parts.length > 0) {
    return (
      <div className="text-base font-medium text-gray-900 leading-relaxed">
        {parts.map((part, idx) => {
          if (part.type === "latex") {
            const isBlock = part.display === "block";
            return (
              <span
                key={idx}
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
                  key={idx}
                  src={src}
                  alt="Question visual"
                  className="my-2 rounded-lg border border-gray-200 max-h-64 w-auto"
                  loading="lazy"
                />
              );
            }
            return (
              <p key={idx} className="text-xs italic text-gray-500">
                [Image placeholder]
              </p>
            );
          }
          return <p key={idx}>{part.value ?? ""}</p>;
        })}
      </div>
    );
  }

  return (
    <p className="text-base font-medium text-gray-900 leading-relaxed">
      {getQuestionPlainText(question)}
    </p>
  );
}

// ── Question Card Component ──────────────────────────────────────────────────

interface QuestionCardProps {
  question: ExtractedQuestionPreview;
  questionNumber: number;
  totalQuestions: number;
  state: QuestionState;
  isEditing: boolean;
  onEdit: () => void;
  onSaveEdit: (edits: Partial<ExtractedQuestionPreview>) => void;
  onCancelEdit: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  processing: boolean;
}

function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  state,
  isEditing,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onApprove,
  onReject,
  processing,
}: QuestionCardProps) {
  const [editData, setEditData] = useState<Partial<ExtractedQuestionPreview>>({});
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const diffConfig = getDifficultyConfig(question.difficultyLevel);

  // Initialize edit data when entering edit mode
  const startEditing = () => {
    const plainText = getQuestionPlainText(question);
    setEditData({
      title: plainText,
      textContent: question.textContent,
      questionType: toQuestionTypeNumber(question.questionType),
      difficultyLevel: toDifficultyNumber(question.difficultyLevel),
      marksAllocation: question.marksAllocation,
      options: [...question.options],
    });
    onEdit();
  };

  // Handle option edit
  const updateOption = (index: number, field: string, value: string | boolean) => {
    const newOptions = [...(editData.options || question.options)];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setEditData({ ...editData, options: newOptions });
  };

  // Render based on status
  if (state.status === "approved") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <p className="font-semibold text-gray-900 text-lg">Approved!</p>
        <p className="text-gray-500 text-sm mt-1">Added to question bank</p>
      </div>
    );
  }

  if (state.status === "rejected") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-4">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <p className="font-semibold text-gray-900 text-lg">Rejected</p>
        {state.rejectReason && (
          <p className="text-gray-500 text-sm mt-1 text-center px-4">
            "{state.rejectReason}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Question Header */}
      <div className="px-5 sm:px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-sm font-medium text-gray-500">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            {typeof question.aiConfidenceScore === "number" && (
              <>
                <Sparkles className={cn(
                  "w-4 h-4",
                  question.aiConfidenceScore >= 0.9 ? "text-green-500" :
                  question.aiConfidenceScore >= 0.7 ? "text-amber-500" : "text-red-500"
                )} />
                <span className="text-xs font-medium text-gray-600">
                  {Math.round(question.aiConfidenceScore * 100)}% confident
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", diffConfig.bg, diffConfig.color)}>
            {diffConfig.label}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-600">
            {getQuestionTypeName(question.questionType)}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-600">
            {question.marksAllocation} mark{question.marksAllocation !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Question Title */}
        {isEditing ? (
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Question</Label>
            <Textarea
              value={editData.title || getQuestionPlainText(question)}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="min-h-[100px] text-base rounded-xl"
              placeholder="Enter question text..."
            />
          </div>
        ) : (
          <QuestionContent question={question} />
        )}

        {/* Options (for MCQ) */}
        {toQuestionTypeNumber(question.questionType) === QuestionTypeEnum.MultipleChoice && question.options.length > 0 && (
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-gray-500 block">Options</Label>
            {(isEditing ? editData.options || question.options : question.options).map((opt, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border-2 transition-colors",
                  opt.isCorrect
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-white"
                )}
              >
                {isEditing ? (
                  <>
                    <Checkbox
                      checked={opt.isCorrect}
                      onCheckedChange={(checked) => updateOption(idx, "isCorrect", !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={opt.optionText}
                        onChange={(e) => updateOption(idx, "optionText", e.target.value)}
                        placeholder="Option text"
                        className="h-10 rounded-lg"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      opt.isCorrect
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {opt.optionLabel}
                    </span>
                    <span className="text-sm text-gray-700 flex-1 pt-0.5">{opt.optionText}</span>
                    {opt.isCorrect && (
                      <Check className="w-5 h-5 text-green-600 shrink-0" />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edit Mode Controls */}
        {isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Type</Label>
              <Select
                value={String(editData.questionType || question.questionType)}
                onValueChange={(v) => setEditData({ ...editData, questionType: parseInt(v) })}
              >
                <SelectTrigger className="h-10 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">MCQ</SelectItem>
                  <SelectItem value="2">Short</SelectItem>
                  <SelectItem value="3">Essay</SelectItem>
                  <SelectItem value="4">T/F</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Difficulty</Label>
              <Select
                value={String(editData.difficultyLevel || question.difficultyLevel)}
                onValueChange={(v) => setEditData({ ...editData, difficultyLevel: parseInt(v) })}
              >
                <SelectTrigger className="h-10 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Easy</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Marks</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={editData.marksAllocation || question.marksAllocation}
                onChange={(e) => setEditData({ ...editData, marksAllocation: parseInt(e.target.value) || 1 })}
                className="h-10 rounded-lg text-sm"
              />
            </div>
          </div>
        )}

        {/* Reject Reason Input */}
        {showRejectInput && (
          <div className="space-y-3 p-4 bg-red-50 rounded-xl">
            <Label className="text-sm font-medium text-red-700">Why reject this question?</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Incorrect answer marked, unclear question text..."
              className="min-h-[80px] rounded-xl bg-white"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  onReject(rejectReason);
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
                disabled={!rejectReason.trim() || processing}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700"
              >
                Confirm Reject
              </Button>
              <Button
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
                variant="outline"
                className="h-10 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions - Sticky Bottom */}
      {!showRejectInput && (
        <div className="sticky bottom-0 p-4 bg-white border-t border-gray-100 space-y-3">
          {isEditing ? (
            <div className="flex gap-3">
              <Button
                onClick={onCancelEdit}
                variant="outline"
                disabled={processing}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onSaveEdit(editData)}
                disabled={processing}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-green-700"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Save & Approve
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowRejectInput(true)}
                  variant="outline"
                  disabled={processing}
                  className="flex-1 h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="w-5 h-5 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={startEditing}
                  variant="outline"
                  disabled={processing}
                  className="flex-1 h-12 rounded-xl"
                >
                  <Pencil className="w-5 h-5 mr-1" />
                  Edit
                </Button>
              </div>
              <Button
                onClick={onApprove}
                disabled={processing}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-lg font-bold shadow-lg shadow-green-500/30"
              >
                {processing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Check className="w-6 h-6 mr-2" />
                    Approve Question
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function QuestionPreviewModal({
  open,
  onClose,
  jobId: _jobId,
  data,
  loading,
}: QuestionPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Map<number, QuestionState>>(new Map());
  const [processing, setProcessing] = useState(false);

  // Get current question state
  const getQuestionState = (index: number): QuestionState => {
    return questionStates.get(index) || { status: "pending" };
  };

  // Update question state
  const updateQuestionState = (index: number, state: QuestionState) => {
    setQuestionStates((prev) => new Map(prev).set(index, state));
  };

  // Navigation
  const goNext = () => {
    if (data && currentIndex < data.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Handle approve — per-question, not the whole job. `_edits` isn't sent
  // yet (the PUT /api/questions edit payload isn't confirmed) so an edited
  // question is approved with its original extracted text for now.
  const handleApprove = async (index: number, _edits?: Partial<ExtractedQuestionPreview>) => {
    if (!data) return;
    const question = data.questions[index];
    if (!question?.questionId) {
      toast.error("This question is missing an id and can't be approved yet.");
      return;
    }

    setProcessing(true);
    try {
      await questionJobService.approveQuestion(question.questionId);
      updateQuestionState(index, { status: "approved" });
      toast.success("Question approved!");

      // Auto-advance after a short delay
      setTimeout(() => {
        const nextPending = data.questions.findIndex(
          (_, i) => i > index && getQuestionState(i).status === "pending"
        );
        if (nextPending !== -1) {
          setCurrentIndex(nextPending);
        }
      }, 1000);
    } catch (err) {
      console.error("Approve error:", err);
      toast.error(getErrorMessage(err, "Failed to approve question"));
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject — per-question soft-delete, not the whole job.
  const handleReject = async (index: number, reason: string) => {
    if (!data) return;
    const question = data.questions[index];
    if (!question?.questionId) {
      toast.error("This question is missing an id and can't be rejected yet.");
      return;
    }

    setProcessing(true);
    try {
      await questionJobService.rejectQuestion(question.questionId, reason);
      updateQuestionState(index, { status: "rejected", rejectReason: reason });
      toast.success("Question rejected");

      // Auto-advance after a short delay
      setTimeout(() => {
        const nextPending = data.questions.findIndex(
          (_, i) => i > index && getQuestionState(i).status === "pending"
        );
        if (nextPending !== -1) {
          setCurrentIndex(nextPending);
        }
      }, 1000);
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(getErrorMessage(err, "Failed to reject question"));
    } finally {
      setProcessing(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0, approved: 0, rejected: 0, pending: 0 };

    let approved = 0;
    let rejected = 0;
    let pending = 0;

    data.questions.forEach((_, index) => {
      const state = getQuestionState(index);
      if (state.status === "approved") approved++;
      else if (state.status === "rejected") rejected++;
      else pending++;
    });

    return { total: data.questions.length, approved, rejected, pending };
  }, [data, questionStates]);

  // Current question
  const currentQuestion = data?.questions[currentIndex];
  const currentState = getQuestionState(currentIndex);

  // Handle complete session
  const handleComplete = async () => {
    if (!data) return;

    try {
      await questionJobService.confirmJob(_jobId);
      toast.success("Review complete!");
      onClose();
    } catch (err) {
      console.error("Complete error:", err);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleComplete()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "p-0 gap-0 flex flex-col",
          // Mobile: full screen
          "fixed inset-0 translate-x-0 translate-y-0 max-w-full rounded-none",
          // Desktop: large modal
          "sm:inset-auto sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:max-w-2xl sm:max-h-[90vh] sm:rounded-3xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 border-b border-gray-100 shrink-0">
          <button
            onClick={handleComplete}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-900 text-sm sm:text-base">Review Questions</span>
          </div>

          {data?.fileUrl && (
            <a
              href={data.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200"
            >
              <ExternalLink className="w-5 h-5 text-gray-600" />
            </a>
          )}
        </div>

        {/* Filing — read-only, chosen once at scan-submit time */}
        {!loading && data && buildFilingLabel(data) && (
          <div className="px-4 sm:px-6 py-2 bg-purple-50 border-b border-purple-100 shrink-0">
            <p className="text-xs font-medium text-purple-700 truncate">{buildFilingLabel(data)}</p>
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-500">Loading questions...</p>
          </div>
        ) : !data || data.questions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">No questions found in this scan</p>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {stats.approved}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {stats.rejected}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    {stats.pending}
                  </span>
                </div>
                <span className="text-gray-500">
                  {stats.approved + stats.rejected} / {stats.total} reviewed
                </span>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1">
                {data.questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "flex-1 h-1.5 rounded-full transition-colors",
                      idx === currentIndex
                        ? "bg-purple-600"
                        : getQuestionState(idx).status === "approved"
                        ? "bg-green-400"
                        : getQuestionState(idx).status === "rejected"
                        ? "bg-red-400"
                        : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Question Card */}
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentIndex + 1}
                totalQuestions={data.questions.length}
                state={currentState}
                isEditing={currentState.status === "editing"}
                onEdit={() => updateQuestionState(currentIndex, { status: "editing" })}
                onSaveEdit={(edits) => handleApprove(currentIndex, edits)}
                onCancelEdit={() => updateQuestionState(currentIndex, { status: "pending" })}
                onApprove={() => handleApprove(currentIndex)}
                onReject={(reason) => handleReject(currentIndex, reason)}
                processing={processing}
              />
            )}

            {/* Navigation Arrows */}
            {currentState.status !== "editing" && (
              <>
                {currentIndex > 0 && (
                  <button
                    onClick={goPrev}
                    className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg items-center justify-center border border-gray-200 sm:left-4"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                )}
                {currentIndex < data.questions.length - 1 && (
                  <button
                    onClick={goNext}
                    className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg items-center justify-center border border-gray-200 sm:right-4"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                )}
              </>
            )}

            {/* Done Button (when all reviewed) */}
            {stats.pending === 0 && (
              <div className="p-4 border-t border-gray-100 shrink-0">
                <Button
                  onClick={handleComplete}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-lg font-bold"
                >
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Done - {stats.approved} Added to Bank
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
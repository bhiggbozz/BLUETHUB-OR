import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import MathText from "@/component/math-text";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Label,
} from "@bluethub/ui-kit";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  ClipboardCopy,
  Loader2,
  Menu,
  Settings2,
  Square,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { schoolService } from "@/services/school";
import {
  questionService,
  type SubjectQuestionSummaryResponseData,
  type QuestionSummaryDto,
} from "@/services/question";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { assessmentService, type CreateAssessmentPayload } from "@/services/assessment";
import { localData } from "@/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ApiItem {
  id: string;
  name: string;
}

interface TeacherAssignment {
  classroomId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface SubTopicChip {
  id: string;
  name: string;
  topicId: string;
  topicName: string;
  questionCount: number;
}

const ADMIN_ROLES = ["SuperAdministrator", "Administrator"];

const SelectField = ({
  label,
  value,
  items,
  placeholder,
  onChange,
  disabled,
  loading,
}: {
  label: string;
  value?: string;
  items: ApiItem[];
  placeholder: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
      {label}
    </Label>
    <select
      value={value ?? ""}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut disabled:opacity-50 w-full"
    >
      <option value="">{loading ? "Loading..." : placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  </div>
);

const Toggle = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) => (
  <div className="flex items-start justify-between gap-3 p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {description && (
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? "bg-chestnut" : "bg-slate-300"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  </div>
);

const NumberField = ({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
      {label}
    </Label>
    <div className="relative">
      <input
        type="number"
        disabled={disabled}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n)) onChange(Math.max(min ?? 0, Math.min(max ?? 999, n)));
        }}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut disabled:opacity-50"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const AssessmentConfigPage = () => {
  const navigate = useNavigate();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, refreshUser } = useAuthContext();
  const isAdmin = ADMIN_ROLES.includes(user?.roleName ?? "");
  const schoolInfo = localData.retrieve<{ id: string; schoolId?: string }>("schoolInfo");

  // ── assessment form ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [passMarkPercent, setPassMarkPercent] = useState(50);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [easyMarks, setEasyMarks] = useState(1);
  const [mediumMarks, setMediumMarks] = useState(2);
  const [hardMarks, setHardMarks] = useState(3);
  const [examLevelMarks, setExamLevelMarks] = useState(4);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // ── filters ────────────────────────────────────────────────────────────────
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(
    searchParams.get("classroomId") ?? undefined,
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(
    searchParams.get("subjectId") ?? undefined,
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(
    searchParams.get("topicId") ?? undefined,
  );
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | undefined>(
    searchParams.get("subTopicId") ?? undefined,
  );

  // ── data ───────────────────────────────────────────────────────────────────
  const [classrooms, setClassrooms] = useState<ApiItem[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [subjects, setSubjects] = useState<ApiItem[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [summary, setSummary] = useState<SubjectQuestionSummaryResponseData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionSummaryDto[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // ── selection ──────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── assessment creation ────────────────────────────────────────────────────
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── assignment ─────────────────────────────────────────────────────────────
  const [assignStep, setAssignStep] = useState(false);
  const [assignTargetIds, setAssignTargetIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

  // ── derived ────────────────────────────────────────────────────────────────
  const topics = useMemo(() => summary?.topics ?? [], [summary]);
  const subtopics = useMemo<SubTopicChip[]>(() => {
    const filtered = selectedTopicId
      ? topics.filter((t) => t.topicId === selectedTopicId)
      : topics;
    return filtered.flatMap((t) =>
      (t.subTopics ?? []).map((s) => ({
        id: s.subTopicId,
        name: s.subTopicName,
        topicId: t.topicId,
        topicName: t.topicName,
        questionCount: s.questionCount,
      })),
    );
  }, [topics, selectedTopicId]);

  const schoolId = schoolInfo?.id ?? schoolInfo?.schoolId ?? "";

  // ── load user / classrooms ─────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAdmin) void refreshUser();
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (!user?.id) return;
    if (isAdmin) {
      setClassroomsLoading(true);
      schoolService
        .getAllClassRooms()
        .then((res) => {
          const raw = (res.data as any)?.data?.classrooms ?? [];
          const next: ApiItem[] = raw.map((c: any) => ({
            id: String(c.id),
            name: String(c.name),
          }));
          setClassrooms(next);
          setSelectedClassId((prev) => {
            if (prev && next.some((c) => c.id === prev)) return prev;
            return next[0]?.id;
          });
        })
        .catch(() => toast.error("Failed to load classrooms"))
        .finally(() => setClassroomsLoading(false));
      return;
    }

    setClassroomsLoading(true);
    const roleData = user?.roleData;
    const roleClassrooms =
      roleData && isTeacherRoleData(roleData) ? roleData.classrooms : [];
    const pairs: TeacherAssignment[] = [];
    const uniqueClassrooms = new Map<string, ApiItem>();
    for (const c of roleClassrooms ?? []) {
      if (!c?.classroomId) continue;
      const cName = String(c.className ?? "Classroom");
      uniqueClassrooms.set(String(c.classroomId), {
        id: String(c.classroomId),
        name: cName,
      });
      for (const s of c.subjects ?? []) {
        if (!s?.subjectId || !s?.subjectName) continue;
        pairs.push({
          classroomId: String(c.classroomId),
          className: cName,
          subjectId: String(s.subjectId),
          subjectName: String(s.subjectName),
        });
      }
    }
    const next = Array.from(uniqueClassrooms.values());
    setTeacherAssignments(pairs);
    setClassrooms(next);
    setSelectedClassId((prev) => {
      if (prev && next.some((c) => c.id === prev)) return prev;
      return next[0]?.id;
    });
    setClassroomsLoading(false);
  }, [isAdmin, user?.id, user?.roleData]);

  // ── load subjects when classroom changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      setSelectedSubjectId(undefined);
      setSummary(null);
      setQuestions([]);
      return;
    }
    setSelectedTopicId(undefined);
    setSelectedSubTopicId(undefined);
    setSummary(null);
    setQuestions([]);
    setSelectedIds(new Set());
    setSubjectsLoading(true);

    if (isAdmin || user?.roleName === "HeadTeacher") {
      schoolService
        .getSubjectsByClassroomId(selectedClassId)
        .then((res) => {
          const data = (res.data as any)?.data;
          const flat = [
            ...(data?.majorSubjects ?? []),
            ...(data?.minorSubjects ?? []),
          ];
          const next: ApiItem[] = flat.map((s: any) => ({
            id: String(s.id ?? s.subjectId ?? ""),
            name: String(s.subject ?? s.subjectName ?? s.name ?? ""),
          }));
          setSubjects(next);
          setSelectedSubjectId((prev) => {
            if (prev && next.some((s) => s.id === prev)) return prev;
            return next[0]?.id;
          });
        })
        .catch(() => toast.error("Failed to load subjects"))
        .finally(() => setSubjectsLoading(false));
      return;
    }

    const classSubjects = teacherAssignments
      .filter((a) => a.classroomId === selectedClassId)
      .reduce<ApiItem[]>((acc, item) => {
        if (!acc.some((x) => x.id === item.subjectId))
          acc.push({ id: item.subjectId, name: item.subjectName });
        return acc;
      }, []);
    setSubjects(classSubjects);
    setSelectedSubjectId((prev) => {
      if (prev && classSubjects.some((s) => s.id === prev)) return prev;
      return classSubjects[0]?.id;
    });
    setSubjectsLoading(false);
  }, [isAdmin, selectedClassId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── load summary when subject changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    questionService
      .getSubjectQuestionSummary(selectedClassId, selectedSubjectId)
      .then((res) => {
        const raw = res.data as any;
        setSummary(raw?.data ?? raw?.dat ?? null);
      })
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [selectedClassId, selectedSubjectId]);

  // ── fetch questions when filters change ────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setQuestions([]);
      setSelectedIds(new Set());
      return;
    }
    if (!selectedTopicId) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    questionService
      .getQuestionsByClassroomSubjectTopic(selectedClassId, selectedSubjectId, selectedTopicId, {
        page: 1,
        pageSize: 100,
        subTopicIds: selectedSubTopicId ? [selectedSubTopicId] : [],
      })
      .then((res) => {
        const raw = res.data as any;
        const payload = raw.data ?? raw.dat ?? raw;
        const items = (payload?.questions ?? raw?.questions ?? []) as QuestionSummaryDto[];
        setQuestions(items);
      })
      .catch(() => {
        setQuestions([]);
        toast.error("Failed to fetch questions");
      })
      .finally(() => setQuestionsLoading(false));
  }, [selectedClassId, selectedSubjectId, selectedTopicId, selectedSubTopicId]);

  // ── selection helpers ──────────────────────────────────────────────────────
  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectedQuestionDetails((d) => {
          const m = new Map(d);
          m.delete(id);
          return m;
        });
      } else {
        next.add(id);
        const q = questions.find((x) => x.id === id);
        if (q) {
          setSelectedQuestionDetails((d) => {
            const m = new Map(d);
            m.set(id, q);
            return m;
          });
        }
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length && questions.every((q) => selectedIds.has(q.id))) {
      setSelectedIds(new Set());
      setSelectedQuestionDetails(new Map());
    } else {
      const allIds = questions.map((q) => q.id);
      const allDetails = new Map(questions.map((q) => [q.id, q]));
      setSelectedIds(new Set(allIds));
      setSelectedQuestionDetails(allDetails);
    }
  };

  const allSelected = questions.length > 0 && selectedIds.size === questions.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  // ── create assessment ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Enter an assessment title");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Select at least one question");
      return;
    }

    setCreating(true);
    try {
      const payload: CreateAssessmentPayload = {
        title: title.trim(),
        description: description.trim(),
        schoolId,
        timeLimitMinutes,
        shuffleQuestions,
        passMarkPercent,
        showResultImmediately,
        easyMarks,
        mediumMarks,
        hardMarks,
        examLevelMarks,
        expiresAt,
        questionIds: Array.from(selectedIds),
      };
      const res = await assessmentService.create(payload);
      const raw = res.data as any;
      const data = raw?.data ?? raw?.dat ?? raw;
      const code = data?.code ?? data?.assessmentCode ?? raw?.code ?? null;
      const id = data?.assessmentId ?? data?.id ?? null;
      if (code) {
        setCreatedCode(code);
        setCreatedAssessmentId(id);
        setSelectedIds(new Set());
        toast.success("Assessment created successfully!");
      } else {
        toast.error(raw?.responseMessage || "Assessment created but no code returned");
        setCreatedCode("Unknown");
      }
    } catch {
      toast.error("Failed to create assessment. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  // ── selected questions dialog ──────────────────────────────────────────────
  const [selectedQuestionsOpen, setSelectedQuestionsOpen] = useState(false);
  const [selectedQuestionDetails, setSelectedQuestionDetails] = useState<Map<string, QuestionSummaryDto>>(new Map());

  const selectedQuestions = useMemo(() => {
    return Array.from(selectedQuestionDetails.values());
  }, [selectedQuestionDetails]);

  // ── assignment ──────────────────────────────────────────────────────────────
  const toggleAssignTarget = (id: string) => {
    setAssignTargetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!createdAssessmentId) {
      toast.error("Assessment ID not available");
      return;
    }
    if (assignTargetIds.size === 0) {
      toast.error("Select at least one classroom");
      return;
    }
    setAssigning(true);
    try {
      await assessmentService.assign({
        assessmentId: createdAssessmentId,
        targetType: "Classroom",
        targetIds: Array.from(assignTargetIds),
      });
      toast.success(`Assessment assigned to ${assignTargetIds.size} classroom(s)`);
      setCreatedCode(null);
      setAssignStep(false);
      setAssignTargetIds(new Set());
    } catch {
      toast.error("Failed to assign assessment");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="font-poppins min-h-screen">
      <div className="backdrop-blur-sm  border border-white/20 overflow-hidden bg-white/70">
        {/* Header */}
        <div className="bg-gradient-to-r from-chestnut to-chestnut/90 px-4 sm:px-6 py-4 sm:py-5  flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Menu className="lg:hidden w-5 h-5 text-white" onClick={openMobileNav} />
            <button onClick={() => navigate(-1)} className="p-1.5">
              <ArrowLeft size={16} className="text-white" />
            </button>
            <h2 className="font-semibold text-base text-white leading-none">Config</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-white bg-white/20 px-3 py-1.5 rounded-full">
                {selectedIds.size} selected
              </span>
            )}
            <button
              onClick={handleCreate}
              disabled={creating || selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span className="hidden sm:inline">Create Assessment</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
          {/* ── Title & Description ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Assessment Title *
              </Label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mid-Term Mathematics Assessment"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Description
              </Label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut w-full"
              />
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Class"
              value={selectedClassId}
              items={classrooms}
              placeholder="Select class"
              onChange={setSelectedClassId}
              loading={classroomsLoading}
            />
            <SelectField
              label="Subject"
              value={selectedSubjectId}
              items={subjects}
              placeholder={selectedClassId ? "Select subject" : "Select class first"}
              onChange={setSelectedSubjectId}
              disabled={!selectedClassId}
              loading={subjectsLoading}
            />
          </div>

          {/* ── Assessment Config ── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100">
              <Settings2 className="w-4 h-4 text-chestnut" />
              <span className="text-sm font-bold text-slate-800">Assessment Settings</span>
            </div>
            <div className="p-4 sm:p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <NumberField
                  label="Time Limit"
                  value={timeLimitMinutes}
                  onChange={setTimeLimitMinutes}
                  min={1}
                  max={180}
                  suffix="min"
                />
                <NumberField
                  label="Pass Mark"
                  value={passMarkPercent}
                  onChange={setPassMarkPercent}
                  min={0}
                  max={100}
                  suffix="%"
                />
                <NumberField
                  label="Easy Marks"
                  value={easyMarks}
                  onChange={setEasyMarks}
                  min={0}
                  max={100}
                />
                <NumberField
                  label="Medium Marks"
                  value={mediumMarks}
                  onChange={setMediumMarks}
                  min={0}
                  max={100}
                />
                <NumberField
                  label="Hard Marks"
                  value={hardMarks}
                  onChange={setHardMarks}
                  min={0}
                  max={100}
                />
                <NumberField
                  label="Expert Marks"
                  value={examLevelMarks}
                  onChange={setExamLevelMarks}
                  min={0}
                  max={100}
                />
              </div>

              {/* ── Expiry Date/Time ── */}
              <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                    Expiry Date & Time
                  </Label>
                  {expiresAt && (
                    <button
                      type="button"
                      onClick={() => setExpiresAt(null)}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="datetime-local"
                    value={expiresAt ?? ""}
                    onChange={(e) => setExpiresAt(e.target.value || null)}
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {[
                      { label: "+30 min", minutes: 30 },
                      { label: "+1 hr", minutes: 60 },
                      { label: "+24 hrs", minutes: 1440 },
                      { label: "+7 days", minutes: 10080 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + preset.minutes * 60_000);
                          const pad = (n: number) => n.toString().padStart(2, "0");
                          const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                          setExpiresAt(iso);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 bg-white text-slate-600 hover:border-chestnut/40 hover:text-chestnut transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {expiresAt
                    ? `Students must start before ${new Date(expiresAt).toLocaleString()}`
                    : "No expiry — assessment stays open indefinitely."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Toggle
                  label="Shuffle Questions"
                  description="Randomize question order per attempt"
                  checked={shuffleQuestions}
                  onChange={setShuffleQuestions}
                />
                <Toggle
                  label="Show Results Immediately"
                  description="Display score right after submission"
                  checked={showResultImmediately}
                  onChange={setShowResultImmediately}
                />
              </div>
            </div>
          </div>

          {/* ── Topic chips ── */}
          {topics.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-slate-700">Topics</h2>
                  {summaryLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => { setSelectedTopicId(undefined); setSelectedSubTopicId(undefined); }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      !selectedTopicId
                        ? "bg-chestnut text-white border-chestnut"
                        : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                    }`}
                  >
                    All topics
                  </button>
                  {topics.map((t) => (
                    <button
                      key={t.topicId}
                      type="button"
                      onClick={() => { setSelectedTopicId(t.topicId); setSelectedSubTopicId(undefined); }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                        selectedTopicId === t.topicId
                          ? "bg-chestnut text-white border-chestnut"
                          : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                      }`}
                    >
                      {t.topicName} ({t.questionCount})
                    </button>
                  ))}
                </div>
              </div>

              {subtopics.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-700">Subtopics</h2>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setSelectedSubTopicId(undefined)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                        !selectedSubTopicId
                          ? "bg-chestnut text-white border-chestnut"
                          : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                      }`}
                    >
                      All
                    </button>
                    {subtopics.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSubTopicId(s.id)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                          selectedSubTopicId === s.id
                            ? "bg-chestnut text-white border-chestnut"
                            : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                        }`}
                      >
                        {s.name} ({s.questionCount})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Questions list ── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  disabled={questions.length === 0}
                  className="text-slate-500 hover:text-chestnut disabled:opacity-30 transition-colors shrink-0"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-chestnut" />
                  ) : someSelected ? (
                    <CheckSquare className="w-5 h-5 text-chestnut/50" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <h3 className="text-sm font-semibold text-slate-700 truncate">
                  Questions
                  {questions.length > 0 && (
                    <span className="ml-1.5 text-slate-400 font-normal">({questions.length})</span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionsOpen(true)}
                    className="text-xs font-semibold text-chestnut bg-chestnut/10 px-2.5 py-1 rounded-full hover:bg-chestnut/20 transition-colors cursor-pointer"
                  >
                    View Selected ({selectedIds.size})
                  </button>
                )}
                {questionsLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
            </div>

            {!questionsLoading && !selectedClassId && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                Select a class and subject to load questions.
              </div>
            )}

            {!questionsLoading && selectedClassId && selectedSubjectId && !selectedTopicId && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                Select a topic above to load questions.
              </div>
            )}

            {!questionsLoading && selectedTopicId && questions.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                No saved questions found for this selection.
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {questions.map((question, idx) => {
                const isSelected = selectedIds.has(question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => toggleQuestion(question.id)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                      isSelected ? "bg-chestnut/5" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0 text-chestnut">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300" />
                      )}
                    </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400 font-medium">#{idx + 1}</p>
                              <div className="text-sm font-semibold text-slate-700 leading-5 mt-0.5">
                                                      <ReactMarkdown
                                                        remarkPlugins={[remarkMath]}
                                                        rehypePlugins={[rehypeKatex]}
                                                      >
                                                        {(question.title || "Untitled question")
                                                          .replace(/\\\(/g, "$")
                                                          .replace(/\\\)/g, "$")}
                                                      </ReactMarkdown>
                                                    </div>
                              {question.imageUrl && (
                                <img
                                  src={question.imageUrl}
                                  alt=""
                                  className="mt-2 max-h-24 rounded-lg border border-slate-200 object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              )}
                              {!question.imageUrl && question.boardSnapshotUrl && (
                                <img
                                  src={question.boardSnapshotUrl}
                                  alt=""
                                  className="mt-2 max-h-24 rounded-lg border border-slate-200 object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              )}
                              <p className="text-xs text-slate-400 mt-1 truncate">
                                {question.topicName || question.topic || "No topic"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                                {question.questionTypeName || `Type ${question.questionType}`}
                              </span>
                              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
                                {question.difficultyLevelName || `Level ${question.difficultyLevel}`}
                              </span>
                            </div>
                          </div>
                        </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Create button (bottom) ── */}
          {selectedIds.size > 0 && (
            <Button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="w-full h-12 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white font-semibold text-sm"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Create Assessment ({selectedIds.size} questions)
            </Button>
          )}
        </div>
      </div>

      {/* ── Selected questions dialog ── */}
      <Dialog open={selectedQuestionsOpen} onOpenChange={setSelectedQuestionsOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden mx-4">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
            <DialogTitle className="text-base font-semibold text-slate-800">
              Selected Questions ({selectedIds.size})
            </DialogTitle>
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">
            {selectedQuestions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No questions selected</p>
            ) : (
              <div className="space-y-2">
                {selectedQuestions.map((q) => {
                  const isSelected = selectedIds.has(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(q.id)) {
                            next.delete(q.id);
                            setSelectedQuestionDetails((d) => {
                              const m = new Map(d);
                              m.delete(q.id);
                              return m;
                            });
                          } else {
                            next.add(q.id);
                          }
                          return next;
                        });
                      }}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                        isSelected
                          ? "border-chestnut/30 bg-chestnut/5"
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0 text-chestnut">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <MathText
                          text={q.title || "Untitled question"}
                          className="block text-sm font-medium text-slate-700 leading-5 line-clamp-2"
                        />
                        {q.imageUrl && (
                          <img
                            src={q.imageUrl}
                            alt=""
                            className="mt-2 max-h-20 rounded-lg border border-slate-200 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        {!q.imageUrl && q.boardSnapshotUrl && (
                          <img
                            src={q.boardSnapshotUrl}
                            alt=""
                            className="mt-2 max-h-20 rounded-lg border border-slate-200 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          {q.topicName || q.topic || "No topic"}
                          {q.difficultyLevelName && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                              {q.difficultyLevelName}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectedQuestionDetails(new Map());
              }}
              disabled={selectedIds.size === 0}
              className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-40 transition-colors"
            >
              Clear All
            </button>
            <Button
              type="button"
              onClick={() => setSelectedQuestionsOpen(false)}
              className="h-9 px-4 rounded-lg bg-chestnut hover:bg-chestnut/90 text-white text-sm font-semibold"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Success dialog ── */}
      <Dialog open={!!createdCode} onOpenChange={(open) => { if (!open) { setCreatedCode(null); setAssignStep(false); setAssignTargetIds(new Set()); } }}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden mx-4">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
            <DialogTitle className="text-base font-semibold text-slate-800">
              {assignStep ? "Assign Assessment" : "Assessment Created!"}
            </DialogTitle>
          </div>

          {createdCode && !assignStep && (
            <div className="p-5 space-y-5">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">
                  Assessment Code
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl sm:text-4xl font-bold tracking-[0.2em] text-chestnut font-mono break-all">
                    {createdCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-chestnut transition-colors shrink-0"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ClipboardCopy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => setAssignStep(true)}
                  className="w-full h-10 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign to Classroom
                </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(`/teacher/assessment/assign-student?code=${createdCode ?? ""}`)}
                    className="w-full h-10 rounded-xl border border-chestnut text-chestnut bg-white hover:bg-chestnut/5 font-semibold text-sm flex items-center justify-center gap-2"
                  >
                  <UserPlus className="w-4 h-4" />
                  Assign to Students
                </Button>
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-semibold text-sm"
                >
                  {copied ? "Copied!" : "Copy Code"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setCreatedCode(null)}
                  className="w-full h-10 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 font-semibold text-sm"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {assignStep && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                Select classrooms to assign this assessment to:
              </p>

              <div className="max-h-52 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2">
                {classrooms.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No classrooms available</p>
                )}
                {classrooms.map((c) => {
                  const selected = assignTargetIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleAssignTarget(c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        selected ? "bg-chestnut/10 border border-chestnut/30" : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? "bg-chestnut border-chestnut" : "border-slate-300"
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{c.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  disabled={assigning || assignTargetIds.size === 0}
                  onClick={handleAssign}
                  className="w-full h-10 rounded-xl bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {assigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {assigning ? "Assigning..." : `Assign to ${assignTargetIds.size} classroom(s)`}
                </Button>
                <button
                  type="button"
                  onClick={() => { setAssignStep(false); setAssignTargetIds(new Set()); }}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentConfigPage;

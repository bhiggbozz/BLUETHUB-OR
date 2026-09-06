import TitleBar from "@/shared/title-bar";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Label,
} from "@bluethub/ui-kit";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Check,
  CheckSquare,
  ClipboardCopy,
  Loader2,
  Settings2,
  Square,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { schoolService } from "@/services/school";
import {
  questionService,
  type SubjectQuestionSummaryResponseData,
  type QuestionSummaryDto,
} from "@/services/question";
import {
  quizService,
  type CreateQuizResponse,
  type QuizConfigPayload,
  type QuizConfiguredDto,
} from "@/services/quiz";
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";

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

/* ── Default quiz config (matches backend defaults) ── */
const DEFAULT_CONFIG: QuizConfigPayload = {
  allowRetakes: false,
  maxAttempts: 1,
  passMarkPercent: 50,
  timeLimitMinutes: null,
  autoSubmitOnTimeout: true,
  shuffleQuestions: false,
  showResultImmediately: true,
  showCorrectAnswers: false,
  allowBoardAnswer: true,
  allowAIAssistance: false,
  maxAIAssistancePerQuestion: 1000,
  starMarkEasy: 1,
  starMarkMedium: 2,
  starMarkHard: 3,
  starMarkExpert: 4,
};

/* ── Shared select field ── */
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

/* ── Toggle switch (custom — Switch not in ui-kit) ── */
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
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-chestnut" : "bg-slate-300"
        }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : ""
          }`}
      />
    </button>
  </div>
);

/* ── Number input row ── */
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
  value: number | null;
  onChange: (v: number | null) => void;
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
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
          } else {
            const n = parseInt(raw, 10);
            if (!isNaN(n)) onChange(n);
          }
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

const GenerateQuiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, refreshUser } = useAuthContext();
  const isAdmin = ADMIN_ROLES.includes(user?.roleName ?? "");

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

  // ── quiz generation ────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [quizResult, setQuizResult] = useState<CreateQuizResponse | null>(null);
  const [configuredResult, setConfiguredResult] = useState<QuizConfiguredDto | null>(null);
  const [copied, setCopied] = useState(false);

  // ── quiz config ────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<QuizConfigPayload>(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(true);
  const [configDirty, setConfigDirty] = useState(false);
  const [showSavedCheck, setShowSavedCheck] = useState(false);

  // ── derived ────────────────────────────────────────────────────────────────
  const selectedSubjectName = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId)?.name,
    [subjects, selectedSubjectId],
  );
  const selectedClassName = useMemo(
    () => classrooms.find((c) => c.id === selectedClassId)?.name,
    [classrooms, selectedClassId],
  );
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

  // ── fetch quiz config on mount ─────────────────────────────────────────────
  useEffect(() => {
    setConfigLoading(true);
    quizService
      .getQuizConfig()
      .then((res) => {
        const raw = res.data as any;
        const data = raw?.data ?? raw?.dat ?? null;
        if (data) {
          setConfig({
            allowRetakes: Boolean(data.allowRetakes ?? DEFAULT_CONFIG.allowRetakes),
            maxAttempts: data.maxAttempts ?? DEFAULT_CONFIG.maxAttempts,
            passMarkPercent: data.passMarkPercent ?? DEFAULT_CONFIG.passMarkPercent,
            timeLimitMinutes: data.timeLimitMinutes ?? DEFAULT_CONFIG.timeLimitMinutes,
            autoSubmitOnTimeout: Boolean(data.autoSubmitOnTimeout ?? DEFAULT_CONFIG.autoSubmitOnTimeout),
            shuffleQuestions: Boolean(data.shuffleQuestions ?? DEFAULT_CONFIG.shuffleQuestions),
            showResultImmediately: Boolean(data.showResultImmediately ?? DEFAULT_CONFIG.showResultImmediately),
            showCorrectAnswers: Boolean(data.showCorrectAnswers ?? DEFAULT_CONFIG.showCorrectAnswers),
            allowBoardAnswer: Boolean(data.allowBoardAnswer ?? DEFAULT_CONFIG.allowBoardAnswer),
            allowAIAssistance: Boolean(data.allowAIAssistance ?? DEFAULT_CONFIG.allowAIAssistance),
            maxAIAssistancePerQuestion: data.maxAIAssistancePerQuestion ?? DEFAULT_CONFIG.maxAIAssistancePerQuestion,
            starMarkEasy: data.starMarkEasy ?? DEFAULT_CONFIG.starMarkEasy,
            starMarkMedium: data.starMarkMedium ?? DEFAULT_CONFIG.starMarkMedium,
            starMarkHard: data.starMarkHard ?? DEFAULT_CONFIG.starMarkHard,
            starMarkExpert: data.starMarkExpert ?? DEFAULT_CONFIG.starMarkExpert,
          });
        }
      })
      .catch(() => {
        toast.error("Failed to load quiz settings — using defaults.");
      })
      .finally(() => setConfigLoading(false));
  }, []);

  // ── fetch questions ────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(
    (cId: string, sId: string, tId?: string, stId?: string) => {
      if (!tId) {
        setQuestions([]);
        return;
      }
      setQuestionsLoading(true);
      setSelectedIds(new Set());
      questionService
        .getQuestionsByClassroomSubjectTopic(cId, sId, tId, {
          page: 1,
          pageSize: 100,
          subTopicIds: stId ? [stId] : [],
        })
        .then((res) => {
          const raw = res.data as any;
          const payload = raw.data ?? raw.dat ?? raw;
          const items =
            (raw.questions ?? raw.dat?.questions ?? payload?.questions ?? []) as QuestionSummaryDto[];
          setQuestions(items);
        })
        .catch(() => {
          setQuestions([]);
          toast.error("Failed to fetch questions");
        })
        .finally(() => setQuestionsLoading(false));
    },
    [],
  );

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
    for (const [i, c] of (roleClassrooms ?? []).entries()) {
      if (!c?.classroomId) continue;
      const cName = String(c.className ?? `Classroom ${i + 1}`);
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
    setSubjectsLoading(true);

    const applySubjects = (next: ApiItem[]) => {
      setSubjects(next);
      setSelectedSubjectId((prev) => {
        if (prev && next.some((s) => s.id === prev)) return prev;
        return next[0]?.id;
      });
    };

    const fetchClassroomSubjects = () =>
      schoolService.getSubjectsByClassroomId(selectedClassId).then((res) => {
        const data = (res.data as any)?.data;
        const flat = [
          ...(data?.majorSubjects ?? []),
          ...(data?.minorSubjects ?? []),
        ];
        return flat.map((s: any) => ({
          id: String(s.subjectId ?? s.id),
          name: String(s.subjectName ?? s.subject ?? s.name),
        })) as ApiItem[];
      });

    if (isAdmin) {
      fetchClassroomSubjects()
        .then(applySubjects)
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

    if (classSubjects.length > 0) {
      applySubjects(classSubjects);
      setSubjectsLoading(false);
      return;
    }

    // roleData had no subjects for this classroom — e.g. a class/head teacher
    // who isn't personally assigned a subject here. Fall back to the full
    // classroom subject list, same as admin.
    fetchClassroomSubjects()
      .then(applySubjects)
      .catch(() => toast.error("Failed to load subjects"))
      .finally(() => setSubjectsLoading(false));
  }, [isAdmin, selectedClassId, teacherAssignments]);

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
      return;
    }
    fetchQuestions(selectedClassId, selectedSubjectId, selectedTopicId, selectedSubTopicId);
  }, [selectedClassId, selectedSubjectId, selectedTopicId, selectedSubTopicId, fetchQuestions]);

  // ── selection helpers ──────────────────────────────────────────────────────
  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const allSelected = questions.length > 0 && selectedIds.size === questions.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  // ── config helpers ─────────────────────────────────────────────────────────
  const updateConfig = useCallback(
    <K extends keyof QuizConfigPayload>(key: K, value: QuizConfigPayload[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setConfigDirty(true);
    },
    [],
  );

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await quizService.saveQuizConfig(config);
      const raw = res.data as any;
      if (raw?.responseCode === "00" || raw?.status === "successful") {
        toast.success(raw?.responseMessage || "Quiz settings saved successfully!");
        setConfigDirty(false);
        setShowSavedCheck(true);
        setTimeout(() => setShowSavedCheck(false), 4000);
      } else {
        toast.error(raw?.responseMessage || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save quiz settings. Please try again.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleResetConfig = () => {
    setConfig(DEFAULT_CONFIG);
    setConfigDirty(true);
  };

  // ── generate quiz ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one question");
      return;
    }
    if (configDirty) {
      toast.error("Save your quiz settings before generating.");
      return;
    }
    setGenerating(true);
    try {
      const res = await quizService.createQuiz(Array.from(selectedIds));
      const raw = res.data as any;
      const data = raw?.data ?? raw?.dat ?? raw;
      setQuizResult({
        quizCode: data?.quizCode ?? data?.QuizCode ?? "",
        questionCount: data?.questionCount ?? data?.QuestionCount ?? selectedIds.size,
        createdAt: data?.createdAt ?? data?.CreatedAt ?? new Date().toISOString(),
      });
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // ── configure (update existing quiz questions) ────────────────────────────
  const handleConfigure = async () => {
    if (!quizResult?.quizCode) return;
    if (selectedIds.size === 0) {
      toast.error("Select at least one question");
      return;
    }
    setGenerating(true);
    try {
      const res = await quizService.configureQuiz({
        quizCode: quizResult.quizCode,
        questionIds: Array.from(selectedIds),
      });
      const raw = res.data as any;
      const data = (raw?.data ?? raw) as QuizConfiguredDto;
      setConfiguredResult(data);
      setSelectedIds(new Set());
      toast.success("Quiz updated successfully");
    } catch {
      toast.error("Failed to update quiz. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!quizResult?.quizCode) return;
    try {
      await navigator.clipboard.writeText(quizResult.quizCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="font-poppins min-h-screen">
      <div className="max-w-6xl mx-auto lg:rounded-2xl border border-white/20 overflow-hidden bg-white/80 backdrop-blur-sm">
        <TitleBar
          title="Generate Quiz"
          hasVertical
          hasBackIcons
          onBack={() => navigate(-1)}
        />

        <div className="lg:p-6 p-3 space-y-4 sm:space-y-5 md:space-y-6">
          {/* ── Header card ── */}
          <div className="rounded-md bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff] border border-[#f3dccb] p-4 sm:p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-sm font-bold text-chestnut leading-tight">
                  {selectedSubjectName ?? "Generate Quiz"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {selectedClassName
                    ? `${selectedClassName} — select questions then generate a quiz code`
                    : "Select a class and subject to browse questions"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Quiz Settings card ── */}
          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setConfigExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-slate-50/80 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-4 h-4 text-chestnut" />
                <span className="text-sm  font-bold text-slate-800">
                  Quiz Settings
                </span>
                {configDirty && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    Unsaved
                  </span>
                )}
              </div>
              {configExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {configExpanded && (
              <div className="p-3 sm:p-4 md:p-5 space-y-4 sm:space-y-5">
                {configLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading settings...
                  </div>
                ) : (
                  <>
                    {/* Numeric row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <NumberField
                        label="Pass Mark"
                        value={config.passMarkPercent}
                        onChange={(v) => updateConfig("passMarkPercent", v ?? 50)}
                        min={0}
                        max={100}
                        suffix="%"
                      />
                      <NumberField
                        label="Max Attempts"
                        value={config.maxAttempts}
                        onChange={(v) => updateConfig("maxAttempts", v ?? 1)}
                        min={1}
                        max={99}
                      />
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                          Time Limit
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={config.timeLimitMinutes ?? ""}
                            min={1}
                            max={300}
                            placeholder="No limit"
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") updateConfig("timeLimitMinutes", null);
                              else {
                                const n = parseInt(raw, 10);
                                if (!isNaN(n)) updateConfig("timeLimitMinutes", n);
                              }
                            }}
                            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut"
                          />
                          <span className="text-xs text-slate-400 shrink-0">minutes</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggles grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                      <Toggle
                        label="Allow Retakes"
                        checked={config.allowRetakes}
                        onChange={(v) => updateConfig("allowRetakes", v)}
                        description="Students can retry after completing"
                      />
                      <Toggle
                        label="Auto Submit"
                        checked={config.autoSubmitOnTimeout}
                        onChange={(v) => updateConfig("autoSubmitOnTimeout", v)}
                        description="Submit automatically when time runs out"
                      />
                      <Toggle
                        label="Shuffle Questions"
                        checked={config.shuffleQuestions}
                        onChange={(v) => updateConfig("shuffleQuestions", v)}
                        description="Randomize question order per attempt"
                      />
                      <Toggle
                        label="Show Result"
                        checked={config.showResultImmediately}
                        onChange={(v) => updateConfig("showResultImmediately", v)}
                        description="Display score right after submission"
                      />
                      <Toggle
                        label="Show Answers"
                        checked={config.showCorrectAnswers}
                        onChange={(v) => updateConfig("showCorrectAnswers", v)}
                        description="Reveal correct answers to students"
                      />
                      <Toggle
                        label="Board Answer"
                        checked={config.allowBoardAnswer}
                        onChange={(v) => updateConfig("allowBoardAnswer", v)}
                        description="Allow drawing-board submissions"
                      />
                      <Toggle
                        label="Assistance"
                        checked={config.allowAIAssistance}
                        onChange={(v) => updateConfig("allowAIAssistance", v)}
                        description="Enable help during quiz"
                      />
                      <NumberField
                        label="Max Assistance / Question"
                        value={config.maxAIAssistancePerQuestion}
                        onChange={(v) =>
                          updateConfig("maxAIAssistancePerQuestion", v ?? 1000)
                        }
                        min={0}
                        max={9999}
                      />
                    </div>

                    {/* ── Score per Difficulty ── */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">Score per Difficulty</span>
                        <span className="text-[11px] text-slate-400">
                          Assign marks for each question difficulty level
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <NumberField
                          label="Easy"
                          value={config.starMarkEasy}
                          onChange={(v) => updateConfig("starMarkEasy", v ?? 1)}
                          min={0}
                          max={100}
                        />
                        <NumberField
                          label="Medium"
                          value={config.starMarkMedium}
                          onChange={(v) => updateConfig("starMarkMedium", v ?? 2)}
                          min={0}
                          max={100}
                        />
                        <NumberField
                          label="Hard"
                          value={config.starMarkHard}
                          onChange={(v) => updateConfig("starMarkHard", v ?? 3)}
                          min={0}
                          max={100}
                        />
                        <NumberField
                          label="Expert"
                          value={config.starMarkExpert}
                          onChange={(v) => updateConfig("starMarkExpert", v ?? 4)}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetConfig}
                        className="h-10 rounded-md border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 font-semibold text-sm"
                      >
                        Reset to Defaults
                      </Button>
                      <Button
                        type="button"
                        disabled={savingConfig}
                        onClick={handleSaveConfig}
                        className="h-10 rounded-md bg-chestnut hover:bg-chestnut/90 text-white font-semibold text-sm"
                      >
                        {savingConfig ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : showSavedCheck ? (
                          <>
                            <Check className="w-4 h-4 mr-2 text-emerald-500" />
                            Saved!
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Save Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Filters ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* ── Topic chips ── */}
          {topics.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-slate-700">Topics</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopicId(undefined);
                      setSelectedSubTopicId(undefined);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${!selectedTopicId
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
                      onClick={() => {
                        setSelectedTopicId(t.topicId);
                        setSelectedSubTopicId(undefined);
                      }}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${selectedTopicId === t.topicId
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
                    {summaryLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setSelectedSubTopicId(undefined)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${!selectedSubTopicId
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
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${selectedSubTopicId === s.id
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
            <div className="px-3 sm:px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                    <span className="ml-1.5 text-slate-400 font-normal">
                      ({questions.length})
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {selectedIds.size > 0 && (
                  <span className="text-xs font-semibold text-chestnut bg-chestnut/10 px-2.5 py-1 rounded-full">
                    {selectedIds.size} selected
                  </span>
                )}
                {questionsLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
              </div>
            </div>

            {!questionsLoading && !selectedClassId && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                Select a class and subject to load questions.
              </div>
            )}

            {!questionsLoading &&
              selectedClassId &&
              selectedSubjectId &&
              !selectedTopicId && (
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
                    className={`w-full text-left px-3 sm:px-4 py-3 sm:py-4 transition-colors flex items-start gap-3 ${isSelected ? "bg-chestnut/5" : "hover:bg-slate-50"
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
                          <p className="text-xs text-slate-400 font-medium">
                            #{idx + 1}
                          </p>
                          <p className="text-sm font-semibold text-slate-700 leading-5 mt-0.5 line-clamp-2">
                            {question.title || "Untitled question"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {question.topicName || question.topic || "No topic"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                            {question.questionTypeName || `Type ${question.questionType}`}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
                            {question.difficultyLevelName ||
                              `Level ${question.difficultyLevel}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Mobile generate button ── */}
          {/* {selectedIds.size > 0 && (
            <div className="sm:hidden">
              <Button
                type="button"
                disabled={generating}
                onClick={quizResult ? handleConfigure : handleGenerate}
                className="w-full h-12 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white font-semibold"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {quizResult ? "Update Quiz" : "Generate Quiz"} ({selectedIds.size} questions)
              </Button>
            </div>
          )} */}
        </div>
      </div>
      {selectedIds.size > 0 && (
        <button
          type="button"
          disabled={generating}
          onClick={quizResult ? handleConfigure : handleGenerate}
          className="fixed bottom-6 right-4 sm:right-10 z-50 inline-flex items-center justify-center gap-2 rounded-xl bg-chestnut px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-chestnut/90 disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {quizResult ? "Update Quiz" : "Generate Quiz"} ({selectedIds.size})
        </button>
      )}

      {/* ── Success dialog ── */}
      <Dialog
        open={!!quizResult || !!configuredResult}
        onOpenChange={(open) => {
          if (!open) { setQuizResult(null); setConfiguredResult(null); }
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden mx-4">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
            <DialogTitle className="text-base font-semibold text-slate-800">
              {configuredResult ? "Quiz Updated!" : "Quiz Created!"}
            </DialogTitle>
          </div>

          {(quizResult || configuredResult) && (
            <div className="p-5 space-y-5">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-2">
                  Quiz Code
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl sm:text-4xl font-bold tracking-[0.2em] text-chestnut font-mono break-all">
                    {quizResult?.quizCode ?? configuredResult?.quizCode}
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

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600 text-center">
                {(configuredResult?.questionCount ?? quizResult?.questionCount)} question
                {(configuredResult?.questionCount ?? quizResult?.questionCount) !== 1 ? "s" : ""} included. Share this
                code with students to start the quiz.
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 h-10 rounded-xl border border-chestnut text-chestnut bg-white hover:bg-chestnut/5 font-semibold text-sm"
                >
                  {copied ? "Copied!" : "Copy Code"}
                </Button>
                <Button
                  type="button"
                  onClick={() => { setQuizResult(null); setConfiguredResult(null); }}
                  className="flex-1 h-10 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white font-semibold text-sm"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default GenerateQuiz;

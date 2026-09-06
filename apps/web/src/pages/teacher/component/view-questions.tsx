import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuthContext } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { schoolService } from "@/services/school";
import { questionService, type QuestionSummaryDto } from "@/services/question";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Label,
} from "@bluethub/ui-kit";
import {
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutList,
  Layers,
  Loader2,
  Menu,
  Search,
  Star,
  X,
  ArrowLeft,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

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

interface CurriculumTopic {
  id: string;
  name: string;
  subTopics: { id: string; name: string }[];
}

const ADMIN_ROLES = ["SuperAdministrator", "Administrator"];

// ═══════════════════════════════════════════════════════════════════════════════
// Star difficulty display
// ═══════════════════════════════════════════════════════════════════════════════
const DIFFICULTY_LABELS = ["", "Easy", "Medium", "Hard", "Expert"];
const DIFFICULTY_COLORS = ["", "#10b981", "#fbbf24", "#f97316", "#ef4444"];

const StarRating = ({ level, size = 14 }: { level: number; size?: number }) => (
  <span className="inline-flex items-center gap-0.5" title={DIFFICULTY_LABELS[level] ?? ""}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        fill={star <= level ? DIFFICULTY_COLORS[level] ?? "#e2e8f0" : "#e2e8f0"}
        strokeWidth={star <= level ? 0 : 1.5}
        className={star <= level ? "" : "text-slate-200"}
      />
    ))}
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const ViewQuestions = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const isAdmin = ADMIN_ROLES.includes(user?.roleName ?? "");

  // ── Teacher context ───────────────────────────────────────────────────────
  const [classrooms, setClassrooms] = useState<ApiItem[]>([]);
  const [subjects, setSubjects] = useState<ApiItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  // ── Curriculum data ───────────────────────────────────────────────────────
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState<Set<string>>(new Set());

  // ── Questions ─────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionSummaryDto[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;
  const [searchText, setSearchText] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionSummaryDto | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const searchRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(questionsTotal / PAGE_SIZE);
  const hasContext = !!selectedClassId && !!selectedSubjectId;

  // ── Load teacher assignments (non-admin) ──────────────────────────────────
  useEffect(() => {
    if (isAdmin || !user?.id) return;
    authService
      .getUserById(user.id)
      .then((res) => {
        const roleData = (res.data as any)?.data?.roleData;
        const roleClassrooms: any[] = roleData?.classrooms ?? [];
        const pairs: TeacherAssignment[] = [];
        const uniqueClassrooms = new Map<string, ApiItem>();
        for (const [index, c] of roleClassrooms.entries()) {
          if (!c?.classroomId) continue;
          const classroomName = String(c.className ?? `Classroom ${index + 1}`);
          uniqueClassrooms.set(c.classroomId, { id: c.classroomId, name: classroomName });
          for (const s of c.subjects ?? []) {
            if (!s?.subjectId || !s?.subjectName) continue;
            pairs.push({
              classroomId: c.classroomId,
              className: classroomName,
              subjectId: s.subjectId,
              subjectName: s.subjectName,
            });
          }
        }
        setTeacherAssignments(pairs);
        setClassrooms(Array.from(uniqueClassrooms.values()));
      })
      .catch(() => toast.error("Failed to load your assignments"));
  }, [isAdmin, user?.id]);

  // ── Fetch classrooms for admin ────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    schoolService
      .getAllClassRooms()
      .then((res) => {
        const raw: { id: string; name: string }[] = (res.data as any)?.data?.classrooms ?? [];
        setClassrooms(raw.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => toast.error("Failed to load classrooms"));
  }, [isAdmin]);

  // ── Fetch subjects when class changes (admin) ────────────────────────────
  useEffect(() => {
    if (!isAdmin || !selectedClassId) return;
    setSelectedSubjectId(undefined);
    setSubjects([]);
    schoolService
      .getSubjectsByClassroomId(selectedClassId)
      .then((res) => {
        const data = (res.data as any)?.data;
        const flat = [...(data?.majorSubjects ?? []), ...(data?.minorSubjects ?? [])];
        const raw: ApiItem[] = flat.map((s: any) => ({
          id: String(s.subjectId ?? s.id),
          name: String(s.subjectName ?? s.subject ?? s.name),
        }));
        setSubjects(raw);
      })
      .catch(() => toast.error("Failed to load subjects"));
  }, [isAdmin, selectedClassId]);

  // ── Filter subjects by class (teacher flow) ───────────────────────────────
  useEffect(() => {
    if (isAdmin || !selectedClassId) return;
    const classSubjects = teacherAssignments
      .filter((a) => a.classroomId === selectedClassId)
      .reduce<ApiItem[]>((acc, a) => {
        if (!acc.some((x) => x.id === a.subjectId)) {
          acc.push({ id: a.subjectId, name: a.subjectName });
        }
        return acc;
      }, []);
    setSubjects(classSubjects);
    if (!classSubjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(undefined);
    }
  }, [isAdmin, selectedClassId, teacherAssignments, selectedSubjectId]);

  // ── Fetch curriculum topics when subject changes ──────────────────────────
  useEffect(() => {
    if (!selectedSubjectId) {
      setTopics([]);
      setSelectedTopicIds(new Set());
      setSelectedSubtopicIds(new Set());
      return;
    }
    schoolService
      .getSubjectCurriculum(selectedSubjectId, selectedClassId)
      .then((res) => {
        const raw = (res.data as any)?.data ?? (res.data as any)?.Data ?? {};
        const rawTopics: any[] = raw.Topics ?? raw.topics ?? [];
        setTopics(rawTopics.map((t: any) => ({
          id: String(t.Id ?? t.id ?? t.topicId),
          name: String(t.Name ?? t.name ?? t.topicName ?? ""),
          subTopics: (t.SubTopics ?? t.subTopics ?? []).map((s: any) => ({
            id: String(s.Id ?? s.id ?? s.subTopicId),
            name: String(s.Name ?? s.name ?? s.subTopicName ?? ""),
          })),
        })));
        setSelectedTopicIds(new Set());
        setSelectedSubtopicIds(new Set());
      })
      .catch(() => toast.error("Failed to load topics"));
  }, [selectedSubjectId]);

  // ── Fetch questions when filters change ───────────────────────────────────
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    const topicIds = Array.from(selectedTopicIds);
    const subtopicIds = Array.from(selectedSubtopicIds);
    setQuestionsLoading(true);
    questionService
      .getQuestionsByClassroom(selectedClassId, {
        page,
        pageSize: PAGE_SIZE,
        subjectId: selectedSubjectId,
        topicId: topicIds.length === 1 ? topicIds[0] : undefined,
        subTopicIds: subtopicIds.length > 0 ? subtopicIds : undefined,
        searchText: searchText.trim() || undefined,
      })
      .then((res) => {
        const body = res.data as any;
        const data = body?.data;
        setQuestions(body?.questions ?? data?.questions ?? []);
        setQuestionsTotal(body?.totalCount ?? data?.totalCount ?? 0);
      })
      .catch(() => toast.error("Failed to load questions"))
      .finally(() => setQuestionsLoading(false));
  }, [selectedClassId, selectedSubjectId, selectedTopicIds, selectedSubtopicIds, page, searchText]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const currentClassName = classrooms.find((c) => c.id === selectedClassId)?.name;

  const clearFilters = () => {
    setSelectedTopicIds(new Set());
    setSelectedSubtopicIds(new Set());
    setSearchText("");
    setPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-poppins">
      <div className="backdrop-blur-sm   border border-white/20 overflow-hidden bg-white/70">
        {/* Header */}
        <div className="bg-gradient-to-r from-chestnut to-chestnut/90 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Menu className="lg:hidden w-5 h-5 text-white" onClick={openMobileNav} />
            <h2 className="font-semibold text-sm text-white leading-none">Question Bank</h2>
          </div>
          <button
            onClick={() => navigate("/teacher/assessment")}
            className="text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
          <ArrowLeft />
          </button>
        </div>

        {/* ── Context Panel (class/subject/topic/subtopic) ── */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Class */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Class <span className="text-red-400">*</span>
              </Label>
              <select
                value={selectedClassId ?? ""}
                onChange={(e) => {
                  setSelectedClassId(e.target.value || undefined);
                  setSelectedSubjectId(undefined);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select class</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Subject <span className="text-red-400">*</span>
              </Label>
              <select
                value={selectedSubjectId ?? ""}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value || undefined);
                  setPage(1);
                }}
                disabled={!selectedClassId}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedClassId ? "Select subject" : "Select class first"}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Topic
              </Label>
              <select
                value={selectedTopicIds.size === 1 ? Array.from(selectedTopicIds)[0] : ""}
                onChange={(e) => {
                  setSelectedTopicIds(e.target.value ? new Set([e.target.value]) : new Set());
                  setSelectedSubtopicIds(new Set());
                  setPage(1);
                }}
                disabled={!selectedSubjectId}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{selectedSubjectId ? "All topics" : "Select subject first"}</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Subtopic */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Subtopic
              </Label>
              <select
                value={selectedSubtopicIds.size === 1 ? Array.from(selectedSubtopicIds)[0] : ""}
                onChange={(e) => {
                  setSelectedSubtopicIds(e.target.value ? new Set([e.target.value]) : new Set());
                  setPage(1);
                }}
                disabled={selectedTopicIds.size !== 1}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {selectedTopicIds.size === 1 ? "All subtopics" : "Select a topic first"}
                </option>
                {selectedTopicIds.size === 1 &&
                  topics
                    .find((t) => selectedTopicIds.has(t.id))
                    ?.subTopics.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
              </select>
            </div>
          </div>

          {currentSubject && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                <BookOpen size={10} />
                {currentSubject.name}{currentClassName ? ` · ${currentClassName}` : ""}
              </span>
              {Array.from(selectedTopicIds).map((tid) => {
                const t = topics.find((x) => x.id === tid);
                return t ? (
                  <span key={tid} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    <Layers size={10} />{t.name}
                  </span>
                ) : null;
              })}
              {Array.from(selectedSubtopicIds).map((sid) => {
                const st = topics.flatMap((t) => t.subTopics).find((x) => x.id === sid);
                return st ? (
                  <span key={sid} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    {st.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col min-h-screen">
          {!hasContext ? (
            <div className="flex flex-col items-center  justify-center h-[70vh]  gap-4">
              <LayoutList size={56} className="text-slate-200" />
              <p className="text-base text-slate-400 font-medium text-center max-w-sm">
                Select a class and subject above to browse questions from the bank.
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchText}
                    onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                    placeholder="Search questions…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-md border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 outline-none transition-all"
                  />
                  {searchText && (
                    <button
                      onClick={() => { setSearchText(""); setPage(1); searchRef.current?.focus(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {(selectedTopicIds.size > 0 || selectedSubtopicIds.size > 0 || searchText) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-rose-50 transition-all"
                  >
                    <X size={12} />
                    Clear
                  </button>
                )}
              </div>

              {/* Questions grid */}
              <div className="flex-1 p-4 sm:p-6">
                {questionsLoading && questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="text-indigo-300 animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">Loading questions…</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Brain size={48} className="text-slate-200" />
                    <p className="text-sm text-slate-400 font-medium text-center">
                      {selectedTopicIds.size === 0
                        ? "Select a topic to narrow results, or adjust your search."
                        : "No questions found for the selected filters."}
                    </p>
                    {selectedTopicIds.size > 0 && (
                      <button onClick={clearFilters} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-medium">
                        {questionsTotal} question{questionsTotal !== 1 ? "s" : ""} found
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white overflow-x-scroll lg:overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-4 py-3 w-12">#</th>
                            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-4 py-3">Question</th>
                            <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-4 py-3 w-48">Difficulty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questions.map((q, i) => (
                            <tr
                              key={q.id}
                              onClick={() => setSelectedQuestion(q)}
                              className="border-b border-slate-100 hover:bg-indigo-50/40 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                                {(page - 1) * PAGE_SIZE + i + 1}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                  {(q.imageUrl || q.boardSnapshotUrl) && (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                      <img
                                        src={q.imageUrl || q.boardSnapshotUrl || ""}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1">
                                      {q.title || "Untitled question"}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                      {q.topicName || q.topic || "No topic"}
                                      {q.questionTypeName ? ` · ${q.questionTypeName}` : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <StarRating level={q.difficultyLevel} size={14} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-medium text-slate-600 px-2">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Question detail dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-xl sm:max-w-2xl rounded-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff] flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-slate-800">Question Details</DialogTitle>
            <button
              onClick={() => setSelectedQuestion(null)}
              className="p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              {/* <X size={18} className="text-slate-500" /> */}
            </button>
          </div>

          {selectedQuestion && (
            <div className="p-5 space-y-4">
              {(selectedQuestion.imageUrl || selectedQuestion.boardSnapshotUrl) && (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <p className="text-[11px] font-semibold text-slate-500 px-3 py-2 border-b border-slate-100 bg-white">
                    {selectedQuestion.imageUrl ? "Attached Image" : "Board Snapshot"}
                  </p>
                  <div className="flex items-center justify-center p-3">
                    <img
                      src={selectedQuestion.imageUrl || selectedQuestion.boardSnapshotUrl || ""}
                      alt="Question media"
                      className="max-w-full rounded-lg object-contain"
                      style={{ maxHeight: 320 }}
                    />
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question</p>
                <p className="mt-2 text-sm text-slate-700 leading-6 font-medium">
                  {selectedQuestion.title || "Untitled question"}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 flex items-center gap-1.5">
                  <Layers size={11} />
                  {selectedQuestion.questionTypeName || `Type ${selectedQuestion.questionType}`}
                </span>
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 flex items-center gap-1.5">
                  <Star size={11} />
                  <StarRating level={selectedQuestion.difficultyLevel} size={12} />
                </span>
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600 flex items-center gap-1.5">
                  <BookOpen size={11} />
                  {selectedQuestion.topicName || selectedQuestion.topic || "No topic"}
                </span>
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600">
                  Status: {selectedQuestion.statusName || `Status ${selectedQuestion.status}`}
                </span>
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600">
                  Marks: {selectedQuestion.marksAllocation}
                </span>
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-600">
                  {selectedQuestion.creationDate}
                </span>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedQuestion(null)} className="h-10 rounded-md px-4">
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedQuestion(null);
                    navigate(`/teacher/assessment/questionlist?subjectId=${selectedSubjectId}&topicId=${selectedQuestion.id}`);
                  }}
                  className="h-10 rounded-md bg-chestnut hover:bg-chestnut/90 text-white px-2 text-sm font-medium flex items-center gap-1.5"
                >
                  <Eye size={10} />
                  View in List
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewQuestions;

import TitleBar from "@/shared/title-bar";
import { Button, Dialog, DialogContent, DialogTitle, Label } from "@bluethub/ui-kit";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { schoolService } from "@/services/school";
import {
  questionService,
  type SubjectQuestionSummaryResponseData,
  type QuestionSummaryDto,
} from "@/services/question";
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
  draftCount: number;
  publishedCount: number;
  pendingReviewCount: number;
}

const ADMIN_ROLES = ["SuperAdministrator", "Administrator"];
const QUESTION_LIST_FILTER_STORAGE_KEY = "teacher-question-list-filters";

type PersistedFilters = {
  classroomId?: string;
  subjectId?: string;
  topicId?: string;
  subTopicId?: string;
};

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
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </Label>
      <select
        value={value ?? ""}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/15 focus:border-chestnut disabled:opacity-50"
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
};

const TopicQuestionList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading, refreshUser } = useAuthContext();
  const isAdmin = ADMIN_ROLES.includes(user?.roleName ?? "");

  const [initialFilters] = useState<PersistedFilters>(() => {
    const fromQuery: PersistedFilters = {
      classroomId: searchParams.get("classroomId") ?? undefined,
      subjectId: searchParams.get("subjectId") ?? undefined,
      topicId: searchParams.get("topicId") ?? undefined,
      subTopicId: searchParams.get("subTopicId") ?? undefined,
    };

    if (fromQuery.classroomId || fromQuery.subjectId || fromQuery.topicId || fromQuery.subTopicId) {
      return fromQuery;
    }

    try {
      const raw = localStorage.getItem(QUESTION_LIST_FILTER_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as PersistedFilters;
      return parsed ?? {};
    } catch {
      return {};
    }
  });

  const [classrooms, setClassrooms] = useState<ApiItem[]>([]);
  const [subjects, setSubjects] = useState<ApiItem[]>([]);
  const [summary, setSummary] = useState<SubjectQuestionSummaryResponseData | null>(null);
  const [questions, setQuestions] = useState<QuestionSummaryDto[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState(0);

  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(initialFilters.classroomId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(initialFilters.subjectId);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(initialFilters.topicId);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<string | undefined>(initialFilters.subTopicId);

  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionSummaryDto | null>(null);

  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

  const selectedClassName = classrooms.find((c) => c.id === selectedClassId)?.name;
  const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.name;

  const fetchQuestions = (
    classroomId: string,
    subjectId: string,
    topicId?: string,
    subTopicId?: string,
  ) => {
    if (!topicId) {
      setQuestions([]);
      setQuestionsTotal(0);
      return;
    }
    setQuestionsLoading(true);
    questionService
      .getQuestionsByClassroomSubjectTopic(classroomId, subjectId, topicId, {
        page: 1,
        pageSize: 50,
        subTopicIds: subTopicId ? [subTopicId] : [],
      })
      .then((res) => {
        const raw = res.data as any;
        const payload = raw.data ?? raw.dat ?? raw;
        const items = raw.questions ?? raw.dat?.questions ?? payload?.questions ?? [];
        const total = raw.totalCount ?? raw.dat?.totalCount ?? payload?.totalCount ?? items.length;
        setQuestions(items);
        setQuestionsTotal(total);
      })
      .catch(() => {
        setQuestions([]);
        setQuestionsTotal(0);
        toast.error("Failed to fetch questions list");
      })
      .finally(() => setQuestionsLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      void refreshUser();
    }
  }, [authLoading, isAdmin]);

  useEffect(() => {
    const payload: PersistedFilters = {
      classroomId: selectedClassId,
      subjectId: selectedSubjectId,
      topicId: selectedTopicId,
      subTopicId: selectedSubTopicId,
    };

    localStorage.setItem(QUESTION_LIST_FILTER_STORAGE_KEY, JSON.stringify(payload));
  }, [selectedClassId, selectedSubjectId, selectedTopicId, selectedSubTopicId]);

  useEffect(() => {
    if (!user?.id) return;

    if (isAdmin) {
      setClassroomsLoading(true);
      schoolService
        .getAllClassRooms()
        .then((res) => {
          const raw = (res.data as any)?.data?.classrooms ?? [];
          const nextClassrooms = raw.map((c: any) => ({ id: String(c.id), name: String(c.name) }));
          setClassrooms(nextClassrooms);
          setSelectedClassId((prev) => {
            if (prev && nextClassrooms.some((c: ApiItem) => c.id === prev)) return prev;
            if (initialFilters.classroomId && nextClassrooms.some((c: ApiItem) => c.id === initialFilters.classroomId)) {
              return initialFilters.classroomId;
            }
            return nextClassrooms[0]?.id;
          });
        })
        .catch(() => toast.error("Failed to load classrooms"))
        .finally(() => setClassroomsLoading(false));
      return;
    }

setClassroomsLoading(true);

const roleData = user?.roleData;
const roleClassrooms = (roleData && isTeacherRoleData(roleData))
  ? roleData.classrooms
  : [];

Promise.resolve(roleClassrooms)
  .then((roleClassrooms) => {
    const pairs: TeacherAssignment[] = [];
    const uniqueClassrooms = new Map<string, ApiItem>();

    for (const [index, c] of roleClassrooms.entries()) {
      if (!c?.classroomId) continue;
      const classroomName = String(c.className ?? `Classroom ${index + 1}`);
      uniqueClassrooms.set(String(c.classroomId), {
        id: String(c.classroomId),
        name: classroomName,
      });

      for (const s of c.subjects ?? []) {
        if (!s?.subjectId || !s?.subjectName) continue;
        pairs.push({
          classroomId: String(c.classroomId),
          className: classroomName,
          subjectId: String(s.subjectId),
          subjectName: String(s.subjectName),
        });
      }
    }

    const nextClassrooms = Array.from(uniqueClassrooms.values());
    setTeacherAssignments(pairs);
    setClassrooms(nextClassrooms);
    setSelectedClassId((prev) => {
      if (prev && nextClassrooms.some((c) => c.id === prev)) return prev;
      if (initialFilters.classroomId && nextClassrooms.some((c) => c.id === initialFilters.classroomId)) {
        return initialFilters.classroomId;
      }
      return nextClassrooms[0]?.id;
    });
  })
  .catch(() => toast.error("Failed to load your assignments"))
  .finally(() => setClassroomsLoading(false));
  }, [initialFilters.classroomId, isAdmin, user?.id, user?.roleData]);

  useEffect(() => {
    if (!selectedClassId) {
      setSubjects([]);
      setSelectedSubjectId(undefined);
      setSelectedTopicId(undefined);
      setSelectedSubTopicId(undefined);
      setSummary(null);
      setQuestions([]);
      setQuestionsTotal(0);
      return;
    }

    setSelectedTopicId(undefined);
    setSelectedSubTopicId(undefined);
    setSummary(null);
    setQuestions([]);
    setQuestionsTotal(0);
    setSubjectsLoading(true);

    if (isAdmin) {
      schoolService
        .getSubjectsByClassroomId(selectedClassId)
        .then((res) => {
          const data = (res.data as any)?.data;
          const major = data?.majorSubjects ?? [];
          const minor = data?.minorSubjects ?? [];
          const flat = [...major, ...minor];
          const nextSubjects = flat.map((s: any) => ({
              id: String(s.subjectId ?? s.id),
              name: String(s.subjectName ?? s.subject ?? s.name),
            }));
          setSubjects(nextSubjects);
          setSelectedSubjectId((prev) => {
            if (prev && nextSubjects.some((s: ApiItem) => s.id === prev)) return prev;
            if (initialFilters.subjectId && nextSubjects.some((s: ApiItem) => s.id === initialFilters.subjectId)) {
              return initialFilters.subjectId;
            }
            return nextSubjects[0]?.id;
          });
        })
        .catch(() => toast.error("Failed to load subjects"))
        .finally(() => setSubjectsLoading(false));
      return;
    }

    const classSubjects = teacherAssignments
      .filter((a) => a.classroomId === selectedClassId)
      .reduce<ApiItem[]>((acc, item) => {
        if (!acc.some((x) => x.id === item.subjectId)) {
          acc.push({ id: item.subjectId, name: item.subjectName });
        }
        return acc;
      }, []);

    setSubjects(classSubjects);
    setSelectedSubjectId((prev) => {
      if (prev && classSubjects.some((s) => s.id === prev)) return prev;
      if (initialFilters.subjectId && classSubjects.some((s) => s.id === initialFilters.subjectId)) {
        return initialFilters.subjectId;
      }
      return classSubjects[0]?.id;
    });
    setSubjectsLoading(false);
  }, [initialFilters.subjectId, isAdmin, selectedClassId, teacherAssignments]);

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setSummary(null);
      return;
    }

    setSummaryLoading(true);
    questionService
      .getSubjectQuestionSummary(selectedClassId, selectedSubjectId, selectedSubTopicId)
      .then((res) => {
        const raw = res.data as any;
        setSummary(raw?.data ?? raw?.dat ?? null);
      })
      .catch(() => {
        setSummary(null);
        toast.error("Failed to fetch subject summary");
      })
      .finally(() => setSummaryLoading(false));
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setQuestions([]);
      setQuestionsTotal(0);
      return;
    }

    fetchQuestions(selectedClassId, selectedSubjectId, selectedTopicId, selectedSubTopicId);
  }, [selectedClassId, selectedSubjectId, selectedTopicId, selectedSubTopicId]);

  const subtopics = useMemo<SubTopicChip[]>(() => {
    const topics = summary?.topics ?? [];
    const filteredTopics = selectedTopicId
      ? topics.filter((topic) => topic.topicId === selectedTopicId)
      : topics;
    return filteredTopics.flatMap((t) =>
      (t.subTopics ?? []).map((s) => ({
        id: s.subTopicId,
        name: s.subTopicName,
        topicId: t.topicId,
        topicName: t.topicName,
        questionCount: s.questionCount,
        draftCount: s.draftCount,
        publishedCount: s.publishedCount,
        pendingReviewCount: s.pendingReviewCount,
      })),
    );
  }, [summary, selectedTopicId]);

  const allSubtopics = useMemo<SubTopicChip[]>(() => {
    const topics = summary?.topics ?? [];
    return topics.flatMap((t) =>
      (t.subTopics ?? []).map((s) => ({
        id: s.subTopicId,
        name: s.subTopicName,
        topicId: t.topicId,
        topicName: t.topicName,
        questionCount: s.questionCount,
        draftCount: s.draftCount,
        publishedCount: s.publishedCount,
        pendingReviewCount: s.pendingReviewCount,
      })),
    );
  }, [summary]);

  const topics = useMemo(() => summary?.topics ?? [], [summary]);

  const selectedSubtopic = subtopics.find((s) => s.id === selectedSubTopicId);

  const handleSubTopicSelect = (subtopic: SubTopicChip) => {
    if (!selectedClassId || !selectedSubjectId) return;

    const params = new URLSearchParams({
      classroomId: selectedClassId,
      subjectId: selectedSubjectId,
      topicId: subtopic.topicId,
      subTopicId: subtopic.id,
      subTopicName: subtopic.name,
      subjectName: selectedSubjectName ?? "",
    });

    navigate(`/teacher/assessment/questionlist/subtopic?${params.toString()}`);
  };

  const displayedQuestions = questions;

  const createQuizHref = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClassId) params.set("classroomId", selectedClassId);
    if (selectedSubjectId) params.set("subjectId", selectedSubjectId);
    if (selectedSubtopic?.topicId) params.set("topicId", selectedSubtopic.topicId);
    else if (selectedTopicId) params.set("topicId", selectedTopicId);
    if (selectedSubtopic?.id) params.set("subTopic", selectedSubtopic.id);

    const query = params.toString();
    return `/teacher/assessment/createQuiz${query ? `?${query}` : ""}`;
  }, [selectedClassId, selectedSubjectId, selectedSubtopic, selectedTopicId]);

  return (
    <div className="font-poppins">
      <div className=" border border-white/20 overflow-hidden bg-white/80 backdrop-blur-sm">
        <TitleBar title="question" hasVertical hasBackIcons onBack={() => navigate(-1)} />

        <div className="md:p-5 space-y-4 sm:space-y-5 p-2">
          <div className="rounded-md bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff] border border-[#f3dccb] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-sm sm:text-base font-bold text-chestnut leading-tight">
                  {selectedSubjectName ?? "Question Library"}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {selectedClassName ? `${selectedClassName} class` : "Select a class and subject"}
                </p>
              </div>
              <Link
                to={createQuizHref}
                className="inline-flex items-center justify-center rounded-md bg-chestnut px-4 py-2.5 text-sm font-medium text-white hover:bg-chestnut/90"
              >
                Upload Question
              </Link>
            </div>
          </div>

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

          <div className="rounded-md border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-700">Topics</h2>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTopicId(undefined);
                  setSelectedSubTopicId(undefined);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  !selectedTopicId
                    ? "bg-chestnut text-white border-chestnut"
                    : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                }`}
              >
                All topics
              </button>
              {topics.map((topic) => {
                const active = selectedTopicId === topic.topicId;
                return (
                  <button
                    key={topic.topicId}
                    type="button"
                    onClick={() => {
                      setSelectedTopicId(topic.topicId);
                      setSelectedSubTopicId(undefined);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-chestnut text-white border-chestnut"
                        : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                    }`}
                  >
                    {topic.topicName} ({topic.questionCount})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-700">Subtopics</h2>
              {summaryLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedSubTopicId(undefined)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                  !selectedSubTopicId
                    ? "bg-chestnut text-white border-chestnut"
                    : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                }`}
              >
                All subtopics ({summary?.totalQuestions ?? 0})
              </button>

              {subtopics.map((sub) => {
                const active = selectedSubTopicId === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubTopicSelect(sub)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-chestnut text-white border-chestnut"
                        : "bg-white text-slate-600 border-slate-200 hover:border-chestnut/40"
                    }`}
                  >
                    {sub.name} ({sub.questionCount})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Questions</p>
              <p className="text-xl font-bold text-chestnut mt-1">{questionsTotal}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Subtopics</p>
              <p className="text-xl font-bold text-chestnut mt-1">{allSubtopics.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Published</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{summary?.statusSummary?.published ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Saved</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{summary?.statusSummary?.published ?? 0}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Pending Review</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{summary?.statusSummary?.pendingReview ?? 0}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-3 col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-widest text-slate-400">Selection</p>
              <p className="text-sm font-semibold text-slate-700 mt-1 truncate">
                {selectedSubtopic ? `${selectedSubtopic.name}` : "All subtopics"}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">All Subtopics</h3>
              <span className="text-xs font-semibold text-slate-500">
                {allSubtopics.length} total
              </span>
            </div>

            {!summaryLoading && allSubtopics.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No subtopics available for this class and subject.
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {allSubtopics.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSubTopicSelect(sub)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    selectedSubTopicId === sub.id ? "bg-chestnut/5" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{sub.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{sub.topicName}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold">
                        <span className="text-emerald-600">Saved {sub.publishedCount}</span>
                        <span className="text-indigo-600">Pending {sub.pendingReviewCount}</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-chestnut/10 text-chestnut text-xs font-semibold px-2.5 py-1">
                      {sub.questionCount} questions
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Difficulty Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {(summary?.difficultyBreakdown ?? []).map((row) => (
                <span key={row.difficultyLevel} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  {row.difficultyLevelName}: {row.questionCount}
                </span>
              ))}
            </div>
            <h3 className="text-sm font-semibold text-slate-700 pt-1">Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {(summary?.typeBreakdown ?? []).map((row) => (
                <span key={row.questionType} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  {row.questionTypeName}: {row.questionCount}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Questions List</h3>
              {questionsLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            {!!selectedSubtopic && (
              <div className="px-4 py-2 text-xs font-semibold text-chestnut bg-chestnut/5 border-b border-slate-100">
                Showing questions for: {selectedSubtopic.name}
              </div>
            )}

            {!questionsLoading && displayedQuestions.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                No saved questions available for this selection.
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {displayedQuestions.map((question, idx) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setSelectedQuestion(question)}
                  className="w-full text-left px-4 py-3 sm:py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">#{idx + 1}</p>
                      <p className="text-sm font-semibold text-slate-700 leading-5 mt-0.5">
                        {question.title || "Untitled question"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {question.topic || "No topic"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                        {question.status}
                      </span>
                      {(question.imageUrl || question.boardSnapshotUrl) && (
                        <img
                          src={question.imageUrl || question.boardSnapshotUrl || ""}
                          alt=""
                          className="h-8 w-8 rounded-md object-cover border border-slate-200 mt-0.5"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
            <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-[#fff] to-[#eef6ff]">
                <DialogTitle className="text-base font-semibold text-slate-800">Question Details</DialogTitle>
              </div>

              {selectedQuestion && (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Question</p>
                    <p className="mt-2 text-sm text-slate-700 leading-6">
                      {selectedQuestion.title || "Untitled question"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Type: {selectedQuestion.questionTypeName || `Type ${selectedQuestion.questionType}`}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Difficulty: {selectedQuestion.difficultyLevelName || `Level ${selectedQuestion.difficultyLevel}`}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Topic: {selectedQuestion.topicName || selectedQuestion.topic || "No topic"}
                    </span>
                    <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600">
                      Status: {selectedQuestion.statusName || `Status ${selectedQuestion.status}`}
                    </span>
                  </div>

                  {/* Image / Board Snapshot preview */}
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

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setSelectedQuestion(null)}
                      className="h-10 rounded-xl bg-chestnut hover:bg-chestnut/90 text-white px-4"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <div className="sm:hidden">
            <Button
              onClick={() => navigate(createQuizHref)}
              className="w-full py-5 rounded-md bg-chestnut hover:bg-chestnut/90 text-white font-semibold"
            >
              Upload Question
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicQuestionList;
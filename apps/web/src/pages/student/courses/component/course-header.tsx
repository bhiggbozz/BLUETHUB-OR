import { BookOpen, Clock, FileText, Star, AlertCircle } from "lucide-react";
import StatPill from "./stat-pill";
import { useEffect, useMemo, useState } from "react";
import studentService, { type StudentSubjectLessonsResponse } from "@/services/student";
import { AxiosError } from "axios";
import { useParams } from "react-router-dom";
import quizService, { type SubjectQuizItemDto } from "@/services/quiz";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return (
      error.response?.data?.responseMessage ??
      error.response?.data?.message ??
      error.message ??
      fallback
    );
  }
  return error instanceof Error ? error.message : fallback;
}

function CourseHeaderSkeleton() {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#4F61EB,#0038AB)] px-5 py-6 text-white sm:px-8 sm:py-8 font-poppins">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 sm:h-56 sm:w-56" />
      <div className="relative flex items-start justify-between">
        <div className="w-2/3 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-white/20" />
          <div className="h-7 w-48 animate-pulse rounded bg-white/25" />
          <div className="h-4 w-32 animate-pulse rounded bg-white/15" />
        </div>
        <div className="hidden h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-white/15 sm:flex sm:h-16 sm:w-16" />
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-white/15" />
        ))}
      </div>
    </div>
  );
}

function CourseHeaderError({ message }: { message: string }) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#4F61EB,#0038AB)] px-5 py-6 text-white sm:px-8 sm:py-8 font-poppins">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 sm:h-56 sm:w-56" />
      <div className="relative flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-200" />
        <div>
          <p className="text-sm font-semibold">Couldn&apos;t load this subject</p>
          <p className="text-xs text-white/70">{message}</p>
        </div>
      </div>
    </div>
  );
}

function CourseHeader() {
  const { subjectId } = useParams();
  const [subjectSummary, setSubjectSummary] = useState<StudentSubjectLessonsResponse | null>(null);
  const [quizzes, setQuizzes] = useState<SubjectQuizItemDto[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) {
      setErrorMessage("Subject ID is required");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const [lessonsResponse, quizResponse] = await Promise.all([
          studentService.getLessonsBySubject(subjectId),
          quizService.getSubjectQuizzes(subjectId),
        ]);

        if (!isMounted) return;

        if (!lessonsResponse.data.status) {
          setErrorMessage(lessonsResponse.data.responseMessage ?? "Failed to load subject details");
          return;
        }

        setSubjectSummary(lessonsResponse.data.data as unknown as StudentSubjectLessonsResponse);
        setQuizzes((quizResponse.data.data as unknown as SubjectQuizItemDto[]) ?? []);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "Something went wrong while loading this subject"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  const lessons = subjectSummary?.lessons ?? [];

  const lessonsMedia = useMemo(() => lessons.flatMap((lesson) => lesson.media), [lessons]);

  const uniqueTopicCount = useMemo(
    () => new Set(lessons.map((lesson) => lesson.topicId)).size,
    [lessons]
  );

  if (loading) {
    return <CourseHeaderSkeleton />;
  }

  if (errorMessage) {
    return <CourseHeaderError message={errorMessage} />;
  }

  const firstLesson = lessons[0];

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#4F61EB,#0038AB)] px-5 py-6 text-white sm:px-8 sm:py-8 font-poppins">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 sm:h-56 sm:w-56" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/65 sm:text-sm">
            {"Science Department"}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {firstLesson?.subjectName ?? "Untitled Subject"}
          </h1>
          <p className="mt-0.5 text-sm text-white/80 sm:text-base">
            {firstLesson?.teacherName ?? "Teacher unassigned"}
          </p>
        </div>
        <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex sm:h-16 sm:w-16">
          <span className="text-2xl sm:text-3xl">🔬</span>
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <StatPill icon={<BookOpen className="h-3.5 w-3.5" />} label={`${uniqueTopicCount} Topics`} />
        <StatPill icon={<Clock className="h-3.5 w-3.5" />} label={`${lessons.length} Lessons`} />
        <StatPill icon={<FileText className="h-3.5 w-3.5" />} label={`${lessonsMedia.length} Media`} />
        <StatPill icon={<Star className="h-3.5 w-3.5" />} label={`${quizzes.length} Quizzes`} />
      </div>
    </div>
  );
}

export default CourseHeader;
import { Badge, Button, Card, CardContent } from "@bluethub/ui-kit";
import { AlertCircle, Play } from "lucide-react";
import StatBlock from "./stat-block";
import ActivityDot from "./activity-dot";
import type { ActivityItem, ContinueLearning } from "../interfaces";
import { isStudentRoleData, useAuthContext } from "@/contexts/auth-context";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { studentService, type StudentSubjectLessonsResponse } from "@/services/student";
import { quizService, type SubjectQuizItemDto } from "@/services/quiz";
import { getErrorMessage } from "./course-header";

// ---------------------------------------------------------------------------
// TODO(backend): everything below is placeholder data with no API behind it
// yet. Wiring notes for whoever picks these up:
//   - DEFAULT_DESCRIPTION: needs a subject-level description field — surface
//     it once `getLessonsBySubject` (or a subject-metadata endpoint) returns
//     one, and drop this constant.
//   - FALLBACK_ACTIVITY: needs a "recent activity" endpoint (completions,
//     quiz scores, downloads) scoped to this subject + student.
//   - continueLearning below is derived from `lessons[0]` as a stand-in for
//     "last opened lesson" — there's no last-accessed/progress field on the
//     current DTO to compute a real one from.
// ---------------------------------------------------------------------------

const DEFAULT_DESCRIPTION =
  "Explore the natural world through hands-on science. This course covers living things, the solar system, matter, energy, the environment, and human body systems — building a strong foundation for senior science.";

const FALLBACK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    label: "Completed",
    highlight: "Living Things — Cell Structure",
    timestamp: "Today",
    dotColor: "green",
  },
  {
    id: "2",
    label: "Scored",
    highlight: "85% on Topic 1 Quiz",
    timestamp: "Yesterday",
    dotColor: "blue",
  },
  {
    id: "3",
    label: "Downloaded",
    highlight: "Matter & Materials PDF",
    timestamp: "Mon",
    dotColor: "orange",
  },
  {
    id: "4",
    label: "Completed",
    highlight: "Living Things — Photosynthesis",
    timestamp: "Mon",
    dotColor: "green",
  },
];

// ---------------------------------------------------------------------------
// Loading / error states
// ---------------------------------------------------------------------------

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-none shadow-sm">
        <CardContent className="flex items-center gap-4 px-4 py-4">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 flex-1 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-10 shrink-0 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load this subject</p>
        <p className="text-xs text-rose-500 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

function OverviewTab() {
  const { user } = useAuthContext();
  const roleData = user?.roleData;
  const studentRoleData = roleData && isStudentRoleData(roleData) ? roleData : null;
  const userClass = studentRoleData?.classroom.className;

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

  const tags = [userClass, "Second Term", "WAEC Aligned", "Practical"].filter(
    (tag): tag is string => Boolean(tag)
  );

  const lessons = subjectSummary?.lessons ?? [];

  const uniqueTopicCount = useMemo(
    () => new Set(lessons.map((lesson) => lesson.topicId)).size,
    [lessons]
  );

  // See TODO block above — stand-in until there's a real "last opened lesson" source.
  const continueLearning: ContinueLearning | null = lessons[0]
    ? {
        topicLabel: "Pick up where you left off",
        title: lessons[0].subjectName,
        subtitleMeta: "",
        durationMinutes: 0,
      }
    : null;

  const activity = FALLBACK_ACTIVITY;

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (errorMessage) {
    return <OverviewError message={errorMessage} />;
  }

  return (
    <div className="space-y-4">
      {continueLearning && (
        <Card className="overflow-hidden border-none bg-gradient-to-r from-[#4F61E8]  to-[#7C4DFF] text-white shadow-sm">
          <CardContent className="flex items-center justify-between gap-4 px-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full bg-white/20 text-white hover:bg-white/30"
                aria-label="Continue lesson"
              >
                <Play className="h-5 w-5 fill-current" />
              </Button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70 sm:text-xs">
                  {continueLearning.topicLabel}
                </p>
                <p className="truncate text-sm font-semibold sm:text-base">{continueLearning.title}</p>
                {continueLearning.durationMinutes > 0 && (
                  <p className="text-xs text-white/70 sm:text-sm">
                    {continueLearning.subtitleMeta} · {continueLearning.durationMinutes} min
                  </p>
                )}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
              aria-label="Play"
            >
              <Play className="h-4 w-4 fill-current" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="">
          <div className="flex  gap-3 ">
            <StatBlock value={uniqueTopicCount} label="Topics" />
            <StatBlock value={lessons.length} label="Lessons" />
            <StatBlock value={quizzes.length} label="Quizzes" />
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {DEFAULT_DESCRIPTION}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full bg-[#292382]/10 text-[#292382] hover:bg-[#292382]/10">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold sm:text-base">Recent activity</span>
            <Button variant="link" className="h-auto p-0 text-sm text-[#292382]">
              See all
            </Button>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ActivityDot color={item.dotColor} />
                    <p className="text-sm text-foreground sm:text-base">
                      {item.label} <span className="font-semibold">{item.highlight}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">{item.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OverviewTab;
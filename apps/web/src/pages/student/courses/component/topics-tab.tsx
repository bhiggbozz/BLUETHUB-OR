import { AlertCircle, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@bluethub/ui-kit";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import TopicRow from "./topic-row";
import { schoolService } from "@/services/school";
import { getErrorMessage } from "./course-header";
import { isStudentRoleData, useAuthContext } from "@/contexts/auth-context";
import type { Topic } from "../interfaces";

// ---------------------------------------------------------------------------
// Skeleton — mirrors TopicRow's collapsed-state layout
// ---------------------------------------------------------------------------

function TopicRowSkeleton() {
  return (
    <Card className="border-none shadow-sm p-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
        </div>
        <span className="h-5 w-5 shrink-0 animate-pulse rounded bg-slate-200" />
      </CardContent>
    </Card>
  );
}

function TopicListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TopicRowSkeleton key={i} />
      ))}
    </div>
  );
}

function TopicsError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load topics</p>
        <p className="text-xs text-rose-500 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

function TopicsEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
      <FolderOpen className="h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-500">No topics yet</p>
      <p className="text-xs text-slate-400 sm:text-sm">
        Topics and lessons for this subject will show up here once your teacher publishes them.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

function TopicsTab() {
  const { subjectId } = useParams();
  const { user } = useAuthContext();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const roleData = user?.roleData;
  const studentRoleData = roleData && isStudentRoleData(roleData) ? roleData : null;
  const classroomId = studentRoleData?.classroom.classroomId;

  useEffect(() => {
    if (!subjectId) {
      setErrorMessage("Subject ID is required");
      setLoading(false);
      return;
    }

    // classroomId comes from the auth context, which can still be hydrating
    // on first render — wait for it rather than firing the request with
    // `undefined` and having to refetch a moment later.
    if (!classroomId) return;

    let isMounted = true;

    const loadTopics = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await schoolService.getSubjectCurriculum(subjectId, classroomId);
        if (!isMounted) return;
        setTopics(res.data.data.topics);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "Something went wrong while loading this subject"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, [subjectId, classroomId]);

  const totalLessons = useMemo(
    () => topics.reduce((sum, t) => sum + t.subTopics.length, 0),
    [topics]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium sm:text-base">All Topics</span>
        {!loading && !errorMessage && (
          <span className="text-xs font-medium text-[#292382] sm:text-sm">
            {topics.length} Topics · {totalLessons} Lessons
          </span>
        )}
      </div>

      {loading ? (
        <TopicListSkeleton />
      ) : errorMessage ? (
        <TopicsError message={errorMessage} />
      ) : topics.length === 0 ? (
        <TopicsEmpty />
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TopicsTab;
import { AlertCircle, FileX2 } from "lucide-react";
import { Card, CardContent } from "@bluethub/ui-kit";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import studentService, { type StudentPublishedLesson, type StudentLessonMedia } from "@/services/student";
import MediaRow  from "./media-row";
import { getErrorMessage } from "./course-header";

// ---------------------------------------------------------------------------
// Skeleton — mirrors MediaRow's exact layout so the swap-in on load is seamless
// ---------------------------------------------------------------------------

function MediaRowSkeleton() {
  return (
    <Card className="border-none shadow-sm p-0">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
        <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200" />
      </CardContent>
    </Card>
  );
}

function MediaListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <MediaRowSkeleton key={i} />
      ))}
    </div>
  );
}

function MediaError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load study materials</p>
        <p className="text-xs text-rose-500 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

function MediaEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 py-10 text-center">
      <FileX2 className="h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-500">No study materials yet</p>
      <p className="text-xs text-slate-400 sm:text-sm">
        PDFs, images, and videos your teacher shares here will show up in this tab.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

function PdfsTab() {
  const { subjectId } = useParams();

  const [lessons, setLessons] = useState<StudentPublishedLesson[]>([]);
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
        const response = await studentService.getLessonsBySubject(subjectId);
        if (!isMounted) return;

        if (!response.data.status) {
          setErrorMessage(response.data.responseMessage ?? "Failed to load subject details");
          return;
        }

        setLessons(response.data.data.lessons);
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

  const mediaList = useMemo<StudentLessonMedia[]>(
    () => lessons.flatMap((lesson) => lesson.media ?? []),
    [lessons]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium sm:text-base">Study Materials &amp; PDFs</span>
        {!loading && !errorMessage && (
          <span className="text-xs font-medium text-[#292382] sm:text-sm">{mediaList.length} Files</span>
        )}
      </div>

      {loading ? (
        <MediaListSkeleton />
      ) : errorMessage ? (
        <MediaError message={errorMessage} />
      ) : mediaList.length === 0 ? (
        <MediaEmpty />
      ) : (
        <div className="space-y-3">
          {mediaList.map((media) => (
            <MediaRow key={media.lessonContentId ?? media.mediaId} media={media} />
          ))}
        </div>
      )}
    </div>
  );
}

export default PdfsTab;
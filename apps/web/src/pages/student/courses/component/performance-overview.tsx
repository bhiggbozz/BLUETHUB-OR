import { useEffect, useState } from "react";
import PerformanceCard, { PerformanceCardSkeleton } from "./performance-card";
import { type MyCourseDetailDto, performanceService } from "@/services/performance";
import { useParams } from "react-router-dom";
import { getErrorMessage } from "./course-header";
import { AlertCircle } from "lucide-react";

function PerformanceError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4">
      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
      <div>
        <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load your performance</p>
        <p className="text-xs text-rose-500 sm:text-sm">{message}</p>
      </div>
    </div>
  );
}

function PerformanceOverview() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseDetail, setCourseDetail] = useState<MyCourseDetailDto | null>(null);
  const { subjectId = "" } = useParams<{ subjectId: string }>();

  useEffect(() => {
    if (!subjectId) {
      setErrorMessage("Subject ID is required");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadPerformance = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const res = await performanceService.getMyCourseDetail(subjectId);
        if (!isMounted) return;

        if (!res.data.status) {
          setErrorMessage(res.data.responseMessage ?? "Failed to load your performance");
          return;
        }

        setCourseDetail(res.data.data);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(getErrorMessage(error, "Something went wrong while loading this subject"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPerformance();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  return (
    <div className="mb-4">
      <span className="mb-3 block px-1 text-sm font-semibold text-[#3A3A3A] sm:text-base">
        Your performance
      </span>

      {errorMessage ? (
        <PerformanceError message={errorMessage} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {loading || !courseDetail ? (
            <>
              <PerformanceCardSkeleton />
              <PerformanceCardSkeleton />
            </>
          ) : (
            <>
              <PerformanceCard label="Quizzes" accent="quiz" stats={courseDetail.quiz} />
              <PerformanceCard label="Assessments" accent="assessment" stats={courseDetail.assessment} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PerformanceOverview;
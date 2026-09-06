import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { BookOpen, GraduationCap } from "lucide-react";
import { setCurrentTime } from "@/store/class-action-slice";
import { Tooltip, TooltipContent, TooltipTrigger } from "@bluethub/ui-kit";

interface ActiveLesson {
  lesson: {
    id: string;
    // flat shape from LessonForClassDto (via PreClassModal)
    topicName?: string;
    subTopic?: string;
    subTopicName?: string;
    subtopic?: string;
    subtopicName?: string;
    subTopicObj?: { name?: string };
    subjectName?: string;
    name?: string;
    className?: string;
    durationMinutes?: number | null;
    // legacy nested shape (recovery flow)
    topic?: string;
    aim?: string;
    subject?: { name: string };
    classroom?: { name: string };
  };
  startedAt: string;
}

const Topic = () => {
  const dispatch = useDispatch();
  const [lessonData, setLessonData] = useState<ActiveLesson | null>(null);
  console.log("lessonData:", lessonData);

  const pickText = (...values: Array<string | undefined | null>) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    return "";
  };

  useEffect(() => {
    const storedLesson = sessionStorage.getItem("activeLesson");
    if (storedLesson) {
      try {
        const parsed = JSON.parse(storedLesson) as ActiveLesson;
        setLessonData(parsed);

        const minutes = parsed.lesson?.durationMinutes;
        if (minutes && minutes > 0) {
          const mm = String(minutes).padStart(2, "0");
          dispatch(setCurrentTime(`${mm}:00`));
        }
      } catch (e) {
        console.error("Failed to parse activeLesson:", e);
      }
    }
  }, [dispatch]);

  const subjectName =
    lessonData?.lesson?.subjectName ||
    lessonData?.lesson?.subject?.name ||
    "Subject";
  const className =
    lessonData?.lesson?.className ||
    lessonData?.lesson?.name ||
    lessonData?.lesson?.classroom?.name ||
    "Class";
  const topic =
    lessonData?.lesson?.topicName ||
    lessonData?.lesson?.topic ||
    "New Lesson";

  const lesson = lessonData?.lesson as Record<string, unknown> | undefined;
  const subTopic = pickText(
    lessonData?.lesson?.subTopic,
    lessonData?.lesson?.subTopicName,
    lessonData?.lesson?.subtopic,
    lessonData?.lesson?.subtopicName,
    typeof lesson?.subTopic === "object" && lesson?.subTopic !== null
      ? (lesson.subTopic as { name?: string }).name
      : undefined,
    typeof lesson?.subTopicObj === "object" && lesson?.subTopicObj !== null
      ? (lesson.subTopicObj as { name?: string }).name
      : undefined
  );

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      {/* Subject & Class Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700">{subjectName}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">{className}</span>
        </div>
      </div>

      {/* Topic & Subtopic */}
      <div className="flex  items-center gap-2">
        <div className="w-px h-6 bg-gray-200" />
        <div className="flex flex-col truncate leading-tight">
          <Tooltip>
            <TooltipTrigger>
              <h2 className="font-poppins font-semibold text-sm md:text-base text-gray-800 max-w-xl truncate leading-tight">
                {topic}
              </h2></TooltipTrigger>
            <TooltipContent side='bottom'>
              {topic}
            </TooltipContent>
          </Tooltip>

          {subTopic && (
            <span className="text-xs text-gray-500 max-w-xs truncate leading-tight">
              {subTopic}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Topic;

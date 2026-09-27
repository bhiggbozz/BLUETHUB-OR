import { Card, CardContent, Progress } from "@bluethub/ui-kit";

function CourseProgressCard() {

    const course = {
        department: "Science Department",
        title: "Basic Science",
        teacher: "Mr. Emeka Nwosu",
        topicsCount: 6,
        lessonsCount: 18,
        pdfsCount: 5,
        quizzesCount: 8,
        progressPercent: 42,
        lessonsCompleted: 7,
        topicsRemaining: 3,
        description:
            "",
        tags: ["JSS 2", "Second Term", "WAEC Aligned", "Practical"],
    };
  return (
    <Card className="border-none rounded-md shadow-sm py-[14px] px-4">
      <CardContent className="px-2 space-y-[6px]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#4A5568] sm:text-base">Course progress</span>
          <span className="text-sm font-bold text-[#4F61E8] sm:text-base">{course.progressPercent}%</span>
        </div>
        <Progress color="bg-[linear-gradient(180deg,#4F61EB,#0038AB)]" value={course.progressPercent} className="h-2 bg-[#E2E8F0]" />
        <p className="text-xs text-[#94A3B8] sm:text-sm">
          {course.lessonsCompleted} of {course.lessonsCount} lessons completed · {course.topicsRemaining} topics remaining
        </p>
      </CardContent>
    </Card>
  );
}


export default CourseProgressCard
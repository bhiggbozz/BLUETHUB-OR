import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Video, Loader2, ArrowLeft, Users, Calendar as CalendarIcon } from "lucide-react";
import { Button, Input, Label } from "@bluethub/ui-kit";
import StudentMultiSelect from "@/component/student-multi-select";
import { liveClassService } from "@/services/live-class";
import type { LessonItem } from "@/services/lesson";
import { getErrorMessage } from "@/utils/errors";

const MAX_STUDENTS = 3;
const MIN_DURATION = 5;
const MAX_DURATION = 40;
const DEFAULT_DURATION = 40;

/** `datetime-local`'s value has no timezone — sent bare (no offset suffix),
 * the backend reads it as school time (WAT) directly, per the brief. We
 * never attach our own offset guess here. */
const toLocalDatetimeMin = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const CreateLiveClass = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lesson = (location.state as { lesson?: LessonItem } | null)?.lesson ?? null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lesson) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50/50 p-6 text-center font-poppins">
        <p className="text-sm text-gray-500">Pick a lesson to start from first.</p>
        <Button onClick={() => navigate("/teacher/live-class")}>Back to Live Classes</Button>
      </div>
    );
  }

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_STUDENTS) {
        next.add(id);
      } else {
        toast.error(`A live class can have at most ${MAX_STUDENTS} students.`);
      }
      return next;
    });
  };

  const lessonTitle = [lesson.subjectName, lesson.topicName, lesson.subTopic || lesson.subTopicName]
    .filter(Boolean)
    .join(" - ") || "Lesson";

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError("Pick at least one student.");
      return;
    }
    if (!scheduledStart) {
      setError("Pick a date and time to start the class.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await liveClassService.create({
        lessonId: lesson.id,
        studentIds: Array.from(selectedIds),
        title: title.trim() || undefined,
        scheduledStart,
        durationMinutes,
      });
      toast.success("Live class scheduled.");
      navigate("/teacher/live-class");
    } catch (err) {
      setError(getErrorMessage(err, "Could not schedule the live class."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-3 font-poppins">
      <button
        onClick={() => navigate("/teacher/live-class")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chestnut/10">
            <Video size={22} className="text-chestnut" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Schedule a live class</h1>
            <p className="text-sm text-gray-500">{lessonTitle}</p>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5">
          <div className="space-y-1.5">
            <Label htmlFor="live-class-title" className="text-xs font-bold text-gray-700">
              Title (optional)
            </Label>
            <Input
              id="live-class-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={lesson.aim || lessonTitle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="live-class-start" className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <CalendarIcon className="size-3.5" /> Starts at
              </Label>
              <Input
                id="live-class-start"
                type="datetime-local"
                value={scheduledStart}
                min={toLocalDatetimeMin()}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-class-duration" className="text-xs font-bold text-gray-700">
                Length (minutes)
              </Label>
              <Input
                id="live-class-duration"
                type="number"
                min={MIN_DURATION}
                max={MAX_DURATION}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(
                    Math.min(MAX_DURATION, Math.max(MIN_DURATION, Number(e.target.value) || DEFAULT_DURATION))
                  )
                }
              />
            </div>
          </div>

          <StudentMultiSelect
            selectedIds={selectedIds}
            onToggle={toggleStudent}
            maxStudents={MAX_STUDENTS}
            label="Students"
            hint={`Pick 1 to ${MAX_STUDENTS} students from this lesson's class to join the live session.`}
          />

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            Only the students you pick here can join, and the time slot can't be changed once the class starts —
            you can still reschedule or cancel before then from the Live Classes list.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedIds.size === 0}
            className="flex w-full items-center justify-center gap-2 bg-chestnut text-white hover:bg-chestnut/90"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            {submitting ? "Scheduling..." : "Schedule live class"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateLiveClass;

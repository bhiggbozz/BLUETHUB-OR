import type { NavigateFunction } from "react-router-dom";
import type { LessonForClassDto } from "@/services/lesson";
import { boardSessionService } from "@/services/board-session";

// The teacher whiteboard (ClassRoom/Class, layouts/teacher/class + pages/teacher/note-board)
// has no backend "create session" call — a board session is just whatever
// lessonId ends up in sessionStorage.activeLesson, implicitly created by the
// first stroke/audio batch POST. So reusing it for a student just means
// writing the same sessionStorage shape with the group content's id as the
// lessonId, plus a few overrides (see end-class.tsx / class-room.tsx) that
// tell the shared component where "exit" should go instead of /teacher.
export interface StudentBoardContent {
  contentId: string;
  groupId: string;
  aim: string;
  // Only used for the board's cosmetic topic display (same flat/nested field
  // mismatch already present in the teacher flow means it's never load-bearing) —
  // fine to omit when resuming a recording for existing content that doesn't
  // carry its subjectId in the group-detail summary.
  subjectId?: string;
  subjectName?: string;
  classroomId: string;
  groupName?: string;
  subTopic?: string | null;
}

export function launchStudentBoard(
  navigate: NavigateFunction,
  content: StudentBoardContent,
  exitPath: string
) {
  const lesson: LessonForClassDto = {
    id: content.contentId,
    aim: content.aim,
    description: "",
    status: "PendingApproval",
    createdAt: new Date().toISOString(),
    approvedAt: null,
    subTopic: content.subTopic ?? "",
    subTopicId: "",
    classroomId: content.classroomId,
    name: content.aim,
    className: content.groupName ?? "",
    subjectId: content.subjectId ?? "",
    subjectName: content.subjectName ?? "",
    topicId: "",
    topicName: "",
    teacherId: "",
    teacherName: "",
    teacherEmail: "",
    approvedByName: null,
    accessDate: null,
    accessTime: null,
    durationMinutes: null,
    accessEndsAt: null,
    isAccessOpen: true,
  };

  localStorage.removeItem("continueSessionId");
  localStorage.removeItem("continueLessonId");

  sessionStorage.setItem("boardMode", "student");
  sessionStorage.setItem("boardExitPath", exitPath);
  sessionStorage.setItem("boardDraftsPath", exitPath);
  // Routes stroke-batch uploads to the group-content pipeline (its own
  // queue/worker/Mongo collection, keyed by groupId + studentId + contentId +
  // batchIndex — no sessionId) instead of the teacher's live-session endpoint.
  // contentId scopes the recording to this one specific submission so a
  // second recording for a different submission in the same group can never
  // overwrite or leak into this one.
  sessionStorage.setItem("boardGroupId", content.groupId);
  sessionStorage.setItem("boardContentId", content.contentId);
  sessionStorage.setItem("activeLesson", JSON.stringify({
    lesson,
    media: [],
    startedAt: new Date().toISOString(),
  }));

  navigate("/student/board", { state: { lessonId: lesson.id, lesson, media: [] } });
}

/**
 * Checks this specific content item's recording slot before opening the
 * board, and only launches when it's actually safe to. A content item that's
 * already been decided (Approved/Rejected) can no longer have its recording
 * changed; "Recorded" means this content already has a finished recording.
 * Fails open (launches anyway) if the status check itself errors, so a
 * backend hiccup doesn't block a student who has never recorded anything.
 */
export async function launchStudentBoardWithStatusCheck(
  navigate: NavigateFunction,
  content: StudentBoardContent,
  exitPath: string,
  toastFn: { error: (msg: string) => void; (msg: string, opts?: { icon?: string }): void }
): Promise<void> {
  try {
    const result = await boardSessionService.getGroupContentStatus(content.groupId, content.contentId);

    switch (result.status) {
      case "NoActiveContent":
        launchStudentBoard(navigate, content, exitPath);
        return;
      case "RecordingInProgress": {
        const minutes = (result.lastBatchIndex ?? 0) + 1;
        toastFn(`Continuing — ${minutes} minute${minutes === 1 ? "" : "s"} already saved from your last recording.`, { icon: "🎥" });
        launchStudentBoard(navigate, content, exitPath);
        return;
      }
      case "Recorded":
        toastFn.error("This content already has a recording — check your content list to review or submit it.");
        return;
      case "Approved":
        toastFn.error("This content has already been approved — its recording can no longer be changed.");
        return;
      case "Rejected":
        toastFn.error(
          result.rejectionReason
            ? `This content was rejected: ${result.rejectionReason}`
            : "This content was rejected."
        );
        return;
    }
  } catch {
    launchStudentBoard(navigate, content, exitPath);
  }
}

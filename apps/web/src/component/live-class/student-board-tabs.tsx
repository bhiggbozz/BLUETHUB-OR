import { Button } from "@bluethub/ui-kit";
import { Cast, MonitorOff } from "lucide-react";

interface StudentBoardTabsStudent {
  studentId: string;
  name: string;
}

interface StudentBoardTabsProps {
  students: StudentBoardTabsStudent[];
  focusedStudentId: string | null;
  onFocus: (studentId: string) => void;
  sharedStudentId: string | null;
  onToggleShare: (studentId: string | null) => void;
}

/** Teacher-only tab strip for switching which student's board is open full
 * size, plus the "show to class" toggle for whichever tab is focused. Only
 * one student's board can be shared to the class at a time — selecting a
 * different student to share automatically replaces the previous one. */
export default function StudentBoardTabs({
  students,
  focusedStudentId,
  onFocus,
  sharedStudentId,
  onToggleShare,
}: StudentBoardTabsProps) {
  if (students.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/90 px-2 py-1.5 shadow-sm">
      {students.map((student) => {
        const isFocused = student.studentId === focusedStudentId;
        const isShared = student.studentId === sharedStudentId;
        return (
          <button
            key={student.studentId}
            onClick={() => onFocus(student.studentId)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isFocused ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {student.name}
            {isShared && <Cast className="size-3.5 text-amber-400" />}
          </button>
        );
      })}

      {focusedStudentId && (
        <Button
          size="sm"
          variant={focusedStudentId === sharedStudentId ? "default" : "outline"}
          className="ml-auto gap-1.5"
          onClick={() => onToggleShare(focusedStudentId === sharedStudentId ? null : focusedStudentId)}
        >
          {focusedStudentId === sharedStudentId ? (
            <>
              <MonitorOff className="size-4" /> Stop showing to class
            </>
          ) : (
            <>
              <Cast className="size-4" /> Show to class
            </>
          )}
        </Button>
      )}
    </div>
  );
}

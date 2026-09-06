import element from "@/assets/svg/element-4.svg";
import Calendar from "@/assets/svg/calendar.svg";
import message from "@/assets/svg/message.svg";
// import studentIcon from "@/assets/svg/student.svg";
// import coursesIcon from "@/assets/svg/courses.svg";
import classIconIcon from "@/assets/svg/class.svg";
import logoutIcon from "@/assets/svg/logout.svg";
import settingsIcon from "@/assets/svg/settings.svg";
import AssignmentIcon from "@/assets/svg/assignment.svg";
import registrationIcon from "@/assets/svg/registration.svg";
import libraryIcon from "@/assets/svg/library.svg";
// import teacherIcon from "@/assets/svg/teacher.svg";
// import MonitorPlayIcon from "@/assets/svg/monitor_play.svg";
import UploadIcon from "@/assets/svg/upload.svg";
import BookTextIcon from "@/assets/svg/jam_book.svg";
import PlayIcon from "@/assets/svg/play.svg";
import QuizzesIcon from "@/assets/svg/quizzes.svg";
import AttendanceIcon from "@/assets/svg/attendance.svg";
import LessonIcon from "@/assets/svg/lesson.svg";
import QuestionBankIcons from "@/assets/svg/question-bank.svg";
import CircleCheckIcon from "@/assets/svg/circle_check.svg";

// Teacher sidebar, grouped by workflow area (not by feature-team taxonomy) so a
// teacher scans "what do I need right now" — class-day actions, content
// authoring, the assessment pipeline — rather than a flat 12-row list. Each
// top-level entry also gets its own icon; several previously shared one icon
// with an unrelated item, which reads as "these are the same thing" at a glance.
export const TACADEMIC_GROUPS = [
  {
    section: "Classroom",
    items: [
      {
        icons: classIconIcon,
        name: "My Classroom",
        children: [
          { name: "Quiz", path: "/teacher/module/quiz" },
          { name: "Topic", path: "/teacher/module/quiz?view=topic", roles: ["ClassTeacher", "HeadTeacher"] },
          { name: "Per Student", path: "/teacher/module/quiz?view=student", roles: ["ClassTeacher", "HeadTeacher"] },
          { name: "Classroom Assessment", path: "/teacher/module/assessment" },
          { name: "Subject", path: "/teacher/module/subject" },
          { name: "Attendance Record", path: "/teacher/module/attendance" },
        ],
      },
      {
        icons: PlayIcon,
        name: "Start Class",
        path: "/teacher/start-class",
      },
      {
        icons: AttendanceIcon,
        name: "Attendance",
        path: "/teacher/attendance",
      },
    ],
  },
  {
    section: "Lessons",
    items: [
      {
        icons: LessonIcon,
        name: "Submit Lesson",
        path: "/teacher/submit-lesson",
      },
      {
        icons: libraryIcon,
        name: "My Lessons",
        path: "/teacher/my-lessons",
      },
      {
        icons: UploadIcon,
        name: "My Drafts",
        path: "/teacher/drafts",
      },
      {
        icons: BookTextIcon,
        name: "My Syllabus",
        path: "/teacher/syllabus",
      },
    ],
  },
  {
    // Question sourcing → quiz building → formal assessment: the three
    // dropdowns read top-to-bottom as one pipeline instead of three
    // unrelated menu entries scattered through the list.
    section: "Assessments",
    items: [
      {
        icons: QuestionBankIcons,
        name: "Question Bank",
        children: [
          { name: "Question Bank", path: "/teacher/question-bank", disabled: true },
          { name: "Browse Question Bank", path: "/teacher/assessment/view-questions" },
          { name: "Extract Question", path: "/teacher/assessment/upload-scan" },
          { name: "Set Question", path: "/teacher/assessment/createQuiz" },
          { name: "My Uploads", path: "/teacher/assessments/My-Uploads" },
          { name: "View Existing Questions", path: "/teacher/assessment/questionlist" },
        ],
      },
      {
        icons: QuizzesIcon,
        name: "Quiz",
        children: [
          { name: "Create Quiz", path: "/teacher/assessment/generate-quiz" },
          { name: "My Quizzes", path: "/teacher/quiz" },
          { name: "Grading", path: "/teacher/module/quiz-grading" },
        ],
      },
      {
        icons: AssignmentIcon,
        name: "Assessment",
        children: [
          { name: "Assessment", path: "/teacher/assessment/config" },
          { name: "Manage Assessments", path: "/teacher/assessment/manage" },
          { name: "Assign to Students", path: "/teacher/assessment/assign-student" },
          { name: "Assessment Grading", path: "/teacher/assessment/pending-grading" },
        ],
      },
    ],
  },
  {
    section: "Other",
    items: [
      {
        icons: CircleCheckIcon,
        name: "Approvals",
        path: "/teacher/approvals",
      },
    ],
  },
  // {
  //   section: "Coming Soon",
  //   items: [
  //     {
  //       icons: studentIcon,
  //       name: "Student",
  //       path: "/teacher/student",
  //       disabled: true,
  //     },
  //     {
  //       icons: coursesIcon,
  //       name: "Courses",
  //       path: "/teacher/courses",
  //       disabled: true,
  //     },
  //   ],
  // },
];



export const navLink = [
  { name: "Dashboard", path: "/admin", icons: element },
  { name: "Analytics", path: "/admin/analytics", icons: element },
  { name: "Approvals", path: "/admin/approvals", icons: AssignmentIcon },
  { name: "Calendar", path: "/admin/calendar", icons: Calendar },
  { name: "Message", path: "/admin/message", icons: message },
];
export const other_menu_Link = [
  { name: "Settings", path: "/admin/settings", icons: settingsIcon },
  { name: "Log Out", path: "#", icons: logoutIcon },
];

export const ACADEMICLINKS = [
  {
    name: "Registration",
    icons: registrationIcon,
    children: [
      { name: "Register admin", path: "/admin/registration/Admin" },
      { name: "Register Student", path: "/admin/registration/student" },
      { name: "Register Teacher", path: "/admin/registration/Teacher" },
      // { name: "Head Teacher", path: "/admin/registration/head-Teacher" },
      { name: "Register Subject", path: "/admin/registration/courses" },
      { name: "Register Class", path: "/admin/registration/class" },
    ],
  },
  // {
  //   name: "Student",
  //   path: "/admin/student",
  //   icons: studentIcon,
  //   children: [
  //     { name: "Register Student", path: "/admin/registration/student" },
  //   ],
  // },
  {
    name: "Library",
    path: "/admin/library",
    icons: libraryIcon,
    children: [
      { name: "Register Library", path: "/admin/registration/library" },
    ],
  },
  // {
  //   name: "Courses",
  //   path: "/admin/courses",
  //   icons: coursesIcon,
  //   children: [
  //     { name: "Register Courses", path: "/admin/registration/courses" },
  //   ],
  // },

  // {
  //   name: "Teachers",
  //   path: "/admin/teacher",
  //   icons: teacherIcon,
  //   children: [
  //     { name: "Register Teacher", path: "/admin/registration/Teacher" },
  //   ],
  // },
  // {
  //   name: "Class",
  //   path: "/admin/class",
  //   icons: classIconIcon,
  //   children: [{ name: "Register Class", path: "/admin/registration/class" }],
  // },
];


import Auth from '@/pages/auth';
import NotFound from '@/component/not-found';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ClassRoom from '@/layouts/teacher/class/class-room';
import Replay from '@/component/reply';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { ErrorBoundary } from '@/component/ErrorBoundary';
import AdminLayout from '@/layouts/admin/admin-layout';
import AdminDashboard from '@/pages/admin/dashboard';
import TeacherLayout from '@/layouts/teacher/class/dashboard';
import TeacherDashboard from '@/pages/teacher/dashboard';
import RecordedLayout from '@/layouts/teacher/class/recorded/recorded';
import RecordedMain from '@/pages/teacher/recorded/recorded-main';
import Selectclass from '@/pages/teacher/recorded/select-class';
import Scheduleclass from '@/pages/teacher/recorded/schedule-class';
import SubmissionPortal from '@/pages/teacher/recorded/submission-portal';
import ApprovalStatus from '@/pages/teacher/recorded/approval-status';
import ApprovalStatusId from '@/pages/teacher/recorded/approval-status-Id';
import ResumeClass from '@/pages/teacher/component/resume-class';
import ClassInfo from '@/pages/teacher/component/class-info';
import StudenLayout from '@/pages/admin/registration/student/layout';
import CreateParentPage from '@/pages/admin/registration/parent/create-parent';
import SearchParentsPage from '@/pages/admin/registration/parent/search-parents';
import AttachStudentPage from '@/pages/admin/registration/parent/attach-student';
import Student from '@/pages/admin/registration/student/student';
import NewStudent from '@/pages/admin/registration/student/new-student';
import Enrollment from '@/pages/admin/registration/student/enrollment';
import EditStudent from '@/pages/admin/registration/student/edit-student';
// import CourseLayout from '@/pages/admin/registration/course/layout';
import CoursesMain from '@/pages/admin/registration/course/main';
import Teacherlayout from '@/pages/admin/registration/teacher/layout';
import TeacherMain from '@/pages/admin/registration/teacher/main';
import SubjectTeacher from '@/pages/admin/registration/teacher/subject-teacher';
import HeadTeacher from '@/pages/admin/registration/teacher/head-teacher';
import TeacherEditProfile from '@/pages/admin/registration/teacher/edit-profile';
import EmailModal from '@/pages/admin/registration/teacher/email-modal';
import ClassRegistration from '@/pages/admin/registration/course/class/class-registration';
import StudentsLayout from '@/layouts/student';
import ParentLayout from '@/layouts/parent';
import ParentProtectedRoute from '@/component/protected-routes/parent-routes';
import ParentDashboard from '@/pages/parent/dashboard';
import ParentAttendance from '@/pages/parent/attendance';
import StudentIndex from '@/pages/student/component/main';
import StudyGroupsIndex from '@/pages/student/study-groups';
import StudyGroupDetailPage from '@/pages/student/study-groups/group-detail';
import StudentSettings from '@/shared/setting';
import ProfileLayout from '@/pages/student/profile/layout';
import Profile from '@/pages/student/profile/profile';
import ClassIndex from '@/pages/student/class';
import ClassLayout from '@/pages/student/class/layout';
import ClassRoomlayout from '@/pages/student/class-room/layout';
import StudentClassRoom from '@/pages/student/class-room/class-room';
import CreateclassRoom from '@/pages/student/class-room/create-class-room';
import ClassQuiz from '@/pages/student/class-room/quiz';
import ClassAssessment from '@/pages/student/class-room/assessment';
import ClassSubject from '@/pages/student/class-room/subject';
import WatchClass from '@/pages/student/class/watch-class';
import StudentReplay from '@/pages/student/class/student-replay';
import StudentQuizzes from '@/pages/student/quizzes';
import StudentQuizPage from '@/pages/student/quiz';
import StudentAssessmentList from '@/pages/student/assessment';
import StudentAssessmentDetail from '@/pages/student/assessment/detail';
import StudentAssessmentAttempt from '@/pages/student/assessment/attempt';
import StudentAssessmentResult from '@/pages/student/assessment/result';
import StudentSubjectScores from '@/pages/student/assessment/subject-scores';
import StudentSubtopicScores from '@/pages/student/assessment/subtopic-scores';
import StudentAssessmentScore from '@/pages/student/assessment/assessment-score';
import Assessment from '@/pages/teacher/component/assessment';
import CreateQuizQuestion from '@/pages/teacher/component/create-quiz';
import TopicQuestionList from '@/pages/teacher/component/topic-question-list';
import SubtopicQuestionList from '@/pages/teacher/component/subtopic-question-list';
import ViewQuestions from '@/pages/teacher/component/view-questions';
// import AssessmentConfig from '@/pages/teacher/component/assessment-config';
import GenerateQuiz from '@/pages/teacher/component/generate-quiz';
import Login from '@/pages/auth/login';
import NewPassword from '@/pages/auth/new-password';
import ForgotPassword from '@/pages/auth/forgot-password';
import ResetPassword from '@/pages/auth/reset-password';
import AdminProtectedRoute from '@/component/protected-routes/admin-routes';
import { PublicRoute } from '@/component/protected-routes/public-route';
import StudentProtectedRoute from '@/component/protected-routes/student-routes';
import UploadScan from '@/pages/teacher/component/upload-scan';
import ReviewQuestion from '@/pages/teacher/component/review-question';
import MyUploads from '@/pages/teacher/component/my-uploads';
import AdminPermissions from '@/pages/admin/admin-permissions';
import AdminRole from '@/pages/admin/registration/admin-role-management/admin-role';
import ViewAllSubject from '@/pages/admin/registration/course/class/view-all-subject';
import RegisterTeacherRole from '@/pages/admin/registration/teacher/assign-role';
import ViewStudent from '@/pages/admin/registration/student/view-student';
import UnlockUser from '@/pages/admin/registration/student/unlock-user';
import RegisterNewSubject from '@/pages/admin/registration/course/class/register-new-subject';
import RegisterNewClass from '@/pages/admin/registration/course/class/register-new-class';
import ClassviewAll from '@/pages/admin/registration/course/class/class-view-all';
import LessonApproval from '@/pages/admin/dashboard/lesson-approval';
import MyLesson from '@/pages/teacher/component/my-lesson';
import SubmitLesson from '@/pages/teacher/component/submit-lesson';
import StartClass from '@/pages/teacher/component/start-class';
import QuizIndex from '@/pages/teacher/quiz';
import QuizDetailView from '@/pages/teacher/quiz/quiz-detail';
import MySyllabus from '@/pages/teacher/Syllabus/my-syllabus';
import CreateSyllabus from '@/pages/teacher/Syllabus/create-syllabus';
import ApprovalsPage from '@/pages/admin/approvals';
import TeacherProtectedRoute from '@/component/protected-routes/teacher-routes';
import IdbViewer from '@/pages/dev/idb-viewer';
import DraftLessons from '@/pages/teacher/drafts';
import PendingUploads from '@/pages/teacher/pending-uploads';
import ModulePage from '@/pages/module';
import StudentMyClassroom from '@/pages/student/module';
import MyClassroomPage from '@/pages/teacher/my-classroom';
import ModuleQuiz from '@/pages/teacher/module/quiz';
import ModuleQuizGrading from '@/pages/teacher/module/quiz-grading';
import ModuleAssessment from '@/pages/teacher/module/assessment';
import ModuleSubject from '@/pages/teacher/module/subject';
import ModuleAttendance from '@/pages/teacher/module/attendance';
import QuestionBankScan from '@/pages/teacher/question-bank';
import AssessmentSettings from '@/pages/teacher/assessment-settings';
import AssignAssessmentToStudent from '@/pages/teacher/assessment/assign-student';
import ManageAssessments from '@/pages/teacher/assessment/manage';
import PendingGrading from '@/pages/teacher/assessment/pending-grading';
import AdminAnalytics from '@/pages/admin/dashboard/analytics-page';
import TeacherAnalytics from '@/pages/teacher/dashboard/analytics-page';
import Attendance from '@/pages/teacher/attendance';
import GradesProgress from '@/pages/student/component/grades-progress';
import CourseIndex from '@/pages/student/courses';
import Course from '@/pages/student/courses/component/course';
import SubjectList from '@/pages/student/courses/component/subject-list';
import DiscussionIndex from '@/pages/student/Discussion forum';
import DiscussionLayout from '@/pages/student/Discussion forum/layout';
import GroupDetailPanel from '@/pages/student/Discussion forum/group/group-detail-panel';
import GroupChatRoom from '@/pages/student/Discussion forum/group/chat/group-chat';
import AssessmentByClass from '@/pages/admin/assessment/by-class';
import AssessmentBySubject from '@/pages/admin/assessment/by-subject';
import AssessmentByStudent from '@/pages/admin/assessment/by-student';
import QuizByClass from '@/pages/admin/quiz/by-class';
import QuizBySubject from '@/pages/admin/quiz/by-subject';
import QuizByStudent from '@/pages/admin/quiz/by-student';
import AttendanceAnalytics from '@/pages/admin/attendance-analytics';
import UploadSchoolLogoPage from '@/component/upload-school-logo-page';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/auth" replace />,
    },
    {
        path: '/auth',
        element: (
            <ErrorBoundary fallbackMessage="Authentication page error">
                <PublicRoute>
                    <Auth />
                </PublicRoute>
            </ErrorBoundary>
        ),
        children: [
            {
                index: true,
                element: <Login />,
            },
            {
                path: 'new-password',
                element: <ErrorBoundary fallbackMessage="Password reset error">
                    <NewPassword />
                </ErrorBoundary>

            },
            {
                path: 'login',
                element: <ErrorBoundary fallbackMessage="Login error">
                    <Login />
                </ErrorBoundary>,
            },
            {
                path: 'forgot-password',
                element: <ErrorBoundary fallbackMessage="Forgot password error">
                    <ForgotPassword />
                </ErrorBoundary>,
            }
        ]
    },
    {
        // Top-level, not under /auth — the emailed reset link
        // (https://{tenant}.bluetsch.com/reset-password?token=...) resolves
        // the user/school from the token alone, no tenant subdomain context
        // or PublicRoute auth-redirect logic needed.
        path: '/reset-password',
        element: <ErrorBoundary fallbackMessage="Reset password error">
            <ResetPassword />
        </ErrorBoundary>,
    },
    {
        path: '/replay',
        element: <ErrorBoundary fallbackMessage="Replay page error" >
            <Provider store={store}><Replay /></Provider>
        </ErrorBoundary>
    },
    {
        path: "*",
        element: <NotFound />,
    },
    {
        path: "teacher/board",
        element: <ErrorBoundary fallbackMessage="Whiteboard error">
            <TeacherProtectedRoute><ClassRoom /></TeacherProtectedRoute>
        </ErrorBoundary>
    },

    // ── Dev routes (no auth) ─────────────────────────────────────────────────
    {
        path: "/dev/lesson-approval",
        element: <LessonApproval />,
    },
    {
        path: "/dev/submit-lesson",
        element: <SubmitLesson />,
    },
    {
        path: "/dev/start-class",
        element: <StartClass />,
    },
    {
        path: "/dev/idb",
        element: <IdbViewer />,
    },

    //  admin route
    {
        path: '/admin',
        element: <ErrorBoundary fallbackMessage="Admin page error" >
            <AdminProtectedRoute>
                <AdminLayout />
            </AdminProtectedRoute>
        </ErrorBoundary>,
        children: [
            {
                index: true,
                element: <AdminDashboard />
            },
            {
                path: "registration",
                children: [
                    {
                        path: "student",
                        element: <StudenLayout />,
                        children: [
                            {
                                index: true,
                                element: <Student />,
                            },
                            {
                                path: 'new',
                                element: <NewStudent />,
                            },
                            {
                                path: "enrollment",
                                element: <Enrollment />,
                            },
                            {
                                path: "unlock-user",
                                element: <UnlockUser />,
                            },
                            {
                                path: "all",
                                element: <ViewStudent />,
                            },
                            {
                                path: "edit",
                                element: <EditStudent />,
                            },
                            {
                                path: ":studentId/edit",
                                element: <EditStudent />,
                            },
                        ],
                    },
                    {
                        path: 'analytics',
                        element: <AdminAnalytics />
                    },
                    {
                        path: "courses",
                        element: <CoursesMain />,
                    },
                    {
                        path: "courses/new",
                        element: <RegisterNewSubject />,
                    },
                    {
                        path: "courses/view-all-subject",
                        element: <ViewAllSubject />,
                    },
                    { path: "class", element: <ClassRegistration /> },
                    { path: "class/new", element: <RegisterNewClass /> },
                    { path: "class/view-all", element: <ClassviewAll /> },
                    { path: "parent", element: <CreateParentPage /> },
                    { path: "parent/search", element: <SearchParentsPage /> },
                    { path: "parent/attach", element: <AttachStudentPage /> },
                    {
                        path: "teacher",
                        element: <Teacherlayout />,
                        children: [
                            { index: true, element: <TeacherMain /> },
                            { path: "teacher", element: <SubjectTeacher /> },
                            { path: "class-teacher", element: <SubjectTeacher /> },
                            { path: "admin-user", element: <SubjectTeacher /> },
                            { path: "head-teacher", element: <HeadTeacher /> },
                            { path: ":rolePath/edit", element: <TeacherEditProfile /> },
                            { path: "admin", element: <AdminRole /> },
                            {
                                path: "email-verification",
                                element: <EmailModal />,
                            },
                            {
                                path: "assign-role",
                                element: <RegisterTeacherRole />,
                            },
                        ],
                    },
                ],

            },
            {
                path: 'module',
                element: <ModulePage />,
            },
            {
                path: 'school-branding',
                element: <UploadSchoolLogoPage />
            },
            {
                path: 'admin-permissions',
                element: <AdminPermissions />
            },
            {
                path: 'lesson-approval',
                element: <LessonApproval />
            },
            {
                path: 'approvals',
                element: <ApprovalsPage />
            },
            {
                path: 'analytics',
                element: <AdminAnalytics />
            },
            {
                path: 'attendance-analytics',
                element: <AttendanceAnalytics />
            },
            {
                path: 'assessment',
                children: [
                    {
                        path: 'class',
                        element: <AssessmentByClass />,
                    },
                    {
                        path: 'subject',
                        element: <AssessmentBySubject />,
                    },
                    {
                        path: 'student',
                        element: <AssessmentByStudent />,
                    },
                ],
            },
            {
                path: 'quiz',
                children: [
                    {
                        path: 'class',
                        element: <QuizByClass />,
                    },
                    {
                        path: 'subject',
                        element: <QuizBySubject />,
                    },
                    {
                        path: 'student',
                        element: <QuizByStudent />,
                    },
                ],
            },
        ]
    },

    //  teacher route
    {
        path: '/teacher',
        element: <ErrorBoundary fallbackMessage="Teacher page error" >
            <TeacherLayout />
        </ErrorBoundary>,
        children: [
            {
                index: true,
                element:
                    <TeacherProtectedRoute>
                        <TeacherDashboard />
                    </TeacherProtectedRoute>
            },
            { path: "module", element: <MyClassroomPage /> },
            { path: "module/quiz", element: <ModuleQuiz /> },
            { path: "module/quiz-grading", element: <ModuleQuizGrading /> },
            { path: "module/assessment", element: <ModuleAssessment /> },
            { path: "module/subject", element: <ModuleSubject /> },
            { path: "module/attendance", element: <ModuleAttendance /> },
            { path: "resume-class", element: <ResumeClass /> },
            { path: "class-info", element: <ClassInfo /> },
            { path: "assessment", element: <Assessment /> },
            { path: "assessment/view-questions", element: <ViewQuestions /> },
            { path: "my-lessons", element: <MyLesson /> },
            { path: "submit-lesson", element: <SubmitLesson /> },
            { path: "start-class", element: <StartClass /> },
            { path: "assessment/createQuiz", element: <CreateQuizQuestion /> },
            { path: "assessment/questionlist", element: <TopicQuestionList /> },
            { path: "assessment/questionlist/subtopic", element: <SubtopicQuestionList /> },
            { path: "assessment/generate-quiz", element: <GenerateQuiz /> },
            { path: "assessment/upload-scan", element: <UploadScan /> },
            { path: "assessment/review", element: <ReviewQuestion /> },
            { path: "assessments/My-Uploads", element: <MyUploads /> },
            {
                path: 'recorded-class',
                element: <RecordedLayout />,
                children: [
                    { index: true, element: <RecordedMain /> },
                    { path: "select-class", element: <Selectclass /> },
                    { path: "schedule-class", element: <Scheduleclass /> },
                    { path: "class-submission-portal", element: <SubmissionPortal /> },
                    { path: "classes/approval-status", element: <ApprovalStatus /> },
                    { path: "classes/approval-status/:id", element: <ApprovalStatusId /> },
                ]
            },
            { path: "quiz", element: <QuizIndex /> },
            { path: "quiz/:quizCode", element: <QuizDetailView /> },
            { path: "syllabus", element: <MySyllabus /> },
            { path: "syllabus/create", element: <CreateSyllabus /> },
            { path: "drafts", element: <DraftLessons /> },
            { path: "pending-uploads", element: <PendingUploads /> },
            { path: "question-bank", element: <QuestionBankScan /> },
            { path: "assessment/config", element: <AssessmentSettings /> },
            { path: "assessment/assign-student", element: <AssignAssessmentToStudent /> },
            { path: "assessment/manage", element: <ManageAssessments /> },
            { path: "assessment/pending-grading", element: <PendingGrading /> },
            { path: "approvals", element: <ApprovalsPage /> },
            { path: "create-syllabus", element: <CreateSyllabus /> },
            { path: "analytics", element: <TeacherAnalytics /> },
            { path: "attendance", element: <Attendance /> },
        ]
    },

    // parent route

    {
        path: "/parent",
        element: <ParentProtectedRoute><ParentLayout /></ParentProtectedRoute>,
        children: [
            { index: true, element: <ParentDashboard /> },
            { path: "attendance", element: <ParentAttendance /> },
        ],
    },

    // student route

    {
        path: "/student",
        element: <ErrorBoundary fallbackMessage="Student page error" >
            <StudentProtectedRoute>
                <StudentsLayout />
            </StudentProtectedRoute>
        </ErrorBoundary>,
        children: [
            { index: true, element: <StudentIndex /> },
            {
                path: "recorded-class",
                element: <ClassIndex />,
                children: [{ index: true, element: <ClassLayout /> }],
            },
            {
                path: "profile",
                element: <ProfileLayout />,
                children: [{ index: true, element: <Profile /> }],
            },
            {
                path: "class-room",
                element: <ClassRoomlayout />,
                children: [
                    { index: true, element: <StudentClassRoom /> },
                    { path: "create", element: <CreateclassRoom /> },
                    { path: "quiz", element: <ClassQuiz /> },
                    { path: "assessment", element: <ClassAssessment /> },
                    { path: "subject", element: <ClassSubject /> },
                ],
            },
            { path: "module", element: <StudentMyClassroom /> },
            { path: "Settings", element: <StudentSettings /> },
            { path: "recorded-class/:classId/watch", element: <WatchClass /> },
            { path: "recorded-class/:classId/replay", element: <StudentReplay /> },
            { path: "quiz/:quizCode", element: <StudentQuizPage /> },
            { path: "Quizzes", element: <StudentQuizzes /> },
            { path: "Grades-Progress", element: <GradesProgress /> },
            {
                path: "assessment",
                children: [
                    { index: true, element: <StudentAssessmentList /> },
                    { path: ":assessmentId", element: <StudentAssessmentDetail /> },
                    { path: ":assessmentId/attempt/:attemptId", element: <StudentAssessmentAttempt /> },
                    { path: ":assessmentId/result/:attemptId", element: <StudentAssessmentResult /> },
                    { path: "subject-scores", element: <StudentSubjectScores /> },
                    { path: "subtopic-scores", element: <StudentSubtopicScores /> },
                    { path: "assessment-score", element: <StudentAssessmentScore /> },
                ],
            },

            {
                path: 'my-course',
                element: <CourseIndex />,
                children: [
                    {
                        index: true,
                        element: <Course />
                    },
                    {
                        path: ':subjectId',
                        element: <SubjectList />
                    }
                ]
            },
            {
                path: "Discussion-Forum",
                element: <DiscussionIndex />,
                children: [
                    {
                        index: true,
                        element: <DiscussionLayout />
                    },
                    {
                        path: ':groupName',
                        element: <GroupDetailPanel />
                    },
                    { path: ':groupName/:groupId', element: <GroupChatRoom /> },
                ]

            },
            {
                path: "study-groups",
                children: [
                    { index: true, element: <StudyGroupsIndex /> },
                    { path: ':groupId', element: <StudyGroupDetailPage /> },
                ]
            }

        ],
    },
])


export default router




import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { schoolService } from "@/services/school";

import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, Layers, Loader2, Menu, PlusIcon } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubTopic {
    id: string;
    name: string;
    topicId: string;
    isActive: boolean;
}

interface Topic {
    id: string;
    name: string;
    subjectId: string;
    subTopics: SubTopic[];
}

interface CurriculumData {
    subjectId: string;
    subjectName: string;
    category: string;
    classCategory: string;
    topics: Topic[];
}

interface SubjectItem {
    subjectId: string;
    subjectName: string;
    classroomId: string;
}

// ── TopicRow ─────────────────────────────────────────────────────────────────

function TopicRow({ topic }: { topic: Topic }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border border-[#E8E8E3] rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#EEF1FB] flex items-center justify-center shrink-0">
                        <Layers size={14} className="text-[#4B6EF5]" />
                    </div>
                    <span className="text-sm font-medium text-[#1A1A2E]">{topic.name}</span>
                    <span className="text-xs text-[#A0A8C0] bg-[#F5F6FA] px-2 py-0.5 rounded-full">
                        {topic.subTopics.length} subtopic{topic.subTopics.length !== 1 ? "s" : ""}
                    </span>
                </div>
                {open ? (
                    <ChevronDown size={16} className="text-[#A0A8C0] shrink-0" />
                ) : (
                    <ChevronRight size={16} className="text-[#A0A8C0] shrink-0" />
                )}
            </button>

            {open && topic.subTopics.length > 0 && (
                <div className="border-t border-[#E8E8E3] divide-y divide-[#F0F0F0] bg-[#FAFAFA]">
                    {topic.subTopics.map((st) => (
                        <div key={st.id} className="flex items-center gap-2.5 px-6 py-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-chestnut shrink-0" />
                            <span className="text-sm text-[#3A3A4A]">{st.name}</span>
                        </div>
                    ))}
                </div>
            )}

            {open && topic.subTopics.length === 0 && (
                <div className="border-t border-[#E8E8E3] px-6 py-3 bg-[#FAFAFA]">
                    <p className="text-xs text-[#A0A8C0]">No subtopics added yet.</p>
                </div>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

const MySyllabus = () => {
    const navigate = useNavigate();
    const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
    const { user, isLoading: authLoading } = useAuthContext();
    const [fallbackClassrooms, setFallbackClassrooms] = useState<any[]>([]);
    const [fetchedSubjects, setFetchedSubjects] = useState<SubjectItem[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hydratingUser, setHydratingUser] = useState(false);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

    const isHeadTeacher = user?.roleName === "HeadTeacher";

    // For Head Teacher: fetch subjects from API since roleData.classrooms has no subjects
    useEffect(() => {
        if (!user?.id) return;
        const roleData = user?.roleData;
        const htClassrooms = roleData && isTeacherRoleData(roleData) ? roleData.classrooms : [];
        const classroomIds = htClassrooms.map((c) => c.classroomId).filter(Boolean);
        if (classroomIds.length === 0) return;
        setLoading(true)
        setIsLoadingSubjects(true)
        Promise.all(
            classroomIds.map((id) =>
                schoolService.getSubjectsByClassroomId(id)
                    .then((res) => {
                        const data = (res.data as any)?.data;
                        return [
                            ...(data?.majorSubjects ?? []),
                            ...(data?.minorSubjects ?? []),
                        ].map((s: any) => ({
                            subjectId: String(s.id ?? s.subjectId ?? ""),
                            subjectName: String(s.subject ?? s.subjectName ?? s.name ?? ""),
                            classroomId: id,
                        }));
                    })
                    .catch(() => [] as SubjectItem[])
                    .finally(() => {
                        setLoading(false);
                        setIsLoadingSubjects(false);
                    })
            )
        ).then((results) => {
            const seen = new Set<string>();
            const all: SubjectItem[] = [];

            for (const batch of results) {
                for (const item of batch) {
                    if (!item.subjectId || !item.subjectName) {
                        continue;
                    }
                    if (seen.has(item.subjectId)) continue;
                    seen.add(item.subjectId);
                    all.push(item);
                }
            }
            setFetchedSubjects(all);
        });
    }, [isHeadTeacher, user?.id, user?.roleData]);

    // Collect unique subjects from the teacher's roleData (already in memory)
    const subjects = useMemo<SubjectItem[]>(() => {
        // Head Teacher: use API-fetched subjects
        if (isHeadTeacher && fetchedSubjects.length > 0) return fetchedSubjects;

        const roleData = user?.roleData;
        const classrooms = roleData && isTeacherRoleData(roleData) && roleData.classrooms.length
            ? roleData.classrooms
            : fallbackClassrooms;
        const seen = new Set<string>();
        const result: SubjectItem[] = [];

        for (const cls of classrooms) {
            for (const s of cls.subjects ?? []) {
                if (!seen.has(s.subjectId)) {
                    seen.add(s.subjectId);
                    result.push({ subjectId: s.subjectId, subjectName: s.subjectName, classroomId: cls.classroomId });
                }
            }
        }

        return result;
    }, [user, isHeadTeacher, fetchedSubjects, fallbackClassrooms]);


    

    useEffect(() => {
        const roleData = user?.roleData;
        const hasClassrooms = roleData && isTeacherRoleData(roleData) && roleData.classrooms.length > 0;
        
        if (authLoading || !user?.id || hasClassrooms || hydratingUser || isHeadTeacher) return;
        
        setHydratingUser(true);
        setIsLoadingSubjects(true);
 
        authService.getUserById(user.id)
            .then((response) => {
                const fetchedRoleData = response.data?.data?.roleData;
                const classrooms = fetchedRoleData && isTeacherRoleData(fetchedRoleData)
                    ? fetchedRoleData.classrooms
                    : [];
                setFallbackClassrooms(classrooms);
            })
            .catch(() => setError("Failed to load your assigned subjects. Please try again."))
            .finally(() => {
                setHydratingUser(false);
                setIsLoadingSubjects(false);
            });
    }, [authLoading, hydratingUser, user?.id, user?.roleData, isHeadTeacher]);

    // Auto-select first subject on mount
    useEffect(() => {
        if (subjects.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(subjects[0].subjectId);
        }
    }, [subjects]);

    // Fetch curriculum whenever selected subject changes
    useEffect(() => {
        if (!selectedSubjectId) return;
        setLoading(true);
        setError(null);
        setCurriculum(null);

        const selectedSubject = subjects.find((s) => s.subjectId === selectedSubjectId) || fetchedSubjects.find((s) => s.subjectId === selectedSubjectId);
        schoolService.getSubjectCurriculum(selectedSubjectId, selectedSubject?.classroomId)
            .then((res) => {
                const data = (res.data as any)?.data;
                if (data) {
                    setCurriculum({
                        subjectId: data.SubjectId ?? data.subjectId,
                        subjectName: data.SubjectName ?? data.subjectName,
                        category: data.Category ?? data.category,
                        classCategory: data.ClassCategory ?? data.classCategory,
                        topics: (data.Topics ?? data.topics ?? []).map((t: any) => ({
                            id: t.Id ?? t.id,
                            name: t.Name ?? t.name,
                            subjectId: t.SubjectId ?? t.subjectId,
                            subTopics: (t.SubTopics ?? t.subTopics ?? []).map((st: any) => ({
                                id: st.Id ?? st.id,
                                name: st.Name ?? st.name,
                                topicId: st.TopicId ?? st.topicId,
                                isActive: st.IsActive ?? st.isActive ?? true,
                            })),
                        })),
                    });
                } else {
                    setError("No curriculum data returned.");
                }
            })
            .catch(() => setError("Failed to load curriculum. Please try again."))
            .finally(() => setLoading(false));
    }, [selectedSubjectId]);


    const selectedSubjectName = subjects.find((s) => s.subjectId === selectedSubjectId)?.subjectName ?? "";

    return (
        <div className="font-poppins">
            <div className="backdrop-blur-sm  border border-white/20 overflow-hidden">

                {/* ── Top Nav ──────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-5 sticky top-0 z-30 bg-chestnut">
                    <div className="flex items-center gap-2.5">
                        <Menu
                            className="lg:hidden w-5 h-5 text-white cursor-pointer"
                            onClick={openMobileNav}  // ✅ not onClick={() => openMobileNav()}
                        />
                        <ArrowLeft className="lg:hidden text-white" onClick={() => navigate(-1)} />
                        <span className="text-white font-semibold text-sm">My Syllabus</span>
                    </div>
                    <button
                        onClick={() => navigate('/teacher/create-syllabus')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
                    >
                        <PlusIcon size={14} />
                        Create new
                    </button>
                </div>

                {/* ── Body ─────────────────────────────────────────────────────── */}
                <div className="flex-1 bg-white/70 backdrop-blur-sm">

                    {authLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-chestnut" />
                        </div>
                    ) : isLoadingSubjects ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-chestnut" />
                        </div>
                    ) : (fetchedSubjects.length === 0 && subjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <BookOpen size={40} className="text-[#A0A8C0]" />
                            <p className="text-sm text-[#A0A8C0]">No subjects assigned to your account.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row min-h-[500px]">

                            {/* ── Subject Sidebar ─────────────────────────────── */}
                            <div className="md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-[#E8E8E3] bg-[#F9F9FB] p-3">
                                <p className="text-[10px] uppercase tracking-widest text-[#A0A8C0] font-semibold px-2 pb-2">
                                    Subjects
                                </p>
                                {/* mobile: horizontal scroll row; md+: vertical stack */}
                                <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0
                             [&::-webkit-scrollbar]:hidden">

                                    { (fetchedSubjects.length > 0 ? fetchedSubjects : subjects).map((s) => (
                                        <button
                                            key={s.subjectId}
                                            onClick={() => setSelectedSubjectId(s.subjectId)}
                                            className={cn(
                                                "shrink-0 text-left px-3 py-2 md:py-2.5 rounded-xl text-sm font-medium transition-all md:w-full",
                                                selectedSubjectId === s.subjectId
                                                    ? "bg-chestnut text-white shadow-sm"
                                                    : "text-[#3A3A4A] hover:bg-[#EFEFEF]"
                                            )}
                                        >
                                            {s.subjectName}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Curriculum Panel ────────────────────────────── */}
                            <div className="flex-1 p-4 md:p-5 overflow-y-auto">

                                {/* Header */}
                                <div className="mb-5">
                                    <h1 className="text-lg font-bold text-[#1A1A2E]">{selectedSubjectName}</h1>
                                    {curriculum && (
                                        <p className="text-xs text-[#A0A8C0] mt-0.5">
                                            {curriculum.category} · {curriculum.classCategory} ·{" "}
                                            {curriculum.topics.length} topic{curriculum.topics.length !== 1 ? "s" : ""}
                                        </p>
                                    )}
                                </div>

                                {/* Loading */}
                                {loading && (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 size={28} className="animate-spin text-chestnut" />
                                    </div>
                                )}

                                {/* Error */}
                                {!loading && error && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                {/* Topics list */}
                                {!loading && !error && curriculum && (
                                    <>
                                        {curriculum.topics.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 gap-2">
                                                <Layers size={36} className="text-[#D0D4E8]" />
                                                <p className="text-sm text-[#A0A8C0]">No topics found for this subject.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {curriculum.topics.map((topic) => (
                                                    <TopicRow key={topic.id} topic={topic} />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Empty state */}
                                {!loading && !error && !curriculum && (
                                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                                        <BookOpen size={36} className="text-[#D0D4E8]" />
                                        <p className="text-sm text-[#A0A8C0]">Select a subject to view its curriculum.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MySyllabus;
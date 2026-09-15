import {
    Button, Label,
    DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuItem, DropdownMenuTrigger,
} from "@bluethub/ui-kit"
import { Check, ChevronDown, ChevronLeft, Layers, Lock, Loader2, Plus, Trash2, X, BookOpen, Tag } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { schoolService } from "@/services/school"
import { AxiosError } from "axios"
import { toast } from "@bluethub/ui-kit"
import { isTeacherRoleData, useAuthContext } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface SubjectItem { id: string; name: string; }
interface ClassItem { id: string; name: string; subjects: SubjectItem[]; }

interface TopicItem {
    id: string;
    name: string;
    subTopics: string[];
    isExisting: boolean;
    existingTopicId?: string;
    existingSubTopics: string[];
}

const isAdminRole = (roleName?: string) =>
    roleName === "Administrator" || roleName === "SuperAdministrator" || roleName === "HeadTeacher";

interface FieldDropdownProps {
    label: string;
    placeholder: string;
    value: string;
    items: { id: string; name: string }[];
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    onChange: (item: { id: string; name: string }) => void;
}

function FieldDropdown({ label, placeholder, value, items, disabled, loading, icon, onChange }: FieldDropdownProps) {
    const [open, setOpen] = useState(false);
    const selected = items.find(i => i.id === value);
    const isDisabled = disabled || loading;

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                {icon}
                {label}
                <span className="text-red-500">*</span>
            </Label>
            <DropdownMenu onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild disabled={isDisabled}>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-between h-12 px-4 rounded-xl text-sm border-2 transition-all",
                            selected
                                ? "border-chestnut/30 bg-chestnut/5 text-gray-900"
                                : "border-gray-200 text-gray-400 bg-white",
                            "hover:border-chestnut/40 hover:bg-chestnut/5",
                            isDisabled && "opacity-50 cursor-not-allowed pointer-events-none bg-gray-50"
                        )}
                    >
                        <span className={cn("truncate text-left", selected ? "font-medium text-gray-900" : "text-gray-400")}>
                            {loading ? "Loading…" : selected?.name ?? placeholder}
                        </span>
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
                            : <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200", open && "rotate-180")} />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) max-h-60 overflow-y-auto rounded-xl border border-gray-200 shadow-xl bg-white p-1.5 z-50"
                    align="start"
                    sideOffset={4}
                >
                    <DropdownMenuGroup>
                        {items.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-gray-400">No options available</div>
                        ) : items.map(item => (
                            <DropdownMenuItem
                                key={item.id}
                                onClick={() => onChange(item)}
                                className={cn(
                                    "flex items-center justify-between rounded-lg py-3 px-3 text-sm cursor-pointer",
                                    value === item.id
                                        ? "bg-chestnut text-white font-medium"
                                        : "text-gray-700 hover:bg-chestnut/5 hover:text-chestnut"
                                )}
                            >
                                <span className="truncate">{item.name}</span>
                                {value === item.id && <Check className="w-4 h-4 shrink-0 ml-2" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

const TopicCard = ({
    topic, index, onNameChange, onDelete, onAddSubTopic, onRemoveSubTopic,
}: {
    topic: TopicItem;
    index: number;
    onNameChange: (name: string) => void;
    onDelete: () => void;
    onAddSubTopic: (val: string) => void;
    onRemoveSubTopic: (idx: number) => void;
}) => {
    const [subInput, setSubInput] = useState("");

    const handleAdd = () => {
        if (!subInput.trim()) return;
        onAddSubTopic(subInput.trim());
        setSubInput("");
    };

    return (
        <div className={cn(
            "border-2 rounded-2xl bg-white overflow-hidden shadow-sm transition-colors",
            topic.isExisting
                ? "border-chestnut/20 hover:border-chestnut/35"
                : "border-gray-100 hover:border-chestnut/20"
        )}>
            <div className={cn(
                "flex items-center gap-3 px-4 py-3.5 border-b border-gray-100",
                topic.isExisting
                    ? "bg-gradient-to-r from-chestnut/10 to-chestnut/5"
                    : "bg-gradient-to-r from-chestnut/5 to-transparent"
            )}>
                <div className="w-7 h-7 rounded-lg bg-chestnut flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {index + 1}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 text-white text-[10px] font-semibold px-2 py-0.5 shrink-0">
                    <BookOpen className="w-2.5 h-2.5" />
                    Topic
                </span>
                {topic.isExisting ? (
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                        <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{topic.name}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-chestnut bg-chestnut/10 px-2 py-0.5 rounded-full shrink-0">
                            <Lock className="w-2.5 h-2.5" />
                            Existing
                        </span>
                    </div>
                ) : (
                    <input
                        value={topic.name}
                        onChange={e => onNameChange(e.target.value)}
                        placeholder="Topic name e.g. Photosynthesis"
                        className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none placeholder:text-gray-300 placeholder:font-normal"
                    />
                )}
                {!topic.isExisting && (
                    <button
                        onClick={onDelete}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                        title="Remove topic"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="px-4 py-3.5 space-y-3">
                {topic.existingSubTopics.length > 0 && (
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 inline-flex items-center gap-1.5">
                            <Tag className="w-3 h-3" />
                            Saved subtopics
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {topic.existingSubTopics.map((st, i) => (
                                <span
                                    key={`existing-${i}`}
                                    className="inline-flex items-center gap-1.5 border border-gray-200 bg-gray-50 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg"
                                >
                                    <Lock className="w-2.5 h-2.5 opacity-60" />
                                    <span className="text-[10px] uppercase tracking-wide opacity-70">Sub</span>
                                    {st}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {topic.subTopics.length > 0 && (
                    <div>
                        {topic.existingSubTopics.length > 0 && (
                            <p className="text-[10px] font-semibold text-chestnut/70 uppercase tracking-wide mb-1.5 inline-flex items-center gap-1.5">
                                <Tag className="w-3 h-3" />
                                New subtopics
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {topic.subTopics.map((st, i) => (
                                <span
                                    key={`new-${i}`}
                                    className="inline-flex items-center gap-1.5 bg-chestnut/10 text-chestnut text-xs font-semibold px-3 py-1.5 rounded-lg border border-chestnut/20"
                                >
                                    <span className="text-[10px] uppercase tracking-wide text-chestnut/70">Sub</span>
                                    {st}
                                    <button onClick={() => onRemoveSubTopic(i)} className="hover:text-red-500 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 border-2 border-gray-100 rounded-xl px-3 py-2.5 focus-within:border-chestnut/30 focus-within:bg-chestnut/5 transition-all">
                        <Tag className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                        <input
                            value={subInput}
                            onChange={e => setSubInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAdd()}
                            placeholder={topic.isExisting ? "Add new subtopic to this topic" : "Add subtopic, press Enter"}
                            className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={!subInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-chestnut text-white hover:bg-chestnut/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                    >
                        Add
                    </button>
                </div>

                {topic.existingSubTopics.length === 0 && topic.subTopics.length === 0 && (
                    <p className="text-[11px] text-gray-300">
                        No subtopics yet — type above and press Enter or click Add
                    </p>
                )}
            </div>
        </div>
    );
};

const CreateSyllabus = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const isAdmin = isAdminRole(user?.roleName);

    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [classes, setClasses] = useState<ClassItem[]>([]);

    // console.log('classes', classes)
    const [topics, setTopics] = useState<TopicItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        if (isAdmin) {
            schoolService.getAllClassRooms()
                .then(({ data }) => {
                    const raw: any[] = (data as any).data?.classrooms ?? [];
                    setClasses(raw.map((c: any) => ({
                        id: String(c.id ?? c.classroomId),
                        name: String(c.name ?? c.className),
                        subjects: [],
                    })));
                })
                .catch(() => { });
        } else {
            const roleData = user.roleData;
            if (roleData && isTeacherRoleData(roleData)) {
                setClasses(
                    roleData.classrooms.map((c) => ({
                        id: c.classroomId,
                        name: c.className,
                        subjects: (c.subjects ?? []).map((s) => ({
                            id: s.subjectId,
                            name: s.subjectName,
                        })),
                    }))
                );
            } else {
                setClasses([]);
            }

        }
    }, [isAdmin, user?.id, user?.roleData]);

    useEffect(() => {
        setSelectedSubject(null);
        setTopics([]);
        if (!selectedClass) { setSubjects([]); return; }

        // Teacher role data carries per-classroom subjects for SubjectTeacher
        // (they're assigned specific subjects), but not for ClassTeacher — a
        // ClassTeacher owns the whole classroom rather than particular
        // subjects, so roleData has no subject list to read here. Fall back
        // to the API in that case, same as admins/HeadTeacher always do.
        if (!isAdmin && selectedClass.subjects.length > 0) {
            setSubjects(selectedClass.subjects);
            return;
        }

        schoolService.getSubjectsByClassroomId(selectedClass.id).then((res) => {
            const data = (res.data as any)?.data;
            const major: any[] = data?.majorSubjects ?? [];
            const minor: any[] = data?.minorSubjects ?? [];
            setSubjects([...major, ...minor].map((s: any) => ({
                id: String(s.id ?? s.subjectId ?? ""),
                name: String(s.subject ?? s.subjectName ?? s.name ?? ""),
            })));
        }).catch(() => setSubjects([]));
    }, [selectedClass, isAdmin]);

    useEffect(() => {
        setTopics([]);
        if (!selectedSubject) return;

        setLoadingCurriculum(true);
        schoolService.getSubjectCurriculum(selectedSubject.id, selectedClass?.id)
            .then((res) => {
                const raw = (res.data as any)?.data ?? (res.data as any)?.Data ?? {};
                const existingTopics: any[] = raw.Topics ?? raw.topics ?? [];
                if (existingTopics.length > 0) {
                    setTopics(existingTopics.map((t: any) => ({
                        id: String(t.Id ?? t.id),
                        name: String(t.Name ?? t.name ?? ""),
                        subTopics: [],
                        isExisting: true,
                        existingTopicId: String(t.Id ?? t.id),
                        existingSubTopics: (t.SubTopics ?? t.subTopics ?? []).map(
                            (s: any) => String(s.Name ?? s.name ?? "")
                        ),
                    })));
                }
            })
            .catch(() => { })
            .finally(() => setLoadingCurriculum(false));
    }, [selectedSubject]);

    const addTopic = () => setTopics(prev => [
        ...prev,
        { id: crypto.randomUUID(), name: "", subTopics: [], isExisting: false, existingSubTopics: [] },
    ]);

    const updateTopicName = (idx: number, name: string) =>
        setTopics(prev => prev.map((t, i) => i === idx ? { ...t, name } : t));

    const deleteTopic = (idx: number) =>
        setTopics(prev => prev.filter((_, i) => i !== idx));

    const addSubTopic = (idx: number, value: string) => {
        if (!value.trim()) return;
        setTopics(prev => prev.map((t, i) =>
            i === idx ? { ...t, subTopics: [...t.subTopics, value.trim()] } : t
        ));
    };

    const removeSubTopic = (topicIdx: number, subIdx: number) =>
        setTopics(prev => prev.map((t, i) =>
            i === topicIdx ? { ...t, subTopics: t.subTopics.filter((_, j) => j !== subIdx) } : t
        ));

    const handleSubmit = async () => {
        if (!selectedClass || !selectedSubject) {
            toast.error("Please select a class and subject");
            return;
        }

        const existingWithNew = topics.filter(t => t.isExisting && t.subTopics.length > 0);
        const newTopics = topics.filter(t => !t.isExisting && t.name.trim() && t.subTopics.length > 0);

        if (existingWithNew.length === 0 && newTopics.length === 0) {
            toast.error("Add at least one new topic or subtopic to save");
            return;
        }

        setSubmitting(true);
        try {
            const ops: Promise<any>[] = [];

            for (const t of existingWithNew) {
                ops.push(
                    schoolService.addSubTopicsToTopic(t.existingTopicId ?? t.id, t.subTopics)
                );
            }

            if (newTopics.length > 0) {
                ops.push(
                    schoolService.createTopic({
                        subjectId: selectedSubject.id,
                        classroomId: selectedClass.id,
                        topics: newTopics.map(t => ({
                            name: t.name.trim(),
                            subTopics: t.subTopics,
                        })),
                    })
                );
            }

            const results = await Promise.all(ops);
            const failed = results.find((res) => (res.data as any)?.status !== "successful");
            if (failed) {
                const failedData = (failed.data as any);
                toast.error(failedData?.responseMessage ?? "Failed to save topics");
                return;
            }

            toast.success("Topics saved successfully");
            navigate("/teacher/syllabus");
        } catch (err) {
            const msg = err instanceof AxiosError
                ? err.response?.data?.responseMessage ?? err.response?.data?.message ?? err.message
                : (err as Error).message;
            toast.error(msg || "Failed to save");
        } finally {
            setSubmitting(false);
        }
    };


  //  console.log("Rendered with topics:", topics);
  //  console.log("Rendered with selected class:", selectedClass);
    const totalExistingSubTopics = topics.reduce((s, t) => s + t.existingSubTopics.length, 0);
    const totalNewSubTopics = topics.reduce((s, t) => s + t.subTopics.length, 0);
    const newTopicsCount = topics.filter(t => !t.isExisting).length;
    const existingTopicsCount = topics.filter(t => t.isExisting).length;

    const canSubmit = !!selectedClass && !!selectedSubject && !loadingCurriculum && (
        topics.some(t => t.isExisting && t.subTopics.length > 0) ||
        topics.some(t => !t.isExisting && t.name.trim() && t.subTopics.length > 0)
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/20 font-poppins">
            <header className="sticky top-0 z-30 bg-chestnut shadow-sm">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-1.5 -ml-1.5 rounded-xl hover:bg-white/10 transition-colors text-white"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <p className="text-white font-semibold text-sm leading-tight">Create / Update Topics</p>
                                <p className="text-white/60 text-[10px]">Add or extend topics & subtopics</p>
                            </div>
                        </div>
                        {(selectedClass || selectedSubject) && (
                            <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
                                {selectedClass && (
                                    <span className="text-white text-[10px] font-semibold truncate max-w-[80px]">
                                        {selectedClass.name}
                                    </span>
                                )}
                                {selectedClass && selectedSubject && (
                                    <span className="text-white/50 text-[10px]">·</span>
                                )}
                                {selectedSubject && (
                                    <span className="text-white text-[10px] font-semibold truncate max-w-[80px]">
                                        {selectedSubject.name}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="md:max-w-3xl md:mx-auto sm:px-6 py-6 pb-32 sm:pb-8 space-y-5">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-chestnut/8 to-transparent border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                selectedClass && selectedSubject ? "bg-green-500 text-white" : "bg-chestnut text-white"
                            )}>
                                {selectedClass && selectedSubject
                                    ? <Check className="w-4 h-4" />
                                    : <BookOpen className="w-4 h-4" />}
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Class & Subject</h2>
                                <p className="text-xs text-gray-400">Choose where these topics belong</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FieldDropdown
                                label="Classroom"
                                placeholder="Select class"
                                value={selectedClass?.id ?? ""}
                                items={classes}
                                onChange={(item) => setSelectedClass({ ...item, subjects: classes.find(c => c.id === item.id)?.subjects ?? [] })}
                            />
                            <FieldDropdown
                                label="Subject"
                                placeholder={selectedClass ? "Select subject" : "Select class first"}
                                value={selectedSubject?.id ?? ""}
                                items={subjects}
                                disabled={!selectedClass}
                                loading={loadingCurriculum && !!selectedSubject}
                                onChange={(item) => setSelectedSubject(item)}
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                                    canSubmit ? "bg-green-500 text-white" : "bg-indigo-500 text-white"
                                )}>
                                    {loadingCurriculum
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : canSubmit ? <Check className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900">
                                        Topics
                                        {topics.length > 0 && !loadingCurriculum && (
                                            <span className="ml-2 text-xs font-normal text-gray-400">
                                                {existingTopicsCount > 0 && `${existingTopicsCount} existing`}
                                                {existingTopicsCount > 0 && newTopicsCount > 0 && " · "}
                                                {newTopicsCount > 0 && `${newTopicsCount} new`}
                                                {" · "}
                                                {totalExistingSubTopics + totalNewSubTopics} subtopics
                                                {totalNewSubTopics > 0 && ` (${totalNewSubTopics} new)`}
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-[11px]  text-gray-400">
                                        {loadingCurriculum
                                            ? "Loading existing topics…"
                                            : existingTopicsCount > 0
                                                ? "Add new subtopics to existing topics, or create new topics"
                                                : "Add topics with their subtopics"}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                        <span className="inline-flex items-center gap-1 bg-slate-800 text-white px-2 py-0.5 rounded-full">
                                            <BookOpen className="w-2.5 h-2.5" />
                                            Topic
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-chestnut/10 text-chestnut px-2 py-0.5 rounded-full border border-chestnut/20">
                                            <Tag className="w-2.5 h-2.5" />
                                            Subtopic
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={addTopic}
                                disabled={loadingCurriculum}
                                className="flex items-center gap-1.5 text-xs font-semibold text-chestnut bg-chestnut/8 hover:bg-chestnut/15 px-3.5 py-2 rounded-xl transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Topic
                            </button>
                        </div>
                    </div>

                    <div className="p-5 space-y-3">
                        {loadingCurriculum ? (
                            <div className="flex items-center justify-center gap-3 py-12 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm">Loading existing topics…</span>
                            </div>
                        ) : topics.length === 0 ? (
                            <div
                                onClick={addTopic}
                                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl py-12 cursor-pointer hover:border-chestnut/30 hover:bg-chestnut/5 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                                    <Layers className="w-6 h-6 text-gray-300" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-400">No topics yet</p>
                                    <p className="text-xs text-gray-300 mt-0.5">Click here or "New Topic" to add your first topic</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {existingTopicsCount > 0 && (
                                    <div className="flex items-center gap-2 px-1 mb-1">
                                        <div className="flex-1 h-px bg-gray-100" />
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                                            Existing — add subtopics below
                                        </span>
                                        <div className="flex-1 h-px bg-gray-100" />
                                    </div>
                                )}
                                {topics.filter(t => t.isExisting).map((topic, _) => {
                                    const globalIdx = topics.indexOf(topic);
                                    return (
                                        <TopicCard
                                            key={topic.id}
                                            topic={topic}
                                            index={globalIdx}
                                            onNameChange={(name) => updateTopicName(globalIdx, name)}
                                            onDelete={() => deleteTopic(globalIdx)}
                                            onAddSubTopic={(val) => addSubTopic(globalIdx, val)}
                                            onRemoveSubTopic={(subIdx) => removeSubTopic(globalIdx, subIdx)}
                                        />
                                    );
                                })}

                                {newTopicsCount > 0 && (
                                    <div className="flex items-center gap-2 px-1 mt-4 mb-1">
                                        <div className="flex-1 h-px bg-gray-100" />
                                        <span className="text-[10px] font-semibold text-chestnut/60 uppercase tracking-wide">
                                            New topics
                                        </span>
                                        <div className="flex-1 h-px bg-gray-100" />
                                    </div>
                                )}
                                {topics.filter(t => !t.isExisting).map((topic) => {
                                    const globalIdx = topics.indexOf(topic);
                                    return (
                                        <TopicCard
                                            key={topic.id}
                                            topic={topic}
                                            index={globalIdx}
                                            onNameChange={(name) => updateTopicName(globalIdx, name)}
                                            onDelete={() => deleteTopic(globalIdx)}
                                            onAddSubTopic={(val) => addSubTopic(globalIdx, val)}
                                            onRemoveSubTopic={(subIdx) => removeSubTopic(globalIdx, subIdx)}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </div>
                </section>

                <div className="hidden sm:flex items-center justify-between pt-1">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !canSubmit}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submitting ? "Saving…" : "Save Topics"}
                    </button>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white border-t border-gray-100 px-4 py-3 flex gap-3 safe-area-pb shadow-lg">
                <button
                    onClick={() => navigate(-1)}
                    className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !canSubmit}
                    className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-chestnut hover:bg-chestnut/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Saving…" : "Save Topics"}
                </button>
            </div>
        </div>
    );
};

export default CreateSyllabus;

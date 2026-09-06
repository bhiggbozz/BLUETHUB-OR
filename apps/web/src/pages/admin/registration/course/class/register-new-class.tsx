import { useEffect, useState } from "react";
import { X, LayoutGrid, Search, Info, Loader2, ArrowLeft } from "lucide-react";
import ClassRegistered from "./class-registered";
import { useNavigate } from "react-router-dom";
import type { Subject } from "../main";
import { AxiosError } from "axios";
import { schoolService } from "@/services/school";

// const BRAND = "#292382";


type SubjectTab = "Major" | "Minor";

interface ClassPill {
    id: string;
    label: string;
}

const RegisterNewClass = () => {
    const [className, setClassName] = useState("");
    const navigate = useNavigate()
    const [open, setOpen] = useState(false);
    const [selectedClasses, setSelectedClasses] = useState<ClassPill[]>([]);

    const [subjectTab, setSubjectTab] = useState<SubjectTab>("Major");
    const [subjectSearch, setSubjectSearch] = useState("");
    const [majorSubjects, setMajorSubjects] = useState<Subject[]>([]);
    const [minorSubjects, setMinorSubjects] = useState<Subject[]>([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [subjectIds, setSubjectIds] = useState<string[]>([])
    const [classSubjects, setClassSubjects] = useState<Record<string, string[]>>({});



    const handleAddClass = () => {
        const trimmed = className.trim();
        if (!trimmed) return;
        const id = trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
        setSelectedClasses(prev => [...prev, { id, label: trimmed }]);
        setClassName("");
    };

    const [activeClass, setActiveClass] = useState<ClassPill | null>(null);

    const handleClassClick = (cls: ClassPill) => {
        setActiveClass(cls);
        // restore previously assigned subjects for this class
        setSubjectIds(classSubjects[cls.id] ?? []);
    };

    const handleRemoveClass = (id: string) => {
        setSelectedClasses(prev => prev.filter(c => c.id !== id));
    };

   const filteredMajor = majorSubjects.filter(s =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
);

const filteredMinor = minorSubjects.filter(s =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
);

    const toggleSubject = (id: string) => {
        if (!activeClass) return; // no class selected yet — do nothing

        const updated = subjectIds.includes(id)
            ? subjectIds.filter(x => x !== id)
            : [...subjectIds, id];

        setSubjectIds(updated);

        // auto-save against the active class immediately
        setClassSubjects(prev => ({
            ...prev,
            [activeClass.id]: updated,
        }));
    };

    const isChecked = (id: string) => subjectIds.includes(id);
    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const response = await schoolService.getAllSubject();
            const all: Subject[] = response.data.data.subjects; // adjust to actual response key


            setMajorSubjects(all.filter(s => s.subjectCategoryName === "Major"));
            setMinorSubjects(all.filter(s => s.subjectCategoryName === "Minor"));
        } catch (error) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.responseMessage ??
                    error.response?.data?.message ??
                    error.message
                    : (error as Error).message;
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, []);

    const handleSubmit = async () => {
        // guard — every class must have at least one subject
        const unassigned = selectedClasses.filter(
            cls => !classSubjects[cls.id]?.length
        );
        if (unassigned.length > 0) {
            setErrorMsg(`Please assign subjects to: ${unassigned.map(c => c.label).join(", ")}`);
            return;
        }

        const payload = {
            classrooms: selectedClasses.map(cls => ({
                name: cls.label,
                noOfStudents: 0,
                subjectIds: classSubjects[cls.id] ?? [],
            })),
        };

        try {
            setLoading(true);
            await schoolService.createClassRoom(payload);
            setOpen(true)
        } catch (error) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.responseMessage ??
                    error.response?.data?.message ??
                    error.message
                    : (error as Error).message;
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="md:p-3 font-poppins">
                <div className="backdrop-blur-sm  border border-white/20 overflow-hidden">
                    {/* ── Top Nav ───────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-30 bg-chestnut">
                        <div className="flex items-center gap-2.5">
                            <LayoutGrid className="w-6 h-6 text-white hidden md:flex" />
                            <ArrowLeft  className="lg:hidden text-white"  onClick={() => navigate(-1)}/>
                            <div>
                                <p className="text-white font-medium text-sm leading-tight">Register New Class</p>
                                <p className="text-white/60 text-[10px] leading-tight">Assign class details and configure subjects</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Body ──────────────────────────────────────────────── */}
                    <div className="flex flex-col md:flex-row gap-0 bg-white/40 backdrop-blur-sm">

                        {/* ── LEFT PANEL ──────────────────────────────────────── */}
                        <div className="w-full md:w-64 shrink-0 border-r border-chestnut/10 p-5 flex flex-col gap-4">

                            {/* Class Name input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-chestnut">
                                    Class Name
                                </label>
                                <input
                                    value={className}
                                    onChange={e => setClassName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleAddClass()}
                                    placeholder="e.g. JSS 1A, Primary 3B"
                                    className="w-full ring-2 ring-chestnut/25 focus:ring-chestnut/50 border-0 rounded-lg px-3 py-2 text-sm text-chestnut font-medium placeholder:text-chestnut/30 outline-none bg-white"
                                />
                                <p className="text-[10px] text-gray-400">
                                    Enter the official class designation used in your school
                                </p>
                            </div>

                            {/* Add Subject button */}
                            <button
                                onClick={handleAddClass}
                                className="w-full py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 bg-chestnut"
                            >
                                Add Class
                            </button>

                            {/* Selected Class pills */}
                            <div className="flex flex-col gap-1.5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                    Selected Class
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {selectedClasses.map(cls => {
                                        const assignedCount = classSubjects[cls.id]?.length ?? 0;
                                        const isActive = activeClass?.id === cls.id;

                                        return (
                                            <div
                                                key={cls.id}
                                                onClick={() => handleClassClick(cls)}
                                                className={`flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border-2 cursor-pointer transition-colors ${isActive
                                                    ? "border-chestnut bg-chestnut text-white"
                                                    : assignedCount > 0
                                                        ? "border-chestnut text-chestnut"
                                                        : "border-chestnut/20 bg-chestnut/5 text-chestnut hover:border-chestnut/50"
                                                    }`}
                                            >
                                                <span className="truncate">{cls.label}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {assignedCount > 0 && (
                                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 h-full p w-full rounded-full ${isActive ? "bg-white/20 text-white" : "bg-chestnut/10 text-chestnut"
                                                            }`}>
                                                            {assignedCount}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation(); // prevent triggering handleClassClick
                                                            handleRemoveClass(cls.id);
                                                        }}
                                                        className="hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT PANEL ─────────────────────────────────────── */}
                        <div className="flex-1 min-w-0 flex flex-col gap-3 p-5">

                            {/* Header: label + Major/Minor toggle */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold text-chestnut">
                                        {activeClass ? `Subjects for ${activeClass.label}` : "Class — Subjects"}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {activeClass
                                            ? "Select subjects to assign to this class"
                                            : "Add a class and click on it to assign subjects"
                                        }
                                    </p>
                                </div>
                                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 shrink-0">
                                    {(["Major", "Minor"] as SubjectTab[]).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setSubjectTab(tab)}
                                            className="px-4 py-1.5 rounded-md text-xs font-bold transition-all"
                                            style={{
                                                backgroundColor: subjectTab === tab ? "#292382" : "transparent",
                                                color: subjectTab === tab ? "#fff" : "#6b7280",
                                            }}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search */}
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    value={subjectSearch}
                                    onChange={e => setSubjectSearch(e.target.value)}
                                    placeholder="Search Subjects..."
                                    className="flex-1 text-xs text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                                />
                            </div>

                            {/* Two columns */}
                            <div className="flex gap-6 relative">
                                {/* Overlay when no class is selected */}
                                {!activeClass && selectedClasses.length > 0 && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
                                        <p className="text-sm text-gray-500 font-medium">
                                            Click on a class to assign subjects
                                        </p>
                                    </div>
                                )}

                                {/* Major column */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-chestnut mb-2.5">Major course</p>
                                    <div className="flex flex-col space-y-1 h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-chestnut/30 scrollbar-track-transparent">
                                        {filteredMajor.map(s => (
                                            <label
                                                key={s.id}
                                                onClick={() => toggleSubject(s.id)}
                                                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
                                                    activeClass
                                                        ? "cursor-pointer hover:bg-chestnut/5"
                                                        : "cursor-not-allowed opacity-60"
                                                }`}
                                            >
                                                <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${isChecked(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"
                                                    }`}>
                                                    {isChecked(s.id) && (
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </span>
                                                <span className={`text-xs font-medium select-none ${isChecked(s.id) ? "text-chestnut font-bold" : "text-gray-600"
                                                    }`}>
                                                    {s.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-px bg-chestnut/10 self-stretch" />

                                {/* Minor column */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-500 mb-2.5">Minor course</p>
                                    <div className="flex flex-col space-y-1 h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-chestnut/30 scrollbar-track-transparent">
                                        {filteredMinor.map(s => (
                                            <label
                                                key={s.id}
                                                onClick={() => toggleSubject(s.id)}
                                                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors ${
                                                    activeClass
                                                        ? "cursor-pointer hover:bg-chestnut/5"
                                                        : "cursor-not-allowed opacity-60"
                                                }`}
                                            >
                                                <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${isChecked(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"
                                                    }`}>
                                                    {isChecked(s.id) && (
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </span>
                                                <span className={`text-xs font-medium select-none ${isChecked(s.id) ? "text-chestnut font-bold" : "text-gray-600"
                                                    }`}>
                                                    {s.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer ────────────────────────────────────────────── */}
                    <div className="flex justify-between px-5 py-3 border-t border-gray-100 bg-white/60">
                        {errorMsg && (
                            <div
                                role="alert"
                                className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5"
                            >
                                <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                <span>{errorMsg}</span>
                            </div>
                        )}
                        <div className="flex ml-auto items-center justify-end gap-3 ">
                            <button className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || selectedClasses.length === 0}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-chestnut disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Submit Registration</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ClassRegistered
                open={open}
                onClose={() => setOpen(false)}
                onAddAnother={() => { 
                    setOpen(false)
                    setActiveClass(null)
                    setSubjectIds([])
                    setSelectedClasses([])
                }}
                onViewAll={() => navigate('/admin/registration/courses/view-all-subject')}
                classRegistered={selectedClasses.length.toString()}
            />
        </>
    );
};

export default RegisterNewClass;
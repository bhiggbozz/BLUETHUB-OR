import { useEffect, useState } from "react";
import { X, Pencil, Loader2, AlertCircle, Plus, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Checkbox, Button, Dialog, DialogContent, DialogTitle,
} from "@bluethub/ui-kit";
import type { Classroom } from "./class-registration";
import { schoolService } from "@/services/school";
import { AxiosError } from "axios";
import type { schoolInfo } from "@/services";
import { localData } from "@/utils";
import type { Subject } from "../main";

// const BRAND = "#292382";

interface SubjectItem {
    category: "Major" | "Minor";
    classCategory: "Primary" | "JSS" | "SSS";
    creationDate: string;
    id: string;
    isActive: boolean;
    modifiedDate: string;
    name: string;
    schoolId: string;
    subject: string;
}

type Tab = "General Info" | "Subjects";

interface EditClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialClassName?: string;
    currentClass: Classroom | null;
}

const tabVariants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit:    { opacity: 0, y: -10, scale: 0.98 },
};

const EditClassModal = ({
    open,
    onOpenChange,
    initialClassName = "",
    currentClass
}: EditClassDialogProps) => {
    const [tab, setTab]           = useState<Tab>("General Info");
    const [className, setClassName] = useState(currentClass?.name || initialClassName);
    const [majorChecked, setMajorChecked] = useState<Set<string>>(new Set());
    const [minorChecked, setMinorChecked] = useState<Set<string>>(new Set());
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [responseMessage, setResponseMessage] = useState<{ ok: boolean; message: string }>({ ok: false, message: "" });
    const [majorList, setMajorList] = useState<SubjectItem[]>([]);
    const [minorList, setMinorList] = useState<SubjectItem[]>([]);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<schoolInfo | null>(null);

    // ── add-subject dialog ──────────────────────────────────────────────
    const [addSubjectOpen, setAddSubjectOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [loadingAllSubjects, setLoadingAllSubjects] = useState(false);
    const [pendingAddIds, setPendingAddIds] = useState<Set<string>>(new Set());
    const [addingSubjects, setAddingSubjects] = useState(false);

    const toggleMajor = (id: string) =>
        setMajorChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const toggleMinor = (id: string) =>
        setMinorChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    // Derive initials from class name
    const initials = className
        .split(/\s+/)
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "JS";


        const classSubjects = async () => {
            try {
                setLoadingSubjects(true)
                setResponseMessage({ ok: false, message: "" })
                const res = await schoolService.getSubjectsByClassroomId(currentClass?.id || "");
                if(res.data.status === "failed")  return setResponseMessage({ ok: false, message: res.data.message });
                const majors = res.data.data.majorSubjects;
                const minors = res.data.data.minorSubjects;
                setMajorList(majors);
                setMinorList(minors);
                // All subjects start checked — the admin unchecks the ones
                // that shouldn't apply to this classroom.
                setMajorChecked(new Set(majors.map((s: SubjectItem) => s.id)));
                setMinorChecked(new Set(minors.map((s: SubjectItem) => s.id)));
            } catch (error) {
                const msg =
                        error instanceof AxiosError
                          ? error.response?.data?.responseMessage ??
                          error.response?.data?.message ??
                          error.message
                          : (error as Error).message;
                setResponseMessage({ ok: false, message: msg });
            } finally {
                setLoadingSubjects(false)
            }
        }

        useEffect(() => {
            if (currentClass?.id) {
                classSubjects();
                            const schoolIn = localData.retrieve<schoolInfo>("schoolInfo")
            setSchoolInfo(schoolIn)
            }
        }, [currentClass?.id]);





        const updateClassroom = async () => {
            setUpdateLoading(true)
            try {
                setResponseMessage({ ok: false, message: "" })
                if (!currentClass?.id) {
                    return setResponseMessage({ ok: false, message: "Classroom ID is missing" });
                }

                // Anything left unchecked in the Subjects tab gets removed from
                // this classroom.
                const uncheckedSubjectIds = [
                    ...majorList.filter(s => !majorChecked.has(s.id)),
                    ...minorList.filter(s => !minorChecked.has(s.id)),
                ].map(s => s.id);

                const ops = [
                    schoolService.updateClassroom({
                        classroomUpdateViews: [{
                            isActive: true,
                            name: className,
                            id: currentClass.id
                        }]
                    }),
                ];

                if (uncheckedSubjectIds.length > 0) {
                    ops.push(
                        schoolService.deleteSubjects({
                            subjectIds: uncheckedSubjectIds,
                            classroomId: currentClass.id,
                        })
                    );
                }

                const results = await Promise.all(ops);
                const failed = results.find(res => res.data.status === "failed");
                if (failed) return setResponseMessage({ ok: false, message: failed.data.message });

                setResponseMessage({ ok: true, message: "Classroom updated successfully" });
                await classSubjects();
            } catch (error) {
                const msg =
                        error instanceof AxiosError
                          ? error.response?.data?.responseMessage ??
                          error.response?.data?.message ??
                          error.message
                          : (error as Error).message;
                setResponseMessage({ ok: false, message: msg });
            } finally {
                setUpdateLoading(false)
            }
        };

        const openAddSubjectDialog = async () => {
            setAddSubjectOpen(true);
            setPendingAddIds(new Set());
            if (allSubjects.length > 0) return;
            setLoadingAllSubjects(true);
            try {
                const res = await schoolService.getAllSubject();
                setAllSubjects((res.data as any)?.data?.subjects ?? []);
            } catch {
                // Non-fatal — the dialog will just show no options.
            } finally {
                setLoadingAllSubjects(false);
            }
        };

        const togglePendingAdd = (id: string) =>
            setPendingAddIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

        const confirmAddSubjects = async () => {
            if (!currentClass?.id || pendingAddIds.size === 0) {
                setAddSubjectOpen(false);
                return;
            }
            setAddingSubjects(true);
            try {
                const res = await schoolService.registerClassroomSubject({
                    classroomId: currentClass.id,
                    subjectIds: Array.from(pendingAddIds),
                });
                if (res.data.status === "failed") {
                    setResponseMessage({ ok: false, message: res.data.responseMessage });
                    return;
                }
                setAddSubjectOpen(false);
                setPendingAddIds(new Set());
                await classSubjects();
            } catch (error) {
                const msg =
                    error instanceof AxiosError
                      ? error.response?.data?.responseMessage ??
                      error.response?.data?.message ??
                      error.message
                      : (error as Error).message;
                setResponseMessage({ ok: false, message: msg });
            } finally {
                setAddingSubjects(false);
            }
        };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent  showCloseButton={false} className="p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-w-md w-full">

                {/* ── HEADER ────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 py-4 bg-chestnut"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <Pencil size={15} className="text-white" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">
                                Edit {currentClass?.name || "JSS1"}
                            </p>
                            <p className="text-white/55 text-[10px] mt-0.5">
                                {schoolInfo?.schoolName || "School"} Management
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                    >
                        <X size={14} className="text-white" />
                    </button>
                </div>

                {/* ── TABS ──────────────────────────────────────────────── */}
                <div className="flex border-b border-gray-100 bg-white">
                    {(["General Info", "Subjects"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="flex-1 py-3.5 text-xs font-bold relative transition-colors"
                            style={{ color: tab === t ? "#292382" : "#9ca3af" }}
                        >
                            {t}
                            {tab === t && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-chestnut"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* ── ERROR BANNER ──────────────────────────────────────── */}
                {!responseMessage.ok && responseMessage.message && (
                    <div className="flex items-start gap-2 px-5 py-3 bg-red-50 border-b border-red-100">
                        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-red-600">{responseMessage.message}</p>
                    </div>
                )}

                {/* ── CONTENT ───────────────────────────────────────────── */}
                <div className="bg-white relative overflow-hidden">
                    <AnimatePresence mode="wait">

                        {/* ── GENERAL INFO TAB ──────────────────────────── */}
                        {tab === "General Info" && (
                            <motion.div
                                key="general"
                                variants={tabVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.22, ease: "easeInOut" }}
                                className="px-5 py-5 flex flex-col gap-5"
                            >
                                {/* Class preview card */}
                                <div
                                    className="flex items-center justify-between px-4 py-3 rounded-xl border bg-chestnut/10 border-chestnut/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 bg-chestnut"
                                        >
                                            {initials}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 leading-tight">
                                                currently Editing
                                            </p>
                                            <p
                                                className="text-sm font-semibold leading-tight uppercase text-chestnut"
                                            >
                                                {currentClass?.name || "JSS1"}
                                            </p>
                                        </div>
                                    </div>
                                    {/* <span
                                        className="text-xs font-semibold px-3 py-1 rounded-full bg-chestnut/12 text-chestnut"
                                    >
                                        Secondary Level
                                    </span> */}
                                </div>

                                {/* Enter Class field */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">
                                        Enter Class <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            value={className}
                                            onChange={e => setClassName(e.target.value)}
                                            placeholder="e.g. Jss1"
                                            className="w-full ring-2 ring-chestnut/25 focus:ring-chestnut/50 border-0 rounded-lg px-3 py-2.5 pr-9 text-sm font-medium text-gray-800 placeholder:text-gray-300 outline-none bg-white"
                                        />
                                        {className && (
                                            <button
                                                onClick={() => setClassName("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        Edit the name and it will update everywhere it's used
                                    </p>
                                </div>

                                {/* Subject Teacher's Name field */}
                                {/* <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">
                                        Subject Teacher's Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            value={teacher}
                                            onChange={e => setTeacher(e.target.value)}
                                            placeholder="e.g. Dr Roy Akinwale"
                                            className="w-full ring-2 ring-chestnut/25 focus:ring-chestnut/50 border-0 rounded-lg px-3 py-2.5 pr-9 text-sm font-medium text-gray-800 placeholder:text-gray-300 outline-none bg-white"
                                        />
                                        {teacher && (
                                            <button
                                                onClick={() => setTeacher("")}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400">
                                        Enter assigned subject Teacher name
                                    </p>
                                </div> */}
                            </motion.div>
                        )}

                        {/* ── SUBJECTS TAB ──────────────────────────────── */}
                        {tab === "Subjects" && (
                            <motion.div
                                key="subjects"
                                variants={tabVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.22, ease: "easeInOut" }}
                                className="px-5 py-4"
                            >
                                {loadingSubjects ? (
                                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                                        <Loader2 size={18} className="animate-spin text-chestnut" />
                                        <p className="text-xs font-medium">Loading subjects…</p>
                                    </div>
                                ) : (
                                <div className="flex gap-6">
                                    {/* Major column */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-chestnut mb-2.5">
                                            Major course
                                        </p>
                                        <div className="flex flex-col gap-1">
                                            {majorList.map(s => {
                                                const checked = majorChecked.has(s.id);
                                                return (
                                                    <label
                                                        key={s.id}
                                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={() => toggleMajor(s.id)}
                                                            className="data-[state=checked]:bg-chestnut data-[state=checked]:border-chestnut"
                                                        />
                                                        <span className={`text-xs font-medium ${checked ? "text-chestnut font-bold" : "text-gray-400 line-through"}`}>
                                                            {s.subject}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px bg-chestnut/10 self-stretch" />

                                    {/* Minor column */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-500 mb-2.5">
                                            Minor course
                                        </p>
                                        <div className="flex flex-col gap-1">
                                            {minorList.map(s => {
                                                const checked = minorChecked.has(s.id);
                                                return (
                                                    <label
                                                        key={s.id}
                                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={() => toggleMinor(s.id)}
                                                            className="data-[state=checked]:bg-chestnut data-[state=checked]:border-chestnut"
                                                        />
                                                        <span className={`text-xs font-medium ${checked ? "text-chestnut font-bold" : "text-gray-400 line-through"}`}>
                                                            {s.subject}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                )}
                                {!loadingSubjects && (
                                    <button
                                        type="button"
                                        onClick={openAddSubjectDialog}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-chestnut hover:opacity-70 transition-opacity mt-4"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add subject
                                    </button>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* ── FOOTER ────────────────────────────────────────────── */}
                <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-gray-100 bg-white">
                    <Button
                      disabled={loadingSubjects || updateLoading}
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="px-6 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </Button>
                    <Button
                    onClick={updateClassroom}
                        disabled={loadingSubjects || updateLoading}
                        className="flex items-center gap-1.5 px-6 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-opacity bg-chestnut disabled:opacity-60"
                    >
                        {updateLoading && <Loader2 size={14} className="animate-spin" />}
                        {updateLoading ? "Saving…" : "Save Changes"}
                    </Button>
                </div>

            </DialogContent>
        </Dialog>

        {/* ── Add Subject picker ──────────────────────────────────────── */}
        <Dialog open={addSubjectOpen} onOpenChange={(o) => { if (!o) { setAddSubjectOpen(false); setPendingAddIds(new Set()); } }}>
            <DialogContent className="md:max-w-lg w-[90%] rounded-2xl p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                    <DialogTitle className="text-sm font-bold text-chestnut">
                        Add Subject
                    </DialogTitle>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Choose subjects to add to {currentClass?.name || "this class"}'s curriculum
                    </p>
                </div>

                <div className="flex gap-0 px-6 py-5">
                    {(["Major", "Minor"] as const).map((category, idx) => {
                        const existingIds = new Set([
                            ...majorList.map(s => s.id),
                            ...minorList.map(s => s.id),
                        ]);
                        const options = allSubjects.filter(
                            s => s.subjectCategoryName === category && !existingIds.has(s.id),
                        );
                        return (
                            <div key={category} className={`flex-1 ${idx === 0 ? "pr-5 border-r border-gray-100" : "pl-5"}`}>
                                <p className={`text-[10px] font-bold mb-3 uppercase tracking-wide flex items-center gap-1.5 ${category === "Major" ? "text-chestnut" : "text-gray-400"}`}>
                                    <LayoutGrid className="w-3 h-3" />
                                    {category}
                                </p>
                                <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-1">
                                    {loadingAllSubjects ? (
                                        <div className="flex items-center gap-2 text-gray-400 py-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span className="text-xs">Loading...</span>
                                        </div>
                                    ) : options.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-2">Nothing to add</p>
                                    ) : (
                                        options.map(s => (
                                            <label
                                                key={s.id}
                                                onClick={() => togglePendingAdd(s.id)}
                                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                                            >
                                                <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${pendingAddIds.has(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"}`}>
                                                    {pendingAddIds.has(s.id) && (
                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </span>
                                                <span className={`text-xs select-none ${pendingAddIds.has(s.id) ? "text-chestnut font-semibold" : "text-gray-600 font-medium"}`}>
                                                    {s.name}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-medium">
                        {pendingAddIds.size} subject{pendingAddIds.size !== 1 ? "s" : ""} selected
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-5 py-2 hover:bg-gray-50"
                            onClick={() => { setAddSubjectOpen(false); setPendingAddIds(new Set()); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="text-white text-xs font-semibold rounded-lg px-5 py-2 hover:opacity-90 transition-opacity bg-chestnut"
                            onClick={confirmAddSubjects}
                            disabled={pendingAddIds.size === 0 || addingSubjects}
                        >
                            {addingSubjects ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
};

export default EditClassModal;
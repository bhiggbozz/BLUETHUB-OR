import { useEffect, useState } from "react";
import { ChevronRight, Check, X, LayoutGrid, Users, ChevronDown, Plus, Info, Loader2, ArrowLeft } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Label,
    Button,
} from "@bluethub/ui-kit";
import type { Classroom } from "../course/class/class-registration";
import { schoolService } from "@/services/school";
import { AxiosError } from "axios";
import type { Subject } from "../course/main";
import { authService, type IcreateUserRequest } from "@/services/auth";
import { localData } from "@/utils";
import { useNavigate } from "react-router-dom";
import { UserRole } from "@/utils/validate";

interface LineManager {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    emailAddress: string;
    roleId: number;
    roleName: string;
    isActive: boolean;
    hasAccess: boolean;
    profileImage: string | null;
    guardianName: string | null;
    createdDate: string;
    modifiedDate: string;
}



const RegisterTeacherRole = () => {
    const [role, setRole] = useState<string>("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [, setIsRoleOpen] = useState(false);
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<Classroom[]>([]);
    const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [classroomError, setClassroomError] = useState("");
    // subject
    const [majorSubjects, setMajorSubjects] = useState<Subject[]>([]);
    const [minorSubjects, setMinorSubjects] = useState<Subject[]>([]);
    const [, setSubjectErrorMsg] = useState("");
    const [, setSubjectLoading] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
    const [lineManagers, setLineManagers] = useState<LineManager[]>([]);
    const [isLineManagerOpen, setIsLineManagerOpen] = useState(false);
    const [selectedLineManager, setSelectedLineManager] = useState<LineManager | null>(null);

    const navigate = useNavigate();

    const selectRole = localData.retrieve("selectRole") as string | null;
    useEffect(() => {
        if (selectRole) {
            setRole(selectRole);
        }
    }, [selectRole]);

    const isChecked = (id: string) => selectedSubjects.some(s => s.id === id);
    const isClassChecked = (id: string) => selectedClasses.some((c) => c.id === id);
    const fetchSubjects = async () => {
        setSubjectErrorMsg("")
        try {
            setSubjectLoading(true);
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
            setSubjectErrorMsg(msg);
        } finally {
            setSubjectLoading(false);
        }
    };


    const fetchClassrooms = async () => {
        setClassroomError("")
        try {
            setLoading(true);
            const { data } = await schoolService.getAllClassRooms();
            setClasses(data.data.classrooms); // ← data.data.classrooms not data.classrooms
        } catch (error) {
            const msg =
                error instanceof AxiosError
                    ? error.response?.data?.responseMessage ??
                    error.response?.data?.message ??
                    error.message
                    : (error as Error).message;
            console.error("Failed to fetch classrooms:", msg);
            setClassroomError(msg);
        } finally {
            setLoading(false);
        }
    };
    let roleId = UserRole.HeadTeacher;

    useEffect(() => {
        const init = async () => {
            await fetchClassrooms();
            await fetchSubjects();
            const { data } = await authService.getUserByRole(roleId);
            setLineManagers(data.data.users);
        };

        init();
    }, []);

    // const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //     const file = e.target.files?.[0];
    //     if (!file) return;
    //     setPhoto(file);
    //     setPhotoPreview(URL.createObjectURL(file));
    // };

    const handleOpenDialog = () => {
        setDialogOpen(true);
    };

    const handleSubmitSubjects = () => {
        if (selectedSubjects.length === 0) return;
        setDialogOpen(false);
    };

    const handleRemoveSubject = (id: string) => {
        setSelectedSubjects(prev => prev.filter(s => s.id !== id));
    };

    const toggleSubject = (subject: Subject) => {
        setSelectedSubjects(prev =>
            prev.some(s => s.id === subject.id)
                ? prev.filter(s => s.id !== subject.id)
                : [...prev, subject]
        );
    };

    const handleRemoveClass = (id: string) => {
        setSelectedClasses(prev => prev.filter(c => c.id !== id));
    };

    const toggleClass = (classroom: Classroom) => {
        setSelectedClasses(prev =>
            prev.some(c => c.id === classroom.id)
                ? prev.filter(c => c.id !== classroom.id)
                : [...prev, classroom]
        );
    };

    const handleSubmitClasses = () => {
        setIsClassDialogOpen(false);
    };


    const handleSave = async () => {
        setErrorMsg("")
        if (!role) { setErrorMsg("Please select a role"); return; }
        if (selectedClasses.length === 0) { setErrorMsg("Please select at least one class"); return; }
        if (role === 'Subject Teacher' && selectedSubjects.length === 0 ) { setErrorMsg("Please add at least one subject"); return; }
        if (!selectedLineManager) { setErrorMsg("Please add line Manager"); return; }

        const teacherPayload = localData.retrieve("th_t") as IcreateUserRequest;
        if (!teacherPayload) {
            setErrorMsg("Teacher information missing, please go back and try again");
            return;
        }

        const finalPayload: IcreateUserRequest = {
            ...teacherPayload,
            lineManagerId: selectedLineManager?.id,
            userClassroomsId: selectedClasses.map((c) => c.id),
            userSubjects: selectedSubjects.map(s => s.id),
            userSubjectClassrooms: selectedClasses.flatMap((c) =>
                selectedSubjects.map((s) => ({ subjectId: s.id, classroomId: c.id }))
            ),
        };

        try {
            setLoading(true);
            await authService.createUser(finalPayload);
            localData.remove("th_t");
            navigate('/admin');
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
        <div className="md:p-6 p-3 lg:max-w-2xl lg:mx-auto  font-poppins">
            <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm bg-white">

                {/* ── Top Nav ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 bg-chestnut">
                    <div className="flex items-center gap-2 text-white text-sm font-semibold">
                        <Users className="w-4 h-4 text-white/70" />
                        <span>Register Teacher's Role</span>
                        <ChevronRight className="w-4 h-4 text-white/40" />
                    </div>
                    <ArrowLeft className="text-white" onClick={() => navigate(-1)} />
                </div>

                {/* ── Body ────────────────────────────────────────────────── */}
                <div className="lg:p-8 p-6 min-h-screen md:h-auto">
                    <div className="flex gap-10">
                        {/* ── Right Column ────────────────────────────────── */}
                        <div className="flex-1 space-y-6">

                            {/* Row 1 — Role + Class */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Role */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-chestnut uppercase tracking-wide">Role</Label>
                                    <DropdownMenu onOpenChange={setIsRoleOpen}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={`w-full justify-between font-medium border-0 ring-2 py-2.5 px-4 text-sm rounded-xl transition-all ${role
                                                    ? "ring-chestnut/30 text-chestnut bg-chestnut/5"
                                                    : "ring-gray-200 text-gray-400 bg-white"
                                                    } hover:ring-chestnut/40`}
                                            >
                                                <span className={role ? "font-semibold text-chestnut" : ""}>
                                                    {selectRole}
                                                </span>
                                                {/* <ChevronDown className={`w-4 h-4 text-chestnut/50 transition-transform duration-200 ${isRoleOpen ? "rotate-180" : ""}`} /> */}
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </DropdownMenu>
                                </div>

                                {/* Class */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-chestnut uppercase tracking-wide">
                                            Classrooms
                                        </Label>
                                        {selectedClasses.length > 0 && (
                                            <span className="text-[10px] font-semibold text-chestnut/50">
                                                {selectedClasses.length} selected
                                            </span>
                                        )}
                                    </div>
                                    {classroomError && (
                                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs">
                                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                                            <span>{classroomError}</span>
                                        </div>
                                    )}
                                    <div className="min-h-10 ring-2 ring-gray-200 focus-within:ring-chestnut/30 rounded-xl bg-gray-50/60 px-3 py-2.5 flex flex-wrap gap-1.5 transition-all">
                                        {selectedClasses.length === 0 ? (
                                            <span className="text-xs text-gray-400 w-full text-center self-center py-2">
                                                No classrooms selected — click below to add
                                            </span>
                                        ) : (
                                            selectedClasses.map(classroom => (
                                                <span
                                                    key={classroom.id}
                                                    className="inline-flex items-center gap-1 bg-chestnut/10 text-chestnut text-xs font-semibold px-2.5 py-1 rounded-full"
                                                >
                                                    {classroom.name}
                                                    <button
                                                        onClick={() => handleRemoveClass(classroom.id)}
                                                        className="hover:text-red-500 transition-colors ml-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsClassDialogOpen(true)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-chestnut hover:opacity-70 transition-opacity mt-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add classrooms
                                    </button>
                                </div>
                            </div>

                            {/* Line Manager */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-chestnut uppercase tracking-wide">Line Manager</Label>
                                <DropdownMenu onOpenChange={setIsLineManagerOpen}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={`w-full justify-between font-medium border-0 ring-2 py-2.5 px-4 text-sm rounded-xl transition-all ${selectedLineManager
                                                ? "ring-chestnut/30 text-chestnut bg-chestnut/5"
                                                : "ring-gray-200 text-gray-400 bg-white"
                                                } hover:ring-chestnut/40`}
                                        >
                                            <span className={selectedLineManager ? "font-semibold text-chestnut" : ""}>
                                                {selectedLineManager
                                                    ? `${selectedLineManager.firstName} ${selectedLineManager.lastName}`
                                                    : "Select line manager"}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-chestnut/50 transition-transform duration-200 ${isLineManagerOpen ? "rotate-180" : ""}`} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) h-50 rounded-xl border border-gray-100 shadow-lg bg-white p-1.5" align="start" sideOffset={6}>
                                        <DropdownMenuGroup className="space-y-0.5">
                                            {lineManagers.map((lm) => (
                                                <DropdownMenuItem
                                                    key={lm.id}
                                                    onClick={() => setSelectedLineManager(lm)}
                                                    className={`text-sm py-2.5 px-3 rounded-lg cursor-pointer ${selectedLineManager?.id === lm.id
                                                        ? "bg-chestnut text-white"
                                                        : "text-gray-700 hover:bg-chestnut/5 hover:text-chestnut"
                                                        }`}
                                                >
                                                    <span className="flex-1">{lm.firstName} {lm.lastName}</span>
                                                    {selectedLineManager?.id === lm.id && <Check className="w-3.5 h-3.5" />}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Row 2 — Subjects */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-chestnut uppercase tracking-wide">
                                        Assigned Subjects
                                    </Label>
                                    {selectedSubjects.length > 0 && (
                                        <span className="text-[10px] font-semibold text-chestnut/50">
                                            {selectedSubjects.length} selected
                                        </span>
                                    )}
                                </div>

                                <div className="min-h-20 ring-2 ring-gray-200 focus-within:ring-chestnut/30 rounded-xl bg-gray-50/60 px-3 py-2.5 flex flex-wrap gap-1.5 transition-all">
                                    {selectedSubjects.length === 0 ? (
                                        <span className="text-xs text-gray-400 w-full text-center self-center py-2">
                                            No subjects added yet — click below to add
                                        </span>
                                    ) : (
                                        selectedSubjects.map(subject => (
                                            <span
                                                key={subject.id}
                                                className="inline-flex items-center gap-1 bg-chestnut/10 text-chestnut text-xs font-semibold px-2.5 py-1 rounded-full"
                                            >
                                                {subject.name}
                                                <button
                                                    onClick={() => handleRemoveSubject(subject.id)}
                                                    className="hover:text-red-500 transition-colors ml-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                </div>

                                <button
                                    onClick={handleOpenDialog}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-chestnut hover:opacity-70 transition-opacity mt-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add subjects
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100" />

                            {/* Save Button */}
                            <div className="flex justify-between">
                                {errorMsg && (
                                    <div
                                        role="alert"
                                        className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-xs mb-5"
                                    >
                                        <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <Button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex md:ml-auto flex-1 md:flex-0 items-center gap-2 text-white text-sm font-semibold rounded-md px-8 py-2.5 transition-opacity hover:opacity-90 bg-chestnut shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>Save and Continue</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Select Subject Dialog ──────────────────────────────────── */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="md:max-w-lg w-[90%] rounded-2xl p-0 overflow-hidden">
                    {/* Dialog header */}
                    <div className="px-6 py-5 border-b border-gray-100">
                        <DialogTitle className="text-sm font-bold text-chestnut">
                            Select Subjects
                        </DialogTitle>
                        <p className="text-[11px] text-gray-400 mt-0.5">Choose major and minor subjects for this teacher</p>
                    </div>

                    <div className="flex gap-0 m px-6 py-5">
                        {/* Major Column */}
                        <div className="flex-1 pr-5 border-r border-gray-100">
                            <p className="text-[10px] font-bold text-chestnut mb-3 uppercase tracking-wide flex items-center gap-1.5">
                                <LayoutGrid className="w-3 h-3" />
                                Major
                            </p>
                            <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-1">
                                {majorSubjects.map(s => (
                                    <label
                                        key={s.id}
                                        onClick={() => toggleSubject(s)}
                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                                    >
                                        <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${isChecked(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"
                                            }`}>
                                            {isChecked(s.id) && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className={`text-xs select-none ${isChecked(s.id) ? "text-chestnut font-semibold" : "text-gray-600 font-medium"}`}>
                                            {s.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Minor Column */}
                        <div className="flex-1 pl-5">
                            <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wide">Minor</p>
                            <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-1">
                                {minorSubjects.map(s => (
                                    <label
                                        key={s.id}
                                        onClick={() => toggleSubject(s)}
                                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                                    >
                                        <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${isChecked(s.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"
                                            }`}>
                                            {isChecked(s.id) && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </span>
                                        <span className={`text-xs select-none ${isChecked(s.id) ? "text-chestnut font-semibold" : "text-gray-600 font-medium"}`}>
                                            {s.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dialog footer */}
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-medium">
                            {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? "s" : ""} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-5 py-2 hover:bg-gray-50"
                                onClick={() => setDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="text-white text-xs font-semibold rounded-lg px-5 py-2 hover:opacity-90 transition-opacity bg-chestnut"
                                onClick={handleSubmitSubjects}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Select Classroom Dialog ──────────────────────────────── */}
            <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100">
                        <DialogTitle className="text-sm font-bold text-chestnut">
                            Select Classrooms
                        </DialogTitle>
                        <p className="text-[11px] text-gray-400 mt-0.5">Choose one or more classrooms for this teacher</p>
                    </div>

                    <div className="px-6 py-5">
                        <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto pr-1">
                            {classes.map((classroom) => (
                                <label
                                    key={classroom.id}
                                    onClick={() => toggleClass(classroom)}
                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-chestnut/5 transition-colors"
                                >
                                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${isClassChecked(classroom.id) ? "border-chestnut bg-chestnut" : "border-gray-300 bg-white"
                                        }`}>
                                        {isClassChecked(classroom.id) && (
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className={`text-xs select-none ${isClassChecked(classroom.id) ? "text-chestnut font-semibold" : "text-gray-600 font-medium"}`}>
                                        {classroom.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-medium">
                            {selectedClasses.length} classroom{selectedClasses.length !== 1 ? "s" : ""} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg px-5 py-2 hover:bg-gray-50"
                                onClick={() => setIsClassDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="text-white text-xs font-semibold rounded-lg px-5 py-2 hover:opacity-90 transition-opacity bg-chestnut"
                                onClick={handleSubmitClasses}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RegisterTeacherRole;
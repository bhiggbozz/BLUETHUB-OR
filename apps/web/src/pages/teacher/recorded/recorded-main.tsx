

import SubmissionGuide from "@/component/submisson-guide";
import { cn } from "@/lib/utils";
import type { SchoolLevel } from "@/pages/admin/registration/student/class-dialog";
import { FileList, type FileItem } from "@/shared/file-list";
import { MediaUpload } from "@/shared/media-upload";
import { Button, Calendar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Label, Popover, PopoverContent, PopoverTrigger, Textarea } from "@bluethub/ui-kit"
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronDown, Clock, EllipsisVertical, Menu, Plus } from "lucide-react"
import { useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import Recordedclass from "../dashboard/recorded-class";
import PendingReviews from "../dashboard/pending-reviews";
import SetQuestion from "../component/set-question";

export const levels: { label: SchoolLevel; disabled?: boolean }[] = [
    { label: "Primary" },
    { label: "Junior Secondary" },
    { label: "Senior Secondary", disabled: true }, // whichever should be disabled
];


const RecordedMain = () => {
    const navigate = useNavigate();
    const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
    const [selectedLevels, setSelectedLevels] = useState<SchoolLevel[]>(["Junior Secondary"]);
    const [subject, setSubject] = useState("");
    const [duration, setDuration] = useState("");
    const [dateTime, setDateTime] = useState("");
    const [open, setOpen] = useState(false);

    const [classes,] = useState([
        { id: "1", name: "JSS 1A" },
        { id: "2", name: "JSS 1B" },
        { id: "3", name: "JSS 2A" },
        { id: "4", name: "JSS 2B" },
        { id: "5", name: "JSS 3A" },
        { id: "6", name: "SSS 1A" },
        { id: "7", name: "SSS 2A" },
        { id: "8", name: "SSS 3A" },
    ]);

    const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);

    const [subjects,] = useState([
        { id: "1", name: "Mathematics", subjectCategoryName: "Major" },
        { id: "2", name: "English Language", subjectCategoryName: "Major" },
        { id: "3", name: "Basic Science", subjectCategoryName: "Major" },
        { id: "4", name: "Basic Technology", subjectCategoryName: "Major" },
        { id: "5", name: "Social Studies", subjectCategoryName: "Minor" },
        { id: "6", name: "Civic Education", subjectCategoryName: "Minor" },
        { id: "7", name: "Home Economics", subjectCategoryName: "Minor" },
        { id: "8", name: "Agricultural Sci", subjectCategoryName: "Minor" },
    ]);

    const files: FileItem[] = [
        {
            id: "1",
            type: "pdf",
            name: "Introduction to Cell Structure.pdf",
            size: "2.4MB",
            date: "21 July 2025, 12:04Am",
        },
        {
            id: "2",
            type: "video",
            name: "Cell Definition and its function_.Mp4",
            size: "2.4MB",
            date: "21 July 2025, 12:07Am",
        },
    ];

    const toggleLevel = (level: SchoolLevel) => {
        setSelectedLevels(prev =>
            prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
        );
    };

    return (
        <>
            <div className="min-h-screen font-poppins bg-[#F5F5F5]">
                <div className="lg:rounded-t-2xl overflow-hidden shadow-lg">
                    <div className="flex items-center justify-between px-6 py-5 bg-chestnut">
                        <div className="flex items-center gap-3">
                            <Menu className="lg:hidden w-5 h-5 text-white cursor-pointer" onClick={openMobileNav} />

                            <h3 className="text-white font-semibold text-sm">Dashboard</h3>
                        </div>
                        <button className="text-white">
                            <EllipsisVertical size={18} />
                        </button>
                    </div>
                </div>


                <div className="grid grid-cols-1 bg-white pt-4 lg:grid-cols-[1fr_350px] items-start">
                    <div className=" p-2 lg:p-4 space-y-4">
                        <div className=" h-13.75 lg:p-4 rounded-[15px] flex items-center justify-between">
                            <div className="lg:space-y-1">
                                <h2 className="font-semibold  text-lg lg:leading-7 text-[#0F0F0E]">Submit a lesson</h2>
                                <p className="text-[#666666] font-medium text-xs">Fill in your lesson details and send to admin for approval</p>
                            </div>
                            <Button
                                onClick={() => navigate("/teacher/resume-class")}
                                className="flex items-center justify-center gap-2 text-white bg-chestnut font-semibold text-sm px-8 py-3 rounded-md transition-opacity hover:bg-opacity-75 cursor-pointer"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                <span className="font-medium text-sm">Resume Class </span>
                            </Button>
                        </div>

                        <div>
                            <div className=" px-4 pt-1.5 bg-white border  border-[#D9D9D9] rounded-[10px]">
                                <div className="border-b border-[#D9D9D9] mb-4 pb-4 space-y-1">
                                    <h2 className="font-semibold text-lg leading-7 text-[#3A3A3A]">Lesson details</h2>
                                    <p className="text-[#666666] font-medium text-xs">All fields marked * are required</p>
                                </div>

                                <div>
                                    <Label htmlFor="className" className="text-sm mb-2 font-semibold text-[#0F0F0E]  block">Lesson type</Label>
                                    <div className="flex items-center gap-2 flex-wrap mb-[11px]">
                                        {levels.map(({ label, disabled }) => {
                                            const active = selectedLevels.includes(label);
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => !disabled && toggleLevel(label)}
                                                    disabled={disabled}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all disabled:cursor-not-allowed"
                                                    style={{
                                                        borderColor: disabled ? "#e5e7eb" : active ? "#292382" : "#e5e7eb",
                                                        backgroundColor: disabled ? "#f9fafb" : active ? "rgba(41, 35, 130, 0.1)" : "#ffffff",
                                                        color: disabled ? "#d1d5db" : active ? "#292382" : "#6b7280",
                                                    }}
                                                >
                                                    {active && !disabled ? (
                                                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-chestnut">
                                                            <Check className="w-2.5 h-2.5 text-white" />
                                                        </span>
                                                    ) : (
                                                        <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0 bg-white" />
                                                    )}
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <Label htmlFor="topic" className="text-xs font-semibold text-[#0F0F0E] mb-3">Topic</Label>
                                    <Input id="topic" placeholder="eg. Photosynthesis - part 2 " className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-900 focus:border-none" />
                                </div>
                                <div className="mb-3 grid grid-cols-1 md:grid-cols-2 items-start gap-5 pb-[25px] border-b border-[#D9D9D9]">
                                    {/* Subject */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#0F0F0E]">
                                            Subject <span className="text-red-500">*</span>
                                        </Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-between border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:border-gray-300 bg-white"
                                                >
                                                    <span className={subject ? "text-[#0F0F0E]" : "text-gray-400"}>
                                                        {subject || "-Select Subject-"}
                                                    </span>
                                                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) rounded-xl border border-gray-100 shadow-lg bg-white p-1.5" align="start">
                                                {subjects.map(s => (
                                                    <DropdownMenuItem
                                                        key={s.id}
                                                        onClick={() => setSubject(s.name)}
                                                        className={`text-sm py-2.5 px-3 rounded-lg cursor-pointer ${subject === s.name
                                                            ? "bg-chestnut text-white"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <span className="flex-1">{s.name}</span>
                                                        {subject === s.name && <Check className="w-3.5 h-3.5" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Class */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#0F0F0E]">
                                            Class <span className="text-red-500">*</span>
                                        </Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-between border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:border-gray-300 bg-white"
                                                >
                                                    <span className={selectedClass ? "text-[#0F0F0E]" : "text-gray-400"}>
                                                        {selectedClass?.name || "-Select Class-"}
                                                    </span>
                                                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) rounded-xl border border-gray-100 shadow-lg bg-white p-1.5" align="start">
                                                {classes.map(cls => (
                                                    <DropdownMenuItem
                                                        key={cls.id}
                                                        onClick={() => setSelectedClass(cls)}
                                                        className={`text-sm py-2.5 px-3 rounded-lg cursor-pointer ${selectedClass?.id === cls.id
                                                            ? "bg-chestnut text-white"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <span className="flex-1">{cls.name}</span>
                                                        {selectedClass?.id === cls.id && <Check className="w-3.5 h-3.5" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Duration */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#0F0F0E]">
                                            Duration <span className="text-red-500">*</span>
                                        </Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-between border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium hover:border-gray-300 bg-white"
                                                >
                                                    <span className={duration ? "text-[#0F0F0E]" : "text-gray-400"}>
                                                        {duration || "-60 Minutes-"}
                                                    </span>
                                                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) rounded-xl border border-gray-100 shadow-lg bg-white p-1.5" align="start">
                                                {["30 Minutes", "45 Minutes", "60 Minutes", "90 Minutes", "120 Minutes"].map(d => (
                                                    <DropdownMenuItem
                                                        key={d}
                                                        onClick={() => setDuration(d)}
                                                        className={`text-sm py-2.5 px-3 rounded-lg cursor-pointer ${duration === d
                                                            ? "bg-chestnut text-white"
                                                            : "text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <span className="flex-1">{d}</span>
                                                        {duration === d && <Check className="w-3.5 h-3.5" />}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Set Time/Date */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-[#0F0F0E]">
                                            Set Time/Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <div className={cn(
                                                    "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium flex items-center gap-2 cursor-pointer hover:border-gray-300 transition bg-white",
                                                    dateTime ? "text-[#0F0F0E]" : "text-gray-400"
                                                )}>
                                                    <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                    {dateTime
                                                        ? format(new Date(dateTime), "dd MMM yyyy, hh:mm a")
                                                        : "mm/dd/yyyy"}
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={dateTime ? new Date(dateTime) : undefined}
                                                    onSelect={(date) => {
                                                        if (!date) return;
                                                        // preserve existing time if already set
                                                        const existing = dateTime ? new Date(dateTime) : new Date();
                                                        date.setHours(existing.getHours(), existing.getMinutes());
                                                        setDateTime(date.toISOString());
                                                    }}
                                                    initialFocus
                                                    captionLayout="dropdown"
                                                    fromYear={new Date().getFullYear()}
                                                    toYear={new Date().getFullYear() + 2}
                                                />
                                                {/* Time picker */}
                                                <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
                                                    <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                                                    <input
                                                        type="time"
                                                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#292382]/20"
                                                        value={dateTime ? format(new Date(dateTime), "HH:mm") : ""}
                                                        onChange={(e) => {
                                                            const [hours, minutes] = e.target.value.split(':').map(Number);
                                                            const base = dateTime ? new Date(dateTime) : new Date();
                                                            base.setHours(hours, minutes);
                                                            setDateTime(base.toISOString());
                                                        }}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <Label htmlFor="Sub-topic" className="text-xs font-semibold text-[#0F0F0E] mb-2">Sub-topic</Label>
                                    <Input id="Sub-topic" placeholder="eg. chrolophyll in plant " className="w-full border border-gray-200 rounded-lg px-4 py-2.5 h-11.25 text-sm font-medium text-gray-900 focus:border-none" />
                                </div>
                                <div className="mb-5">
                                    <Label htmlFor="lesson-objectives" className="text-xs font-semibold text-[#0F0F0E] mb-2">
                                        Lesson Objectives/Aim
                                    </Label>
                                    <Textarea
                                        id="lesson-objectives"
                                        placeholder="What will the student learn and be able to do after this lesson"
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 min-h-[65px] text-sm font-medium text-gray-900 resize-none focus:border-none"
                                        rows={3}
                                    />
                                </div>
                                {/* --- Type & Conditional Media Upload --- */}
                                <div className="space-y-6">
                                    {/* ✅ Only show this section if Recorded Class is selected */}
                                    <div className="grid grid-cols-1 gap-6 transition-all duration-300 pb-10 border-b border-[#D9D9D9]">
                                        <div>
                                            <Label htmlFor="Sub-topic" className="text-xs font-semibold text-[#0F0F0E] mb-2">Upload Media</Label>
                                            <MediaUpload onFilesSelected={(files) => files} />
                                        </div>
                                        <FileList
                                            files={files}
                                            onDelete={(id) => id}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center justify-end gap-2 py-6 lg:pt-6 lg:pb-10">
                                    <button className="border border-[#3A3A3A80] px-4 py-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                                        <span className="text-[#3A3A3A80] font-semibold text-sm">Close</span>
                                    </button>

                                    <button className="border border-[#3A3A3A80] px-4 py-2 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                                        <span className="text-[#3A3A3A80] font-semibold text-sm">Save As Draft</span>
                                    </button>

                                    <button
                                        onClick={() => setOpen(true)}
                                        className="bg-chestnut px-4 py-2 flex items-center gap-1.5 rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.5 7.25C2.5 7.25 3.25 7.25 4.25 9C4.25 9 7.0295 4.4165 9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span className="text-white font-medium text-sm">Submit for Review</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 lg:pr-2 p-2">
                        <PendingReviews />
                        <Recordedclass />
                        <SubmissionGuide />
                    </div>

                </div>
            </div>

            <SetQuestion open={open} onOpenChange={setOpen} />
        </>
    )
}

export default RecordedMain
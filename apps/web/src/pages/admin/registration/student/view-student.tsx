import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EllipsisVertical, PlusIcon, Trash2 } from "lucide-react";
import { Button } from "@bluethub/ui-kit";
import type { StudentProfile } from "./edit-student-dialog";
import EditStudentDialog from "./edit-student-dialog";

export type FilterTab = "All" | "Primary" | "JSS" | "SSS";

export type SchoolLevel = "All Levels" | "Primary" | "Junior Secondary" | "Senior Secondary";

export interface Student {
    id: number;
    name: string;
    level: SchoolLevel;
    status: "Active" | "Non-Active";
}

const levelBadge: Record<SchoolLevel, { bg: string; text: string }> = {
    "All Levels": { bg: "#EEF2FF", text: "#4338CA" },
    "Primary": { bg: "#DCFCE7", text: "#15803D" },
    "Junior Secondary": { bg: "#FAC775", text: "#854F0B" },
    "Senior Secondary": { bg: "#F3F4F6", text: "#6B7280" },
};

const ViewStudent = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("All");
    const [students] = useState<Student[]>([]);
    const [editOpen, setEditOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);

    const totalClass = students.length;
    const activeClasses = students.filter(s => s.status === "Active").length;
    const nonActive = students.filter(s => s.status === "Non-Active").length;

    const visible = students.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === "All" ||
            (filter === "Primary" && s.level === "Primary") ||
            (filter === "JSS" && s.level === "Junior Secondary") ||
            (filter === "SSS" && s.level === "Senior Secondary");
        return matchSearch && matchFilter;
    });


    const handleEdit = (s: Student) => {
        setEditingStudent({
            id: s.id,
            name: s.name,
            className: s.level,
            subjectCount: 0,
            guardianName: "",
            username: s.name.toLowerCase().replace(" ", "."),
            dob: "",
        });
        setEditOpen(true);
    };

    return (
        <>
            <div className="p-6 font-poppins">
                <div className="backdrop-blur-sm  border border-white/20 overflow-hidden">

                    {/* ── Top Nav ─────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between px-4 py-5 sticky top-0 z-30 bg-chestnut">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
                            </svg>
                            <span className="text-white font-semibold text-sm">View All Student</span>
                        </div>
                        <button className="text-white">
                            <EllipsisVertical size={18} />
                        </button>
                    </div>

                    {/* ── Body ────────────────────────────────────────────────── */}
                    <div className="flex-1 p-8 bg-white/70 backdrop-blur-sm">

                        {/* Page header row */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-xl font-bold text-[#12122A] leading-tight">
                                    Student Registry
                                </h1>
                                <p className="text-sm text-[#A0A8C0] mt-0.5">
                                    All Student at Greenfield College — Primary to Secondary
                                </p>
                            </div>
                            <Button
                                onClick={() => navigate('/admin/registration/student/enrollment')}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-xs font-semibold bg-chestnut shrink-0 transition-opacity hover:opacity-90"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Student
                            </Button>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {[
                                {
                                    icon: (
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    ),
                                    value: totalClass,
                                    label: "Total Class",
                                },
                                {
                                    icon: (
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    ),
                                    value: activeClasses,
                                    label: "Active Classes",
                                },
                                {
                                    icon: (
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    ),
                                    value: nonActive,
                                    label: "Non-Active Class",
                                },
                            ].map(({ icon, value, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 bg-gray-50 border border-[#E2E5F0] rounded-xl px-4 py-3"
                                >
                                    {icon}
                                    <div>
                                        <p className="text-xl font-bold text-[#12122A] leading-none">{value}</p>
                                        <p className="text-sm text-[#3A3A3ABF] mt-0.5">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Search + filter tabs */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by Student name..."
                                    className="flex-1 text-xs text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                                />
                            </div>
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                                {(["All", "Primary", "JSS", "SSS"] as FilterTab[]).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setFilter(tab)}
                                        className="px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                                        style={{
                                            backgroundColor: filter === tab ? "#292382" : "transparent",
                                            color: filter === tab ? "#fff" : "#6b7280",
                                        }}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Table header */}
                            <div
                                className="grid text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-4 py-2.5 border-b border-gray-200 bg-gray-50"
                                style={{ gridTemplateColumns: "40px 1fr 180px 120px 120px" }}
                            >
                                <span>#</span>
                                <span>Student Name</span>
                                <span>School Level</span>
                                <span>Status</span>
                                <span>Action</span>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-gray-100">
                                {visible.map((s, i) => {
                                    const badge = levelBadge[s.level];
                                    return (
                                        <div
                                            key={s.id}
                                            className="grid items-center px-4 py-2.5 hover:bg-gray-50/70 transition-colors"
                                            style={{ gridTemplateColumns: "40px 1fr 180px 120px 120px" }}
                                        >
                                            {/* # */}
                                            <span className="text-[11px] text-gray-400">
                                                {String(i + 1).padStart(2, "0")}
                                            </span>

                                            {/* Student name */}
                                            <span className="text-xs font-medium text-gray-800">
                                                {s.name}
                                            </span>

                                            {/* Level badge */}
                                            <div>
                                                <span
                                                    className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                                                    style={{ backgroundColor: badge.bg, color: badge.text }}
                                                >
                                                    {s.level}
                                                </span>
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{
                                                        backgroundColor: s.status === "Active" ? "#22c55e" : "#f59e0b",
                                                    }}
                                                />
                                                <span
                                                    className="text-[11px] font-medium"
                                                    style={{
                                                        color: s.status === "Active" ? "#15803d" : "#b45309",
                                                    }}
                                                >
                                                    {s.status}
                                                </span>
                                            </div>

                                            {/* Edit */}
                                            <div className="flex items-center gap-3 justify-between">

                                            <button
                                                onClick={() => handleEdit(s)}
                                                className="text-[11px] font-semibold text-chestnut hover:underline transition-colors text-left"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleEdit(s)}
                                                className="text-[11px] font-semibold text-white bg-[#dd0b0bf9] p-2 rounded-md hover:underline transition-colors text-left"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {visible.length === 0 && (
                                    <div className="py-10 text-center">
                                        <p className="text-xs text-gray-400">No students found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {
                editingStudent && (
                    <EditStudentDialog
                        open={editOpen}
                        onOpenChange={setEditOpen}
                        student={editingStudent}
                        onSave={(updated) => console.log("saved", updated)}
                    />
                )
            }
        </>
    );
};

export default ViewStudent;
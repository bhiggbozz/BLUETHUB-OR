import { useEffect, useState } from "react";
import { ArrowLeft, EllipsisVertical, LayoutGrid, Menu, PlusIcon } from "lucide-react";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@bluethub/ui-kit";
import { useNavigate, useOutletContext } from "react-router-dom";
import EditSubjectModal from "./edit-subject-modal";
import { AxiosError } from "axios";
import { schoolService } from "@/services/school";
import type { Subject } from "../main";
import { localData } from "@/utils";
import type { SchoolInfo } from "@/services";


export type SchoolLevel = "Primary" | "JSS" | "SSS" | "All Levels";
export type SubjectStatus = "Active" | "Inactive";

/* ── Level badge colours ─────────────────────────────────────────────── */
export const levelBadge: Record<SchoolLevel, { bg: string; text: string }> = {
    "All Levels": { bg: "#e0f2fe", text: "#0369a1" },
    "Primary": { bg: "#d1fae5", text: "#065f46" },
    "JSS": { bg: "#ede9fe", text: "#5b21b6" },
    "SSS": { bg: "#fee2e2", text: "#991b1b" },
};

export type FilterTab = "All" | "Primary" | "JSS" | "SSS";

const ViewAllSubject = () => {
    const navigate = useNavigate();
    const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
    const schoolInfo = localData.retrieve("schoolInfo") as SchoolInfo | null;
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("All");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [, setErrorMsg] = useState("");

    const totalSubjects = subjects.length;
    const activeSubjects = subjects.filter(s => s.isActive).length;
    const nonActiveSubjects = subjects.filter(s => !s.isActive).length;

    const visible = subjects.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === "All" ||
            (filter === "Primary" && s.classCategoryName === "Primary") ||
            (filter === "JSS" && s.classCategoryName === "JSS") ||
            (filter === "SSS" && s.classCategoryName === "SSS");
        return matchSearch && matchFilter;
    });




    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const { data } = await schoolService.getAllSubject();
            setSubjects(data.data.subjects ?? []);
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


    return (
        <div className="lg:p-2 font-poppins">
            <div className="backdrop-blur-sm  border border-white/20  overflow-hidden">

                {/* ── Top Nav ──────────────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-4 py-5 sticky top-0 z-30 bg-chestnut"
                >
                    <div className="flex items-center gap-2.5">
                        <LayoutGrid className="w-6 h-6 text-white hidden lg:inline-flex" />
                        <Menu className="lg:hidden text-white" onClick={openMobileNav} />
                        <ArrowLeft  className="lg:hidden text-white"  onClick={() => navigate(-1)}/>
                        <span className="text-white font-medium text-sm">View All Subject</span>
                    </div>
                    <button className="text-white">
                        <EllipsisVertical size={18} />
                    </button>
                </div>

                {/* ── White card ───────────────────────────────────────────────── */}
                <div className="flex-1 lg:p-8 p-4 bg-white/70 backdrop-blur-sm">
                    <div className="space-y-20">

                        {/* Page header row */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-base font-medium  lg:font-bold text-blck-b2 leading-tight">
                                    Subject Registry
                                </h1>
                                <p className="text-xs  text-[#A0A8C0]  mt-0.5">
                                    All subjects registered to {schoolInfo?.schoolName || "Your School"} — Primary to Secondary
                                </p>
                            </div>
                            <Button
                                onClick={() => navigate('/admin/registration/courses/new')}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-white text-xs font-semibold  bg-chestnut shrink-0 transition-opacity hover:opacity-90"
                            >
                                <PlusIcon />
                                Add Subject
                            </Button>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                            {[
                                {
                                    icon: (
                                        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    ),
                                    value: totalSubjects,
                                    label: "Total subjects",
                                },
                                {
                                    icon: (
                                        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    ),
                                    value: activeSubjects,
                                    label: "Active subjects",
                                },
                                {
                                    icon: (
                                        <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    ),
                                    value: nonActiveSubjects,
                                    label: "Non Active subjects",
                                },
                            ].map(({ icon, value, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 bg-gray-50 border border-[#E2E5F0] rounded-md px-4 py-3"
                                >
                                    {icon}
                                    <div className="min-w-0">
                                        <p className="text-xl font-bold text-[#12122A] leading-none">{value}</p>
                                        <p className="text-xs sm:text-sm text-[#3A3A3ABF] mt-0.5 truncate">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Search + filter tabs */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">

                            {/* Search */}
                            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by subject name..."
                                    className="flex-1 text-xs text-gray-600 placeholder-gray-400 outline-none bg-transparent"
                                />
                            </div>

                            {/* Filter tabs */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
                                {(["All", "Primary", "JSS", "SSS"] as FilterTab[]).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setFilter(tab)}
                                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap"
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

                        <div className="border border-gray-200 rounded-md md:rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-gray-400 w-10">#</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Subject Name</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-gray-400">School Level</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wide text-gray-400 w-20">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <>
                                            {[...Array(5)].map((_, i) => (
                                                <TableRow key={i}>
                                                    {[...Array(5)].map((_, j) => (
                                                        <TableCell key={j}>
                                                            <div
                                                                className="h-4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"
                                                                style={{
                                                                    width: j === 0 ? "40%" : j === 4 ? "60%" : "75%",
                                                                    animationDelay: `${i * 80}ms`,
                                                                }}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </>
                                    ) : visible.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-10 text-center text-xs text-gray-400">
                                                No subjects found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visible.map((s, i) => {
                                            const badge = levelBadge[s.classCategoryName as SchoolLevel] ?? { bg: "#f3f4f6", text: "#6b7280" };
                                            return (
                                                <TableRow key={s.id} className="hover:bg-gray-50/70">
                                                    <TableCell className="text-[11px] text-gray-400">
                                                        {String(i + 1).padStart(2, "0")}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium text-gray-800">
                                                        {s.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                                                            style={{ backgroundColor: badge.bg, color: badge.text }}
                                                        >
                                                            {s.classCategoryName}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: s.isActive ? "#22c55e" : "#f59e0b" }}
                                                            />
                                                            <span
                                                                className="text-[11px] font-medium"
                                                                style={{ color: s.isActive ? "#15803d" : "#b45309" }}
                                                            >
                                                                {s.isActive ? "Active" : "Inactive"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <EditSubjectModal onAction={s} />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewAllSubject;
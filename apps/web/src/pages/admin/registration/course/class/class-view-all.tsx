import { useEffect, useState } from "react";
import { ArrowLeft, EllipsisVertical, GalleryVerticalEnd, LayoutGrid, Loader2, Menu, PlusIcon } from "lucide-react";
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@bluethub/ui-kit";
import { useNavigate, useOutletContext } from "react-router-dom";
// import EditSubjectModal from "./edit-subject-modal";
import EditClassModal from "./edit-class-dialog";
import { AxiosError } from "axios";
import { schoolService } from "@/services/school";
import type { Classroom } from "./class-registration";
import { localData } from "@/utils";
import type { SchoolInfo } from "@/services";



export type FilterTab = "All" | "Primary" | "JSS" | "SSS";

export type SchoolLevel =
    | "All Levels"
    | "Primary"
    | "Junior Secondary"
    | "Senior Secondary";

export type ClassStatus = "Active" | "Inactive";



/* ── Level badge colours ─────────────────────────────────────────────── */
export const levelBadge: Record<SchoolLevel, { bg: string; text: string }> = {
    "All Levels": { bg: "#e0f2fe", text: "#0369a1" },
    "Primary": { bg: "#d1fae5", text: "#065f46" },
    "Junior Secondary": { bg: "#fef9c3", text: "#a16207" },
    "Senior Secondary": { bg: "#ede9fe", text: "#5b21b6" },
};



const ClassviewAll = () => {
    const navigate = useNavigate();
    const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("All");
    const [classes, setClasses] = useState<Classroom[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [, setErrorMsg] = useState("");
    const schoolName = localData.retrieve("schoolInfo") as SchoolInfo
    const [currentClass, setCurrentClass] = useState<Classroom | null>(null);



    const totalClass = classes.length;
    const activeClass = classes.filter(s => s.isActive).length;
    const nonActiveClass = classes.filter(s => !s.isActive).length;


    const visible = classes.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
        // const matchFilter =
        //     filter === "All" ||
        //     (filter === "Primary" && s.level === "Primary") ||
        //     (filter === "JSS" && s.level === "Junior Secondary") ||
        //     (filter === "SSS" && s.level === "Senior Secondary");
        return matchSearch;
    });

    const fetchClassrooms = async () => {
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
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const handleModal = (s: Classroom) => {
        setOpen(true)
        setCurrentClass(s)
    }

    return (
        <>
            <div className="md:p-3 font-poppins">
                <div className="backdrop-blur-sm border border-white/20  overflow-hidden">

                    {/* ── Top Nav ──────────────────────────────────────────────────── */}
                    <div
                        className="flex items-center justify-between px-4 py-5 sticky top-0 z-30 bg-chestnut"
                    >
                        <div className="flex items-center gap-2.5">
                            <LayoutGrid className="w-5 h-5 text-white lg:inline hidden" />
                            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
                            <ArrowLeft className="lg:hidden text-white" onClick={() => navigate(-1)} />
                            <span className="text-white font-medium text-sm">View All class</span>
                        </div>
                        <button className="text-white">
                            <EllipsisVertical size={18} />
                        </button>
                    </div>

                    {/* ── White card ───────────────────────────────────────────────── */}
                    <div className="flex-1 p-4 lg:p-8 bg-white/70 backdrop-blur-sm">
                        <div className="space-y-20">

                            {/* Page header row */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className="text-base font-semibold text-blck-b2 leading-tight">
                                        Class Registry
                                    </h1>
                                    <p className=" text-xs sm:text-sm text-[#A0A8C0]  mt-0.5">
                                        All classes at {schoolName.schoolName} — Primary to Secondary

                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate('/admin/registration/class/new')}
                                    className="flex items-center gap-1.5 px-3.5 py-2  rounded-md lg:rounded-lg text-white text-xs font-semibold  bg-chestnut shrink-0 transition-opacity hover:opacity-90"
                                >
                                    <PlusIcon />
                                    Add Class
                                </Button>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                {[
                                    {
                                        icon: <GalleryVerticalEnd className="w-5 h-5 text-gray-500" />,
                                        value: totalClass,
                                        label: "Total Class",
                                    },
                                    {
                                        icon: (
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        ),
                                        value: activeClass,
                                        label: "Active Class",
                                    },
                                    {
                                        icon: (
                                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        ),
                                        value: nonActiveClass,
                                        label: "Non Active Class",
                                    },
                                ].map(({ icon, value, label }) => (
                                    <div
                                        key={label}
                                        className="flex items-center gap-3 bg-gray-50 border border-[#E2E5F0] rounded-xl px-4 py-3"
                                    >
                                        {icon}
                                        <div>
                                            <p className="text-xl font-semibold text-[#12122A] leading-none">{value}</p>
                                            <p className="text-sm text-[#3A3A3ABF] mt-0.5">{label}</p>
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

                            {/* Table */}
                            <div className="border border-gray-200 rounded-md lg:rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-10">#</TableHead>
                                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Class Name</TableHead>
                                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">noOfStudents</TableHead>
                                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Status</TableHead>
                                            <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-10 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                                        <Loader2 size={14} className="animate-spin" />
                                                        Loading classes…
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : visible.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-10 text-center text-xs text-gray-400">
                                                    No Class found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            visible.map((s, i) => {
                                                return (
                                                    <TableRow key={s.id} className="hover:bg-gray-50/70">
                                                        <TableCell className="text-[11px] text-gray-400">
                                                            {String(i + 1).padStart(2, "0")}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-semibold text-gray-800">
                                                            {s.name}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-semibold text-gray-800">
                                                            {s.noOfStudents}
                                                        </TableCell>
                                                        {/* <TableCell>
                                                            <span
                                                                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                                                                style={{ backgroundColor: badge.bg, color: badge.text }}
                                                            >
                                                                {s.classCategoryName}
                                                            </span>
                                                        </TableCell> */}
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
                                                            <Button
                                                                onClick={() => handleModal(s)}
                                                                className="text-[11px] font-semibold hover:opacity-70 transition-opacity bg-chestnut h-7 px-3"
                                                            >
                                                                Edit
                                                            </Button>
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

            <EditClassModal open={open} currentClass={currentClass} onOpenChange={() => { setOpen(false), fetchClassrooms();}}/>
        </>
    );
};

export default ClassviewAll;
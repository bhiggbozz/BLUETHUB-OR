import { useAuthContext } from "@/contexts/auth-context";
import { authService } from "@/services/auth";
import { adminService } from "@/services/admin";
import { localData } from "@/utils";
import { UserRole } from "@/utils/validate";
import { EllipsisVertical, LayoutGrid, Loader2, Menu, PlusIcon, Search, SquarePen, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button, Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@bluethub/ui-kit";
import { useNavigate, useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  emailAddress: string;
  guardianName?: string | null;
  isActive: boolean;
  className: string;
  status: "Active" | "Non-Active";
};

const normalizeStudents = (payload: any): StudentRow[] => {
  const rows = payload?.users ?? payload?.Users ?? payload?.students ?? payload?.Students ?? payload ?? [];

  return (Array.isArray(rows) ? rows : [])
    .map((student: any) => {
      const classrooms = student?.roleData?.classrooms ?? student?.roleData?.Classrooms ?? [];
      const classroom = student?.roleData?.classroom ?? student?.roleData?.Classroom ?? classrooms[0] ?? null;

      return {
        id: String(student?.id ?? student?.Id ?? ""),
        firstName: String(student?.firstName ?? student?.FirstName ?? ""),
        lastName: String(student?.lastName ?? student?.LastName ?? ""),
        userName: String(student?.userName ?? student?.UserName ?? ""),
        emailAddress: String(student?.emailAddress ?? student?.EmailAddress ?? ""),
        guardianName: student?.guardianName ?? student?.GuardianName ?? null,
        isActive: Boolean(student?.isActive ?? student?.IsActive ?? false),
        className: String(
          classroom?.className ?? classroom?.ClassName ?? classroom?.name ?? classroom?.Name ?? "",
        ),
        status: Boolean(student?.isActive ?? student?.IsActive ?? false) ? "Active" : "Non-Active",
      } satisfies StudentRow;
    })
    .filter((student: StudentRow) => !!student.id);
};

const Student = () => {
  const navigate = useNavigate();
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { user } = useAuthContext();
  const school = localData.retrieve("schoolInfo") as { schoolName?: string } | null;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);



  const fetchStudent = async () => {
    try {
      setLoading(true);
      const { data } = await authService.getUserByRole(UserRole.Student);
      const payload = (data as any)?.data ?? (data as any)?.Data ?? {};
      const normalized = normalizeStudents(payload);
      setStudents(normalized);
    } catch (error) {
      console.warn("Failed to fetch students", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (studentId: string) => {
    setUnlockingId(studentId);
    try {
      await adminService.unlockUser(studentId);
      toast.success("User account unlocked successfully");
      setStudents(prev =>
        prev.map(s =>
          s.id === studentId ? { ...s, isActive: true, status: "Active" } : s
        )
      );
    } catch (error: any) {
      const msg =
        error?.response?.data?.responseMessage ??
        error?.message ??
        "Failed to unlock user";
      toast.error(msg);
    } finally {
      setUnlockingId(null);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.firstName, student.lastName, student.userName, student.emailAddress, student.className]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, students]);


  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  };

  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / PAGE_SIZE));

  if (loading) {
    return (
      <div className="md:p-3 p-3 font-poppins space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-chestnut px-5 py-4 text-white">
          <div className="space-y-1">
            <div className="h-4 w-36 rounded bg-white/20" />
            <div className="h-3 w-56 rounded bg-white/15" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-white/15" />
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-14 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="md:p-3 font-poppins">
      <div className="border border-white/20 overflow-hidden bg-white/75 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-30 bg-chestnut">
          <div className="flex items-center gap-2.5 min-w-0">
            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
            <LayoutGrid className="w-5 h-5 hidden lg:inline text-white" />
            <span className="text-white font-semibold text-sm truncate">Student Registry</span>
          </div>
          <EllipsisVertical className="text-white" />
        </div>

        <div className="p-5 sm:p-6 space-y-4 min-h-screen">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#12122A]">Students</h1>
              <p className="text-sm text-slate-500">
                {school?.schoolName ?? "School"} - {user?.firstName ?? ""} {user?.lastName ?? ""}
              </p>
            </div>
            <Button onClick={() => navigate("/admin/registration/student/enrollment")} className="inline-flex items-center gap-2 rounded-md bg-chestnut px-4 py-2 text-white text-sm font-semibold hover:opacity-90">
              <PlusIcon className="w-4 h-4" />
              Add Student
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            {/* Header row - hidden on mobile */}
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_120px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Student</span>
              <span>Email</span>
              <span>Class</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            <div className="divide-y divide-slate-100">
              {visibleStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50/80 transition-colors md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_120px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">@{student.userName}</p>
                  </div>

                  {/* Mobile: labeled stacked rows. Desktop: plain cell, label hidden */}
                  <p className="text-sm text-slate-600 truncate">
                    <span className="md:hidden text-xs text-slate-400 mr-1">Email:</span>
                    {student.emailAddress || "-"}
                  </p>
                  <p className="text-sm text-slate-600 truncate">
                    <span className="md:hidden text-xs text-slate-400 mr-1">Class:</span>
                    {student.className || "-"}
                  </p>
                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${student.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {student.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate("/admin/registration/student/edit", { state: { studentId: student.id } })}
                    className="inline-flex items-center gap-1 rounded-lg border border-chestnut/20 bg-chestnut/5 px-3 py-2 text-xs font-semibold text-chestnut hover:bg-chestnut/10 w-fit"
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {!student.isActive && (
                    <button
                      type="button"
                      onClick={() => handleUnlock(student.id)}
                      disabled={unlockingId === student.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 w-fit"
                    >
                      {unlockingId === student.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                      Unlock
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {!loading && (
          <Pagination className="mt-5 justify-between md:hidden pb-7">
            <PaginationContent className="w-full flex items-center justify-between">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "gap-1.5 text-sm text-gray-500 border border-[#F6F6F6] rounded-[8px] bg-white cursor-pointer select-none",
                    currentPage === 1 && "pointer-events-none opacity-40"
                  )}
                />
              </PaginationItem>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, i) =>
                  page === "..." ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(Number(page))}
                        isActive={currentPage === page}
                        className={cn(
                          "size-10 rounded-[8px] text-sm font-medium cursor-pointer select-none",
                          currentPage === page
                            ? "bg-[#A000000D] border border-[#A000000D] text-[#A00000] hover:bg-gray-800 hover:text-white"
                            : "text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
              </div>

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                    "gap-1.5 text-sm text-gray-500 border border-[#F6F6F6] rounded-[8px] bg-white cursor-pointer select-none",
                    currentPage === totalPages && "pointer-events-none opacity-40"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

    </div>
  )
}

export default Student
import { useAuthContext } from "@/contexts/auth-context";
import { authService, type IEditUserRequest } from "@/services/auth";
import { adminService } from "@/services/admin";
import { localData } from "@/utils";
import { UserRole } from "@/utils/validate";
import { EllipsisVertical, LayoutGrid, Loader2, Menu, PlusIcon, Search, SquarePen, Trash2, Unlock, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@bluethub/ui-kit";
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
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StudentRow | null>(null);

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

  const handleDeactivate = async (studentId: string) => {
    setDeactivatingId(studentId);
    try {
      // Fetch the full record so the edit payload preserves every field the
      // backend's editUser contract requires — this list only holds a
      // display-shaped subset (no roleId/hasAccess/profileImage).
      const { data } = await authService.getUserById(studentId);
      const record = (data as any)?.data ?? (data as any)?.Data ?? data;

      const payload: IEditUserRequest = {
        id: studentId,
        firstName: String(record?.firstName ?? record?.FirstName ?? ""),
        lastName: String(record?.lastName ?? record?.LastName ?? ""),
        emailAddress: String(record?.emailAddress ?? record?.EmailAddress ?? ""),
        isActive: false,
        hasAccess: Boolean(record?.hasAccess ?? record?.HasAccess ?? false),
        roleId: Number(record?.roleId ?? record?.RoleId ?? UserRole.Student),
        profileImage: record?.profileImage ?? record?.ProfileImage ?? "",
        guardianName: record?.guardianName ?? record?.GuardianName ?? "",
      };

      await authService.editUser(payload);
      toast.success("Student account deactivated");
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, isActive: false, status: "Non-Active" } : s)),
      );
      setDeactivateTarget(null);
    } catch (error: any) {
      const msg =
        error?.response?.data?.responseMessage ??
        error?.message ??
        "Failed to deactivate student";
      toast.error(msg);
    } finally {
      setDeactivatingId(null);
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
            <Skeleton className="h-4 w-36 bg-white/20" />
            <Skeleton className="h-3 w-56 bg-white/15" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg bg-white/15" />
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="md:p-3 font-poppins">
      <div className="border border-border overflow-hidden bg-card/75 backdrop-blur-sm">
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
              <h1 className="text-xl font-bold text-foreground">Students</h1>
              <p className="text-sm text-muted-foreground">
                {school?.schoolName ?? "School"} - {user?.firstName ?? ""} {user?.lastName ?? ""}
              </p>
            </div>
            <Button onClick={() => navigate("/admin/registration/student/enrollment")} className="gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Student
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {visibleStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background py-16 text-center">
              <UsersRound className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {search ? "No students match your search" : "No students yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {search ? "Try a different name, class, or email." : "Students you register will show up here."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: a real table */}
              <div className="hidden md:block overflow-hidden rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="whitespace-normal">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">@{student.userName}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.emailAddress || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.className || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={student.isActive ? "success" : "secondary"}>{student.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate("/admin/registration/student/edit", { state: { studentId: student.id } })}
                              className="gap-1"
                            >
                              <SquarePen className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            {!student.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnlock(student.id)}
                                disabled={unlockingId === student.id}
                                className="gap-1 border-emerald-600/20 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400"
                              >
                                {unlockingId === student.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Unlock className="h-3.5 w-3.5" />
                                )}
                                Unlock
                              </Button>
                            )}
                            {student.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeactivateTarget(student)}
                                disabled={deactivatingId === student.id}
                                className="gap-1 border-red-600/20 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
                              >
                                {deactivatingId === student.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-2">
                {visibleStudents.map((student) => (
                  <div key={student.id} className="rounded-md border border-border bg-background p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{student.userName}</p>
                      </div>
                      <Badge variant={student.isActive ? "success" : "secondary"}>{student.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      <span className="text-xs text-muted-foreground/70 mr-1">Email:</span>
                      {student.emailAddress || "-"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      <span className="text-xs text-muted-foreground/70 mr-1">Class:</span>
                      {student.className || "-"}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/admin/registration/student/edit", { state: { studentId: student.id } })}
                        className="gap-1"
                      >
                        <SquarePen className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      {!student.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlock(student.id)}
                          disabled={unlockingId === student.id}
                          className="gap-1 border-emerald-600/20 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400"
                        >
                          {unlockingId === student.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                          Unlock
                        </Button>
                      )}
                      {student.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeactivateTarget(student)}
                          disabled={deactivatingId === student.id}
                          className="gap-1 border-red-600/20 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
                        >
                          {deactivatingId === student.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {!loading && (
          <Pagination className="mt-5 justify-between md:hidden pb-7">
            <PaginationContent className="w-full flex items-center justify-between">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "gap-1.5 text-sm text-muted-foreground border border-border rounded-[8px] bg-background cursor-pointer select-none",
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
                            ? "bg-chestnut/10 border border-chestnut/10 text-chestnut hover:bg-chestnut hover:text-white"
                            : "text-muted-foreground hover:bg-accent"
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
                    "gap-1.5 text-sm text-muted-foreground border border-border rounded-[8px] bg-background cursor-pointer select-none",
                    currentPage === totalPages && "pointer-events-none opacity-40"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this student?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.firstName} ${deactivateTarget.lastName} will immediately lose login access. You can restore access later from the Unlock User page.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deactivatingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!!deactivatingId}
              onClick={() => deactivateTarget && handleDeactivate(deactivateTarget.id)}
            >
              {deactivatingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Student
import { useAuthContext } from "@/contexts/auth-context";
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import { moduleService } from "@/services/module";
import { schoolService } from "@/services/school";
import { localData } from "@/utils";
import { UserRole } from "@/utils/validate";
import {
  EllipsisVertical,
  LayoutGrid,
  Loader2,
  Lock,
  Menu,
  Search,
  Unlock,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useOutletContext } from "react-router-dom";

type UnlockUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  emailAddress: string;
  className: string;
  isActive: boolean;
  status: "Active" | "Non-Active";
};

type RoleOption = {
  label: string;
  roleId: number;
};

type ClassroomOption = {
  id: string;
  name: string;
};

const roles: RoleOption[] = [
  { label: "Student", roleId: UserRole.Student },
  { label: "Subject Teacher", roleId: UserRole.SubjectTeacher },
  { label: "Class Teacher", roleId: UserRole.ClassTeacher },
  { label: "Head Teacher", roleId: UserRole.HeadTeacher },
  { label: "Administrator", roleId: UserRole.Administrator },
];

const normalizeUser = (s: any): UnlockUserRow => {
  const classrooms =
    s?.roleData?.classrooms ?? s?.roleData?.Classrooms ?? [];
  const classroom =
    s?.roleData?.classroom ??
    s?.roleData?.Classroom ??
    classrooms[0] ??
    null;

  return {
    id: String(s?.id ?? s?.Id ?? ""),
    firstName: String(s?.firstName ?? s?.FirstName ?? ""),
    lastName: String(s?.lastName ?? s?.LastName ?? ""),
    userName: String(s?.userName ?? s?.UserName ?? ""),
    emailAddress: String(s?.emailAddress ?? s?.EmailAddress ?? ""),
    className: String(
      classroom?.className ??
        classroom?.ClassName ??
        classroom?.name ??
        classroom?.Name ??
        (s?.className ?? s?.ClassName ?? ""),
    ),
    isActive: Boolean(s?.isActive ?? s?.IsActive ?? false),
    status: Boolean(s?.isActive ?? s?.IsActive ?? false)
      ? "Active"
      : "Non-Active",
  };
};

const UnlockUser = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const { user } = useAuthContext();
  const school = localData.retrieve("schoolInfo") as {
    schoolName?: string;
  } | null;

  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");
  const [users, setUsers] = useState<UnlockUserRow[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const isStudentRole = selectedRole?.roleId === UserRole.Student;

  const fetchClassrooms = async () => {
    try {
      setLoadingClasses(true);
      const { data } = await schoolService.getAllClassRooms({
        pageNumber: 1,
        pageSize: 200,
      });
      const d = (data as any)?.data ?? {};
      const rows: any[] = d.classrooms ?? d.Classrooms ?? [];
      const mapped = rows
        .map((c: any) => ({
          id: String(c.id ?? c.Id ?? c.classroomId ?? ""),
          name: String(c.name ?? c.Name ?? c.className ?? ""),
        }))
        .filter((c: ClassroomOption) => !!c.id);
      setClassrooms(mapped);
    } catch (error) {
      console.warn("Failed to fetch classrooms", error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchUsersByRole = async (role: RoleOption) => {
    try {
      setLoadingUsers(true);
      const { data } = await authService.getUserByRole(role.roleId);
      const payload = (data as any)?.data ?? (data as any)?.Data ?? {};
      const rows =
        payload?.users ??
        payload?.Users ??
        payload?.students ??
        payload?.Students ??
        payload ??
        [];
      const normalized = (Array.isArray(rows) ? rows : [])
        .map(normalizeUser)
        .filter((u: UnlockUserRow) => !!u.id);
      setUsers(normalized);
    } catch (error) {
      console.warn("Failed to fetch users by role", error);
      setUsers([]);
      toast.error(`Failed to load users for ${role.label}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStudentsByClass = async (classroomId: string) => {
    if (!classroomId) return;
    try {
      setLoadingUsers(true);
      const { data } = await moduleService.getStudentsByClassroom(classroomId);
      const payload = (data as any)?.data ?? [];
      const normalized = (Array.isArray(payload) ? payload : [])
        .map(normalizeUser)
        .filter((u: UnlockUserRow) => !!u.id);
      setUsers(normalized);
    } catch (error) {
      console.warn("Failed to fetch students", error);
      setUsers([]);
      toast.error("Failed to load students for this class");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = (role: RoleOption) => {
    setSelectedRole(role);
    setSelectedClassroomId("");
    setSearch("");
    setUsers([]);
    if (role.roleId === UserRole.Student) {
      if (classrooms.length === 0) fetchClassrooms();
    } else {
      fetchUsersByRole(role);
    }
  };

  const handleClassChange = (classroomId: string) => {
    setSelectedClassroomId(classroomId);
    setSearch("");
    fetchStudentsByClass(classroomId);
  };

  const handleUnlock = async (userId: string) => {
    setUnlockingId(userId);
    try {
      await adminService.unlockUser(userId);
      toast.success("User account unlocked successfully");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isActive: true, status: "Active" }
            : u,
        ),
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

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) =>
      [u.firstName, u.lastName, u.userName, u.emailAddress, u.className]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, users]);

  const lockedUsers = users.filter((u) => !u.isActive);
  const selectedClassName =
    classrooms.find((c) => c.id === selectedClassroomId)?.name ?? "";

  const showList =
    selectedRole && (!isStudentRole || !!selectedClassroomId);

  return (
    <div className="md:p-3 font-poppins">
      <div className=" border border-white/20 overflow-hidden bg-white/75 backdrop-blur-sm min-h-screen">
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-30 bg-chestnut">
          <div className="flex items-center gap-2.5 min-w-0">
            <Menu className="lg:hidden text-white" onClick={openMobileNav} />
            <LayoutGrid className="w-5 h-5 hidden lg:inline text-white" />
            <span className="text-white font-semibold text-sm truncate">
              Unlock User
            </span>
          </div>
          <EllipsisVertical className="text-white" />
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-[#12122A]">
              Unlock User Accounts
            </h1>
            <p className="text-sm text-slate-500">
              {school?.schoolName ?? "School"} -{" "}
              {user?.firstName ?? ""} {user?.lastName ?? ""}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Role
              </label>
              <select
                value={selectedRole?.roleId ?? ""}
                onChange={(e) => {
                  const role = roles.find(
                    (r) => String(r.roleId) === e.target.value,
                  );
                  if (role) handleRoleChange(role);
                }}
                className="w-full mt-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-[#12122A] font-medium focus:outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-transparent"
              >
                <option value="">Select a role...</option>
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {isStudentRole && (
              <div className="flex-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Class
                </label>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full mt-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-[#12122A] font-medium focus:outline-none focus:ring-2 focus:ring-chestnut/30 focus:border-transparent"
                >
                  <option value="">Select a class...</option>
                  {loadingClasses ? (
                    <option disabled>Loading classes...</option>
                  ) : (
                    classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {showList && (
              <div className="flex-1">
                <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Search
                </label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search user..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>

          {showList && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Total Users",
                  value: users.length,
                  icon: <Users className="w-5 h-5 text-slate-500" />,
                },
                {
                  label: "Active",
                  value: users.length - lockedUsers.length,
                  icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
                },
                {
                  label: "Locked",
                  value: lockedUsers.length,
                  icon: <Lock className="w-5 h-5 text-amber-600" />,
                },
              ].map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3"
                >
                  {icon}
                  <div>
                    <p className="text-lg font-semibold text-[#12122A] leading-none">
                      {value}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Lock className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-400 font-medium">
                  Select a role to see its users
                </p>
              </div>
            ) : isStudentRole && !selectedClassroomId ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <Lock className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-400 font-medium">
                  Select a class to see its students
                </p>
              </div>
            ) : loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-chestnut" />
                <span className="text-sm text-slate-400">
                  Loading users{isStudentRole ? ` for ${selectedClassName}` : ""}...
                </span>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_120px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>User</span>
                  <span>Email</span>
                  <span>Class</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Users className="w-10 h-10 text-slate-300" />
                      <p className="text-sm text-slate-400 font-medium">
                        {search
                          ? "No users match your search."
                          : "No users found."}
                      </p>
                    </div>
                  ) : (
                    visibleUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50/80 transition-colors md:grid md:grid-cols-[2fr_1.5fr_1fr_1fr_120px] md:items-center md:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            @{u.userName}
                          </p>
                        </div>
                        <p className="text-sm text-slate-600 truncate">
                          <span className="md:hidden text-xs text-slate-400 mr-1">
                            Email:
                          </span>
                          {u.emailAddress || "-"}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          <span className="md:hidden text-xs text-slate-400 mr-1">
                            Class:
                          </span>
                          {u.className || selectedClassName || "-"}
                        </p>
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {u.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnlock(u.id)}
                          disabled={unlockingId === u.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/20 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 w-fit disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {unlockingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                          {u.isActive ? "Active" : "Unlock"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnlockUser;
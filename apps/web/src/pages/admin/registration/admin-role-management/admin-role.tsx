import { ArrowLeft, EllipsisVertical, FilterIcon, Info, Menu, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import AssignRoleDialog from "./admin-role-dialog";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@bluethub/ui-kit'
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import { UserRole } from "@/utils/validate";
import { AxiosError } from "axios";
import toast from "react-hot-toast";

const BRAND = "#292382";

// type AdminStatus = "Active" | "Pending" | "Blocked";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  emailAddress: string;
  roleId: number;
  roleName: string;
  isActive: boolean,
  hasAccess: boolean,
  profileImage: string | null,
  guardianName: string | null,
  createdDate: string,
  modifiedDate: string
}


const AvatarPhoto = ({ admin }: { admin: Admin }) => {
  const colors = ["#1a1a3e", "#d4a5a5", "#8b5cf6", "#6d28d9", "#9ca3af"];
  const color = colors[admin.firstName.charCodeAt(0) % colors.length];
  const initials = `${admin.firstName?.[0] ?? ""}${admin.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 border-gray-200"
      style={{ backgroundColor: color }}
    >
      {admin.profileImage ? (
        <img src={admin.profileImage} alt={admin.userName} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white text-xs font-bold">{initials}</span>
      )}
    </div>
  );
};

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ backgroundColor: checked ? "#22c55e" : "#f59e0b" }}
  >
    <span
      className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
      style={{ transform: checked ? "translateX(24px)" : "translateX(4px)" }}
    />
  </button>
);

const StatusBadge = ({ isActive, hasAccess }: { isActive: boolean; hasAccess: boolean }) => {
  const status = isActive ? "Active" : hasAccess ? "Pending" : "Blocked";
  const colors = {
    Active: { bg: "#22c55e", text: "#fff" },
    Pending: { bg: "#f59e0b", text: "#fff" },
    Blocked: { bg: "#ef4444", text: "#fff" },
  };
  const s = colors[status];
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {status}
    </span>
  );
};

const AdminRole = () => {
  const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Admin[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const navigate = useNavigate()

  // Derived values directly from API fields
  const filteredRows = rows.filter(a =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    a.emailAddress.toLowerCase().includes(search.toLowerCase()) ||
    a.roleName.toLowerCase().includes(search.toLowerCase())
  );

  const totalAdmins = rows.length;
  const activeRole = rows.filter(r => r.isActive).length;
  const blockedUser = rows.filter(r => !r.isActive && !r.hasAccess).length;

  const toggleRow = async (id: string) => {
    const admin = rows.find(r => r.id === id);
    if (!admin) return;

    if (!admin.isActive) {
      setTogglingId(id);
      try {
        const { data } = await adminService.unlockUser(id);
        toast.success(data?.responseMessage ?? "User account unlocked successfully");
        setRows(prev =>
          prev.map(r =>
            r.id === id ? { ...r, isActive: true } : r
          )
        );
      } catch (error: any) {
        const msg =
          error?.response?.data?.responseMessage ??
          error?.message ??
          "Failed to unlock user";
        toast.error(msg);
      } finally {
        setTogglingId(null);
      }
    } else {
      setRows(prev =>
        prev.map(r =>
          r.id === id ? { ...r, isActive: !r.isActive } : r
        )
      );
    }
  }
  const adminRoles = async () => {
    try {
      setLoading(true);
      const response = await authService.getUserByRole(UserRole.Admin);
      //console.log(response.data.data.users);
      setRows(response.data.data.users);
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
    adminRoles();
  }, []);

  if (errorMsg) {
    return (
      <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
        <span>{errorMsg}</span>
      </div>
    );
  }

  return (
    <div className="md:p-3 font-poppins">
      <div className="backdrop-blur-sm lg:rounded-2xl border border-white/20  overflow-hidden">

        <div className="flex items-center justify-between px-4 sm:px-5 h-14 sticky top-0 z-30 bg-chestnut">

          {/* Left: hamburger + title */}
          <div className="flex items-center gap-2 min-w-0">
            <Menu
              className="lg:hidden shrink-0 text-white cursor-pointer"
              onClick={openMobileNav}
            />
            <ArrowLeft  className="lg:hidden text-white"  onClick={() => navigate(-1)}/>
            <span className="text-white font-medium text-sm sm:text-base truncate">
              Admin Role Management
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* <Link to="/admin/registration/admin-permissions" className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/50 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
              Assign Role
            </Link> */}
            {/* Assign Role — icon only on mobile */}
            <button className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full border border-white/50 text-white hover:bg-white/10 transition-colors">
              <Plus size={16} />
            </button>
            <EllipsisVertical className="text-white cursor-pointer shrink-0" />
          </div>

        </div>

        {/* ── Page Body ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4  p-4 bg-white/70 backdrop-blur-sm">

          {/* Search + Department filter row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

            {/* Search */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or role ID..."
                className="flex-1 text-sm text-gray-600 placeholder-gray-400 outline-none bg-transparent"
              />
            </div>

            {/* All Department button */}
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium bg-chestnut shrink-0">
              <FilterIcon className="size-4" />
              <span>All Department</span>
            </button>

          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Total Admins", value: totalAdmins },
              { label: "Active Role", value: activeRole },
              { label: "Blocked User", value: blockedUser },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2"
              >
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-base font-medium text-chestnut">{value}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            {/* ── md+ Table (shadcn) ── */}
            <div className="hidden p-2 lg:p-0 md:block overflow-x-auto">
              <Table>
                <TableHeader style={{ backgroundColor: BRAND }}>
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-white font-medium text-sm w-[220px]">Name & Contact</TableHead>
                    <TableHead className="text-white font-medium text-sm">Role</TableHead>
                    <TableHead className="text-white font-medium text-sm">Role Label 1</TableHead>
                    <TableHead className="text-white font-medium text-sm">Role Label 2</TableHead>
                    <TableHead className="text-white font-medium text-sm w-[80px]" />
                    <TableHead className="text-white font-medium text-sm w-[130px]" />
                    <TableHead className="text-white font-medium text-sm w-[100px]" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (<>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}>
                            <div
                              className="h-4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"
                              style={{ width: j === 0 ? "80%" : "60%", animationDelay: `${i * 80}ms` }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </>
                  ) : filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-gray-400">
                        No admins found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((admin) => (
                      <TableRow
                        key={admin.id}
                        className="hover:bg-gray-50/60 transition-colors border-gray-200"
                      >
                        {/* Name & Contact */}
                        <TableCell>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AvatarPhoto admin={admin} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-blck-b2 capitalize truncate">{admin.firstName} {admin.lastName}</p>
                              <p className="text-xs text-blck-b2 truncate">{admin.emailAddress}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <span className="text-sm font-medium text-blck-b2 capitalize whitespace-nowrap">
                            {admin.roleName}
                          </span>
                        </TableCell>

                        {/* Role Label 1 */}
                        <TableCell>
                          <span className="text-sm font-medium text-blck-b2 capitalize whitespace-nowrap">
                            {admin.roleName}
                          </span>
                        </TableCell>

                        {/* Role Label 2 */}
                        <TableCell>
                          <span className="text-sm font-medium text-blck-b2 capitalize whitespace-nowrap">
                            {admin.roleName}
                          </span>
                        </TableCell>

                        {/* Toggle */}
                        <TableCell>
                          <Toggle checked={admin.isActive} onChange={() => toggleRow(admin.id)} disabled={togglingId === admin.id} />
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="w-fit">
                            <StatusBadge isActive={admin.isActive} hasAccess={admin.hasAccess} />
                          </div>
                        </TableCell>

                        {/* Edit */}
                        <TableCell>
                          <AssignRoleDialog admin={admin} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ── Mobile cards (unchanged) ── */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredRows.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400">No admins found</p>
                </div>
              )}
              {filteredRows.map((admin) => (
                <div key={admin.id} className="px-4 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarPhoto admin={admin} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-blck-b2 capitalize truncate">{admin.firstName} {admin.lastName}</p>
                        <p className="text-xs text-blck-b2 truncate">{admin.emailAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Toggle checked={admin.isActive} onChange={() => toggleRow(admin.id)} disabled={togglingId === admin.id} />
                      <AssignRoleDialog admin={admin} />
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {admin.roleName && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                        {admin.roleName}
                      </span>
                    )}
                    {admin.roleName && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                      {admin.roleName}
                    </span>
                    )}
                    {admin.roleName && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md capitalize">
                        {admin.roleName}
                      </span>
                    )}
                    <div className="w-fit">
                      <StatusBadge isActive={admin.isActive} hasAccess={admin.hasAccess} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div >
  );
};

export default AdminRole;
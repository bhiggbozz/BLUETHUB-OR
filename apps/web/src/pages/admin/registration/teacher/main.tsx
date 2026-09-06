import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@bluethub/ui-kit";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Menu, Search, Sparkles, UserCircle, Users } from "lucide-react";
import { authService } from "@/services/auth";
import { UserRole } from "@/utils/validate";
import { localData } from "@/utils";

type RoleOption = {
    label: string;
    value: "teacher" | "class-teacher" | "head-teacher" | "admin";
    path: string;
    editPath: string;
    hint: string;
    roleId: number;
};

const roles: RoleOption[] = [
    {
        label: "Subject Teacher",
        value: "teacher",
        path: "/admin/registration/teacher/teacher",
        editPath: "/admin/registration/teacher/teacher/edit",
        hint: "Register subject teachers and assign their role details.",
        roleId: UserRole.SubjectTeacher,
    },
    {
        label: "Class Teacher",
        value: "class-teacher",
        path: "/admin/registration/teacher/class-teacher",
        editPath: "/admin/registration/teacher/class-teacher/edit",
        hint: "Register class teachers and assign them to a classroom.",
        roleId: UserRole.ClassTeacher,
    },
    {
        label: "Head Teacher",
        value: "head-teacher",
        path: "/admin/registration/teacher/head-teacher",
        editPath: "/admin/registration/teacher/head-teacher/edit",
        hint: "Register lead teachers for class-wide coordination.",
        roleId: UserRole.HeadTeacher,
    },
    {
        label: "Admin",
        value: "admin",
        path: "/admin/registration/teacher/admin-user",
        editPath: "/admin/registration/teacher/admin-user/edit",
        hint: "Register an admin user using the same create form flow.",
        roleId: UserRole.Admin,
    },
];

type UserDto = {
    id: string;
    firstName: string;
    lastName: string;
    userName: string;
    emailAddress: string;
    roleId: number;
    roleName: string;
    isActive: boolean;
};

const TeacherMain = () => {
    const { openMobileNav } = useOutletContext<{ openMobileNav: () => void }>();
    const navigate = useNavigate();
    const [selectRole, setSelectRole] = useState<RoleOption | null>(null);
    console.log("selectRole", selectRole?.label);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [editUsers, setEditUsers] = useState<UserDto[]>([]);
    const [editSearch, setEditSearch] = useState("");
    const [editDetailLoading, setEditDetailLoading] = useState<string | null>(null);

    const handleEditUser = async (u: UserDto) => {
        if (!selectRole) return;
        setEditDetailLoading(u.id);
        setEditOpen(false);
        navigate(selectRole.editPath, { state: { userId: u.id } });
        setEditDetailLoading(null);
    };

    const handleOpenEdit = async () => {
        if (!selectRole) return;
        setEditOpen(true);
        setEditError("");
        setEditUsers([]);
        setEditSearch("");
        setEditLoading(true);
        try {
            const { data } = await authService.getUserByRole(selectRole.roleId);
            const payload = (data as any)?.data ?? (data as any)?.Data ?? {};
            setEditUsers((payload?.users ?? payload?.Users ?? []) as UserDto[]);
        } catch (err: any) {
            setEditError(
                err?.response?.data?.responseMessage ??
                err?.message ??
                "Failed to load users.",
            );
        } finally {
            setEditLoading(false);
        }
    };

    const filteredUsers = editUsers.filter((u) => {
        const q = editSearch.toLowerCase();
        return (
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
            u.userName?.toLowerCase().includes(q) ||
            u.emailAddress?.toLowerCase().includes(q)
        );
    });

    useEffect(() => {
        if (selectRole) {
            localData.save("selectRole", selectRole?.label);
        }
    }, [selectRole]);

    return (
        <div className="md:px-5 lg:p-3">
            <section className="relative overflow-hidden border border-white/20 bg-white/85 shadow-sm">
                <div className="pointer-events-none absolute -top-12 -right-14 h-44 w-44 rounded-full bg-chestnut/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 rounded-full bg-[#292382]/10 blur-3xl" />

                <section className="relative bg-chestnut px-5 py-4 sm:px-7 flex gap-4 md:gap-0 md:block">
                    <Menu
                        className="lg:hidden shrink-0 mb-2 text-white cursor-pointer"
                        onClick={openMobileNav}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="font-poppins text-sm font-semibold text-white">
                                Register Teacher
                            </h1>
                            <p className="mt-1 text-xs sm:text-sm text-white/85">
                                Select a role and continue with the registration flow.
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                            <Sparkles className="h-3.5 w-3.5" />
                            Admin Workspace
                        </span>
                    </div>
                </section>

                <div className="relative p-4 sm:p-6 lg:p-8 min-h-screen">
                    <div className="grid gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.35fr)]">
                        <div className="rounded-2xl border border-chestnut/15 bg-white  p-4 sm:p-5 lg:p-6 shadow-sm">
                            <label className="text-chestnut font-semibold text-sm sm:text-sm flex items-center gap-2">
                                <UserCircle className="h-4 w-4" />
                                Role
                            </label>

                            <DropdownMenu onOpenChange={setIsDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`mt-3 relative h-12 sm:h-13 w-full justify-between rounded-xl border-0 px-4 text-sm sm:text-sm font-medium ring-2 transition-all duration-300 ${selectRole
                                            ? "bg-chestnut/5 text-chestnut ring-chestnut/40"
                                            : "bg-white text-chestnut/60 ring-chestnut/20"
                                            } hover:bg-chestnut/5 hover:ring-chestnut/40 focus:ring-4 focus:ring-chestnut/35`}
                                    >
                                        <span className={selectRole ? "font-semibold text-chestnut" : ""}>
                                            {selectRole?.label ?? "Select role"}
                                        </span>
                                        <span className={`transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}>
                                            <ChevronDown className="h-5 w-5 text-chestnut/70" />
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    className="w-(--radix-dropdown-menu-trigger-width) rounded-xl border-2 border-chestnut/10 bg-white/95 p-2 shadow-xl"
                                    align="start"
                                    sideOffset={8}
                                >
                                    <DropdownMenuGroup className="space-y-1">
                                        {roles.map((role) => (
                                            <DropdownMenuItem
                                                key={role.value}
                                                className={`rounded-lg px-4 py-3 text-sm sm:text-base font-medium transition-all ${selectRole?.value === role.value
                                                    ? "bg-chestnut text-white"
                                                    : "text-chestnut hover:bg-chestnut/10"
                                                    }`}
                                                onSelect={() => setSelectRole(role)}
                                            >
                                                <div className="flex w-full items-center justify-between">
                                                    <span>{role.label}</span>
                                                    {selectRole?.value === role.value && <Check className="ml-2 h-5 w-5 text-white" />}
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <p className="mt-3 min-h-10 text-xs sm:text-sm text-slate-500">
                                {selectRole?.hint ?? "Choose a role to see available registration actions."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-[#fff8f3] p-4 sm:p-6 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 text-chestnut">
                                <Users className="h-4 w-4" />
                                <h2 className="text-sm  font-semibold">Actions</h2>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {selectRole ? (
                                    <Button
                                        className="h-12 sm:h-14 rounded-xl bg-chestnut px-5 text-sm  font-semibold text-white hover:bg-chestnut/90"
                                        asChild
                                    >
                                        <Link to={selectRole.path}>
                                            New User
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button
                                        className="h-12 sm:h-14 rounded-xl bg-chestnut px-5 text-sm font-semibold text-white opacity-60"
                                        disabled
                                    >
                                        New User
                                    </Button>
                                )}

                                <Button
                                    className="h-12 sm:h-14 rounded-xl border-2 border-[#C4C4C4] bg-white px-5 text-sm sm:text-base font-semibold text-[#EC1B2C] hover:bg-white"
                                    disabled={!selectRole}
                                    onClick={handleOpenEdit}
                                >
                                    Edit Profile
                                </Button>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2.5 text-xs sm:text-sm text-slate-600">
                                {selectRole
                                    ? `Click Edit Profile to browse all ${selectRole.label}s and update their info.`
                                    : "Select a role first to enable New User and Edit Profile."}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Edit Profile dialog ─────────────────────────────────────── */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-lg rounded-md p-0 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#fff4ec] via-white to-[#eef6ff]">
                        <DialogTitle className="text-base font-semibold text-slate-800">
                            {selectRole?.label} — Select user to edit
                        </DialogTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {editUsers.length > 0 ? `${editUsers.length} user${editUsers.length !== 1 ? "s" : ""} found` : ""}
                        </p>
                    </div>

                    <div className="px-5 pt-4 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, username or email…"
                                value={editSearch}
                                onChange={(e) => setEditSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-chestnut/20"
                            />
                        </div>
                    </div>

                    <div className="px-5 pb-5 max-h-[55vh] overflow-y-auto space-y-2 mt-2">
                        {editLoading && (
                            <div className="flex items-center justify-center py-10 text-slate-500 gap-2 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading users…
                            </div>
                        )}

                        {!editLoading && editError && (
                            <p className="text-sm text-red-600 text-center py-6">{editError}</p>
                        )}

                        {!editLoading && !editError && filteredUsers.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-8">
                                No users found{editSearch ? " for that search" : " for this role"}.
                            </p>
                        )}

                        {!editLoading && filteredUsers.map((u) => (
                            <div
                                key={u.id}
                                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:border-chestnut/30 hover:bg-chestnut/5 transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {u.firstName} {u.lastName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{u.emailAddress || u.userName}</p>
                                    <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                        {u.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <Button
                                    className="ml-3 h-8 rounded-lg bg-chestnut hover:bg-chestnut/90 text-white text-xs font-semibold px-3 shrink-0"
                                    disabled={editDetailLoading !== null}
                                    onClick={() => handleEditUser(u)}
                                >
                                    {editDetailLoading === u.id
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : "Edit"}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                        <Button
                            className="h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-5"
                            onClick={() => setEditOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherMain;

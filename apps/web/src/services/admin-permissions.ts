import { API, type TResponse } from ".";

const headers = { "X-Tenant-ID": import.meta.env.VITE_DEFAULT_TENANT };

const endpoint = {
  assignAdminPermissions: "api/user/AssignPermissions",
  getAllAdminPermissions: "api/user/GetAllAdminPermissions",
}

// Admin Permission Flags
export const AdminPermissionFlags = {
  ApproveClasses: 1,
  CreateClasses: 2,
  ManageTeachers: 4,
  ManageStudents: 8,
  ViewReports: 16,
  ManageClassrooms: 32,
  ManageSubjects: 64,
  CreateUsers: 128,
} as const;

export type AdminPermissionKey = keyof typeof AdminPermissionFlags;

export interface AdminPermissionDto {
  id: string;
  userId: string;
  userName: string;
  email: string;
  roleName: string;
  permissionsValue: number;
  permissions: number[];
  creationDate: string;
  modifiedDate: string;
  createdByName: string;
}

export interface AssignAdminPermissionsRequest {
  adminUserId: string;
  permissions: number[];
}

export interface AdminPermissionsResponse {
  adminPermissions: AdminPermissionDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const adminPermissionsService = {
  // Assign or update admin permissions
  assignAdminPermissions: (payload: AssignAdminPermissionsRequest) =>
    API.post<TResponse<{
      adminId: string;
      adminName: string;
      permissionsValue: number;
      permissions: number[];
      permissionNames: string[];
    }>>(
      endpoint.assignAdminPermissions,
      payload,
      { headers }
    ),

  // Get all admin permissions with pagination
  getAllAdminPermissions: (pageNumber: number = 1, pageSize: number = 50) =>
    API.get<TResponse<AdminPermissionsResponse>>(
      endpoint.getAllAdminPermissions,
      {
        headers,
        params: { pageNumber, pageSize },
      }
    ),
};

// Helper to convert permission flags to names
export const getPermissionName = (flag: number): string => {
  const names: Record<number, string> = {
    1: "Approve Classes",
    2: "Create Lesson",
    4: "Manage Teachers",
    8: "Manage Students",
    16: "View Reports",
    32: "Manage Lesson",
    64: "Manage Subjects",
    128: "Create Users",
  };
  return names[flag] ?? `Unknown (${flag})`;
};

// Helper to get all permission flags
export const getAllPermissionFlags = (): Array<{ flag: number; name: string }> => {
  return [
    { flag: 1, name: "Approve Classes" },
    { flag: 2, name: "Create Lesson" },
    { flag: 4, name: "Manage Teachers" },
    { flag: 8, name: "Manage Students" },
    { flag: 16, name: "View Reports" },
    { flag: 32, name: "Manage Lesson" },
    { flag: 64, name: "Manage Subjects" },
    { flag: 128, name: "Create Users" },
  ];
};

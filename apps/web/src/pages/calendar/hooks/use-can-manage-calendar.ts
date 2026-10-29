import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { adminPermissionsService, AdminPermissionFlags } from "@/services/admin-permissions";

export type CalendarWriteAccess =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "denied-needs-permission" } // Administrator without ManageCalendar
  | { status: "granted" };

/**
 * SuperAdministrator can always manage the calendar. Administrator needs the
 * ManageCalendar (256) permission, checked against their own permission
 * record. Every other role is read-only. The server enforces this too — this
 * only gates the UI.
 */
export function useCanManageCalendar(): CalendarWriteAccess {
  const { user } = useAuthContext();
  const [access, setAccess] = useState<CalendarWriteAccess>({ status: "loading" });

  useEffect(() => {
    if (!user) {
      setAccess({ status: "loading" });
      return;
    }

    if (user.roleName === "SuperAdministrator") {
      setAccess({ status: "granted" });
      return;
    }

    if (user.roleName !== "Administrator" && user.roleName !== "Admin") {
      setAccess({ status: "denied" });
      return;
    }

    let cancelled = false;
    setAccess({ status: "loading" });
    adminPermissionsService
      .getAdminPermissions(user.id)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        const hasFlag =
          !!data &&
          (data.permissions?.includes(AdminPermissionFlags.ManageCalendar) ||
            (data.permissionsValue & AdminPermissionFlags.ManageCalendar) !== 0);
        setAccess({ status: hasFlag ? "granted" : "denied-needs-permission" });
      })
      .catch(() => {
        if (!cancelled) setAccess({ status: "denied-needs-permission" });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return access;
}

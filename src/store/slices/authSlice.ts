import { adminService, ADMIN_SESSION_KEY, canAccessAdminPortal } from "@/services/admin.service";
import type { AdminSession } from "@/types/api";

import type { AppSliceCreator } from "../types";

function loadStoredAdminSession(): AdminSession | null {
  try {
    const value = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as AdminSession;
    return canAccessAdminPortal(session) ? session : null;
  } catch {
    return null;
  }
}

export type AuthSlice = {
  adminSession: AdminSession | null;
  adminLoginBusy: boolean;
  adminLoginError: string;
  adminPermissionDenied: boolean;
  loginAdmin: (employeeCode: string, password: string) => Promise<AdminSession>;
  logoutAdmin: () => void;
  clearAdminLoginError: () => void;
};

export const createAuthSlice: AppSliceCreator<AuthSlice> = (set) => ({
  adminSession: loadStoredAdminSession(),
  adminLoginBusy: false,
  adminLoginError: "",
  adminPermissionDenied: false,

  async loginAdmin(employeeCode, password) {
    set({ adminLoginBusy: true, adminLoginError: "", adminPermissionDenied: false });
    try {
      const session = await adminService.login(employeeCode, password);
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
      set({ adminSession: session, adminLoginBusy: false });
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ";
      set({
        adminLoginBusy: false,
        adminLoginError: message,
        adminPermissionDenied: message.includes("ไม่มีสิทธิ์"),
      });
      throw error;
    }
  },

  logoutAdmin() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    set({ adminSession: null, adminLoginError: "", adminPermissionDenied: false });
  },

  clearAdminLoginError() {
    set({ adminLoginError: "", adminPermissionDenied: false });
  },
});

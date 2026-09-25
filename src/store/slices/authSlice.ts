import { adminService, ADMIN_SESSION_KEY, canAccessAdminPortal } from "@/services/admin.service";
import { authService } from "@/services/auth";
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
  employeeLoginBusy: boolean;
  employeeLoginError: string;
  loginAdmin: (employeeCode: string, password: string) => Promise<AdminSession>;
  logoutAdmin: () => void;
  clearAdminLoginError: () => void;
  loginEmployee: (employeeCode: string, password: string) => Promise<void>;
  clearEmployeeLoginError: () => void;
};

export const createAuthSlice: AppSliceCreator<AuthSlice> = (set, get) => ({
  adminSession: loadStoredAdminSession(),
  adminLoginBusy: false,
  adminLoginError: "",
  adminPermissionDenied: false,
  employeeLoginBusy: false,
  employeeLoginError: "",

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

  async loginEmployee(employeeCode, password) {
    set({ employeeLoginBusy: true, employeeLoginError: "" });
    try {
      const result = await authService.login({ employeeCode, password });
      get().setAuthenticatedEmployee(result.employee);
      set({ employeeLoginBusy: false, employeeLoginError: "" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ";
      set({ employeeLoginBusy: false, employeeLoginError: message });
      throw error;
    }
  },

  clearEmployeeLoginError() {
    set({ employeeLoginError: "" });
  },

});

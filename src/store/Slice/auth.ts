import type { StateCreator } from "zustand";
// import { authService } from "@/services.dev/auth.Service";
import { authService } from "@/services/auth.Service";

export interface AuthEmployee {
  employee_code: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role_name: string;
  name_prefix: string;
  field_id?: number | null;
  field_name?: string | null;
  position_name: string;
  department_id?: number | null;
  department_name?: string | null;
  division_id?: number | null;
  division_name?: string | null;
  position_id?: number | null;
  route?: string | null;
}

export interface AuthSlice {
  // State
  authEmployee: AuthEmployee | null;
  authLoading: boolean;
  authError: string | null;
  authErrorKey: string | null;
  authContacts: Array<{ team?: string; email?: string }> | undefined;

  // Actions
  login: (employee_code: string, password: string) => Promise<boolean>;
  logout: (employee_code: string) => Promise<boolean>;
  clearAuthError: () => void;
  changePassword: (
    employee_code: string,
    oldPin: string,
    newPin: string,
  ) => Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }>;
  forgotPassword: (employee_code: string) => Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }>;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authEmployee: JSON.parse(sessionStorage.getItem("auth_employee") || "null"),
  authLoading: false,
  authError: null,
  authErrorKey: null,
  authContacts: undefined,

  login: async (employee_code, password) => {
    set({
      authLoading: true,
      authError: null,
      authErrorKey: null,
      authContacts: undefined,
    });
    try {
      const result = await authService.login(employee_code, password);

      if (result.success && result.data) {
        const emp: AuthEmployee = (result.data as { employee: AuthEmployee })
          .employee;
        const displayName =
          `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;

        sessionStorage.setItem("emp_code", emp.employee_code);
        sessionStorage.setItem("display_name", displayName);
        sessionStorage.setItem("auth_employee", JSON.stringify(emp));
        sessionStorage.setItem("login_time", String(Date.now()));

        set({ authEmployee: emp, authLoading: false, authError: null });
        return true;
      }

      set({
        authLoading: false,
        authError: result.message || "เข้าสู่ระบบไม่สำเร็จ",
        authErrorKey: result.error || null,
        authContacts: result.contacts,
      });
      return false;
    } catch {
      set({ authLoading: false, authError: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์" });
      return false;
    }
  },

  logout: async (employee_code) => {
    const result = await authService.logout(employee_code);
    if (result.success) {
      sessionStorage.removeItem("emp_code");
      sessionStorage.removeItem("display_name");
      sessionStorage.removeItem("auth_employee");
      set({ authEmployee: null, authError: null });
    }
    return result.success;
  },

  clearAuthError: () =>
    set({ authError: null, authErrorKey: null, authContacts: undefined }),

  changePassword: async (employee_code, oldPin, newPin) => {
    set({
      authLoading: true,
      authError: null,
      authErrorKey: null,
      authContacts: undefined,
    });
    try {
      const result = await authService.changePassword(
        employee_code,
        oldPin,
        newPin,
      );
      set({ authLoading: false });
      return result;
    } catch {
      const fallback = {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์",
      };
      set({
        authLoading: false,
        authError: fallback.message,
      });
      return fallback;
    }
  },

  forgotPassword: async (employee_code) => {
    set({
      authLoading: true,
      authError: null,
      authErrorKey: null,
      authContacts: undefined,
    });
    try {
      const result = await authService.forgotPassword(employee_code);
      set({ authLoading: false });
      return result;
    } catch {
      const fallback = {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์",
      };
      set({
        authLoading: false,
        authError: fallback.message,
      });
      return fallback;
    }
  },
});

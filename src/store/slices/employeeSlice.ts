import { faceVerifyService } from "@/services/faceVerify.service";
import type { EmployeeProfile } from "@/types/api";

import type { AppSliceCreator } from "../types";

export type EmployeeRoute = "home" | "register" | "verify";

const EMPLOYEE_SESSION_KEY = "guts-face.employee.v1";
const ROUTE_SESSION_KEY = "guts-face.route.v1";

function loadEmployeeSession(): EmployeeProfile | null {
  try {
    const stored = sessionStorage.getItem(EMPLOYEE_SESSION_KEY);
    if (!stored) return null;
    const employee = JSON.parse(stored) as EmployeeProfile;
    return typeof employee.employee_code === "string" ? employee : null;
  } catch {
    return null;
  }
}

const initialEmployee = loadEmployeeSession();

function persistEmployee(employee: EmployeeProfile | null) {
  if (employee) {
    sessionStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(employee));
  } else {
    sessionStorage.removeItem(EMPLOYEE_SESSION_KEY);
  }
}

export type EmployeeSlice = {
  employee: EmployeeProfile | null;
  employeeRoute: EmployeeRoute;
  employeeLookupBusy: boolean;
  employeeLookupError: string;
  lookupEmployee: (employeeCode: string) => Promise<EmployeeProfile>;
  setAuthenticatedEmployee: (employee: EmployeeProfile) => void;
  clearEmployeeSession: () => void;
  setEmployeeRoute: (route: EmployeeRoute) => void;
  clearEmployeeLookupError: () => void;
};

export const createEmployeeSlice: AppSliceCreator<EmployeeSlice> = (set) => ({
  employee: initialEmployee,
  employeeRoute: "register",
  employeeLookupBusy: false,
  employeeLookupError: "",

  setAuthenticatedEmployee(employee) {
    persistEmployee(employee);
    sessionStorage.removeItem(ROUTE_SESSION_KEY);
    set({
      employee,
      employeeRoute: "register",
      employeeLookupBusy: false,
      employeeLookupError: "",
    });
  },

  async lookupEmployee(employeeCode) {
    set({ employeeLookupBusy: true, employeeLookupError: "" });
    try {
      const employee = await faceVerifyService.lookupEmployee(employeeCode);
      persistEmployee(employee);
      sessionStorage.removeItem(ROUTE_SESSION_KEY);
      set({ employee, employeeRoute: "register", employeeLookupBusy: false });
      return employee;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถค้นหาพนักงานได้";
      set({ employeeLookupBusy: false, employeeLookupError: message });
      throw error;
    }
  },

  clearEmployeeSession() {
    sessionStorage.removeItem(EMPLOYEE_SESSION_KEY);
    sessionStorage.removeItem(ROUTE_SESSION_KEY);
    set({ employee: null, employeeRoute: "register", employeeLookupError: "" });
  },

  setEmployeeRoute(route) {
    sessionStorage.removeItem(ROUTE_SESSION_KEY);
    set({ employeeRoute: route });
  },

  clearEmployeeLookupError() {
    set({ employeeLookupError: "" });
  },
});

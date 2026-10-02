import { adminService, type AdminUserListOptions } from "@/services/admin.service";
import type { AdminEmployee, DirectoryEmployee, EmployeeSummary } from "@/types/api";

import type { AppSliceCreator } from "../types";

let adminUsersRequestSequence = 0;
let employeeDirectoryRequestSequence = 0;

export type AdminUsersSlice = {
  adminUsers: AdminEmployee[];
  employeeDirectory: DirectoryEmployee[];
  adminUsersPage: number;
  employeeDirectoryPage: number;
  adminUsersTotal: number;
  employeeDirectoryTotal: number;
  employeeSummary: EmployeeSummary;
  adminUsersAppliedSearch: string;
  employeeDirectoryAppliedSearch: string;
  adminUsersListOptions: AdminUserListOptions;
  adminUsersBusy: boolean;
  adminUsersError: string;
  adminUsersNotice: string;
  loadAdminUsers: (
    page?: number,
    search?: string,
    options?: AdminUserListOptions,
  ) => Promise<void>;
  loadEmployeeDirectory: (
    page?: number,
    search?: string,
    options?: AdminUserListOptions,
  ) => Promise<void>;
  loadEmployeeSummary: () => Promise<void>;
  setAdminUsersPage: (page: number) => void;
  setEmployeeDirectoryPage: (page: number) => void;
  applyAdminUsersSearch: (search: string) => Promise<void>;
  getAdminFaceProfile: (employeeCode: string) => Promise<Blob>;
  replaceAdminFaceProfile: (employeeCode: string, imageDataUrl: string) => Promise<void>;
  deleteAdminFaceProfile: (employeeCode: string) => Promise<void>;
  clearAdminUsersMessages: () => void;
};

export const createAdminUsersSlice: AppSliceCreator<AdminUsersSlice> = (set, get) => ({
  adminUsers: [],
  employeeDirectory: [],
  adminUsersPage: 1,
  employeeDirectoryPage: 1,
  adminUsersTotal: 0,
  employeeDirectoryTotal: 0,
  employeeSummary: { total: 0, registered: 0, missing: 0 },
  adminUsersAppliedSearch: "",
  employeeDirectoryAppliedSearch: "",
  adminUsersListOptions: {},
  adminUsersBusy: true,
  adminUsersError: "",
  adminUsersNotice: "",

  async loadAdminUsers(
    page = get().adminUsersPage,
    search = get().adminUsersAppliedSearch,
    options = get().adminUsersListOptions,
  ) {
    const requestSequence = ++adminUsersRequestSequence;
    const adminCode = get().adminSession?.employee_code;
    if (!adminCode) {
      set({ adminUsersBusy: false, adminUsersError: "กรุณาเข้าสู่ระบบผู้ดูแล" });
      return;
    }

    set({
      adminUsersBusy: true,
      adminUsersError: "",
      adminUsersPage: page,
      adminUsersAppliedSearch: search,
      adminUsersListOptions: options,
    });
    try {
      const result = await adminService.listUsers(adminCode, search, page, options);
      if (requestSequence !== adminUsersRequestSequence) return;
      set({
        adminUsers: result.items,
        adminUsersTotal: result.total,
        adminUsersBusy: false,
      });
    } catch (error) {
      if (requestSequence !== adminUsersRequestSequence) return;
      set({
        adminUsersBusy: false,
        adminUsersError:
          error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลพนักงานได้",
      });
    }
  },

  async loadEmployeeDirectory(
    page = get().employeeDirectoryPage,
    search = get().employeeDirectoryAppliedSearch,
    options = get().adminUsersListOptions,
  ) {
    const requestSequence = ++employeeDirectoryRequestSequence;
    const employeeCode = get().adminSession?.employee_code;
    if (!employeeCode) {
      set({ adminUsersBusy: false, adminUsersError: "กรุณาเข้าสู่ระบบ" });
      return;
    }

    set({
      adminUsersBusy: true,
      adminUsersError: "",
      employeeDirectoryPage: page,
      employeeDirectoryAppliedSearch: search,
      adminUsersListOptions: options,
    });
    try {
      const result = await adminService.listEmployeeDirectory(
        employeeCode,
        search,
        page,
        options,
      );
      if (requestSequence !== employeeDirectoryRequestSequence) return;
      set({
        employeeDirectory: result.items,
        employeeDirectoryTotal: result.total,
        adminUsersBusy: false,
      });
    } catch (error) {
      if (requestSequence !== employeeDirectoryRequestSequence) return;
      set({
        adminUsersBusy: false,
        adminUsersError:
          error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลพนักงานได้",
      });
    }
  },

  async loadEmployeeSummary() {
    const employeeCode = get().adminSession?.employee_code;
    if (!employeeCode) return;

    try {
      const employeeSummary = await adminService.getEmployeeSummary(employeeCode);
      set({ employeeSummary });
    } catch (error) {
      set({
        adminUsersError:
          error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลสรุปพนักงานได้",
      });
    }
  },

  setAdminUsersPage(page) {
    void get().loadAdminUsers(page, get().adminUsersAppliedSearch);
  },

  setEmployeeDirectoryPage(page) {
    void get().loadEmployeeDirectory(page, get().employeeDirectoryAppliedSearch);
  },

  async applyAdminUsersSearch(search) {
    await get().loadAdminUsers(1, search.trim());
  },

  async getAdminFaceProfile(employeeCode) {
    const adminCode = get().adminSession?.employee_code;
    if (!adminCode) throw new Error("กรุณาเข้าสู่ระบบผู้ดูแล");
    set({ adminUsersError: "" });
    try {
      return await adminService.getFaceProfile(adminCode, employeeCode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถโหลดรูปใบหน้าได้";
      set({ adminUsersError: message });
      throw error;
    }
  },

  async replaceAdminFaceProfile(employeeCode, imageDataUrl) {
    const adminCode = get().adminSession?.employee_code;
    if (!adminCode) throw new Error("กรุณาเข้าสู่ระบบผู้ดูแล");
    set({ adminUsersError: "", adminUsersNotice: "" });
    try {
      await adminService.replaceFaceProfile(adminCode, employeeCode, imageDataUrl);
      set({ adminUsersNotice: "บันทึกรูปใบหน้าแล้ว" });
      await Promise.all([get().loadAdminUsers(), get().loadEmployeeSummary()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถบันทึกรูปใบหน้าได้";
      set({ adminUsersError: message });
      throw error;
    }
  },

  async deleteAdminFaceProfile(employeeCode) {
    const adminCode = get().adminSession?.employee_code;
    if (!adminCode) throw new Error("กรุณาเข้าสู่ระบบผู้ดูแล");
    set({ adminUsersError: "", adminUsersNotice: "" });
    try {
      await adminService.deleteFaceProfile(adminCode, employeeCode);
      set({ adminUsersNotice: "ลบรูปใบหน้าแล้ว" });
      await Promise.all([get().loadAdminUsers(), get().loadEmployeeSummary()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถลบรูปใบหน้าได้";
      set({ adminUsersError: message });
      throw error;
    }
  },

  clearAdminUsersMessages() {
    set({ adminUsersError: "", adminUsersNotice: "" });
  },
});

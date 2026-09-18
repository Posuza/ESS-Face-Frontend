import { adminService } from "@/services/admin.service";
import type { AdminEmployee } from "@/types/api";

import type { AppSliceCreator } from "../types";

export type AdminUsersSlice = {
  adminUsers: AdminEmployee[];
  adminUsersPage: number;
  adminUsersTotal: number;
  adminUsersAppliedSearch: string;
  adminUsersBusy: boolean;
  adminUsersError: string;
  adminUsersNotice: string;
  loadAdminUsers: (page?: number, search?: string) => Promise<void>;
  setAdminUsersPage: (page: number) => void;
  applyAdminUsersSearch: (search: string) => Promise<void>;
  getAdminFaceProfile: (employeeCode: string) => Promise<Blob>;
  replaceAdminFaceProfile: (employeeCode: string, imageDataUrl: string) => Promise<void>;
  deleteAdminFaceProfile: (employeeCode: string) => Promise<void>;
  clearAdminUsersMessages: () => void;
};

export const createAdminUsersSlice: AppSliceCreator<AdminUsersSlice> = (set, get) => ({
  adminUsers: [],
  adminUsersPage: 1,
  adminUsersTotal: 0,
  adminUsersAppliedSearch: "",
  adminUsersBusy: true,
  adminUsersError: "",
  adminUsersNotice: "",

  async loadAdminUsers(page = get().adminUsersPage, search = get().adminUsersAppliedSearch) {
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
    });
    try {
      const result = await adminService.listUsers(adminCode, search, page);
      set({
        adminUsers: result.items,
        adminUsersTotal: result.total,
        adminUsersBusy: false,
      });
    } catch (error) {
      set({
        adminUsersBusy: false,
        adminUsersError:
          error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลพนักงานได้",
      });
    }
  },

  setAdminUsersPage(page) {
    void get().loadAdminUsers(page, get().adminUsersAppliedSearch);
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
      await get().loadAdminUsers();
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
      await get().loadAdminUsers();
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

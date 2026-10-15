import { create } from "zustand";

import { clientAuthService } from "@/services/clientAuth.service";
import type { EmployeeProfile, FaceVerifyResult } from "@/types/api";

type Contact = { team?: string; email?: string };
type ActionResult = {
  success: boolean;
  message: string;
  error?: string;
  contacts?: Contact[];
};

function initialReturnTo(): string | null {
  const raw = new URLSearchParams(window.location.search).get("return_to");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function initialPublicKey(): string | null {
  const value = new URLSearchParams(window.location.search).get("public_key")?.trim();
  return value || null;
}

type ClientAuthState = {
  authEmployee: EmployeeProfile | null;
  authError: string;
  authErrorKey: string | null;
  authContacts: Contact[];
  authLoading: boolean;
  returnTo: string | null;
  publicKey: string | null;
  issuedTicket: string | null;
  setClientContext: (publicKey: string | null, returnTo: string | null) => void;
  clearAuthError: () => void;
  goBackToSource: () => void;
  login: (employeeCode: string, password: string) => Promise<boolean>;
  forgotPassword: (employeeCode: string) => Promise<ActionResult>;
  changePassword: (
    employeeCode: string,
    oldPassword: string,
    newPassword: string,
  ) => Promise<ActionResult>;
  lookupEmployeeFaceProfile: (employeeCode: string) => Promise<EmployeeProfile>;
  faceLogin: (employeeCode: string, imageDataUrl: string) => Promise<boolean>;
  recoverPasswordWithFace: (
    employeeCode: string,
    imageDataUrl: string,
  ) => Promise<FaceVerifyResult & { password?: string }>;
};

const knownFaceProfiles = new Map<string, EmployeeProfile>();

export const useClientAuthStore = create<ClientAuthState>((set, get) => ({
  authEmployee: null,
  authError: "",
  authErrorKey: null,
  authContacts: [],
  authLoading: false,
  returnTo: initialReturnTo(),
  publicKey: initialPublicKey(),
  issuedTicket: null,

  setClientContext(publicKey, returnTo) {
    set({ publicKey, returnTo, issuedTicket: null });
  },

  clearAuthError() {
    set({ authError: "", authErrorKey: null, authContacts: [] });
  },

  goBackToSource() {
    const returnTo = get().returnTo;
    if (returnTo) window.location.assign(returnTo);
  },

  async login(employeeCode, password) {
    set({ authLoading: true, authError: "", authErrorKey: null });
    try {
      const publicKey = get().publicKey;
      if (publicKey) {
        const returnTo = get().returnTo;
        if (!returnTo) throw new Error("ไม่พบ URL สำหรับกลับไปยังแอปพลิเคชันไคลเอนต์");
        const result = await clientAuthService.passwordTicket(
          publicKey,
          returnTo,
          employeeCode,
          password,
        );
        set({ issuedTicket: result.ticket, authLoading: false });
        return true;
      }

      const result = await clientAuthService.passwordLogin(employeeCode, password);
      set({ authEmployee: result.employee, authLoading: false });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ";
      set({
        authLoading: false,
        authError: message,
        authErrorKey: message.includes("รหัสผ่าน") ? "INVALID_CREDENTIALS" : "LOGIN_FAILED",
      });
      return false;
    }
  },

  async forgotPassword(employeeCode) {
    set({ authLoading: true, authError: "", authErrorKey: null });
    try {
      const result = await clientAuthService.forgotPassword(employeeCode);
      return { success: true, message: result.message };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถส่งรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
      };
    } finally {
      set({ authLoading: false });
    }
  },

  async changePassword(employeeCode, oldPassword, newPassword) {
    set({ authLoading: true, authError: "", authErrorKey: null });
    try {
      const result = await clientAuthService.changePassword(
        employeeCode,
        oldPassword,
        newPassword,
      );
      return { success: true, message: result.message };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง",
      };
    } finally {
      set({ authLoading: false });
    }
  },

  async lookupEmployeeFaceProfile(employeeCode) {
    const code = employeeCode.trim();
    const cached = knownFaceProfiles.get(code);
    if (cached) return cached;

    const profile = await clientAuthService.getProfile(code);
    if (profile.has_face_profile) knownFaceProfiles.set(code, profile);
    return profile;
  },

  async faceLogin(employeeCode, imageDataUrl) {
    const publicKey = get().publicKey;
    if (publicKey) {
      try {
        const returnTo = get().returnTo;
        if (!returnTo) throw new Error("ไม่พบ URL สำหรับกลับไปยังแอปพลิเคชันไคลเอนต์");
        const result = await clientAuthService.faceTicket(
          publicKey,
          returnTo,
          employeeCode,
          imageDataUrl,
        );
        set({ issuedTicket: result.ticket, authError: "", authErrorKey: null });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ";
        set({ authError: message, authErrorKey: "FACE_NOT_MATCHED" });
        return false;
      }
    }

    const result = await clientAuthService.faceLogin(employeeCode, imageDataUrl);
    if (!result.is_match || !result.employee) {
      set({ authError: result.message, authErrorKey: "FACE_NOT_MATCHED" });
      return false;
    }
    knownFaceProfiles.set(result.employee.employee_code, result.employee);
    set({ authEmployee: result.employee, authError: "", authErrorKey: null });
    return true;
  },

  async recoverPasswordWithFace(employeeCode, imageDataUrl) {
    const response = await clientAuthService.recoverPasswordWithFace(
      employeeCode,
      imageDataUrl,
    );
    const result: FaceVerifyResult & { password?: string } = {
      success: true,
      is_match: response.is_match,
      message: response.message,
      score: response.score,
      threshold: response.threshold,
      password: response.password || undefined,
    };
    if (!response.is_match || !response.password) {
      set({ authError: response.message, authErrorKey: "FACE_NOT_MATCHED" });
    } else {
      set({ authError: "", authErrorKey: null });
    }
    return result;
  },
}));

import { API_URL } from "@/config/api.config";
import type {
  AdminEmployee,
  AdminSession,
  FaceMode,
  ModelGroup,
  ModelSchema,
  ModelSettingsDocument,
} from "@/types/api";

export const ADMIN_SESSION_KEY = "guts-face.admin.v1";
const REQUIRED_MODEL_KEYS = new Set(["scrfd_detector", "arcface_recognizer", "face_landmarker"]);
const USER_MANAGER_EMPLOYEE_CODES = new Set(["680708", "622057", "632070", "622062"]);

export function isAdminRole(roleName: string) {
  const normalized = roleName.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized === "admin" || normalized === "super_admin";
}

export function canAccessAdminPortal(session: AdminSession) {
  return isAdminRole(session.role_name) || USER_MANAGER_EMPLOYEE_CODES.has(session.employee_code);
}

export function canEditAdminModels(session: AdminSession) {
  return isAdminRole(session.role_name);
}

function adminHeaders(adminCode: string, json = true): HeadersInit {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "X-Employee-Code": adminCode,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
  const data = await response.json().catch(() => null);
  const detail = data?.detail;
  const message =
    typeof detail === "string"
      ? detail
      : typeof detail?.message === "string"
        ? detail.message
        : "ดำเนินการไม่สำเร็จ";
  throw new Error(message);
}

export const adminService = {
  async login(employeeCode: string, password: string): Promise<AdminSession> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_code: employeeCode, password }),
    });
    const data = await parseResponse<{ employee: AdminSession }>(response);
    if (!canAccessAdminPortal(data.employee)) {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้ดูแล");
    }
    return data.employee;
  },

  async listUsers(adminCode: string, search = "", page = 1) {
    const params = new URLSearchParams({ search, page: String(page), page_size: "25" });
    return parseResponse<{ items: AdminEmployee[]; total: number; page: number; page_size: number }>(
      await fetch(`${API_URL}/admin/users?${params}`, { headers: adminHeaders(adminCode, false) }),
    );
  },

  async getFaceProfile(adminCode: string, employeeCode: string) {
    const response = await fetch(
      `${API_URL}/admin/users/${encodeURIComponent(employeeCode)}/face-profile`,
      { headers: adminHeaders(adminCode, false), cache: "no-store" },
    );
    if (!response.ok) {
      await parseResponse(response);
    }
    return response.blob();
  },

  async replaceFaceProfile(adminCode: string, employeeCode: string, imageDataUrl: string) {
    return parseResponse(
      await fetch(`${API_URL}/admin/users/${encodeURIComponent(employeeCode)}/face-profile`, {
        method: "PUT",
        headers: adminHeaders(adminCode),
        body: JSON.stringify({ image_data_url: imageDataUrl }),
      }),
    );
  },

  async deleteFaceProfile(adminCode: string, employeeCode: string) {
    return parseResponse<void>(
      await fetch(`${API_URL}/admin/users/${encodeURIComponent(employeeCode)}/face-profile`, {
        method: "DELETE",
        headers: adminHeaders(adminCode, false),
      }),
    );
  },

  async getModelSettings(adminCode: string, mode: FaceMode) {
    const query = `?mode=${encodeURIComponent(mode)}`;
    return parseResponse<ModelSettingsDocument>(
      await fetch(`${API_URL}/admin/model-settings${query}`, { headers: adminHeaders(adminCode, false) }),
    );
  },

  async updateModel(
    adminCode: string,
    group: ModelGroup,
    model: ModelSchema,
    mode: FaceMode,
  ) {
    const settings_values = Object.fromEntries(
      Object.entries(model.settings_values).map(([key, metadata]) => [key, metadata.value]),
    );
    const body = {
      ...(!REQUIRED_MODEL_KEYS.has(model.model_key) ? { active: model.active } : {}),
      settings_values,
    };
    return parseResponse<ModelSchema>(
      await fetch(`${API_URL}/admin/model-settings/${group}/${model.model_key}?mode=${encodeURIComponent(mode)}`, {
        method: "PATCH",
        headers: adminHeaders(adminCode),
        body: JSON.stringify(body),
      }),
    );
  },

  async resetModelSettings(
    adminCode: string,
    mode: FaceMode,
    group?: ModelGroup,
    modelKey?: string,
  ) {
    return parseResponse<ModelSettingsDocument>(
      await fetch(`${API_URL}/admin/model-settings/reset?mode=${encodeURIComponent(mode)}`, {
        method: "POST",
        headers: adminHeaders(adminCode),
        body: JSON.stringify({
          ...(group ? { group } : {}),
          ...(modelKey ? { model_key: modelKey } : {}),
        }),
      }),
    );
  },
};

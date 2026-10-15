import { API_URL } from "@/config/api.config";
import type {
  AdminEmployee,
  AdminSession,
  BlockedClientIp,
  ClientIpBlockCreate,
  ClientApplication,
  ClientApplicationCreate,
  ClientApplicationUpdate,
  DirectoryEmployee,
  EmployeeSummary,
  FaceMode,
  ModelGroup,
  ModelSchema,
  ModelSettingsDocument,
  PresenceSnapshot,
  PresenceSettings,
} from "@/types/api";

export const ADMIN_SESSION_KEY = "guts-face.admin.v1";
const REQUIRED_MODEL_KEYS = new Set(["scrfd_detector", "arcface_recognizer", "face_landmarker"]);
const USER_MANAGER_EMPLOYEE_CODES = new Set(["680708", "622057", "632070", "622062"]);

export type AdminUserListOptions = {
  isActive?: boolean;
  includeSuperAdmins?: boolean;
  registeredFacesFirst?: boolean;
  sortEmployeeCode?: boolean;
  sortBy?: "employee_code" | "face_status";
  sortDirection?: "asc" | "desc";
  faceStatus?: "all" | "registered" | "missing";
};

export type EmployeeSummaryOptions = {
  activeOnly?: boolean;
  includeSuperAdmins?: boolean;
};

function normalizeRoleName(roleName: string) {
  return roleName.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isAdminRole(roleName: string) {
  return normalizeRoleName(roleName) === "admin";
}

export function isSuperAdminRole(roleName: string) {
  return normalizeRoleName(roleName) === "super_admin";
}

export function canAccessAdminDashboard(session: AdminSession) {
  return USER_MANAGER_EMPLOYEE_CODES.has(session.employee_code);
}

export function canAccessSuperAdminPortal(session: AdminSession) {
  return isSuperAdminRole(session.role_name);
}

export function canAccessAdminPortal(session: AdminSession) {
  return Boolean(session.employee_code);
}

export function canEditAdminModels(session: AdminSession) {
  return canAccessSuperAdminPortal(session);
}

function adminHeaders(adminCode: string, json = true): HeadersInit {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    "X-Employee-Code": adminCode,
  };
}

function presenceWebSocketUrl(adminCode: string) {
  const url = new URL(API_URL, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/admin/client-applications/presence/ws`;
  url.search = "";
  url.searchParams.set("employee_code", adminCode);
  return url;
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
  watchClientPresence(
    adminCode: string,
    onSnapshot: (snapshot: PresenceSnapshot) => void,
    onError: () => void,
  ) {
    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      reconnectTimer = null;
      if (stopped) return;
      socket = new WebSocket(presenceWebSocketUrl(adminCode));
      socket.onmessage = (event) => {
        try {
          onSnapshot(JSON.parse(event.data) as PresenceSnapshot);
        } catch {
          onError();
        }
      };
      socket.onerror = onError;
      socket.onclose = (event) => {
        socket = null;
        if (stopped || event.code === 1008) return;
        reconnectTimer = window.setTimeout(connect, 2_000);
      };
    };

    // Let React's development-only StrictMode cleanup cancel the discarded mount
    // before it creates a short-lived WebSocket through the Vite proxy.
    reconnectTimer = window.setTimeout(connect, 0);
    return () => {
      stopped = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close(1000, "Monitor closed");
    };
  },

  async login(employeeCode: string, password: string): Promise<AdminSession> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_code: employeeCode, password }),
    });
    const data = await parseResponse<{ employee: AdminSession }>(response);
    return data.employee;
  },

  async listClientApplications(adminCode: string) {
    return parseResponse<ClientApplication[]>(
      await fetch(`${API_URL}/admin/client-applications`, {
        headers: adminHeaders(adminCode, false),
        cache: "no-store",
      }),
    );
  },

  async getClientPresence(adminCode: string) {
    return parseResponse<PresenceSnapshot>(
      await fetch(`${API_URL}/admin/client-applications/presence`, {
        headers: adminHeaders(adminCode, false),
        cache: "no-store",
      }),
    );
  },

  async getClientPresenceSettings(adminCode: string) {
    return parseResponse<PresenceSettings>(
      await fetch(`${API_URL}/admin/client-applications/presence/settings`, {
        headers: adminHeaders(adminCode, false),
        cache: "no-store",
      }),
    );
  },

  async updateClientPresenceSettings(adminCode: string, enabled: boolean) {
    return parseResponse<PresenceSettings>(
      await fetch(`${API_URL}/admin/client-applications/presence/settings`, {
        method: "PUT",
        headers: adminHeaders(adminCode),
        body: JSON.stringify({ enabled }),
      }),
    );
  },

  async generateClientApplicationKeyPair(adminCode: string) {
    return parseResponse<{ public_key: string; private_key: string }>(
      await fetch(`${API_URL}/admin/client-applications/generate-key-pair`, {
        method: "POST",
        headers: adminHeaders(adminCode, false),
      }),
    );
  },

  async createClientApplication(adminCode: string, payload: ClientApplicationCreate) {
    return parseResponse<ClientApplication>(
      await fetch(`${API_URL}/admin/client-applications`, {
        method: "POST",
        headers: adminHeaders(adminCode),
        body: JSON.stringify(payload),
      }),
    );
  },

  async updateClientApplication(
    adminCode: string,
    appRegistrationId: number,
    payload: ClientApplicationUpdate,
  ) {
    return parseResponse<ClientApplication>(
      await fetch(`${API_URL}/admin/client-applications/${appRegistrationId}`, {
        method: "PATCH",
        headers: adminHeaders(adminCode),
        body: JSON.stringify(payload),
      }),
    );
  },

  async deleteClientApplication(adminCode: string, appRegistrationId: number) {
    return parseResponse<{ message: string }>(
      await fetch(`${API_URL}/admin/client-applications/${appRegistrationId}`, {
        method: "DELETE",
        headers: adminHeaders(adminCode, false),
      }),
    );
  },

  async rotateClientApplicationSigningKey(adminCode: string, appRegistrationId: number) {
    return parseResponse<{ message: string; updated_at: string }>(
      await fetch(
        `${API_URL}/admin/client-applications/${appRegistrationId}/rotate-signing-key`,
        {
          method: "POST",
          headers: adminHeaders(adminCode, false),
        },
      ),
    );
  },

  async revealClientApplicationSigningKey(adminCode: string, appRegistrationId: number) {
    return parseResponse<{ private_key: string }>(
      await fetch(
        `${API_URL}/admin/client-applications/${appRegistrationId}/signing-key`,
        {
          headers: adminHeaders(adminCode, false),
          cache: "no-store",
        },
      ),
    );
  },

  async listBlockedClientIps(adminCode: string) {
    return parseResponse<BlockedClientIp[]>(
      await fetch(`${API_URL}/admin/blocked-client-ips`, {
        headers: adminHeaders(adminCode, false),
        cache: "no-store",
      }),
    );
  },

  async blockClientIp(adminCode: string, payload: ClientIpBlockCreate) {
    return parseResponse<BlockedClientIp>(
      await fetch(`${API_URL}/admin/blocked-client-ips`, {
        method: "POST",
        headers: adminHeaders(adminCode),
        body: JSON.stringify(payload),
      }),
    );
  },

  async unblockClientIp(adminCode: string, ipAddress: string) {
    return parseResponse<BlockedClientIp>(
      await fetch(
        `${API_URL}/admin/blocked-client-ips/${encodeURIComponent(ipAddress)}/unblock`,
        {
          method: "PATCH",
          headers: adminHeaders(adminCode, false),
        },
      ),
    );
  },

  async deleteBlockedClientIp(adminCode: string, ipAddress: string) {
    return parseResponse<void>(
      await fetch(
        `${API_URL}/admin/blocked-client-ips/${encodeURIComponent(ipAddress)}`,
        {
          method: "DELETE",
          headers: adminHeaders(adminCode, false),
        },
      ),
    );
  },

  async listEmployeeDirectory(
    employeeCode: string,
    search = "",
    page = 1,
    options: AdminUserListOptions = {},
  ) {
    const params = new URLSearchParams({ search, page: String(page), page_size: "25" });
    if (options.sortBy) {
      params.set("sort_by", options.sortBy);
      params.set("sort_direction", options.sortDirection ?? "asc");
    }
    if (options.faceStatus) {
      params.set("face_status", options.faceStatus);
    }
    return parseResponse<{
      items: DirectoryEmployee[];
      total: number;
      page: number;
      page_size: number;
    }>(
      await fetch(`${API_URL}/employee-directory?${params}`, {
        headers: adminHeaders(employeeCode, false),
        cache: "no-store",
      }),
    );
  },

  async getEmployeeSummary(
    employeeCode: string,
    options: EmployeeSummaryOptions = {},
  ) {
    const params = new URLSearchParams({
      active_only: String(options.activeOnly ?? true),
    });
    const endpoint = options.includeSuperAdmins
      ? "super-admin/employee-summary"
      : "employee-summary";
    return parseResponse<EmployeeSummary>(
      await fetch(`${API_URL}/${endpoint}?${params}`, {
        headers: adminHeaders(employeeCode, false),
        cache: "no-store",
      }),
    );
  },

  async listUsers(
    adminCode: string,
    search = "",
    page = 1,
    options: AdminUserListOptions = {},
  ) {
    const params = new URLSearchParams({ search, page: String(page), page_size: "25" });
    if (options.isActive !== undefined) {
      params.set("is_active", String(options.isActive));
    }
    if (options.sortEmployeeCode) {
      params.set("sort_employee_code", "true");
    }
    if (options.registeredFacesFirst) {
      params.set("registered_faces_first", "true");
    }
    if (options.sortBy) {
      params.set("sort_by", options.sortBy);
      params.set("sort_direction", options.sortDirection ?? "asc");
    }
    if (options.faceStatus) {
      params.set("face_status", options.faceStatus);
    }
    return parseResponse<{
      items: AdminEmployee[];
      total: number;
      page: number;
      page_size: number;
    }>(
      await fetch(`${API_URL}/${options.includeSuperAdmins ? "super-admin/users" : "admin/users"}?${params}`, {
        headers: adminHeaders(adminCode, false),
        cache: "no-store",
      }),
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

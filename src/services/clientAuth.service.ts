import { API_URL } from "@/config/api.config";
import type { EmployeeProfile, FrontendModel } from "@/types/api";

type PasswordLoginResponse = {
  employee: EmployeeProfile;
  message: string;
};

type FaceLoginResponse = {
  is_match: boolean;
  message: string;
  employee: EmployeeProfile | null;
  score?: number;
  threshold?: number;
};

type FacePasswordRecoveryResponse = {
  is_match: boolean;
  message: string;
  password: string | null;
  score?: number;
  threshold?: number;
};

type ClientTicketResponse = {
  ticket: string;
};

type ClientCallbackValidationResponse = {
  valid: boolean;
  return_to: string;
};

type PasswordActionResponse = {
  message: string;
};

type ClientErrorDetail = {
  message?: unknown;
  code?: unknown;
  safe_redirect_url?: unknown;
  retry_after_seconds?: unknown;
};

export class ClientAuthRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly safeRedirectUrl: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status: number, detail?: ClientErrorDetail) {
    super(message);
    this.name = "ClientAuthRequestError";
    this.status = status;
    this.code = typeof detail?.code === "string" ? detail.code : null;
    this.safeRedirectUrl =
      typeof detail?.safe_redirect_url === "string" ? detail.safe_redirect_url : null;
    this.retryAfterSeconds =
      typeof detail?.retry_after_seconds === "number"
        ? detail.retry_after_seconds
        : null;
  }
}

const USER_MESSAGE_TRANSLATIONS: Record<string, string> = {
  "Invalid client application.":
    "ไม่พบแอปพลิเคชันไคลเอนต์ หรือแอปพลิเคชันถูกปิดใช้งาน",
};

function localizedUserMessage(message: string): string {
  const normalized = message.trim();
  return USER_MESSAGE_TRANSLATIONS[normalized] || normalized;
}

function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return localizedUserMessage(detail);
  }
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return localizedUserMessage(message);
    }
  }
  return fallback;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      data && typeof data === "object" && (data as { detail?: unknown }).detail
      && typeof (data as { detail?: unknown }).detail === "object"
        ? ((data as { detail: ClientErrorDetail }).detail)
        : undefined;
    throw new ClientAuthRequestError(
      errorMessage(data, "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
      response.status,
      detail,
    );
  }
  return data as T;
}

export const clientAuthService = {
  validateCallback(
    publicKey: string,
    returnTo?: string,
  ): Promise<ClientCallbackValidationResponse> {
    return jsonRequest(`${API_URL}/client-auth/callback/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_key: publicKey,
        ...(returnTo ? { return_to: returnTo } : {}),
      }),
    });
  },

  getProfile(employeeCode: string): Promise<EmployeeProfile> {
    return jsonRequest(
      `${API_URL}/client-auth/employees/${encodeURIComponent(employeeCode.trim())}`,
      { cache: "no-store" },
    );
  },

  passwordLogin(employeeCode: string, password: string): Promise<PasswordLoginResponse> {
    return jsonRequest(`${API_URL}/client-auth/login/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_code: employeeCode.trim(),
        password,
      }),
    });
  },

  passwordTicket(
    publicKey: string,
    returnTo: string,
    employeeCode: string,
    password: string,
  ): Promise<ClientTicketResponse> {
    return jsonRequest(`${API_URL}/client-auth/tickets/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_key: publicKey,
        return_to: returnTo,
        employee_code: employeeCode.trim(),
        password,
      }),
    });
  },

  faceLogin(employeeCode: string, imageDataUrl: string): Promise<FaceLoginResponse> {
    return jsonRequest(`${API_URL}/client-auth/login/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_code: employeeCode.trim(),
        image_data_url: imageDataUrl,
      }),
    });
  },

  faceTicket(
    publicKey: string,
    returnTo: string,
    employeeCode: string,
    imageDataUrl: string,
  ): Promise<ClientTicketResponse> {
    return jsonRequest(`${API_URL}/client-auth/tickets/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_key: publicKey,
        return_to: returnTo,
        employee_code: employeeCode.trim(),
        image_data_url: imageDataUrl,
      }),
    });
  },

  recoverPasswordWithFace(
    employeeCode: string,
    imageDataUrl: string,
  ): Promise<FacePasswordRecoveryResponse> {
    return jsonRequest(`${API_URL}/client-auth/password/recover/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_code: employeeCode.trim(),
        image_data_url: imageDataUrl,
      }),
    });
  },

  forgotPassword(employeeCode: string): Promise<PasswordActionResponse> {
    return jsonRequest(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_code: employeeCode.trim(),
        send_plain_password: true,
      }),
    });
  },

  changePassword(
    employeeCode: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<PasswordActionResponse> {
    return jsonRequest(`${API_URL}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_code: employeeCode.trim(),
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
  },

  async getFrontendModelSettings(): Promise<FrontendModel[]> {
    const data = await jsonRequest<{ frontend_models?: FrontendModel[] }>(
      `${API_URL}/client-auth/model-settings/frontend`,
      { cache: "no-store" },
    );
    return Array.isArray(data.frontend_models) ? data.frontend_models : [];
  },
};

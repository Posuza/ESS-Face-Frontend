import { API_URL } from "@/config/api.config";
import type { EmployeeProfile } from "@/types/api";

export interface EmployeeLoginCredentials {
  employeeCode: string;
  password: string;
}

export interface EmployeeLoginResponse {
  employee: EmployeeProfile;
  message: string;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;

  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first === "object") {
      const msg = (first as { msg?: unknown }).msg;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
  }

  return fallback;
}

async function employeeLogin(
  credentials: EmployeeLoginCredentials,
): Promise<EmployeeLoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employee_code: credentials.employeeCode.trim(),
        password: credentials.password,
      }),
    });
  } catch {
    throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  }

  if (!data?.employee?.employee_code) {
    throw new Error("ข้อมูลพนักงานจากระบบไม่สมบูรณ์");
  }

  return data as EmployeeLoginResponse;
}

export const authService = {
  login: employeeLogin,
};

// Keep a named export for any existing code that imported `login` directly.
export const login = employeeLogin;

// src/services/auth.Service.ts
import { API_URL } from "@/config/api.config";

const API_BASE_URL = API_URL;

/** Build headers that include geo/device info from localStorage (optional). */
function _geoHeaders(): Record<string, string> {
  const lat = localStorage.getItem("geo_lat");
  const lng = localStorage.getItem("geo_lng");
  const geoStatus = localStorage.getItem("geo_status");
  if (lat && lng) return { "X-Latitude": lat, "X-Longitude": lng };
  if (geoStatus) return { "X-Geo-Status": geoStatus };
  return {};
}

export interface ForgotPasswordRequest {
  employee_code: string;
  send_plain_password: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
  contacts?: Array<{ team?: string; email?: string }>;
}

export const authService = {
  /**
   * Send forgot password request - sends password to employee's registered email
   */
  async forgotPassword(employee_code: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ..._geoHeaders(),
        },
        body: JSON.stringify({
          employee_code,
          send_plain_password: true,
        } as ForgotPasswordRequest),
      });

      if (response.ok) {
        const data: ForgotPasswordResponse = await response.json();
        return {
          success: true,
          message: data.message || "ส่งรหัสผ่านไปยังอีเมลเรียบร้อยแล้ว",
        };
      }

      // Handle error responses by parsing backend detail (may include message and contacts)
      const errorData = await response.json().catch(() => null);

      if (errorData?.detail) {
        // New format: detail is an object with error, message and contacts
        if (typeof errorData.detail === "object") {
          const msg =
            errorData.detail.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
          const error_key = errorData.detail.error;
          const contacts = Array.isArray(errorData.detail.contacts)
            ? errorData.detail.contacts.map(
                (c: { team?: string; email?: string }) => ({
                  team: c.team,
                  email: c.email,
                }),
              )
            : undefined;
          return { success: false, message: msg, error: error_key, contacts };
        }

        // Old format: detail is a string message
        if (typeof errorData.detail === "string") {
          return { success: false, message: errorData.detail };
        }
      }

      // Fallbacks based on status codes
      if (response.status === 500) {
        return {
          success: false,
          message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง",
        };
      }

      return {
        success: false,
        message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      };
    } catch (error) {
      // Network or other errors
      console.error("Forgot password error:", error);
      return {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต",
      };
    }
  },

  /**
   * Logout and record audit on backend (fire-and-forget)
   */
  async logout(employee_code: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/auth/logout?employee_code=${employee_code}`,
        {
          method: "POST",
          headers: { ..._geoHeaders() },
        },
      );
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  },

  /**
   * Login with employee code and PIN
   */
  async login(
    employee_code: string,
    password: string,
  ): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
    message?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ..._geoHeaders(),
        },
        body: JSON.stringify({
          employee_code,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("auth.login response:", data);
        return {
          success: true,
          data,
        };
      }

      const errorData = await response.json().catch(() => null);

      // Handle error response from ERROR_REGISTRY
      let message = "";
      let error_key = undefined;
      let contacts = undefined;

      if (errorData?.detail) {
        if (typeof errorData.detail === "object") {
          // New format with error object
          message = errorData.detail.message || "เกิดข้อผิดพลาด";
          error_key = errorData.detail.error;

          if (
            errorData.detail.contacts &&
            errorData.detail.contacts.length > 0
          ) {
            contacts = errorData.detail.contacts;
          }
        } else if (typeof errorData.detail === "string") {
          // Old format with string detail
          message = errorData.detail;
        }
      }

      if (!message) {
        message =
          response.status === 500
            ? "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาติดต่อทีมพัฒนา"
            : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        if (response.status === 500) {
          contacts = [{ team: "BE_CORE", email: "be-core@gutsess.com" }];
        }
      }

      return {
        success: false,
        error: error_key,
        message,
        contacts,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์",
      };
    }
  },

  /**
   * Change password — production mode
   */
  async changePassword(
    employee_code: string,
    oldPin: string,
    newPin: string,
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ..._geoHeaders(),
        },
        body: JSON.stringify({
          employee_code,
          old_password: oldPin,
          new_password: newPin,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || "เปลี่ยนรหัสผ่านสำเร็จ",
        };
      }

      const errorData = await response.json().catch(() => null);
      let message = "";
      let error_key = undefined;
      let contacts = undefined;

      if (errorData?.detail) {
        if (typeof errorData.detail === "object") {
          message = errorData.detail.message || "เกิดข้อผิดพลาด";
          error_key = errorData.detail.error;
          contacts = errorData.detail.contacts;
        } else if (typeof errorData.detail === "string") {
          message = errorData.detail;
        }
      }

      if (!message) {
        message =
          response.status === 500
            ? "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาติดต่อทีมพัฒนา"
            : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        if (response.status === 500) {
          contacts = [{ team: "BE_CORE", email: "be-core@gutsess.com" }];
        }
      }

      return {
        success: false,
        error: error_key,
        message,
        contacts,
      };
    } catch (error) {
      console.error("Change password error:", error);
      return {
        success: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์",
      };
    }
  },
};

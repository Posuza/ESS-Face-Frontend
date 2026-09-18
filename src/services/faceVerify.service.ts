// src/services/faceVerify.service.ts
import { API_URL } from "@/config/api.config";
import type {
  EmployeeProfile,
  FaceEnrollRequest,
  FaceVerifyRequest,
  FaceVerifyResult,
} from "@/types/api";

const API_BASE_URL = API_URL;

export const faceVerifyService = {
  async lookupEmployee(employeeCode: string): Promise<EmployeeProfile> {
    const response = await fetch(
      `${API_BASE_URL}/faces/employees/${encodeURIComponent(employeeCode)}`,
      { cache: "no-store" },
    );
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      throw new Error(
        typeof detail === "string" ? detail : "ไม่พบข้อมูลพนักงาน",
      );
    }
    return data as EmployeeProfile;
  },

  async getProfileImage(employeeCode: string): Promise<Blob | null> {
    const response = await fetch(
      `${API_BASE_URL}/faces/${encodeURIComponent(employeeCode)}/profile-image`,
      { cache: "no-store" },
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("โหลดรูปใบหน้าอ้างอิงไม่สำเร็จ");
    }

    return response.blob();
  },

  /**
   * Calls POST /face-profiles/verify. Returns success=false (with a
   * message) on network/server errors as well as on a genuine
   * is_match=false, so the caller can show one consistent failure UI
   * either way.
   */
  async verify(payload: FaceVerifyRequest): Promise<FaceVerifyResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/faces/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        return {
          success: true,
          is_match: Boolean(data.is_match),
          message:
            data.message ||
            (data.is_match ? "ยืนยันใบหน้าสำเร็จ" : "ใบหน้าไม่ตรงกับข้อมูลพนักงาน"),
          score: data.score,
          threshold: data.threshold,
        };
      }

      let message = "ยืนยันใบหน้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
      const detail = data?.detail;

      if (typeof detail === "string") {
        message = detail;
      } else if (detail && typeof detail === "object" && detail.message) {
        message = detail.message;
      }

      return { success: false, is_match: false, message };
    } catch (error) {
      console.error("faceVerifyService.verify error:", error);
      return {
        success: false,
        is_match: false,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต",
      };
    }
  },

  async enroll(payload: FaceEnrollRequest) {
    const response = await fetch(`${API_BASE_URL}/faces/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      throw new Error(
        typeof detail === "string" ? detail : "ลงทะเบียนใบหน้าไม่สำเร็จ",
      );
    }

    return data;
  },
};

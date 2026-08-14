// ── API client ─────────────────────────────────────────────────────────────

import { API_URL, API_CONFIG } from "../config/api.config";



// ── Types ──────────────────────────────────────────────────────────────────
export interface Division {
  division_id: number;
  division_name: string;
  department_id: number;
}

export interface Department {
  department_id: number;
  department_name: string;
  field_id: number;
}

async function request<T>(path: string): Promise<T> {
  const url = `${API_URL}/workplace${path}`;
  const res = await fetch(url, {
    ...API_CONFIG,
    headers: {
      ...API_CONFIG.headers,
      ...API_CONFIG.getAuthHeader(),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Service ────────────────────────────────────────────────────────────────

export const divisionService = {
  async getByDepartment(
    departmentId: number,
    fieldId?: number,
  ): Promise<Division[]> {
    const params = new URLSearchParams({
      department_id: String(departmentId),
    });
    if (fieldId != null) params.set("field_id", String(fieldId));
    return request<Division[]>(`/divisions?${params.toString()}`);
  },

  async getDepartmentsByField(fieldId: number): Promise<Department[]> {
    return request<Department[]>(`/departments?field_id=${fieldId}`);
  },
};

import { API_URL, API_CONFIG } from "../config/api.config";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SectorReportDiscipline {
  id?: string | number;
  key: string;
  label: string;
  value: number;
}

export interface SectorReportProject {
  id: string;
  name: string;
  project_name?: string;
  detail: string;
  status: string;
  note: string;
}

export interface SectorReport {
  id: number;
  department_id: number;
  department_name: string;
  division_id: number;
  division_name: string;
  report_date: string;
  status: string;
  workflow_status?: string;
  approved_status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  approved_remark?: string | null;
  created_at?: string;
  created_by: string;
  updated_by?: string | null;
  updated_at?: string | null;

  // Group 1 — หน่วยงานที่รับผิดชอบ
  dept_guard_post_count: number;
  dept_current_personnel_count: number;
  dept_missing_regular_count: number;
  dept_missing_personnel_count: number;
  dept_recruitment_count: number;
  dept_supplement_count: number;
  dept_reserve_units_count: number;
  dept_reserve_personnel_count: number;

  // Group 2 — การลา
  leave_personal_count: number;
  leave_sick_count: number;
  leave_absent_count: number;
  leave_deserted_count: number;
  leave_resigned_count: number;
  leave_terminated_count: number;
  leave_other_count: number;

  // Group 3 — การบริหารการควงเวร
  shift_18_count: number;
  shift_24_count: number;
  shift_36_count: number;

  // Group 4 — อบรมและควบคุมหน้างาน
  training_shift_change_count: number;
  training_planned_count: number;
  training_supervise_onsite_count: number;
  training_supervise_virtual_simulation_count: number;

  // Group 6A — เข้าพบผู้ว่าจ้าง summary
  employer_number_count: number;
  employer_problem_count: number;

  // Group 5 — วินัยและการลงโทษ (dynamic array)
  disciplines: SectorReportDiscipline[];

  // Group 6 — เข้าพบผู้ว่าจ้าง (dynamic array)
  projects: SectorReportProject[];

  // Group 7 — การเปลี่ยนแปลงจุดรักษาการณ์ (dynamic array)
  guard_post_movements: SectorReportProject[];
}

export interface SectorReportFilters {
  field_id?: number;
  department_id?: number;
  division_id?: number;
  created_by?: string;
  start_date?: string;
  end_date?: string;
  approved_status?: string;
}

/** Shape returned by getDistinctDisciplineTypes(). Only key + label, no value. */
export interface DistinctDiscipline {
  key: string;
  label: string;
}

/**
 * Shape returned by getEmployeeTodayReport().
 */
export interface EmployeeTodayReport {
  hasReport: boolean;
  divisionName: string;
  disciplines: SectorReportDiscipline[];
  disciplineExtraFields: Array<{
    key: string;
    label: string;
    value: number;
  }>;
}

export interface MoWorkflowStatus {
  mo_daily_transaction_id: number;
  workflow_status?: string | null;
  updated_by?: string | null;
  updated_by_position_name?: string | null;
  updated_at?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Map frontend filter keys to backend query params. */
function toQuery(filters?: SectorReportFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.field_id != null)
    params.set("field_id", String(filters.field_id));
  if (filters.department_id != null)
    params.set("department_id", String(filters.department_id));
  if (filters.division_id != null)
    params.set("division_id", String(filters.division_id));
  if (filters.created_by) params.set("created_by", filters.created_by);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.approved_status) params.set("status", filters.approved_status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Error that carries the HTTP status code alongside the message. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}/mo-daily-transactions${path}`;
  const res = await fetch(url, {
    ...API_CONFIG,
    headers: {
      ...API_CONFIG.headers,
      ...API_CONFIG.getAuthHeader(),
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail
          ? JSON.stringify(data.detail)
          : `API error ${res.status}`;
    throw new HttpError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;

  // Map mo_daily_transaction_id → id
  if (Array.isArray(data)) {
    return data.map((item: any) => ({
      ...item,
      id: item.mo_daily_transaction_id,
    })) as T;
  }
  return { ...data, id: data.mo_daily_transaction_id } as T;
}

// ── CRUD Service ───────────────────────────────────────────────────────────

export const sectorReportService = {
  async getAll(filters?: SectorReportFilters): Promise<SectorReport[]> {
    return request<SectorReport[]>(`/${toQuery(filters)}`);
  },

  async getById(id: number): Promise<SectorReport> {
    return request<SectorReport>(`/${id}`);
  },

  async create(data: any): Promise<SectorReport> {
    return request<SectorReport>("/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: any): Promise<SectorReport> {
    return request<SectorReport>(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    await request<void>(`/${id}`, { method: "DELETE" });
  },

  // ── Derived / convenience methods ────────────────────────────────────────

  async getWorkflowStatus(id: number): Promise<MoWorkflowStatus> {
    return request<MoWorkflowStatus>(
      `/${id}/mo_daily_transaction_workflow_status`,
    );
  },

  /**
   * Fetch ALL distinct discipline types (key + label) from across all reports.
   */
  async getDistinctDisciplineTypes(): Promise<DistinctDiscipline[]> {
    // Start with the 10 standard discipline types as baseline
    const standardMap = new Map<string, DistinctDiscipline>([
      [
        "discipline_sleeping_on_duty_count",
        { key: "discipline_sleeping_on_duty_count", label: "หลับเวร" },
      ],
      [
        "discipline_abandoning_post_count",
        { key: "discipline_abandoning_post_count", label: "ทิ้งจุด" },
      ],
      [
        "discipline_absent_work_count",
        { key: "discipline_absent_work_count", label: "ขาดงาน" },
      ],
      [
        "discipline_early_leaved_duty_count",
        { key: "discipline_early_leaved_duty_count", label: "ออกเวรก่อนเวลา" },
      ],
      [
        "discipline_using_phone_on_duty_count",
        { key: "discipline_using_phone_on_duty_count", label: "เล่นโทรศัพท์" },
      ],
      [
        "discipline_client_complained_count",
        { key: "discipline_client_complained_count", label: "ผู้ว่าจ้างตำหนิ" },
      ],
      [
        "discipline_improper_attire_count",
        { key: "discipline_improper_attire_count", label: "แต่งการไม่เรียบร้อย" },
      ],
      [
        "discipline_failed_write_report_count",
        { key: "discipline_failed_write_report_count", label: "ไม่เขียนรายงาน" },
      ],
      [
        "discipline_early_write_report_count",
        { key: "discipline_early_write_report_count", label: "เขียนรายงานล่วงหน้า" },
      ],
      [
        "discipline_using_drugs_on_duty_count",
        { key: "discipline_using_drugs_on_duty_count", label: "ดื่ม/มีกลิ่นสุรา ขณะทำงาน" },
      ],
    ]);

    // Merge with any additional types found in existing reports
    try {
      const allReports = await this.getAll();
      for (const report of allReports) {
        for (const d of report.disciplines ?? []) {
          if (!d.key || !d.label) continue;

          // Skip the 10 standard discipline keys (already in standardMap)
          if (standardMap.has(d.key)) {
            // Just update label if it changed
            standardMap.set(d.key, { key: d.key, label: d.label });
            continue;
          }

          // Custom disciplines (discipline_custom_N) — deduplicate by label
          if (d.key.startsWith("discipline_custom_")) {
            const existingCustom = [...standardMap.values()].find(
              (v) => v.label === d.label && v.key.startsWith("discipline_custom_"),
            );
            if (!existingCustom) {
              standardMap.set(d.key, { key: d.key, label: d.label });
            }
            // If same label already exists, skip (dedup by label)
            continue;
          }

          // Any other dynamic discipline key — add directly
          standardMap.set(d.key, { key: d.key, label: d.label });
        }
      }

      return Array.from(standardMap.values());
    } catch {
      // If fetching reports fails, return at least the standard types
      return Array.from(standardMap.values());
    }
  },

  /**
   * Fetch ALL distinct guard post movement statuses from the backend API.
   */
  async getDistinctGuardPostMovementStatuses(): Promise<string[]> {
    const result = await request<{ statuses: string[] }>(
      "/distinct-guard-post-movement-statuses",
    );
    return result.statuses;
  },

  /**
   * Fetch active divisions that do not already have today's report.
   */
  async getAvailableReportDivisions(
    departmentId: number,
  ): Promise<
    { division_id: number; division_name: string; department_id: number }[]
  > {
    return request<
      { division_id: number; division_name: string; department_id: number }[]
    >(`/available-report-divisions?department_id=${departmentId}`);
  },

  /**
   * Fetch today's report for a specific employee in their department.
   */
  async getEmployeeTodayReport(
    departmentId: number,
    empCode: string,
  ): Promise<EmployeeTodayReport> {
    const today = new Date().toISOString().slice(0, 10);
    const reports = await this.getAll({
      department_id: departmentId,
      created_by: empCode,
      start_date: today,
      end_date: today,
    });

    if (reports.length === 0) {
      return {
        hasReport: false,
        divisionName: "",
        disciplines: [],
        disciplineExtraFields: [],
      };
    }

    const report = reports[0];

    return {
      hasReport: true,
      divisionName: report.division_name ?? "",
      disciplines: report.disciplines ?? [],
      disciplineExtraFields: [],
    };
  },
};

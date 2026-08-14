import { API_CONFIG, API_URL } from "../config/api.config";
import { HttpError } from "./moReporTransaction.Service";

export type MoReportExportType = "mo_summary_report" | "mo_division_report";
export type MoReportExportStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type MoReportExportFilters = {
  mo_daily_transaction_ids?: number[];
  department_id?: number;
  division_id?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  created_by?: string;
};

export type MoReportExportJob = {
  mo_report_export_job_id: number;
  report_type: MoReportExportType;
  job_status: MoReportExportStatus;
  progress_current: number;
  progress_total: number;
  progress_percent: number;
  download_ready: boolean;
  download_filename?: string | null;
  error_message?: string | null;
};

type QueueExportPayload = {
  report_type: MoReportExportType;
  filters: MoReportExportFilters;
  requested_by: string;
};

const EXPORT_PATH = "/mo-report-exports";
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${EXPORT_PATH}${path}`, {
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

  return data as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? null;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const moReportPdfExportService = {
  async queueExport(payload: QueueExportPayload): Promise<MoReportExportJob> {
    return request<MoReportExportJob>("/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getExport(jobId: number): Promise<MoReportExportJob> {
    return request<MoReportExportJob>(`/${jobId}`);
  },

  async waitForExport(
    jobId: number,
    onProgress?: (job: MoReportExportJob) => void,
  ): Promise<MoReportExportJob> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      const job = await this.getExport(jobId);
      onProgress?.(job);
      if (job.job_status === "completed") return job;
      if (["failed", "cancelled", "expired"].includes(job.job_status)) {
        throw new Error(job.error_message || `PDF export ${job.job_status}`);
      }
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error("PDF export timed out");
  },

  async downloadExport(job: MoReportExportJob): Promise<void> {
    const res = await fetch(
      `${API_URL}${EXPORT_PATH}/${job.mo_report_export_job_id}/download`,
      {
        ...API_CONFIG,
        headers: {
          ...API_CONFIG.getAuthHeader(),
        },
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new HttpError(
        res.status,
        typeof data?.detail === "string" ? data.detail : `API error ${res.status}`,
      );
    }

    const blob = await res.blob();
    const filename =
      filenameFromDisposition(res.headers.get("Content-Disposition")) ||
      job.download_filename ||
      "mo_report.pdf";
    saveBlob(blob, filename);
  },
};

import { useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { BsFillFileEarmarkPdfFill } from "react-icons/bs";
import { LuLandmark } from "react-icons/lu";
import DetailViewer from "../../components/mo/DetailViewer";
import { MoLoadingPopup } from "../../components/mo/popup";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import { useStore } from "../../store/store";
import { getMoWorkflowDisplayStatus } from "../../utils/mo/workflowDisplay";
import styles from "./MoFieldOnlyDetailPage.module.css";

type Props = {
  onCancel?: () => void;
  view: "summary" | "sector";
  item?: SectorReport;
  departmentId?: number;
  selectedDate?: string;
};

function getReportDate(report: SectorReport) {
  return (
    report.report_date ||
    (report.created_at ? String(report.created_at).slice(0, 10) : "")
  );
}

function isApproved(report?: SectorReport | null) {
  return (
    String(report?.approved_status ?? "").trim().toLowerCase() === "approved"
  );
}

function getWorkflowStatusClass(tone: string) {
  if (tone === "approved") return "status-approved";
  if (tone === "rejected") return "status-rejected";
  return "status-pending";
}

export default function MoFieldOnlyDetailPage({
  onCancel,
  view,
  item,
  departmentId,
  selectedDate,
}: Props) {
  const reports = useStore((state) => state.reports);
  const currentReport = useStore((state) => state.currentReport);
  const currentEmployee = useStore((state) => state.authEmployee);
  const employeeCode = currentEmployee?.employee_code;
  const pdfLoading = useStore((state) => state.isPdfExportLoading);
  const pdfExportJob = useStore((state) => state.currentPdfExportJob);
  const downloadMoReportPdfExport = useStore(
    (state) => state.downloadMoReportPdfExport,
  );

  const directReport =
    currentReport?.id === item?.id ? currentReport : item ?? null;

  const approvedDepartmentReports = useMemo(() => {
    if (view !== "summary" || departmentId == null) return [];
    return (reports ?? []).filter(
      (report) =>
        Number(report.department_id) === Number(departmentId) &&
        (!selectedDate || getReportDate(report) === selectedDate) &&
        isApproved(report),
    );
  }, [departmentId, reports, selectedDate, view]);

  const [selectedSummaryTransactionId, setSelectedSummaryTransactionId] =
    useState<number | null>(null);
  const validSelectedSummaryTransactionId = approvedDepartmentReports.some(
    (report) => report.id === selectedSummaryTransactionId,
  )
    ? selectedSummaryTransactionId
    : null;
  const selectedSummaryReport =
    approvedDepartmentReports.find(
      (report) => report.id === validSelectedSummaryTransactionId,
    ) ?? null;
  const reportCandidate = view === "sector" ? directReport : selectedSummaryReport;
  const activeReport =
    currentReport?.id === reportCandidate?.id ? currentReport : reportCandidate;
  const isSectorView = view === "sector" || activeReport != null;

  const departmentReport = useMemo(
    () =>
      activeReport ??
      (reports ?? []).find(
        (report) => Number(report.department_id) === Number(departmentId),
      ) ??
      null,
    [activeReport, departmentId, reports],
  );
  const displayDepartment =
    departmentReport?.department_name ||
    (departmentId != null ? `ภาค ${departmentId}` : "-");
  const displayDivision =
    isSectorView ? activeReport?.division_name || "-" : "ทั้งหมด";

  const summaryTransactionIds = useMemo(() => {
    if (view !== "summary" || departmentId == null) return [];

    return Array.from(
      new Set(
        approvedDepartmentReports
          .map((report) => report.id)
          .filter((id): id is number => Number.isFinite(id)),
      ),
    );
  }, [approvedDepartmentReports, departmentId, view]);

  const canDownload =
    isSectorView
      ? Boolean(activeReport?.id && isApproved(activeReport))
      : summaryTransactionIds.length > 0;

  const workflowDisplayStatus = activeReport
    ? getMoWorkflowDisplayStatus(activeReport, {
        position_id: currentEmployee?.position_id,
      })
    : null;

  const exportButtonText = useMemo(() => {
    if (!pdfLoading) return "ดาวน์โหลด PDF";
    if (!pdfExportJob || pdfExportJob.job_status === "queued") {
      return "กำลังเตรียม...";
    }
    if (pdfExportJob.job_status === "processing") {
      const percent = Math.max(
        0,
        Math.min(100, Math.floor(pdfExportJob.progress_percent || 0)),
      );
      return percent > 0 ? `กำลังสร้าง ${percent}%` : "กำลังสร้าง...";
    }
    if (pdfExportJob.job_status === "completed") {
      return "กำลังดาวน์โหลด...";
    }
    return "ดาวน์โหลด PDF";
  }, [pdfExportJob, pdfLoading]);

  async function handleDownload() {
    if (!employeeCode || !canDownload) return;

    try {
      if (isSectorView && activeReport?.id) {
        await downloadMoReportPdfExport({
          report_type: "mo_division_report",
          filters: {
            mo_daily_transaction_ids: [activeReport.id],
            division_id: activeReport.division_id,
          },
          requested_by: employeeCode,
        });
        return;
      }

      await downloadMoReportPdfExport({
        report_type: "mo_summary_report",
        filters: { mo_daily_transaction_ids: summaryTransactionIds },
        requested_by: employeeCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`เกิดข้อผิดพลาดในการดาวน์โหลด PDF: ${message}`);
    }
  }

  const disabledTitle =
    isSectorView
      ? "ดาวน์โหลดได้เฉพาะรายงานที่อนุมัติแล้ว"
      : "ไม่มีรายงานที่อนุมัติแล้วสำหรับดาวน์โหลด PDF";

  return (
    <div className={styles["field-detail-page"]}>
      <MoLoadingPopup open={pdfLoading} message="กำลังสร้าง PDF..." />

      <div className={styles["sector-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th className={styles["location-table-header"]}>
                <div className={styles["sector-header-fullwidth"]}>
                  <LuLandmark size="1.5em" />
                  <span className={styles["sector-select-wrap"]}>
                    <select
                      className={styles["sector-cell-select"]}
                      value={
                        view === "sector"
                          ? String(activeReport?.id ?? "")
                          : String(validSelectedSummaryTransactionId ?? "")
                      }
                      disabled={view === "sector"}
                      onChange={(event) =>
                        setSelectedSummaryTransactionId(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      aria-label={view === "summary" ? "ภาค" : "เขต"}
                    >
                      {view === "summary" && (
                        <option value="">{displayDepartment}</option>
                      )}
                      {view === "summary" ? (
                        approvedDepartmentReports.map((report) => (
                          <option key={report.id} value={report.id}>
                            {report.division_name || `รายการ ${report.id}`}
                          </option>
                        ))
                      ) : (
                        <option value={activeReport?.id ?? ""}>
                          {displayDivision}
                        </option>
                      )}
                    </select>
                    <ChevronDown
                      className={styles["sector-select-chevron"]}
                      size={16}
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          {isSectorView && (
            <tbody>
              <tr>
                <td className={styles["sector-location-cell"]}>
                  <span className={styles["first-column-cell"]}>
                    <MapPin className={styles["pin-icon"]} />
                  </span>
                  <span className={styles["sector-cell-bodytext"]}>
                    <span>{displayDivision}</span>
                    {workflowDisplayStatus && (
                      <span
                        className={`${styles["status-pill"]} ${styles[getWorkflowStatusClass(workflowDisplayStatus.tone)]}`}
                      >
                        {workflowDisplayStatus.label}
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      <div className={styles["field-detail-toolbar"]}>
        <button
          type="button"
          className={styles["pdf-download-btn"]}
          onClick={handleDownload}
          disabled={pdfLoading || !canDownload}
          title={canDownload ? "ดาวน์โหลด PDF" : disabledTitle}
        >
          <BsFillFileEarmarkPdfFill size={18} />
          {exportButtonText}
        </button>
      </div>

      {!isSectorView ? (
        <DetailViewer
          view="summary"
          departmentId={departmentId}
          selectedDate={selectedDate}
        />
      ) : activeReport?.id ? (
        <DetailViewer view="sector" selectedTransactionId={activeReport.id} />
      ) : null}

      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={() => (onCancel ? onCancel() : window.history.back())}
        >
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}

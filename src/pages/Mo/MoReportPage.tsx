import { useState, useMemo, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { BsFillFileEarmarkPdfFill } from "react-icons/bs";
import { LuLandmark } from "react-icons/lu";
import styles from "./MoReportPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import DetailViewer from "../../components/mo/DetailViewer";
import MoUpdateForm from "../../components/mo/MoUpdateForm";
import {
  ConfirmDeleteDialog,
  InfoModel,
  MoLoadingPopup,
} from "../../components/mo/popup";
import {
  persistMoReportState,
  readSavedMoReportState,
} from "./moPersistence";
import { useMoContext } from "../../context/MoContext";
import { canSeeFieldGroup } from "../../utils/mo/positionAccess";

type ReportListItem = SectorReport & {
  department?: string;
  create_at?: string;
  user_id?: string | number;
  wear_pants_count?: number | string;
  wear_shoes_count?: number | string;
};

type Props = {
  onCancel: () => void;
  initialDeptId?: number;
  initialDate?: string;
};

export default function MoReportPage({
  onCancel,
  initialDeptId,
  initialDate,
}: Props) {
  const { setMoSearchDate } = useMoContext();
  const authEmployee = useStore((s) => s.authEmployee);
  const empCode = authEmployee?.employee_code;
  const savedState = useMemo(() => readSavedMoReportState(), []);
  const [selectedDate, setSelectedDate] = useState(
    savedState?.selectedDate ?? initialDate ?? "",
  );

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const canSeeField = canSeeFieldGroup(currentEmployee);
  const fetchReports = useStore((state) => state.fetchReports);
  const deleteReport = useStore((state) => state.deleteReport);
  const pdfLoading = useStore((state) => state.isPdfExportLoading);
  const pdfExportJob = useStore((state) => state.currentPdfExportJob);
  const downloadMoReportPdfExport = useStore(
    (state) => state.downloadMoReportPdfExport,
  );
  const storeLoading = useStore((state) => state.isLoading);

  // Page loading popup — same concept as MoHome
  // Shows until: min 1.5s passed AND store is no longer loading
  const [showLoading, setShowLoading] = useState(true);
  const pageLoadStartRef = useRef(0);
  const pageLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_PAGE_LOAD_MS = 1500;

  useEffect(() => {
    pageLoadStartRef.current = Date.now();
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!storeLoading && showLoading) {
      const elapsed = Date.now() - pageLoadStartRef.current;
      const remaining = MIN_PAGE_LOAD_MS - elapsed;
      if (remaining > 0) {
        pageLoadTimerRef.current = setTimeout(() => {
          setShowLoading(false);
        }, remaining);
      } else {
        setShowLoading(false);
      }
    }
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, [storeLoading, showLoading]);

  const handleDownload = async () => {
    if (!empCode) {
      alert("ไม่พบรหัสพนักงานสำหรับสร้าง PDF");
      return;
    }
    if (!selectedSectorId || transactionIds.length < 1) {
      alert("ไม่มีรายงานให้ดาวน์โหลด PDF");
      return;
    }

    try {
      const reportType = selectedTransactionId
        ? "mo_division_report"
        : "mo_summary_report";
      const filters = selectedTransactionId
        ? {
            mo_daily_transaction_ids: [selectedTransactionId],
            division_id: selectedTransactionRow?.division_id,
          }
        : { mo_daily_transaction_ids: transactionIds };

      await downloadMoReportPdfExport({
        report_type: reportType,
        filters,
        requested_by: empCode,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`เกิดข้อผิดพลาดในการดาวน์โหลด PDF: ${message}`);
    }
  };

  // currentDept holds a simple id/name object for the currently selected department
  const [currentDept, setCurrentDept] = useState<{
    id: number;
    name: string;
  } | null>(() => {
    if (initialDeptId) {
      return {
        id: initialDeptId,
        name:
          authEmployee && Number(authEmployee.department_id) === initialDeptId
            ? authEmployee.department_name
            : `ฝ่ายปฏิบัติการภาค ${initialDeptId}`,
      };
    }
    return { id: 9, name: "ฝ่ายปฏิบัติการภาค 9" };
  });

  // selectedDepartment is a string (matches select option values). Initialize from currentDept if available.
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    currentDept?.name ?? "",
  );

  function updateMoSearchDate(date = selectedDate) {
    if (date) {
      setMoSearchDate(date);
    }
  }

  useEffect(() => {
    if (savedState?.selectedDate != null) {
      updateMoSearchDate(savedState.selectedDate);
      return;
    }
    if (initialDate !== undefined) {
      setSelectedDate(initialDate);
      updateMoSearchDate(initialDate);
    }
  }, [initialDate, savedState?.selectedDate]);

  // Sync department name from reports slice when data loads
  useEffect(() => {
    if (
      reports.length > 0 &&
      currentDept &&
      currentDept.name.includes(String(currentDept.id))
    ) {
      const match = reports.find(
        (r) => Number(r.department_id) === currentDept.id,
      );
      const deptName =
        (match as any)?.department_name || (match as any)?.departmentName;
      if (deptName && deptName !== currentDept.name) {
        setCurrentDept((prev) => (prev ? { ...prev, name: deptName } : null));
      }
    }
  }, [reports, currentDept]);

  function submitSearch() {
    if (selectedDate) {
      const targetSectorId = selectedSectorId ?? undefined;

      fetchReports({
        department_id: targetSectorId ?? undefined,
        start_date: selectedDate,
        end_date: selectedDate,
      });
      updateMoSearchDate();
    }
  }

  const employeeDepartments = useMemo(
    () =>
      currentEmployee?.department_name ? [currentEmployee.department_name] : [],
    [currentEmployee?.department_name],
  );

  /* derive department -> division mapping from fixture (matches component logic) */
  const derivedDepartments = useMemo(() => {
    try {
      const rows = reports;
      const map: Record<string, { name: string; divisions: Set<string> }> = {};
      rows.forEach((r: any) => {
        const id = Number(r.department_id) || 0;
        const div = (r.division_name ? String(r.division_name) : "").trim();
        if (!map[id]) {
          map[id] = {
            name: r.department_name || `ฝ่ายปฏิบัติการภาค ${id}`,
            divisions: new Set(),
          };
        }
        if (div) map[id].divisions.add(div);
      });
      return Object.keys(map).map((k) => ({
        id: Number(k),
        department: map[k].name,
        divisions: Array.from(map[k].divisions),
      }));
    } catch (e) {
      return [] as any;
    }
  }, [reports]);

  const mappedReports: ReportListItem[] = reports.map((r: SectorReport) => ({
    ...r,
    department:
      r.department_id === currentEmployee?.department_id &&
      currentEmployee?.department_name
        ? currentEmployee.department_name
        : (r as any).department_name ||
          (r as any).departmentName ||
          `ภาค ${r.department_id}`,
    create_at: r.created_at,
    user_id: r.created_by,
  }));

  const allSectorRecords = mappedReports;

  const uniqueDepartments = Array.from(
    new Set(allSectorRecords.map((r) => r.department).filter(Boolean)),
  ).sort() as string[];

  /* Decide which location options to show in the top select:
     - If empCode is true, prefer the employee's departments; if none, fall back to derivedDepartments.
     - Otherwise, use uniqueDepartments from reports. */
  const locationOptions = useMemo(() => {
    // Build combined options: department-only and department + division entries
    const derivedCombined = derivedDepartments.flatMap(
      (d) =>
        [
          d.department,
          ...d.divisions.map((s) => `${d.department} | ${s}`),
        ] as string[],
    );

    if (canSeeField) {
      return derivedCombined.length > 0 ? derivedCombined : uniqueDepartments;
    }

    if (empCode) {
      if (employeeDepartments.length > 0) return employeeDepartments;
      return derivedCombined.length > 0 ? derivedCombined : uniqueDepartments;
    }

    // Default: prefer derivedCombined if available, otherwise fall back to uniqueDepartments
    return derivedCombined.length > 0 ? derivedCombined : uniqueDepartments;
  }, [
    canSeeField,
    empCode,
    employeeDepartments,
    derivedDepartments,
    uniqueDepartments,
  ]);

  const selectedSectorName =
    selectedDepartment || currentEmployee?.department_name || "";

  /* find selected department id (if any) so we can compute transactionIds */
  const selectedSectorId = useMemo(() => {
    const found = derivedDepartments.find(
      (d) => d.department === selectedSectorName,
    );
    if (found) return found.id;
    return currentDept?.id ?? currentEmployee?.department_id ?? null;
  }, [derivedDepartments, selectedSectorName, currentDept, currentEmployee]);

  const selectedReportDate = selectedDate || initialDate || "";

  const visibleReports = useMemo(() => {
    let byDept = selectedSectorId
      ? reports.filter(
          (r) => Number(r.department_id) === Number(selectedSectorId),
        )
      : reports;

    // Filter to only include reports with approved_status equal to APPROVED
    byDept = byDept.filter((r) => r.approved_status === "APPROVED");

    if (!selectedReportDate) return byDept;

    return byDept.filter((r) => {
      const reportDate =
        r.report_date ?? (r.created_at ? r.created_at.slice(0, 10) : "");
      return reportDate === selectedReportDate;
    });
  }, [reports, selectedSectorId, selectedReportDate]);

  const transactionIds = useMemo(() => {
    const rows = visibleReports;
    if (!Array.isArray(rows) || !selectedSectorId) return [] as number[];
    const filtered = rows.filter(
      (r: any) => Number(r.department_id) === Number(selectedSectorId),
    );
    const ids = Array.from(
      new Set(filtered.map((r: any) => r.id || r.mo_daily_transaction_id)),
    ).filter(Boolean);
    return ids as number[];
  }, [selectedSectorId, visibleReports]);

  const exportButtonText = useMemo(() => {
    if (!pdfLoading) {
      return "ดาวน์โหลด PDF";
    }

    if (!pdfExportJob || pdfExportJob.job_status === "queued") {
      return "กำลังเตรียม...";
    }

    if (pdfExportJob.job_status === "processing") {
      const percent = Math.max(
        0,
        Math.min(100, Math.floor(pdfExportJob.progress_percent || 0)),
      );
      if (percent > 0) {
        return `กำลังสร้าง ${percent}%`;
      }
      if (pdfExportJob.progress_total > 0) {
        return `กำลังสร้าง ${pdfExportJob.progress_current}/${pdfExportJob.progress_total}`;
      }
      return "กำลังสร้าง...";
    }

    if (pdfExportJob.job_status === "completed") {
      return "กำลังดาวน์โหลด...";
    }

    return "ดาวน์โหลด PDF";
  }, [pdfLoading, pdfExportJob]);

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(savedState?.selectedTransactionId ?? null);

  // Edit mode state — threaded through to MoUpdateForm in MoSectorDetailForm
  const [isEditing, setIsEditing] = useState(savedState?.isEditing ?? false);
  const [isDirty, setIsDirty] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    persistMoReportState({
      selectedTransactionId,
      isEditing,
      viewMode: "table",
      selectedDate,
    });
  }, [selectedTransactionId, isEditing, selectedDate]);

  // Delete / success dialog state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState("ลบรายการสำเร็จ!");
  const [successDescription, setSuccessDescription] = useState(
    "ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว",
  );

  useEffect(() => {
    setSelectedTransactionId((prev) => {
      if (prev == null) return null; // was on department view → stay there
      if (transactionIds.includes(prev)) return prev; // still valid → keep it
      return null; // their selection disappeared → fall back to department
    });
  }, [transactionIds]);

  // ── Selected transaction row
  const selectedTransactionRow = useMemo(() => {
    if (!selectedTransactionId) return null;
    return (
      visibleReports.find(
        (r: any) =>
          String(r.mo_daily_transaction_id) === String(selectedTransactionId) ||
          String(r.id) === String(selectedTransactionId),
      ) || null
    );
  }, [visibleReports, selectedTransactionId]);

  // ── Permission logic
  const currentReport = useMemo(() => {
    if (selectedTransactionId) {
      const matched = visibleReports.find(
        (r) =>
          String((r as any).mo_daily_transaction_id) ===
            String(selectedTransactionId) ||
          String(r.id) === String(selectedTransactionId),
      );
      if (matched) return matched;
    }
    if (selectedSectorId) {
      const matched = visibleReports.find(
        (r) => String(r.department_id) === String(selectedSectorId),
      );
      if (matched) return matched;
    }
    return (
      visibleReports[0] ||
      ({
        id: selectedTransactionId ?? 1,
        mo_daily_transaction_id: selectedTransactionId ?? 1,
        department_id: selectedSectorId ?? 1,
        created_at: new Date().toISOString(),
        created_by: currentEmployee?.employee_code || "ADMIN",
      } as unknown as SectorReport)
    );
  }, [
    selectedTransactionId,
    selectedSectorId,
    currentEmployee,
    visibleReports,
  ]);

  function confirmDelete() {
    const idToDelete =
      (currentReport as any)?.id ||
      (currentReport as any)?.mo_daily_transaction_id ||
      selectedTransactionId;
    if (!idToDelete) return;
    setShowConfirmDelete(false);
    deleteReport(Number(idToDelete))
      .then(() => {
        setSuccessTitle("ลบรายการสำเร็จ!");
        setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
        setShowSuccess(true);
      })
      .catch((err: unknown) => {
        alert(`เกิดข้อผิดพลาดในการลบ: ${err}`);
      });
  }

  return (
    <div className={styles["reportPage"]}>
      <MoLoadingPopup
        open={showLoading || pdfLoading}
        message={pdfLoading ? "กำลังสร้าง PDF..." : undefined}
      />

      {/* หน่วยงาน / Sector row */}

      <div className={styles["sector-table-wrapper"]}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={4}
                className={`${styles["location-table-header"]} ${styles["no-border"]}`}
              >
                <div className={styles["sector-header-fullwidth"]}>
                  <LuLandmark size="1.5em" />

                  <select
                    className={styles["sector-cell-select"]}
                    value={selectedTransactionId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedTransactionId(v === "" ? null : Number(v));
                    }}
                  >
                    {/* value="" = department-level / summary view */}
                    <option value="">{currentDept?.name}</option>

                    {visibleReports.map((row: any) => {
                      const nm = String(row.division_name ?? "");
                      return (
                        <option
                          key={row.id || row.mo_daily_transaction_id}
                          value={String(row.id || row.mo_daily_transaction_id)}
                        >
                          {nm || row.division_name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          {selectedTransactionRow && (
            <tbody>
              <tr>
                <td colSpan={1} className={`${styles["first-column-cell"]}`}>
                  <MapPin className={styles["pin-icon"]} />
                </td>
                <td colSpan={3} className={styles["sector-cell-bodytext"]}>
                  {(() => {
                    const nm = String(
                      selectedTransactionRow.division_name ?? "",
                    );
                    return nm;
                  })()}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      {/* Toolbar */}
      <div className={styles["toolbar"]}>
        <div className={styles["toolbar-right"]}>
          <button
            type="button"
            className={`${styles["toolbar-action-btn"]} ${styles["pdf-download-btn"]}`}
            onClick={handleDownload}
            disabled={pdfLoading || transactionIds.length < 1}
            title={
              transactionIds.length < 1
                ? "ไม่มีรายงานให้ดาวน์โหลด PDF"
                : "ดาวน์โหลด PDF"
            }
          >
            <BsFillFileEarmarkPdfFill size={18} />
            {exportButtonText}
          </button>
        </div>
      </div>

      {/* Toolbar — for detialPae edit+ delte bnt  for talbe viwemode*/}

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={showConfirmDelete}
        title="ยืนยันลบรายการนี้?"
        description="รายการนี้จะถูกลบออกจากระบบ ไม่สามารถกู้คืนได้"
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
      />

      {/* Success info dialog */}
      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onCancel();
        }}
        variant="success"
        title={successTitle}
        description={successDescription}
      />

      {/* Content — only mount after initial loading is done */}
      {!showLoading && (
        <>
          {/* Content — MoReportPage decides what to show */}
          {isEditing ? (
            <MoUpdateForm
              reportData={currentReport as unknown as Record<string, unknown>}
              onCancel={() => {
                setIsEditing(false);
                setIsDirty(false);
              }}
              isDirty={isDirty}
              onDirtyChange={setIsDirty}
              submitRef={submitRef}
            />
          ) : selectedTransactionId ? (
            <DetailViewer
              view="sector"
              selectedTransactionId={selectedTransactionId}
              departmentId={selectedSectorId}
              selectedDate={selectedDate}
            />
          ) : (
            <DetailViewer
              view="summary"
              departmentId={selectedSectorId}
              selectedDate={selectedDate}
            />
          )}
        </>
      )}

      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={onCancel}
        >
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}

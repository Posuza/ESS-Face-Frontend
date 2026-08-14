// src/pages/dev.Mo/MoDetailPage.tsx
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Trash2, Pencil } from "lucide-react";
import styles from "./MoDetailPage.module.css";
import {
  ConfirmDeleteDialog,
  InfoModel,
  MoLoadingPopup,
} from "../../components/mo/popup";
import MoUpdateForm from "../../components/mo/MoUpdateForm";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import {
  HttpError,
  sectorReportService,
} from "../../services/moReporTransaction.Service";
import { getLocalTodayYYYYMMDD } from "../../utils/mo/date";
import { isReadOnly } from "../../utils/mo/positionAccess";
import {
  canApproveWorkflowStep,
  canEditReportContent,
  canSendBackWorkflowStep,
  getRestoreWorkflowStatus,
  getWorkflowRank,
  isWorkflowEditingByEmployee,
  isWorkflowLockedByOther,
} from "../../utils/mo/workflowAccess";
import {
  getWorkflowRankLabel,
  makeWorkflowStatus,
  WorkflowState,
} from "../../utils/mo/workflowStatus";
import {
  clearMoDetailEditState,
  persistMoDetailEditState,
  readSavedMoDetailEditState,
} from "./moPersistence";
import { useMoContext } from "../../context/MoContext";
import { getMoWorkflowDisplayStatus } from "../../utils/mo/workflowDisplay";

type Props = {
  onCancel?: () => void;
  item?: SectorReport;
};

function getItemSearchDate(item: any, fallbackDate: string) {
  return (
    item?.report_date ||
    (item?.created_at ? String(item.created_at).slice(0, 10) : "") ||
    fallbackDate
  );
}

function normalizePositionLabel(positionName?: string | null) {
  const value = String(positionName ?? "").trim();
  if (!value) return "ผู้ใช้อื่น";
  if (value.includes("ผู้จัดการ")) return "ผู้จัดการ";
  if (value.includes("ผู้อำนวยการ")) return "ผู้อำนวยการ";
  return value;
}

const getWorkflowStatusClass = (
  tone: string,
  stylesMod: Record<string, string>,
) => {
  if (tone === "approved") return stylesMod["status-approved"] ?? "";
  if (tone === "rejected") return stylesMod["status-rejected"] ?? "";
  return stylesMod["status-pending"] ?? "";
};

export default function MoDetailPage(props: Props) {
  const { moSearchDate, setMoSearchDate } = useMoContext();
  const savedEditState = readSavedMoDetailEditState();
  const [isEditing, setIsEditing] = useState(
    savedEditState?.itemId === props.item?.id
      ? savedEditState.isEditing
      : false,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState("อัปเดตรายงานสำเร็จ!");
  const [successDescription, setSuccessDescription] = useState(
    "ระบบได้ทำการอัปเดตข้อมูลของคุณเรียบร้อยแล้ว",
  );

  // Fetch error state — report may have been deleted by someone else
  const [showFetchError, setShowFetchError] = useState(false);
  const [fetchErrorMessage, setFetchErrorMessage] = useState("");
  const [showEditLockedWarning, setShowEditLockedWarning] = useState(false);
  const [editLockedMessage, setEditLockedMessage] = useState(
    "ผู้ใช้อื่นกำลังตรวจสอบแก้ไขอยู่ ไม่สามารถดำเนินการได้",
  );

  // Delete loading popup with minimum 1.5-second display time
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_DELETE_MS = 1500;

  // Initial page loading — don't mount form until data is ready + min 1.5s
  const [pageDataReady, setPageDataReady] = useState(false);
  const [pageMinTimePassed, setPageMinTimePassed] = useState(false);
  const showPageLoading = !(pageDataReady && pageMinTimePassed);

  useEffect(() => {
    const timer = setTimeout(() => setPageMinTimePassed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  // ── Approval state — lifted up from MoUpdateForm so this page can own the approve/send-back buttons ──
  const [approvalStatus, setApprovalStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >(
    (props.item?.approved_status as "PENDING" | "APPROVED" | "REJECTED") ||
      "PENDING",
  );

  // ref that MoUpdateForm exposes so we can trigger a save (with optional approve flag) from here
  const submitRef = useRef<
    ((opts?: { approve?: boolean; sendBack?: boolean }) => Promise<void>) | null
  >(null);

  const currentEmployee = useStore((state) => state.authEmployee);
  const { deleteReport, fetchReportById, updateReport, currentReport } =
    useStore();

  // Fetch fresh data on mount — if report was deleted, show error and go back
  useEffect(() => {
    if (props.item?.id) {
      fetchReportById(props.item.id).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setFetchErrorMessage(msg);
        setShowFetchError(true);
        setPageDataReady(true);
        setPageMinTimePassed(true);
      });
    }
  }, [props.item?.id, fetchReportById]);

  // Data is ready when currentReport matches this item
  useEffect(() => {
    if (currentReport?.id === props.item?.id) {
      setPageDataReady(true);
    }
  }, [currentReport, props.item?.id]);

  // Sync local approvalStatus when fresh data arrives
  useEffect(() => {
    const freshStatus =
      (currentReport?.id === props.item?.id
        ? (currentReport as any)?.approved_status
        : null) ?? props.item?.approved_status;
    if (freshStatus) {
      setApprovalStatus(freshStatus as "PENDING" | "APPROVED" | "REJECTED");
    }
  }, [currentReport, props.item]);

  useEffect(() => {
    if (!props.item?.id) return;
    persistMoDetailEditState(props.item.id, isEditing);
  }, [props.item?.id, isEditing]);

  const reportData =
    (currentReport?.id === props.item?.id
      ? (currentReport as unknown as Record<string, unknown>)
      : null) ?? (props.item as unknown as Record<string, unknown>);

  useEffect(() => {
    const detailItem =
      currentReport?.id === props.item?.id ? currentReport : props.item;

    if (detailItem) {
      setMoSearchDate(getItemSearchDate(detailItem, moSearchDate));
    }
  }, [currentReport, moSearchDate, props.item, setMoSearchDate]);

  const workflowReport = reportData as Partial<SectorReport>;

  useEffect(() => {
    if (!props.item?.id) return;

    const saved = readSavedMoDetailEditState();
    const savedEditing =
      saved?.itemId === props.item.id ? saved.isEditing : false;
    const backendEditingByMe = isWorkflowEditingByEmployee(
      currentEmployee,
      workflowReport,
    );

    setIsEditing(savedEditing || backendEditingByMe);
  }, [
    currentEmployee,
    props.item?.id,
    workflowReport.workflow_status,
    workflowReport.updated_by,
  ]);

  const workflowLockedByOther = isWorkflowLockedByOther(
    currentEmployee,
    workflowReport,
  );
  const editingPositionLabel = getWorkflowRankLabel(
    workflowReport.workflow_status,
  );

  const workflowDisplayStatus = getMoWorkflowDisplayStatus(
    {
      approved_status: approvalStatus,
      workflow_status: workflowReport.workflow_status,
    },
    {
      position_id: currentEmployee?.position_id,
    },
  );

  const canApproveStep = canApproveWorkflowStep(currentEmployee, workflowReport);
  const canSendBack = canSendBackWorkflowStep(currentEmployee, workflowReport);

  // Allow actions on reports submitted today. The business report_date can be
  // yesterday's round, while created_at is the actual transaction date.
  const today = getLocalTodayYYYYMMDD();
  const reportDate = props.item?.report_date ?? currentReport?.report_date;
  const transactionDate =
    (reportData?.created_at ? String(reportData.created_at).slice(0, 10) : "") ||
    (currentReport?.created_at ? String(currentReport.created_at).slice(0, 10) : "") ||
    (props.item?.created_at ? String(props.item.created_at).slice(0, 10) : "");
  const isReportDateToday = today === reportDate || today === transactionDate;
  const canShowApprovalActions =
    !isReadOnly(currentEmployee?.position_id) &&
    !isEditing &&
    !showPageLoading &&
    isReportDateToday &&
    (canApproveStep || canSendBack);

  // User can edit/delete only:
  //   - Not read-only
  //   - Report date is today
  //   - Director-level users can edit/delete directly
  //   - Manager-level users must be the original creator and workflow owner
  const canEditData =
    !isReadOnly(currentEmployee?.position_id) &&
    !!currentEmployee &&
    isReportDateToday &&
    canEditReportContent(currentEmployee, workflowReport);

  function showWorkflowLockedWarning(positionName?: string | null) {
    const positionLabel = normalizePositionLabel(positionName);
    setEditLockedMessage(
      `${positionLabel}กำลังตรวจสอบแก้ไขอยู่ ไม่สามารถดำเนินการได้`,
    );
    setShowEditLockedWarning(true);
  }

  function showWorkflowActionWarning(message: string) {
    setEditLockedMessage(message);
    setShowEditLockedWarning(true);
  }

  async function getFreshWorkflowReport() {
    if (!props.item?.id) return null;
    const freshWorkflow = await sectorReportService.getWorkflowStatus(
      props.item.id,
    );
    return {
      freshWorkflow,
      freshReport: {
        ...workflowReport,
        workflow_status: freshWorkflow.workflow_status ?? undefined,
        updated_by: freshWorkflow.updated_by ?? undefined,
      },
    };
  }

  async function canRunApprovalAction(action: "approve" | "sendBack") {
    const fresh = await getFreshWorkflowReport();
    if (!fresh) return false;

    const { freshWorkflow, freshReport } = fresh;
    if (isWorkflowLockedByOther(currentEmployee, freshReport)) {
      showWorkflowLockedWarning(
        freshWorkflow.updated_by_position_name ||
          getWorkflowRankLabel(freshWorkflow.workflow_status),
      );
      return false;
    }

    const canRun =
      action === "approve"
        ? canApproveWorkflowStep(currentEmployee, freshReport)
        : canSendBackWorkflowStep(currentEmployee, freshReport);

    if (!canRun) {
      showWorkflowActionWarning(
        "รายการนี้ยังไม่อยู่ในขั้นตอนอนุมัติของตำแหน่งคุณ",
      );
      return false;
    }

    return true;
  }

  async function handleStartEdit() {
    if (!props.item?.id) return;
    const rank = getWorkflowRank(currentEmployee?.position_id);
    if (!rank) return;
    try {
      const freshWorkflow = await sectorReportService.getWorkflowStatus(
        props.item.id,
      );
      const freshReport = {
        ...workflowReport,
        workflow_status: freshWorkflow.workflow_status ?? undefined,
        updated_by: freshWorkflow.updated_by ?? undefined,
      };
      if (isWorkflowLockedByOther(currentEmployee, freshReport)) {
        showWorkflowLockedWarning(
          freshWorkflow.updated_by_position_name ||
            getWorkflowRankLabel(freshWorkflow.workflow_status),
        );
        return;
      }
      if (
        !canEditReportContent(currentEmployee, freshReport)
      ) {
        setFetchErrorMessage("รายการนี้ยังไม่อยู่ในขั้นตอนแก้ไขของตำแหน่งคุณ");
        setShowFetchError(true);
        return;
      }
      await updateReport(props.item.id, {
        workflow_status: makeWorkflowStatus(rank, WorkflowState.EDITING),
      });
      setIsEditing(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchErrorMessage(msg);
      setShowFetchError(true);
    }
  }

  async function handleCancelEdit() {
    if (props.item?.id) {
      try {
        const freshWorkflow = await sectorReportService.getWorkflowStatus(
          props.item.id,
        );
        const freshReport = {
          ...workflowReport,
          workflow_status: freshWorkflow.workflow_status ?? undefined,
          updated_by: freshWorkflow.updated_by ?? undefined,
        };
        const restoreWorkflowStatus = getRestoreWorkflowStatus(
          currentEmployee,
          freshReport,
        );
        if (
          restoreWorkflowStatus &&
          restoreWorkflowStatus !== freshWorkflow.workflow_status
        ) {
          await updateReport(props.item.id, {
            workflow_status: restoreWorkflowStatus,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setFetchErrorMessage(msg);
        setShowFetchError(true);
        return;
      }
    }
    setIsEditing(false);
    setIsDirty(false);
  }

  function handleSavedEdit() {
    setIsEditing(false);
    setIsDirty(false);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!props.item?.id) return;
    try {
      const freshWorkflow = await sectorReportService.getWorkflowStatus(
        props.item.id,
      );
      const freshReport = {
        ...workflowReport,
        workflow_status: freshWorkflow.workflow_status ?? undefined,
        updated_by: freshWorkflow.updated_by ?? undefined,
      };
      if (isWorkflowLockedByOther(currentEmployee, freshReport)) {
        showWorkflowLockedWarning(
          freshWorkflow.updated_by_position_name ||
            getWorkflowRankLabel(freshWorkflow.workflow_status),
        );
        return;
      }
      setShowConfirmDelete(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchErrorMessage(msg);
      setShowFetchError(true);
    }
  }

  function confirmDelete() {
    if (!props.item?.id) return;
    setShowConfirmDelete(false);
    setIsDeleting(true);
    const startTime = Date.now();

    deleteReport(props.item.id)
      .then(() => {
        const elapsed = Date.now() - startTime;
        const remaining = MIN_DELETE_MS - elapsed;
        if (remaining > 0) {
          deleteTimerRef.current = setTimeout(() => {
            setIsDeleting(false);
            setSuccessTitle("ลบรายการสำเร็จ!");
            setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
            setShowSuccess(true);
          }, remaining);
        } else {
          setIsDeleting(false);
          setSuccessTitle("ลบรายการสำเร็จ!");
          setSuccessDescription("ระบบได้ลบรายการนี้ออกจากระบบเรียบร้อยแล้ว");
          setShowSuccess(true);
        }
      })
      .catch((err) => {
        setIsDeleting(false);
        const msg = err instanceof Error ? err.message : String(err);
        setFetchErrorMessage(msg);
        setShowFetchError(true);
      });
  }

  // ── Approve: verify fresh workflow first, then trigger MoUpdateForm's save ──
  const handleApprove = async () => {
    try {
      const canRun = await canRunApprovalAction("approve");
      if (!canRun) return;
      setApprovalStatus("APPROVED");
      await submitRef.current?.({ approve: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchErrorMessage(msg);
      setShowFetchError(true);
    }
  };

  // ── Send back for revision: verify fresh workflow first, then save ──
  const handleSendBack = async () => {
    try {
      const canRun = await canRunApprovalAction("sendBack");
      if (!canRun) return;
      setApprovalStatus("REJECTED");
      await submitRef.current?.({ sendBack: true });
      if (props.item?.id) {
        await fetchReportById(props.item.id);
      }
      setIsEditing(false);
      setIsDirty(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchErrorMessage(msg);
      setShowFetchError(true);
    }
  };

  return (
    <>
      {/* ── Top action bar: back + edit/delete ── */}
      <div className={styles["gut-detail-btns-box"]}>
        <div className={styles["guts-action-icons"]}>
          {(canEditData || workflowLockedByOther) && (
            <>
              {!isEditing && reportData?.approved_status !== "APPROVED" && (
                <button
                  type="button"
                  className={styles["guts-icon-btn"]}
                  title={
                    workflowLockedByOther
                      ? `${editingPositionLabel}กำลังตรวจสอบแก้ไขอยู่ ไม่สามารถดำเนินการได้`
                      : "แก้ไข"
                  }
                  aria-label="Edit"
                  onClick={handleStartEdit}
                >
                  <Pencil size={18} />
                </button>
              )}

              {(canEditData || workflowLockedByOther) &&
                !isEditing &&
                reportData?.approved_status !== "APPROVED" && (
                <button
                  type="button"
                  className={`${styles["guts-icon-btn"]} ${styles["guts-icon-delete"]}`}
                  onClick={handleDelete}
                  title="ลบ"
                  aria-label="Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={showConfirmDelete}
        title="ยืนยันลบรายการนี้?"
        description="รายการนี้จะถูกลบออกจากระบบ ไม่สามารถกู้คืนได้"
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={confirmDelete}
      />

      <MoLoadingPopup open={isDeleting} message="กำลังลบข้อมูล..." />
      <MoLoadingPopup open={showPageLoading} message="กำลังโหลดข้อมูล..." />

      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          clearMoDetailEditState();
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="success"
        title={successTitle}
        description={successDescription}
      />

      <InfoModel
        open={showFetchError}
        onClose={() => {
          setShowFetchError(false);
          clearMoDetailEditState();
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="error"
        title="ไม่พบรายงาน"
        description={fetchErrorMessage}
      />

      <InfoModel
        open={showEditLockedWarning}
        onClose={() => setShowEditLockedWarning(false)}
        variant="error"
        title="ไม่สามารถดำเนินการได้"
        description={editLockedMessage}
      />

      {/* ── Form — only mount after initial loading is done ── */}
      {!showPageLoading && (
        <MoUpdateForm
          reportData={reportData}
          selectedDivision={(props.item as any)?.division_name}
          onCancel={handleCancelEdit}
          onSaved={handleSavedEdit}
          submitRef={submitRef}
          isEditing={isEditing}
          onDirtyChange={setIsDirty}
          isDirty={isDirty}
          // Pass approval state down so MoUpdateForm can include it in save payloads
          externalApprovalStatus={approvalStatus}
          onApprovalStatusChange={setApprovalStatus}
          onReportNotFound={(message) => {
            setFetchErrorMessage(message);
            setShowFetchError(true);
          }}
          onRefreshData={async () => {
            if (!props.item?.id) return;
            try {
              await fetchReportById(props.item.id);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              if (err instanceof HttpError && err.status === 404) {
                clearMoDetailEditState();
                if (props.onCancel) return props.onCancel();
                return window.history.back();
              }
              throw err;
            }
          }}
        />
      )}

      {/* ── Workflow action buttons — only after initial loading ── */}
      {canShowApprovalActions && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: 0,
            }}
          >
            {/* อนุมัติรายงาน — hidden once already approved */}
            {canApproveStep && (
              <button
                type="button"
                className={`${styles["guts-approve-btn"]} ${styles["status-pill"]} ${getWorkflowStatusClass(
                  workflowDisplayStatus.tone,
                  styles,
                )}`}
                onClick={handleApprove}
              >
                อนุมัติรายงาน
              </button>
            )}

            {/* ส่งกลับแก้ไข — only current workflow owner can reject/send back */}
            <button
              type="button"
              className={styles["guts-reactive-btn"]}
              disabled={!canSendBack}
              style={
                !canSendBack
                  ? { opacity: 0.4, cursor: "not-allowed" }
                  : {}
              }
              onClick={handleSendBack}
            >
              ส่งกลับแก้ไข
            </button>
          </div>
        )}

      {!isEditing && (
        <div className={styles["mo-back-outer"]}>
          <button
            type="button"
            className={styles["mo-back-btn"]}
            onClick={() => {
              clearMoDetailEditState();
              if (props.onCancel) return props.onCancel();
              return window.history.back();
            }}
          >
            ย้อนกลับ
          </button>
        </div>
      )}
    </>
  );
}

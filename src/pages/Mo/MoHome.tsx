import styles from "./MoHome.module.css";
import { useState, useEffect, useMemo, useRef } from "react";

import { useStore } from "../../store/store";
import { type SectorReport } from "../../services/moReporTransaction.Service";
import {
  canAccessMoDashboard,
  canSeeFieldGroup,
  isReadOnly,
} from "../../utils/mo/positionAccess";
import MoReportPage from "./MoReportPage";
import MoListPage from "./MoListPage";
import MoFieldOnlyListPage from "./MoFieldOnlyListPage";
import MoAddNewPage from "./MoAddNewPage";
import MoConfigPage from "./MoConfigPage";
import MoDetailPage from "./MoDetailPage";
import MoFieldOnlyDetailPage from "./MoFieldOnlyDetailPage";
import { MoLoadingPopup, InfoModel } from "../../components/mo/popup";
import { ChevronRight, RefreshCw, Check, X } from "lucide-react";
import { FaHourglassHalf } from "react-icons/fa";
import NoDataMessage from "../../components/NoDataMessage";
import { FaHouse } from "react-icons/fa6";
import { LuLandmark } from "react-icons/lu";
import { usePositionReports } from "../../hooks/usePositionReports";
import {
  clearMoDetailState,
  clearMoDetailEditState,
  clearMoFieldListState,
  clearMoReportState,
  persistMoDetailState,
  readSavedMoDetailState,
  type MoDetailSource,
} from "./moPersistence";
import { useMoContext } from "../../context/MoContext";

type SubView =
  | "main"
  | "list"
  | "new"
  | "detail"
  | "update"
  | "dashboard"
  | "pdfviewer"
  | "report"
  | "config"
  | "add";

type Props = {
  onBackHome?: () => void;
  initialView?: "main" | "search"; // Initial section of the main view
};

type DetailSource = MoDetailSource;

const MO_SUBVIEW_KEY = "mo_subview";
const MO_REPORT_PARAMS_KEY = "mo_report_params";

const VALID_SUBVIEWS: SubView[] = [
  "main",
  "list",
  "new",
  "detail",
  "update",
  "dashboard",
  "pdfviewer",
  "report",
  "config",
  "add",
];

function readSavedSubView(): SubView | null {
  try {
    const saved = sessionStorage.getItem(MO_SUBVIEW_KEY) as SubView | null;
    if (saved && VALID_SUBVIEWS.includes(saved)) return saved;
  } catch {
    // sessionStorage unavailable — ignore
  }
  return null;
}

function persistSubView(v: SubView) {
  try {
    sessionStorage.setItem(MO_SUBVIEW_KEY, v);
  } catch {
    // ignore storage errors
  }
}

function clearPersistedSubView() {
  try {
    sessionStorage.removeItem(MO_SUBVIEW_KEY);
    sessionStorage.removeItem(MO_REPORT_PARAMS_KEY);
  } catch {
    // ignore
  }
  clearMoDetailState();
  clearMoDetailEditState();
  clearMoReportState();
}

function readSavedReportParams(): {
  deptId?: number;
  date?: string;
} {
  try {
    const raw = sessionStorage.getItem(MO_REPORT_PARAMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse / storage errors
  }
  return {};
}

function persistReportParams(deptId?: number, date?: string) {
  try {
    sessionStorage.setItem(
      MO_REPORT_PARAMS_KEY,
      JSON.stringify({ deptId, date }),
    );
  } catch {
    // ignore storage errors
  }
}

function getInitialSubView(initialView?: "main" | "search"): SubView {
  if (initialView === "search") return "report";

  const saved = readSavedSubView();
  if (!saved) return "main";

  if (saved === "detail" && !readSavedMoDetailState()) {
    return "main";
  }

  return saved;
}

export default function MoHome(props: Props) {
  const { resetListSearchDate, resetMoSearchDate } = useMoContext();
  const [subView, setSubViewState] = useState<SubView>(() =>
    getInitialSubView(props.initialView),
  );
  const savedDetailState = useMemo(() => readSavedMoDetailState(), []);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(
    savedDetailState?.itemId ?? null,
  );

  // Wrap the raw setState so every subview change is automatically
  // persisted for the current browser session.
  function setSubView(v: SubView) {
    setSubViewState(v);
    persistSubView(v);
  }

  useEffect(() => {
    resetMoSearchDate();
    if (subView === "main") {
      resetListSearchDate();
    }
  }, [resetListSearchDate, resetMoSearchDate, subView]);

  const [selectedItem, setSelectedItem] = useState<SectorReport | null>(null);
  const [detailSource, setDetailSource] = useState<DetailSource>(
    savedDetailState?.source ?? "main",
  );

  // Restore report params (deptId / date) if we came back into "report"
  // subview after a refresh.
  const savedReportParams = useMemo(() => readSavedReportParams(), []);

  const [reportInitialDeptId, setReportInitialDeptId] = useState<
    number | undefined
  >(subView === "report" ? savedReportParams.deptId : undefined);
  const [reportInitialDate, setReportInitialDate] = useState<
    string | undefined
  >(subView === "report" ? savedReportParams.date : undefined);

  const [showNotFoundError, setShowNotFoundError] = useState(false);
  const [notFoundErrorMessage, setNotFoundErrorMessage] = useState("");

  const currentEmployee = useStore((state) => state.authEmployee);
  const canSeeField = canSeeFieldGroup(currentEmployee);
  const { reports, isLoading, fetchWithPosition } = usePositionReports();
  const fetchReportById = useStore((s) => s.fetchReportById);
  const clearReports = useStore((s) => s.clearReports);
  const fetchAvailableReportDivisions = useStore(
    (s) => s.fetchAvailableReportDivisions,
  );
  // Local loading state with minimum 1.5-second display time
  const [showLoading, setShowLoading] = useState(true);
  const loadingStartRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_LOADING_MS = 1500;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Ensure loading popup shows for at least 1.5 seconds
  useEffect(() => {
    if (isLoading) {
      // Clear any pending hide timer
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      loadingStartRef.current = Date.now();
      setShowLoading(true);
    } else if (loadingStartRef.current > 0) {
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        loadingTimerRef.current = setTimeout(() => {
          setShowLoading(false);
          loadingTimerRef.current = null;
        }, remaining);
      } else {
        setShowLoading(false);
      }
      loadingStartRef.current = 0;
    }
  }, [isLoading]);

  // Field viewers fetch reports only from the field-list Search action.
  useEffect(() => {
    if (!canSeeField && currentEmployee?.department_id) {
      fetchWithPosition()
        .then((data) => {
          console.log("MoHome: Freshly fetched reports data:", data);
        })
        .catch((err) => {
          console.error("MoHome: Failed to fetch initial reports:", err);
        });
    }
  }, [canSeeField, currentEmployee?.department_id, fetchWithPosition]);

  useEffect(() => {
    if (subView !== "detail" || selectedItemId == null) return;

    const found = reports.find(
      (report) => Number(report.id) === Number(selectedItemId),
    );

    if (found) {
      if (selectedItem?.id !== found.id) {
        setSelectedItem(found);
      }
      return;
    }

    if (!isLoading && !showLoading) {
      clearMoDetailState();
      clearMoDetailEditState();
      setSelectedItem(null);
      setSelectedItemId(null);
      setSubView("main");
    }
  }, [reports, isLoading, selectedItem, selectedItemId, showLoading, subView]);

  const deptName = canSeeField
    ? currentEmployee?.field_name
    : currentEmployee?.department_name;

  const [availableDivisionCount, setAvailableDivisionCount] = useState(0);

  // Fetch active divisions that can still create today's report.
  function fetchDivisionCounts() {
    if (!currentEmployee?.department_id) return;
    fetchAvailableReportDivisions(currentEmployee.department_id).then(
      (divisions) => {
        setAvailableDivisionCount(divisions.length);
      },
    );
  }

  useEffect(() => {
    // Read-only users (position 3,4 or deactivated) don't need division counts
    if (!isReadOnly(currentEmployee?.position_id)) {
      fetchDivisionCounts();
    }
  }, [currentEmployee?.department_id, fetchAvailableReportDivisions]);

  // Refresh all main-view data (reports + division counts)
  function refreshMainView() {
    if (canSeeField || !currentEmployee?.department_id) return;
    fetchWithPosition();
    fetchDivisionCounts();
  }

  const noAvailableDivisions = availableDivisionCount === 0;

  const locationTable = useMemo(() => {
    if (!currentEmployee?.field_id && !currentEmployee?.department_id) return [];

    return (reports || []).map((report) => {
      const id = report.id || (report as any).mo_daily_transaction_id;
      return {
        id,
        department_id: report.department_id,
        department_name: report.department_name,
        division_name: report.division_name,
        workflow_status: report.workflow_status,
        approved_status: report.approved_status,
        created_by: report.created_by,
        report_date: report.report_date,
      };
    });
  }, [reports, currentEmployee?.department_id, currentEmployee?.field_id]);

  const getStatusMeta = (statusRaw?: string) => {
    const s = String(statusRaw ?? "").toLowerCase();
    if (s === "approved" || s === "ดำเนินการแล้ว")
      return {
        dotClass: styles["dot-approved"],
        icon: <Check size={16} strokeWidth={3} />,
        label: "อนุมัติเรียบร้อยแล้ว",
        badgeClass: styles["badge-approved"],
      };
    if (s === "rejected" || s === "reject" || s === "ถูกปฏิเสธ")
      return {
        dotClass: styles["dot-rejected"],
        icon: <X size={16} strokeWidth={3} />,
        label: "รอการดำเนินการแก้ไข",
        badgeClass: styles["badge-rejected"],
      };
    return {
      dotClass: styles["dot-pending"],
      icon: <FaHourglassHalf size={14} />,
      label: "รอผู้อำนวยการอนุมัติ",
      badgeClass: styles["badge-pending"],
    };
  };

  function openList() {
    clearMoDetailState();
    clearMoDetailEditState();
    setSubView("list");
  }

  function openNew() {
    clearMoDetailState();
    clearMoDetailEditState();
    setSubView("add");
  }

  function goBack() {
    if (subView === "add" || subView === "list") {
      setSubView("main");
      refreshMainView();
      return;
    }
    if (props.onBackHome) {
      clearPersistedSubView();
      props.onBackHome();
    } else {
      window.history.back();
    }
  }

  if (subView === "list") {
    const ListPage = canSeeField ? MoFieldOnlyListPage : MoListPage;

    return (
      <ListPage
        onCancel={() => {
          clearMoDetailState();
          clearMoDetailEditState();
          if (canSeeField) {
            clearMoFieldListState();
            clearReports();
          }
          setSubView("main");
          refreshMainView();
        }}
        onOpenDetail={(item) => {
          persistMoDetailState(item.id, "list");
          setSelectedItemId(item.id);
          setSelectedItem(item);
          setDetailSource("list");
          setSubView("detail");
        }}
        onOpenReport={(deptId, date) => {
          clearMoDetailState();
          clearMoReportState();
          setReportInitialDeptId(deptId);
          setReportInitialDate(date);
          persistReportParams(deptId, date);
          setSubView("report");
        }}
      />
    );
  }

  if (subView === "add") {
    return (
      <MoAddNewPage
        onCancel={() => {
          clearMoDetailState();
          clearMoDetailEditState();
          setSubView("main");
          refreshMainView();
        }}
      />
    );
  }

  if (subView === "report") {
    if (canSeeField) {
      return (
        <MoFieldOnlyDetailPage
          view="summary"
          departmentId={reportInitialDeptId}
          selectedDate={reportInitialDate}
          onCancel={() => {
            clearMoReportState();
            clearMoDetailEditState();
            setSubView("list");
          }}
        />
      );
    }

    return (
      <MoReportPage
        initialDeptId={reportInitialDeptId}
        initialDate={reportInitialDate}
        onCancel={() => {
          clearMoReportState();
          clearMoDetailEditState();
          setSubView("list");
        }}
      />
    );
  }

  if (subView === "detail") {
    if (!selectedItem) {
      return (
        <div className={styles["mo-home-page"]}>
          <MoLoadingPopup open message="กำลังโหลดข้อมูล..." />
        </div>
      );
    }

    const backToView =
      detailSource === "list"
        ? "list"
        : detailSource === "report"
          ? "report"
          : "main";
    if (canSeeField) {
      return (
        <MoFieldOnlyDetailPage
          view="sector"
          item={selectedItem}
          onCancel={() => {
            clearMoDetailState();
            clearMoDetailEditState();
            setSelectedItemId(null);
            setSelectedItem(null);
            setSubView(backToView);
            if (backToView === "main") {
              refreshMainView();
            }
          }}
        />
      );
    }

    return (
      <MoDetailPage
        item={selectedItem}
        onCancel={() => {
          clearMoDetailState();
          clearMoDetailEditState();
          setSelectedItemId(null);
          setSelectedItem(null);
          setSubView(backToView);
          if (backToView === "main" || backToView === "list") {
            refreshMainView();
          }
        }}
      />
    );
  }

  if (subView === "config") {
    return (
      <MoConfigPage
        onCancel={() => {
          clearMoDetailState();
          clearMoDetailEditState();
          setSubView("main");
          refreshMainView();
        }}
      />
    );
  }

  if (subView === "dashboard" && canAccessMoDashboard(currentEmployee)) {
    return (
      <div className={styles["mo-table-wrapper"]}>
        <h2>Dashboard View</h2>
        <p>Dashboard functionality coming soon...</p>
        <button onClick={() => setSubView("main")}>Go Back</button>
      </div>
    );
  }

  return (
    <div className={styles["mo-home-page"]}>
      {!canSeeField && (
        <>
          <div className={styles["mo-reload-box"]}>
        <button
          type="button"
          className={styles["mo-reload-btn"]}
          onClick={() => refreshMainView()}
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw size={15} className={styles["mo-reload-icon"]} />
        </button>
          </div>
          <div className={styles["mo-card-wrapper"]}>
        <div className={styles["mo-card-header"]}>
          <LuLandmark size={16} />
          <span>{deptName}</span>
        </div>

        {showLoading ? null : locationTable.length > 0 ? (
          <div className={styles["mo-card-list"]}>
            {locationTable.map((r) => {
              const { dotClass, icon, label, badgeClass } = getStatusMeta(
                r.approved_status,
              );

              return (
                <div
                  key={`${r.id}-${r.division_name}`}
                  className={styles["mo-card-item"]}
                  onClick={() => {
                    const found = reports.find(
                      (rep) =>
                        (rep.id || (rep as any).mo_daily_transaction_id) ===
                        r.id,
                    );

                    if (
                      found &&
                      (canSeeField ||
                        Number(found.department_id) ===
                          Number(currentEmployee?.department_id))
                    ) {
                      fetchReportById(found.id)
                        .then(() => {
                          persistMoDetailState(found.id, "main");
                          setSelectedItemId(found.id);
                          setSelectedItem(found);
                          setDetailSource("main");
                          setSubView("detail");
                        })
                        .catch((err: unknown) => {
                          const msg =
                            err instanceof Error ? err.message : String(err);
                          setNotFoundErrorMessage(msg);
                          setShowNotFoundError(true);
                        });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`${styles["status-icon"]} ${dotClass}`}>
                    {icon}
                  </div>

                  <div className={styles["mo-card-body"]}>
                    <span className={styles["mo-card-name"]}>
                      {canSeeField
                        ? [r.department_name, r.division_name]
                            .filter(Boolean)
                            .join(" | ") || "-"
                        : r.division_name || "-"}
                    </span>
                  </div>

                  <span className={`${styles["status-badge"]} ${badgeClass}`}>
                    {label}
                  </span>

                  <ChevronRight
                    size={16}
                    strokeWidth={2.8}
                    className={styles["mo-card-chevron"]}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <NoDataMessage />
        )}
          </div>

          {/* Read-only users (position 3,4) see the action, but cannot use it. */}
          <div className={styles["guts-mo-btn"]}>
            <button
              type="button"
              className={styles["mo-home-addnew"]}
              disabled={
                isReadOnly(currentEmployee?.position_id) ||
                noAvailableDivisions
              }
              onClick={() => {
                openNew();
              }}
            >
              {noAvailableDivisions
                ? "ไม่มีหน่วยงานที่สามารถบันทึกรายงานได้"
                : "บันทึกรายงานประจำวันวันนี้"}
            </button>
          </div>

          <MoLoadingPopup open={showLoading} />

          <InfoModel
            open={showNotFoundError}
            onClose={() => {
              setShowNotFoundError(false);
              refreshMainView();
            }}
            variant="error"
            title="ไม่พบรายงาน"
            description={notFoundErrorMessage}
          />
        </>
      )}
      <div className={styles["guts-mo-btn"]}>
        <button
          type="button"
          className={styles["mo-home-search"]}
          onClick={openList}
        >
          รายงานสถิติ
        </button>
      </div>

      <hr className={styles["mo-divider"]} />

      <div className={styles["mo-back-home-outer"]}>
        <button
          type="button"
          className={styles["mo-back-home"]}
          onClick={goBack}
        >
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}

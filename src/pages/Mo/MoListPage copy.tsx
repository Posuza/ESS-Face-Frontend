import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Search,
  ChevronRight,
  Home,
  MapPin,
  Landmark,
  Check,
  Clock3,
  X,
  Users,
  CalendarDays,
} from "lucide-react";
import styles from "./MoListPage.module.css";
import { useStore } from "../../store/store";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import {
  buildReportFilters,
  canSeeDepartmentGroup,
} from "../../utils/mo/positionAccess";
import { FaHourglassHalf } from "react-icons/fa";
import { MoLoadingPopup, InfoModel } from "../../components/mo/popup";
import NoDataMessage from "../../components/NoDataMessage";
import { useMoContext } from "../../context/MoContext";

const DEPARTMENT_NAMES: Record<number, string> = {
  4: "ฝ่ายปฎิบัติการภาค 1",
  6: "ฝ่ายปฎิบัติการภาค 3",
  9: "ฝ่ายปฎิบัติการภาค 9 (ทดสอบ)",
};

type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const THAI_DATE_LOCALE = "th-TH-u-ca-buddhist";
const THAI_WEEKDAY_LOCALE = "th-TH";

const thaiShortDatePartsFormatter = new Intl.DateTimeFormat(THAI_DATE_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const thaiMonthYearPartsFormatter = new Intl.DateTimeFormat(THAI_DATE_LOCALE, {
  month: "long",
  year: "numeric",
});

const thaiWeekdayShortFormatter = new Intl.DateTimeFormat(THAI_WEEKDAY_LOCALE, {
  weekday: "short",
});

function getIntlPart(
  formatter: Intl.DateTimeFormat,
  date: Date,
  type: Intl.DateTimeFormatPart["type"],
) {
  return (
    formatter.formatToParts(date).find((part) => part.type === type)?.value ??
    ""
  );
}

function normalizeThaiWeekdayShort(value: string) {
  return value.replace(/\.$/, "");
}

function getThaiWeekdaysShort() {
  const startDate = new Date();

  startDate.setHours(12, 0, 0, 0);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return normalizeThaiWeekdayShort(thaiWeekdayShortFormatter.format(date));
  });
}

const THAI_WEEKDAYS = getThaiWeekdaysShort();

function getTodayYYYYMMDD() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseYYYYMMDD(value: string) {
  if (!value) return undefined;

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}

function formatDateToYYYYMMDD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateThaiShort(value: string) {
  const date = parseYYYYMMDD(value);

  if (!date) return "เลือกวันที่";

  const day = getIntlPart(thaiShortDatePartsFormatter, date, "day");
  const month = getIntlPart(thaiShortDatePartsFormatter, date, "month");
  const year = getIntlPart(thaiShortDatePartsFormatter, date, "year");

  return `${day} ${month} ${year}`;
}

function getCalendarTitle(date: Date) {
  const month = getIntlPart(thaiMonthYearPartsFormatter, date, "month");
  const year = getIntlPart(thaiMonthYearPartsFormatter, date, "year");

  return `${month} ${year}`;
}

function getCalendarCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDate = new Date(year, month, 1);
  const firstDayIndex = firstDate.getDay();

  const currentMonthDays = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDayIndex + 1;

    if (dayNumber <= 0) {
      return {
        date: new Date(year, month - 1, previousMonthDays + dayNumber),
        isCurrentMonth: false,
      };
    }

    if (dayNumber > currentMonthDays) {
      return {
        date: new Date(year, month + 1, dayNumber - currentMonthDays),
        isCurrentMonth: false,
      };
    }

    return {
      date: new Date(year, month, dayNumber),
      isCurrentMonth: true,
    };
  });
}

type ReportListItem = SectorReport & {
  department?: string;
  create_at?: string;
  user_id?: string | number;
  wear_pants_count?: number | string;
  wear_shoes_count?: number | string;
};

type Props = {
  onCancel: () => void;
  onOpenDetail: (item: SectorReport) => void;
  onOpenReport?: (deptId: number, date: string) => void;
};

export default function MoListPage({
  onCancel,
  onOpenDetail,
  onOpenReport,
}: Props) {
  const authEmployee = useStore((s) => s.authEmployee);
  const empCode = authEmployee?.employee_code;
  const { listSearchDate, setListSearchDate, setMoSearchDate } =
    useMoContext();
  const [selectedDate, setSelectedDate] = useState(listSearchDate);

  const currentDept = useMemo<{ id: number; name: string } | null>(() => {
    if (authEmployee?.department_id && authEmployee?.department_name) {
      return {
        id: Number(authEmployee.department_id),
        name: authEmployee.department_name,
      };
    }
    return null;
  }, [authEmployee]);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  }, []);

  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    currentDept?.name ?? "",
  );

  const [showNotFoundError, setShowNotFoundError] = useState(false);
  const [notFoundErrorMessage, setNotFoundErrorMessage] = useState("");

  const reports = useStore((state) => state.reports);
  const currentEmployee = useStore((state) => state.authEmployee);
  const fetchReports = useStore((state) => state.fetchReports);
  const fetchReportById = useStore((state) => state.fetchReportById);
  const storeLoading = useStore((state) => state.isLoading);

  // Track last searched values — to highlight Search btn when values change
  const [lastSearchedDepartment, setLastSearchedDepartment] =
    useState(selectedDepartment);
  const [lastSearchedDate, setLastSearchedDate] = useState(selectedDate);
  const hasSearchChanged =
    selectedDepartment !== lastSearchedDepartment ||
    selectedDate !== lastSearchedDate;

  const canSeeDeptGroup = canSeeDepartmentGroup(currentEmployee?.position_id);
  const datePickerWrapRef = useRef<HTMLDivElement>(null);
  const [activeDatePicker, setActiveDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    return parseYYYYMMDD(getTodayYYYYMMDD()) ?? new Date();
  });

  // Loading popup — shows on mount and during search (min 1.5s)
  const [showLoading, setShowLoading] = useState(true);
  const pageLoadStartRef = useRef(0);
  const pageLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MIN_PAGE_LOAD_MS = 1500;

  // Cleanup timer on unmount
  useEffect(() => {
    pageLoadStartRef.current = Date.now();
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, []);

  // Track store loading — show popup while loading, hide after min 1.5s
  useEffect(() => {
    if (storeLoading) {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
      pageLoadStartRef.current = Date.now();
      setShowLoading(true);
    } else if (showLoading) {
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
  }, [storeLoading, showLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (datePickerWrapRef.current?.contains(target)) {
        return;
      }

      setActiveDatePicker(false);
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const calendarCells = useMemo(
    () => getCalendarCells(calendarMonth),
    [calendarMonth],
  );

  function updateMoSearchDate() {
    setListSearchDate(selectedDate);
    setMoSearchDate(selectedDate);
  }

  async function submitSearch() {
    if (!selectedDepartment && !selectedDate) return;

    let targetSectorId: number | undefined = undefined;
    if (selectedDepartment) {
      if (
        currentEmployee &&
        selectedDepartment === currentEmployee.department_name
      ) {
        targetSectorId = currentEmployee.department_id as number;
      } else {
        const deptPart = selectedDepartment.split("|")[0].trim();
        const match = deptPart.match(/(\d+)/);
        if (match) targetSectorId = Number(match[1]);
      }
    }

    const payload: Record<string, any> = {};

    if (currentEmployee) {
      const dateRange = selectedDate
        ? { start_date: selectedDate, end_date: selectedDate }
        : undefined;
      let employeeWithSelectedDept = currentEmployee;

      if (targetSectorId && targetSectorId !== currentEmployee.department_id) {
        employeeWithSelectedDept = {
          ...currentEmployee,
          department_id: targetSectorId,
        };
      }

      const filters = buildReportFilters(employeeWithSelectedDept, dateRange);
      Object.assign(payload, filters);
    }

    await fetchReports(payload);
    updateMoSearchDate();
    setLastSearchedDepartment(selectedDepartment);
    setLastSearchedDate(selectedDate);
  }

  function openDatePicker() {
    setCalendarMonth(parseYYYYMMDD(selectedDate) ?? new Date());
    setActiveDatePicker(true);
  }

  function handleSelectDate(dateText: string) {
    setSelectedDate(dateText);
    setCalendarMonth(parseYYYYMMDD(dateText) ?? new Date());
    setActiveDatePicker(false);
  }

  function goBack() {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  }

  function getDepartmentName(deptId: number): string {
    return DEPARTMENT_NAMES[deptId] ?? `ฝ่ายปฏิบัติการภาค ${deptId}`;
  }

  const employeeDepartments = useMemo(
    () =>
      currentEmployee?.department_name ? [currentEmployee.department_name] : [],
    [currentEmployee?.department_name],
  );

  const derivedDepartments = useMemo(() => {
    try {
      const rows = reports;
      const map: Record<string, Set<string>> = {};
      rows.forEach((r: any) => {
        const id = Number(r.department_id) || 0;
        const sub = (r.division_name ? String(r.division_name) : "").trim();
        if (!map[id]) map[id] = new Set();
        if (sub) map[id].add(sub);
      });
      return Object.keys(map).map((k) => ({
        id: Number(k),
        department: getDepartmentName(Number(k)),
        divisions: Array.from(map[k]),
      }));
    } catch (_e) {
      return [] as any;
    }
  }, [reports]);

  const mappedReports: ReportListItem[] = reports.map((r: SectorReport) => ({
    ...r,
    department:
      r.department_id === currentEmployee?.department_id &&
      currentEmployee?.department_name
        ? currentEmployee.department_name
        : getDepartmentName(r.department_id),
    create_at: r.created_at,
    user_id: r.created_by,
  }));

  const allSectorRecords = mappedReports;

  const uniqueDepartments = Array.from(
    new Set(allSectorRecords.map((r) => r.department).filter(Boolean)),
  ).sort() as string[];

  const locationOptions = useMemo(() => {
    const deptOnly = derivedDepartments.map((d: any) => d.department);
    if (empCode) {
      if (employeeDepartments.length > 0) return employeeDepartments;
      return deptOnly.length > 0 ? deptOnly : uniqueDepartments;
    }
    return deptOnly.length > 0 ? deptOnly : uniqueDepartments;
  }, [empCode, employeeDepartments, derivedDepartments, uniqueDepartments]);

  const selectedSectorName =
    selectedDepartment || currentEmployee?.department_name || "";

  const filteredData = useMemo(() => {
    if (selectedSectorName) {
      return allSectorRecords.filter(
        (r) => r.department === selectedSectorName,
      );
    }
    return allSectorRecords;
  }, [allSectorRecords, selectedSectorName]);

  const displayRecords = filteredData;

  useEffect(() => {
    if (!currentDept?.id) return;
    setCalendarMonth(parseYYYYMMDD(selectedDate) ?? new Date());
    setMoSearchDate(selectedDate);
    if (currentEmployee) {
      const filters = buildReportFilters(currentEmployee, {
        start_date: selectedDate,
        end_date: selectedDate,
      });
      fetchReports(filters);
      setLastSearchedDepartment(currentDept.name);
      setLastSearchedDate(selectedDate);
    }
  }, [currentDept]);

  function getStatusMeta(statusRaw?: string) {
    const s = String(statusRaw ?? "").toLowerCase();
    if (s === "approved")
      return {
        dotClass: styles["dot-approved"],
        icon: <Check size={16} strokeWidth={3} />,
        label: "อนุมัติเรียบร้อยแล้ว",
        badgeClass: styles["badge-approved"],
      };
    if (s === "rejected" || s === "reject")
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
  }

  function renderNoData() {
    return (
      <div
        style={{
          background: "white",
          borderRadius: "4px 4px 8px 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <NoDataMessage />
      </div>
    );
  }

  return (
    <>
      <MoLoadingPopup open={showLoading} />

      <InfoModel
        open={showNotFoundError}
        onClose={() => {
          setShowNotFoundError(false);
          // Re-fetch search results since the data is stale
          if (lastSearchedDepartment || lastSearchedDate) {
            submitSearch();
          }
        }}
        variant="error"
        title="ไม่พบรายงาน"
        description={notFoundErrorMessage}
      />

      {/* Search bar — always visible */}
      <div className={styles["mo-search"]}>
        <label className={styles["search-field-group"]}>
          <span className={styles["search-label"]}>ภาค</span>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className={styles["guts-mo-search-input"]}
          >
            {(empCode ? employeeDepartments : locationOptions).map(
              (option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ),
            )}
          </select>
        </label>

        <label className={styles["search-field-group"]}>
          <span className={styles["search-label"]}>จากวันที่</span>
          <div className={styles["date-picker-wrap"]} ref={datePickerWrapRef}>
            <button
              type="button"
              className={styles["date-control"]}
              onClick={openDatePicker}
              aria-label="เลือกวันที่"
            >
              <span className={styles["control-icon"]}>
                <CalendarDays size={14} strokeWidth={2.5} />
              </span>

              <span className={styles["date-display"]}>
                {formatDateThaiShort(selectedDate)}
              </span>
            </button>

            {activeDatePicker && (
              <div className={styles["date-popover"]}>
                <div className={styles["calendar-box"]}>
                  <div className={styles["calendar-header"]}>
                    <button
                      type="button"
                      className={styles["calendar-nav-button"]}
                      onClick={() =>
                        setCalendarMonth(
                          (prev) =>
                            new Date(
                              prev.getFullYear(),
                              prev.getMonth() - 1,
                              1,
                            ),
                        )
                      }
                      aria-label="เดือนก่อนหน้า"
                    >
                      ‹
                    </button>

                    <strong className={styles["calendar-title"]}>
                      {getCalendarTitle(calendarMonth)}
                    </strong>

                    <button
                      type="button"
                      className={styles["calendar-nav-button"]}
                      onClick={() =>
                        setCalendarMonth(
                          (prev) =>
                            new Date(
                              prev.getFullYear(),
                              prev.getMonth() + 1,
                              1,
                            ),
                        )
                      }
                      aria-label="เดือนถัดไป"
                    >
                      ›
                    </button>
                  </div>

                  <div className={styles["calendar-weekdays"]}>
                    {THAI_WEEKDAYS.map((weekday) => (
                      <span
                        key={weekday}
                        className={styles["calendar-weekday"]}
                      >
                        {weekday}
                      </span>
                    ))}
                  </div>

                  <div className={styles["calendar-grid"]}>
                    {calendarCells.map((cell) => {
                      const cellValue = formatDateToYYYYMMDD(cell.date);
                      const isSelected = cellValue === selectedDate;
                      const isToday = cellValue === getTodayYYYYMMDD();

                      return (
                        <button
                          key={cellValue}
                          type="button"
                          className={`${styles["calendar-cell"]} ${
                            cell.isCurrentMonth
                              ? styles["calendar-cell-current"]
                              : styles["calendar-cell-other"]
                          } ${isSelected ? styles["calendar-cell-selected"] : ""} ${
                            isToday ? styles["calendar-cell-today"] : ""
                          }`}
                          onClick={() => handleSelectDate(cellValue)}
                        >
                          {cell.date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </label>

        <button
          className={`${styles["mo-search-clear"]} ${hasSearchChanged ? styles["mo-search-clear-highlighted"] : ""}`}
          aria-label="ค้นหา"
          onClick={submitSearch}
          type="button"
          disabled={!selectedDepartment && !selectedDate}
        >
          <Search size={15} strokeWidth={2.6} />
        </button>
      </div>

      {!showLoading && (
        <>
          {/* ========== DEPARTMENT GROUP — position 1 & 5 only ========== */}
          {canSeeDeptGroup && (
            <div className={styles["section-group"]}>
              <div className={styles["department-section-header"]}>
                <div className={styles["section-header-left"]}>
                  <Landmark size={16} className={styles["section-icon"]} />
                  <span>ภาคบันทึก</span>
                </div>
                {selectedDate && (
                  <span className={styles["section-date"]}>
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "th-TH",
                    )}
                  </span>
                )}
              </div>

              {(() => {
                const groupMap: Record<string, any[]> = {};
                displayRecords.forEach((r: any) => {
                  const deptName =
                    r.departmentName ??
                    getDepartmentName(Number(r.department_id));
                  if (!groupMap[deptName]) groupMap[deptName] = [];
                  groupMap[deptName].push(r);
                });

                const entries = Object.entries(groupMap);
                if (entries.length === 0) {
                  return renderNoData();
                }

                return entries.map(([deptName, items], deptIdx) => {
                  const deptId = Number(items[0]?.department_id);
                  const approvedCnt = items.filter(
                    (it) => it.approved_status?.toLowerCase() === "approved",
                  ).length;
                  const pendingCnt = items.filter(
                    (it) => it.approved_status?.toLowerCase() === "pending",
                  ).length;
                  const rejectedCnt = items.filter(
                    (it) =>
                      it.approved_status?.toLowerCase() === "rejected" ||
                      it.approved_status?.toLowerCase() === "reject",
                  ).length;

                  return (
                    <div key={deptName} className={styles["dept-group-card"]}>
                      <div
                        className={`${styles["dept-card"]} ${expandedKey === "dept-" + deptName ? styles["dept-card-expanded"] : ""}`}
                        onClick={() => toggleExpand("dept-" + deptName)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            toggleExpand("dept-" + deptName);
                        }}
                      >
                        <div className={styles["dept-card-header-body"]}>
                          <div className={styles["dept-card-title"]}>
                            {deptIdx + 1}. {deptName}
                          </div>

                          {expandedKey !== "dept-" + deptName && (
                            <div className={styles["dept-card-chips"]}>
                              <span className={styles["header-chip"]}>
                                <span
                                  className={`${styles["chip-dot"]} ${styles["chip-dot-approved"]}`}
                                >
                                  <Check size={12} />
                                </span>
                                {approvedCnt}
                              </span>
                              <span className={styles["header-chip"]}>
                                <span
                                  className={`${styles["chip-dot"]} ${styles["chip-dot-pending"]}`}
                                >
                                  <FaHourglassHalf size={12} />
                                </span>
                                {pendingCnt}
                              </span>
                              <span className={styles["header-chip"]}>
                                <span
                                  className={`${styles["chip-dot"]} ${styles["chip-dot-rejected"]}`}
                                >
                                  <X size={12} />
                                </span>
                                {rejectedCnt}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          className={styles["dept-card-btn"]}
                          aria-label="Open department"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReport?.(deptId, selectedDate);
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      {expandedKey === "dept-" + deptName && (
                        <div className={styles["dept-card-body"]}>
                          {[
                            {
                              key: "approved",
                              label: "อนุมัติเรียบร้อยแล้ว",
                              count: approvedCnt,
                              cls: styles["chip-approved"],
                            },
                            {
                              key: "pending",
                              label: "รอผู้อำนวยการอนุมัติ",
                              count: pendingCnt,
                              cls: styles["chip-pending"],
                            },
                            {
                              key: "rejected",
                              label: "รอการดำเนินการแก้ไข",
                              count: rejectedCnt,
                              cls: styles["chip-rejected"],
                            },
                          ].map((s) => (
                            <div
                              key={s.key}
                              className={styles["dept-item-row"]}
                            >
                              <span
                                className={`${styles["dept-item-name"]} ${s.cls}`}
                              >
                                {s.label}
                              </span>
                              <span className={styles["detail-value"]}>
                                {s.count} รายการ
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* ========== DIVISION GROUP ========== */}
          <div className={styles["section-group"]}>
            <div className={styles["division-section-header"]}>
              <div className={styles["section-header-left"]}>
                <MapPin size={16} className={styles["section-icon"]} />
                <span>เขตบันทึก</span>
                <span className={styles["section-count"]}>
                  {displayRecords.length} รายการ
                </span>
              </div>
              {selectedDate && (
                <span className={styles["section-date"]}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "th-TH",
                  )}
                </span>
              )}
            </div>

            {displayRecords.length === 0
              ? renderNoData()
              : displayRecords.map((r: any, idx: number) => {
                  const key = r.id ?? r.user_id ?? idx;
                  const subZone = r.division_name ?? "";
                  const itemKey = String(key) + "-sub";
                  const isExpanded = expandedKey === itemKey;

                  const sumByPrefix = (prefix: string) =>
                    Object.keys(r)
                      .filter((k) => k.startsWith(prefix))
                      .reduce((acc, k) => acc + (Number(r[k]) || 0), 0);
                  const itemLeaveTotal = sumByPrefix("leave_");
                  const itemShiftTotal = sumByPrefix("shift_");
                  const itemDeptTotal = sumByPrefix("dept_");
                  const itemTrainingTotal = sumByPrefix("training_");
                  const itemProjectCount = (r.projects || []).length;
                  const itemGuardPostMovementCount = (
                    r.guard_post_movements || []
                  ).length;
                  const itemDisciplineCount = (r.disciplines || []).filter(
                    (d: any) => Number(d.value) > 0,
                  ).length;

                  const { dotClass, icon, badgeClass, label } = getStatusMeta(
                    r.approved_status,
                  );

                  return (
                    <div key={itemKey} className={styles["report-card"]}>
                      <div
                        className={`${styles["card-header"]} ${isExpanded ? styles["card-header-expanded"] : ""}`}
                        onClick={() => toggleExpand(itemKey)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className={`${styles["status-dot"]} ${dotClass}`}>
                          {icon}
                        </div>
                        <div className={styles["card-body"]}>
                          <div className={styles["card-key"]}>{idx + 1}.</div>
                          <div className={styles["card-title"]}>
                            {subZone || "-"}
                          </div>
                        </div>
                        <div className={styles["card-actions"]}>
                          <button
                            type="button"
                            className={styles["card-detail-btn"]}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Verify report still exists before navigating
                              fetchReportById(r.id)
                                .then(() => {
                                  onOpenDetail(r);
                                })
                                .catch((err: unknown) => {
                                  const msg =
                                    err instanceof Error
                                      ? err.message
                                      : String(err);
                                  setNotFoundErrorMessage(msg);
                                  // Close loading popup first, then show error
                                  if (pageLoadTimerRef.current)
                                    clearTimeout(pageLoadTimerRef.current);
                                  setShowLoading(false);
                                  setTimeout(() => {
                                    setShowNotFoundError(true);
                                  }, 150);
                                });
                            }}
                            aria-label="ดูรายละเอียด"
                            title="ดูรายละเอียด"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles["card-details"]}>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>ลา</span>
                            <span className={styles["detail-value"]}>
                              {itemLeaveTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>เวร</span>
                            <span className={styles["detail-value"]}>
                              {itemShiftTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              กำลังพล
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemDeptTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>อบรม</span>
                            <span className={styles["detail-value"]}>
                              {itemTrainingTotal} คน
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              โครงการ
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemProjectCount} โครงการ
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              เปลี่ยนแปลงจุด
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemGuardPostMovementCount} รายการ
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              วินัย
                            </span>
                            <span className={styles["detail-value"]}>
                              {itemDisciplineCount} รายการ
                            </span>
                          </div>
                          <div className={styles["detail-row"]}>
                            <span className={styles["detail-label"]}>
                              สถานะ
                            </span>
                            <span
                              className={`${styles["status-badge"]} ${badgeClass}`}
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        </>
      )}

      {/* Back button */}
      <div className={styles["mo-back-outer"]}>
        <button
          type="button"
          className={styles["mo-back-btn"]}
          onClick={goBack}
        >
          ย้อนกลับ
        </button>
      </div>
    </>
  );
}

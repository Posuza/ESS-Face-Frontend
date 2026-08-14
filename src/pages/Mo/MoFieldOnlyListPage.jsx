import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronRight, Search, X } from "lucide-react";
import { FaHourglassHalf } from "react-icons/fa";
import { InfoModel, MoLoadingPopup } from "../../components/mo/popup";
import NoDataMessage from "../../components/NoDataMessage";
import { useMoContext } from "../../context/MoContext";
import { divisionService } from "../../services/division.Service";
import { useStore } from "../../store/store";
import { buildReportFilters } from "../../utils/mo/positionAccess";
import {
  persistMoFieldListState,
  readSavedMoFieldListState,
} from "./moPersistence";
import fieldStyles from "./MoFieldOnlyListPage.module.css";
import sharedStyles from "./MoListPage.module.css";

const DEPARTMENT_NAMES = {
  4: "ฝ่ายปฎิบัติการภาค 1",
  6: "ฝ่ายปฎิบัติการภาค 3",
  9: "ฝ่ายปฎิบัติการภาค 9 (ทดสอบ)",
};

const THAI_DATE_LOCALE = "th-TH-u-ca-buddhist";
const THAI_WEEKDAY_LOCALE = "th-TH";
const thaiShortDatePartsFormatter = new Intl.DateTimeFormat(THAI_DATE_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const thaiMonthYearPartsFormatter = new Intl.DateTimeFormat(
  THAI_DATE_LOCALE,
  { month: "long", year: "numeric" },
);
const thaiWeekdayShortFormatter = new Intl.DateTimeFormat(
  THAI_WEEKDAY_LOCALE,
  { weekday: "short" },
);

function getIntlPart(formatter, date, type) {
  return (
    formatter.formatToParts(date).find((part) => part.type === type)?.value ??
    ""
  );
}

function getThaiWeekdaysShort() {
  const startDate = new Date();
  startDate.setHours(12, 0, 0, 0);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return thaiWeekdayShortFormatter.format(date).replace(/\.$/, "");
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

function parseYYYYMMDD(value) {
  if (!value) return undefined;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateToYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateThaiShort(value) {
  const date = parseYYYYMMDD(value);
  if (!date) return "เลือกวันที่";
  const day = getIntlPart(thaiShortDatePartsFormatter, date, "day");
  const month = getIntlPart(thaiShortDatePartsFormatter, date, "month");
  const year = getIntlPart(thaiShortDatePartsFormatter, date, "year");
  return `${day} ${month} ${year}`;
}

function getCalendarTitle(date) {
  const month = getIntlPart(thaiMonthYearPartsFormatter, date, "month");
  const year = getIntlPart(thaiMonthYearPartsFormatter, date, "year");
  return `${month} ${year}`;
}

function getCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
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
    return { date: new Date(year, month, dayNumber), isCurrentMonth: true };
  });
}

function getDepartmentName(departmentId) {
  return (
    DEPARTMENT_NAMES[departmentId] ?? `ฝ่ายปฏิบัติการภาค ${departmentId}`
  );
}

function getStatusMeta(statusRaw) {
  const status = String(statusRaw ?? "").toLowerCase();
  if (status === "approved") {
    return {
      dotClass: sharedStyles["dot-approved"],
      icon: <Check size={16} strokeWidth={3} />,
      label: "อนุมัติเรียบร้อยแล้ว",
      badgeClass: sharedStyles["badge-approved"],
    };
  }
  if (status === "rejected" || status === "reject") {
    return {
      dotClass: sharedStyles["dot-rejected"],
      icon: <X size={16} strokeWidth={3} />,
      label: "รอการดำเนินการแก้ไข",
      badgeClass: sharedStyles["badge-rejected"],
    };
  }
  return {
    dotClass: sharedStyles["dot-pending"],
    icon: <FaHourglassHalf size={14} />,
    label: "รอผู้อำนวยการอนุมัติ",
    badgeClass: sharedStyles["badge-pending"],
  };
}

function NoResults() {
  return (
    <div className={fieldStyles["no-results"]}>
      <NoDataMessage />
    </div>
  );
}

export default function MoFieldOnlyListPage({
  onCancel,
  onOpenDetail,
  onOpenReport = undefined,
}) {
  const currentEmployee = useStore((state) => state.authEmployee);
  const reports = useStore((state) => state.reports);
  const fetchReports = useStore((state) => state.fetchReports);
  const fetchReportById = useStore((state) => state.fetchReportById);
  const storeLoading = useStore((state) => state.isLoading);
  const { listSearchDate, setListSearchDate, setMoSearchDate } = useMoContext();

  const savedListState = useMemo(() => readSavedMoFieldListState(), []);

  const [selectedDate, setSelectedDate] = useState(
    savedListState?.selectedDate || listSearchDate,
  );
  const [selectedDepartment, setSelectedDepartment] = useState(
    savedListState?.selectedDepartment || "",
  );
  const [selectedDivision, setSelectedDivision] = useState(
    savedListState?.selectedDivision || "",
  );
  const [lastSearchedDepartment, setLastSearchedDepartment] = useState(
    savedListState?.lastSearchedDepartment || "",
  );
  const [lastSearchedDivision, setLastSearchedDivision] = useState(
    savedListState?.lastSearchedDivision || "",
  );
  const [lastSearchedDate, setLastSearchedDate] = useState(
    savedListState?.lastSearchedDate ||
      savedListState?.selectedDate ||
      listSearchDate,
  );
  const [fieldDepartments, setFieldDepartments] = useState([]);
  const [fieldDivisions, setFieldDivisions] = useState([]);
  const [expandedDepartments, setExpandedDepartments] = useState(new Set());
  const [expandedReport, setExpandedReport] = useState(null);
  const [showNotFoundError, setShowNotFoundError] = useState(false);
  const [notFoundErrorMessage, setNotFoundErrorMessage] = useState("");

  const datePickerWrapRef = useRef(null);
  const [activeDatePicker, setActiveDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    () => parseYYYYMMDD(getTodayYYYYMMDD()) ?? new Date(),
  );

  const [showLoading, setShowLoading] = useState(true);
  const pageLoadStartRef = useRef(Date.now());
  const pageLoadTimerRef = useRef(null);
  const hasSearchChanged =
    selectedDepartment !== lastSearchedDepartment ||
    selectedDivision !== lastSearchedDivision ||
    selectedDate !== lastSearchedDate;

  useEffect(() => {
    persistMoFieldListState({
      selectedDepartment,
      selectedDivision,
      selectedDate,
      lastSearchedDepartment,
      lastSearchedDivision,
      lastSearchedDate,
    });
  }, [
    lastSearchedDate,
    lastSearchedDepartment,
    lastSearchedDivision,
    selectedDate,
    selectedDepartment,
    selectedDivision,
  ]);

  useEffect(() => {
    return () => {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (storeLoading) {
      if (pageLoadTimerRef.current) clearTimeout(pageLoadTimerRef.current);
      pageLoadStartRef.current = Date.now();
      setShowLoading(true);
      return;
    }
    if (!showLoading) return;

    const remaining = 1500 - (Date.now() - pageLoadStartRef.current);
    if (remaining > 0) {
      pageLoadTimerRef.current = setTimeout(() => setShowLoading(false), remaining);
    } else {
      setShowLoading(false);
    }
  }, [showLoading, storeLoading]);

  useEffect(() => {
    const fieldId = currentEmployee?.field_id;
    if (fieldId == null) {
      setFieldDepartments([]);
      return;
    }

    let cancelled = false;
    divisionService
      .getDepartmentsByField(fieldId)
      .then((departments) => {
        if (!cancelled) setFieldDepartments(departments);
      })
      .catch((error) => {
        if (cancelled) return;
        setNotFoundErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
        setShowNotFoundError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentEmployee?.field_id]);

  useEffect(() => {
    if (!selectedDepartment) {
      setFieldDivisions([]);
      return;
    }
    const departmentId = fieldDepartments.find(
      (department) => department.department_name === selectedDepartment,
    )?.department_id;
    if (departmentId == null) {
      setFieldDivisions([]);
      return;
    }

    let cancelled = false;
    divisionService
      .getByDepartment(departmentId, currentEmployee?.field_id ?? undefined)
      .then((divisions) => {
        if (!cancelled) setFieldDivisions(divisions);
      })
      .catch((error) => {
        if (cancelled) return;
        setNotFoundErrorMessage(
          error instanceof Error ? error.message : String(error),
        );
        setShowNotFoundError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentEmployee?.field_id, fieldDepartments, selectedDepartment]);

  useEffect(() => {
    setExpandedDepartments(new Set());
    setExpandedReport(null);
  }, [selectedDepartment]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!datePickerWrapRef.current?.contains(event.target)) {
        setActiveDatePicker(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setActiveDatePicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const calendarCells = useMemo(
    () => getCalendarCells(calendarMonth),
    [calendarMonth],
  );
  const departmentOptions = useMemo(
    () => fieldDepartments.map((department) => department.department_name),
    [fieldDepartments],
  );
  const divisionOptions = useMemo(
    () => fieldDivisions.map((division) => division.division_name),
    [fieldDivisions],
  );

  const mappedReports = useMemo(
    () =>
      reports.map((report) => ({
        ...report,
        department:
          report.department_name || getDepartmentName(report.department_id),
      })),
    [reports],
  );
  const displayRecords = useMemo(() => {
    if (!lastSearchedDepartment) return [];
    return mappedReports.filter(
      (report) =>
        report.department === lastSearchedDepartment &&
        (!lastSearchedDivision ||
          report.division_name === lastSearchedDivision),
    );
  }, [lastSearchedDepartment, lastSearchedDivision, mappedReports]);

  const groupedRecords = useMemo(
    () =>
      displayRecords.reduce((groups, report) => {
        const department = report.department || "-";
        if (!groups[department]) groups[department] = [];
        groups[department].push(report);
        return groups;
      }, {}),
    [displayRecords],
  );

  const toggleDepartment = useCallback((key) => {
    setExpandedDepartments((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  async function submitSearch() {
    if (!selectedDepartment || !selectedDate || !currentEmployee) return;
    const departmentId = fieldDepartments.find(
      (department) => department.department_name === selectedDepartment,
    )?.department_id;
    if (departmentId == null) return;

    const filters = buildReportFilters(currentEmployee, {
      start_date: selectedDate,
      end_date: selectedDate,
    });
    filters.department_id = departmentId;

    if (selectedDivision) {
      const divisionId = fieldDivisions.find(
        (division) =>
          division.department_id === departmentId &&
          division.division_name === selectedDivision,
      )?.division_id;
      if (divisionId != null) filters.division_id = divisionId;
    }

    try {
      await fetchReports(filters);
      setListSearchDate(selectedDate);
      setMoSearchDate(selectedDate);
      setLastSearchedDepartment(selectedDepartment);
      setLastSearchedDivision(selectedDivision);
      setLastSearchedDate(selectedDate);
      setExpandedDepartments(new Set());
      setExpandedReport(null);
    } catch (error) {
      setNotFoundErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
      setShowNotFoundError(true);
    }
  }

  function openDatePicker() {
    setCalendarMonth(parseYYYYMMDD(selectedDate) ?? new Date());
    setActiveDatePicker(true);
  }

  function handleSelectDate(dateText) {
    setSelectedDate(dateText);
    setCalendarMonth(parseYYYYMMDD(dateText) ?? new Date());
    setActiveDatePicker(false);
  }

  async function openDetail(report) {
    try {
      await fetchReportById(report.id);
      onOpenDetail(report);
    } catch (error) {
      setNotFoundErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
      setShowNotFoundError(true);
    }
  }

  return (
    <>
      <MoLoadingPopup open={showLoading} />
      <InfoModel
        open={showNotFoundError}
        onClose={() => setShowNotFoundError(false)}
        variant="error"
        title="ไม่พบรายงาน"
        description={notFoundErrorMessage}
      />

      <div className={fieldStyles["field-scope-search"]}>
        <label className={sharedStyles["search-field-group"]}>
          <span className={sharedStyles["search-label"]}>ภาค</span>
          <select
            value={selectedDepartment}
            onChange={(event) => {
              setSelectedDepartment(event.target.value);
              setSelectedDivision("");
            }}
            className={sharedStyles["guts-mo-search-input"]}
          >
            <option value="">โปรดเลือก</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>

        <label className={sharedStyles["search-field-group"]}>
          <span className={sharedStyles["search-label"]}>เขต</span>
          <select
            value={selectedDivision}
            onChange={(event) => setSelectedDivision(event.target.value)}
            className={sharedStyles["guts-mo-search-input"]}
            disabled={!selectedDepartment}
          >
            <option value="">โปรดเลือก</option>
            {divisionOptions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </label>

        <label className={sharedStyles["search-field-group"]}>
          <span className={sharedStyles["search-label"]}>กรุณาระบุวัน</span>
          <div
            className={sharedStyles["date-picker-wrap"]}
            ref={datePickerWrapRef}
          >
            <button
              type="button"
              className={sharedStyles["date-control"]}
              onClick={openDatePicker}
              aria-label="เลือกวันที่"
            >
              <span className={sharedStyles["control-icon"]}>
                <CalendarDays size={14} strokeWidth={2.5} />
              </span>
              <span className={sharedStyles["date-display"]}>
                {formatDateThaiShort(selectedDate)}
              </span>
            </button>

            {activeDatePicker && (
              <div
                className={`${sharedStyles["date-popover"]} ${fieldStyles["field-date-popover"]}`}
              >
                <div className={sharedStyles["calendar-box"]}>
                  <div className={sharedStyles["calendar-header"]}>
                    <button
                      type="button"
                      className={sharedStyles["calendar-nav-button"]}
                      onClick={() =>
                        setCalendarMonth(
                          (previous) =>
                            new Date(
                              previous.getFullYear(),
                              previous.getMonth() - 1,
                              1,
                            ),
                        )
                      }
                      aria-label="เดือนก่อนหน้า"
                    >
                      ‹
                    </button>
                    <strong className={sharedStyles["calendar-title"]}>
                      {getCalendarTitle(calendarMonth)}
                    </strong>
                    <button
                      type="button"
                      className={sharedStyles["calendar-nav-button"]}
                      onClick={() =>
                        setCalendarMonth(
                          (previous) =>
                            new Date(
                              previous.getFullYear(),
                              previous.getMonth() + 1,
                              1,
                            ),
                        )
                      }
                      aria-label="เดือนถัดไป"
                    >
                      ›
                    </button>
                  </div>
                  <div className={sharedStyles["calendar-weekdays"]}>
                    {THAI_WEEKDAYS.map((weekday) => (
                      <span
                        key={weekday}
                        className={sharedStyles["calendar-weekday"]}
                      >
                        {weekday}
                      </span>
                    ))}
                  </div>
                  <div className={sharedStyles["calendar-grid"]}>
                    {calendarCells.map((cell) => {
                      const cellValue = formatDateToYYYYMMDD(cell.date);
                      const isSelected = cellValue === selectedDate;
                      const isToday = cellValue === getTodayYYYYMMDD();
                      return (
                        <button
                          key={cellValue}
                          type="button"
                          className={`${sharedStyles["calendar-cell"]} ${
                            cell.isCurrentMonth
                              ? sharedStyles["calendar-cell-current"]
                              : sharedStyles["calendar-cell-other"]
                          } ${
                            isSelected
                              ? sharedStyles["calendar-cell-selected"]
                              : ""
                          } ${
                            isToday ? sharedStyles["calendar-cell-today"] : ""
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
          type="button"
          className={`${sharedStyles["mo-search-clear"]} ${fieldStyles["field-search-button"]} ${
            hasSearchChanged
              ? sharedStyles["mo-search-clear-highlighted"]
              : ""
          }`}
          onClick={submitSearch}
          disabled={!selectedDepartment || !selectedDate}
          aria-label="ค้นหา"
        >
          <Search size={15} strokeWidth={2.6} />
          <span>ค้นหา</span>
        </button>
      </div>

      {!showLoading && (
        <div className={fieldStyles["field-results"]}>
          <div className={fieldStyles["field-results-label"]}>
            รายการรายงาน:
          </div>
          {displayRecords.length === 0 ? (
            <NoResults />
          ) : (
            Object.entries(groupedRecords).map(
              ([department, items], departmentIndex) => {
                const departmentId = Number(items[0]?.department_id);
                const groupKey = `field-${department}`;
                const isDepartmentExpanded = expandedDepartments.has(groupKey);
                const divisionRows = (
                  <div
                    className={`${fieldStyles["field-division-list"]} ${
                      lastSearchedDivision
                        ? fieldStyles["field-division-list-selected"]
                        : ""
                    }`}
                  >
                    {items.map((report, reportIndex) => {
                      const reportKey = `field-report-${report.id}`;
                      const isReportExpanded = expandedReport === reportKey;
                      const sumByPrefix = (prefix) =>
                        Object.keys(report)
                          .filter((key) => key.startsWith(prefix))
                          .reduce(
                            (total, key) => total + (Number(report[key]) || 0),
                            0,
                          );
                      const { dotClass, icon, badgeClass, label } =
                        getStatusMeta(report.approved_status);

                      return (
                        <div
                          key={report.id}
                          className={fieldStyles["field-division-card"]}
                        >
                          <div
                            className={fieldStyles["field-division-row"]}
                            onClick={() =>
                              setExpandedReport((current) =>
                                current === reportKey ? null : reportKey,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                setExpandedReport((current) =>
                                  current === reportKey ? null : reportKey,
                                );
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={isReportExpanded}
                          >
                            <span
                              className={`${sharedStyles["status-dot"]} ${dotClass}`}
                            >
                              {icon}
                            </span>
                            <span
                              className={fieldStyles["field-division-name"]}
                            >
                              {reportIndex + 1}. {report.division_name || "-"}
                            </span>
                            <button
                              type="button"
                              className={fieldStyles["field-division-detail"]}
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetail(report);
                              }}
                              aria-label={`ดูรายละเอียด ${report.division_name || "เขต"}`}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>

                          {isReportExpanded && (
                            <div className={sharedStyles["card-details"]}>
                              {[
                                ["ลา", `${sumByPrefix("leave_")} คน`],
                                ["เวร", `${sumByPrefix("shift_")} คน`],
                                ["กำลังพล", `${sumByPrefix("dept_")} คน`],
                                ["อบรม", `${sumByPrefix("training_")} คน`],
                                [
                                  "โครงการ",
                                  `${(report.projects || []).length} โครงการ`,
                                ],
                                [
                                  "เปลี่ยนแปลงจุด",
                                  `${(report.guard_post_movements || []).length} รายการ`,
                                ],
                                [
                                  "วินัย",
                                  `${(report.disciplines || []).filter(
                                    (discipline) => Number(discipline.value) > 0,
                                  ).length} รายการ`,
                                ],
                              ].map(([detailLabel, value]) => (
                                <div
                                  key={detailLabel}
                                  className={sharedStyles["detail-row"]}
                                >
                                  <span
                                    className={sharedStyles["detail-label"]}
                                  >
                                    {detailLabel}
                                  </span>
                                  <span
                                    className={sharedStyles["detail-value"]}
                                  >
                                    {value}
                                  </span>
                                </div>
                              ))}
                              <div className={sharedStyles["detail-row"]}>
                                <span className={sharedStyles["detail-label"]}>
                                  สถานะ
                                </span>
                                <span
                                  className={`${sharedStyles["status-badge"]} ${badgeClass}`}
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
                );

                if (lastSearchedDivision) return divisionRows;

                return (
                  <div
                    key={department}
                    className={fieldStyles["field-department-group"]}
                  >
                    <div
                      className={fieldStyles["field-department-row"]}
                      onClick={() => toggleDepartment(groupKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          toggleDepartment(groupKey);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isDepartmentExpanded}
                    >
                      <span className={fieldStyles["field-department-title"]}>
                        <span>{departmentIndex + 1}.</span>
                        <span>{department}</span>
                      </span>
                      <span
                        className={fieldStyles["field-department-actions"]}
                      >
                        {!isDepartmentExpanded && (
                          <span className={fieldStyles["field-count-badge"]}>
                            {items.length} รายการ
                          </span>
                        )}
                        <button
                          type="button"
                          className={fieldStyles["field-department-action"]}
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenReport?.(departmentId, lastSearchedDate);
                          }}
                          aria-label={`เปิดรายงาน ${department}`}
                        >
                          <ChevronRight size={19} />
                        </button>
                      </span>
                    </div>
                    {isDepartmentExpanded && divisionRows}
                  </div>
                );
              },
            )
          )}
        </div>
      )}

      <div className={sharedStyles["mo-back-outer"]}>
        <button
          type="button"
          className={sharedStyles["mo-back-btn"]}
          onClick={onCancel}
        >
          ย้อนกลับ
        </button>
      </div>
    </>
  );
}

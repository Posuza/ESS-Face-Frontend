import React, { useState, useMemo, useCallback } from "react";
import "./TableSearchSection.css";
import caseData from "../../../temp_data/case.json";
import { ConfirmDeleteDialog } from "../popup";
import {
  Check,
  X,
  Edit,
  Trash2,
  Search,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ── Types ── */
type SortDir = "asc" | "desc";
type SortKey =
  | "mo_daily_transaction_id"
  | "department_id"
  | "approved_status"
  | "created_at"
  | "manpower"
  | "leave"
  | "uniform"
  | "rules";

interface CaseRow {
  mo_daily_transaction_id: number;
  department_id: number;
  leave_sick_count: number;
  leave_business_count: number;
  leave_other_count: number;
  absent_count: number;
  shift_18_count: number;
  shift_24_count: number;
  shift_36_count: number;
  rule_sleep_count: number;
  rule_use_phone_count: number;
  rule_no_card_count: number;
  warning: string;
  wear_hat_count: number;
  wear_shirt_count: number;
  wear_pant_count: number;
  wear_shoe_count: number;
  other_job: string;
  other_job_count: number;
  other_training: string;
  other_training_count: number;
  approved_status: string;
  approved_remark: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  [key: string]: unknown;
}

/* ── Helpers ── */
const departmentMap: Record<number, string> = {
  1: "ภาค 1",
  2: "ภาค 2",
  3: "ภาค 3",
  4: "ภาค 4",
  5: "ภาค 5",
  6: "ภาค 6",
  7: "ภาค 7",
  8: "ภาค 8",
  9: "ภาค 9",
  10: "ภาค 10",
};

function getDeptName(id: number): string {
  return departmentMap[id] ?? `ภาค ${id}`;
}

function getLeaveTotal(r: CaseRow): number {
  return (
    (r.leave_sick_count || 0) +
    (r.leave_business_count || 0) +
    (r.leave_other_count || 0) +
    (r.absent_count || 0)
  );
}

function getManpower(r: CaseRow): number {
  return (
    (r.shift_18_count || 0) + (r.shift_24_count || 0) + (r.shift_36_count || 0)
  );
}

function getUniform(r: CaseRow): number {
  return (
    (r.wear_hat_count || 0) +
    (r.wear_shirt_count || 0) +
    (r.wear_pant_count || 0) +
    (r.wear_shoe_count || 0)
  );
}

function getRules(r: CaseRow): number {
  return (
    (r.rule_sleep_count || 0) +
    (r.rule_use_phone_count || 0) +
    (r.rule_no_card_count || 0)
  );
}

function statusLabel(s: string): string {
  if (s === "APPROVED") return "อนุมัติ";
  if (s === "REJECTED") return "ไม่อนุมัติ";
  return "รออนุมัติ";
}

function statusClass(s: string): string {
  if (s === "APPROVED") return "ts-status--approved";
  if (s === "REJECTED") return "ts-status--rejected";
  return "ts-status--pending";
}

function statusIcon(s: string): string {
  if (s === "APPROVED") return "✓";
  if (s === "REJECTED") return "✕";
  return "◷";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr.replace(" ", "T"));
    return d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ── SVGs for bulk actions matching OrdersTable.jsx exactly ── */
const IconBulkSelectOff = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    height="18px"
    width="18px"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 8v-2a2 2 0 0 1 2 -2h2" />
    <path d="M4 16v2a2 2 0 0 0 2 2h2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2" />
    <path d="M16 20h2a2 2 0 0 0 2 -2v-2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconBulkSelectOn = () => (
  <svg
    stroke="currentColor"
    fill="none"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
    height="18px"
    width="18px"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconBulkDelete = ({ disabled }: { disabled: boolean }) => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    viewBox="0 0 24 24"
    height="22px"
    width="22px"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      color: disabled ? "#cbd5e1" : "#dc2626",
      transition: "color 0.15s ease",
    }}
  >
    <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z" />
  </svg>
);

/* ══════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════ */
export default function TableSearch() {
  // ── Local records state for CRUD ──
  const [records, setRecords] = useState<CaseRow[]>(
    () => caseData as CaseRow[],
  );

  // ── Bulk selection state ──
  const [showBulkSelect, setShowBulkSelect] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // ── Filter state ──
  const [filterDept, setFilterDept] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");

  // ── Sort state ──
  const [sortKey, setSortKey] = useState<SortKey>("mo_daily_transaction_id");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);

  // ── Interactive Hover Highlight state ──
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);

  // ── CRUD states (Edit Modal & Delete Dialog) ──
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CaseRow | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<CaseRow | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<CaseRow | null>(null);

  // ── Unique values from records state ──
  const uniqueDepts = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.department_id))).sort(
      (a, b) => a - b,
    );
  }, [records]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.approved_status))).sort();
  }, [records]);

  // ── Computed: filtered data ──
  const filteredData = useMemo(() => {
    let data = [...records];

    if (filterDept) {
      data = data.filter((r) => String(r.department_id) === filterDept);
    }
    if (filterStatus) {
      data = data.filter((r) => r.approved_status === filterStatus);
    }
    if (filterDateFrom) {
      data = data.filter((r) => {
        const d = r.created_at?.split(" ")[0];
        return d && d >= filterDateFrom;
      });
    }
    if (filterDateTo) {
      data = data.filter((r) => {
        const d = r.created_at?.split(" ")[0];
        return d && d <= filterDateTo;
      });
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      data = data.filter(
        (r) =>
          String(r.mo_daily_transaction_id).includes(q) ||
          getDeptName(r.department_id).toLowerCase().includes(q) ||
          (r.created_by || "").toLowerCase().includes(q) ||
          (r.warning || "").toLowerCase().includes(q) ||
          (r.other_job || "").toLowerCase().includes(q),
      );
    }

    return data;
  }, [
    records,
    filterDept,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    searchText,
  ]);

  // ── Computed: sorted data ──
  const sortedData = useMemo(() => {
    const data = [...filteredData];
    data.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      switch (sortKey) {
        case "mo_daily_transaction_id":
          va = a.mo_daily_transaction_id;
          vb = b.mo_daily_transaction_id;
          break;
        case "department_id":
          va = a.department_id;
          vb = b.department_id;
          break;
        case "approved_status":
          va = a.approved_status;
          vb = b.approved_status;
          break;
        case "created_at":
          va = a.created_at || "";
          vb = b.created_at || "";
          break;
        case "manpower":
          va = getManpower(a);
          vb = getManpower(b);
          break;
        case "leave":
          va = getLeaveTotal(a);
          vb = getLeaveTotal(b);
          break;
        case "uniform":
          va = getUniform(a);
          vb = getUniform(b);
          break;
        case "rules":
          va = getRules(a);
          vb = getRules(b);
          break;
      }

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return data;
  }, [filteredData, sortKey, sortDir]);

  // ── Pagination calculations ──
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, totalItems);
  const pageData = sortedData.slice(startIdx, endIdx);

  // ── Pagination helper matching OrdersTable.jsx ──
  const generatePaginationNumbers = useCallback(() => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safePage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (safePage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", safePage, "...", totalPages);
      }
    }
    return pages;
  }, [safePage, totalPages]);

  // ── Sorting Handlers ──
  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setCurrentPage(1);
    },
    [sortKey],
  );

  const clearFilters = useCallback(() => {
    setFilterDept("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchText("");
    setCurrentPage(1);
  }, []);

  const goPage = useCallback(
    (p: number) => {
      setCurrentPage(Math.max(1, Math.min(p, totalPages)));
    },
    [totalPages],
  );

  const handlePerPage = useCallback((val: number) => {
    setPerPage(val);
    setCurrentPage(1);
  }, []);

  // ── Row Actions ──
  const handleToggleApprove = useCallback(
    (id: number, currentStatus: string) => {
      let nextStatus = "APPROVED";
      if (currentStatus === "APPROVED") {
        nextStatus = "REJECTED";
      } else if (currentStatus === "REJECTED") {
        nextStatus = "APPROVED";
      } else {
        nextStatus = "APPROVED";
      }

      setRecords((prev) =>
        prev.map((r) =>
          r.mo_daily_transaction_id === id
            ? {
                ...r,
                approved_status: nextStatus,
                approved_at: new Date()
                  .toISOString()
                  .replace("T", " ")
                  .substring(0, 19),
              }
            : r,
        ),
      );
    },
    [],
  );

  const handleEditClick = useCallback((record: CaseRow) => {
    setEditingRecord({ ...record });
    setIsEditModalOpen(true);
  }, []);

  const handleViewClick = useCallback((record: CaseRow) => {
    setViewingRecord(record);
    setIsViewModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRecord) return;

      setRecords((prev) =>
        prev.map((r) =>
          r.mo_daily_transaction_id === editingRecord.mo_daily_transaction_id
            ? editingRecord
            : r,
        ),
      );
      setIsEditModalOpen(false);
      setEditingRecord(null);
    },
    [editingRecord],
  );

  const handleDeleteClick = useCallback((record: CaseRow) => {
    setRecordToDelete(record);
    setIsDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (recordToDelete) {
      // Single delete
      setRecords((prev) =>
        prev.filter(
          (r) =>
            r.mo_daily_transaction_id !==
            recordToDelete.mo_daily_transaction_id,
        ),
      );
      setRecordToDelete(null);
    } else if (selectedIds.length > 0) {
      // Bulk delete
      setRecords((prev) =>
        prev.filter((r) => !selectedIds.includes(r.mo_daily_transaction_id)),
      );
      setSelectedIds([]);
      setShowBulkSelect(false);
    }
    setIsDeleteOpen(false);
  }, [recordToDelete, selectedIds]);

  // Sort arrow helper
  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  const sortAria = (key: SortKey): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  };

  const hasFilters =
    filterDept ||
    filterStatus ||
    filterDateFrom ||
    filterDateTo ||
    searchText.trim();

  return (
    <div className="mo-tablesearch">
      {/* ── Filter Bar ── */}
      <div className="ts-filter-bar">
        <div className="ts-filter-group">
          <label htmlFor="ts-search">ค้นหา:</label>
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <input
              id="ts-search"
              type="text"
              className="ts-filter-input"
              placeholder="รหัส, ภาค, ผู้สร้าง..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "160px", paddingLeft: "30px" }}
            />
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                color: "rgba(27,43,74,0.4)",
              }}
            />
          </div>
        </div>

        <div className="ts-filter-group">
          <label htmlFor="ts-dept">ภาค:</label>
          <select
            id="ts-dept"
            className="ts-filter-select"
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">ทั้งหมด</option>
            {uniqueDepts.map((d) => (
              <option key={d} value={String(d)}>
                {getDeptName(d)}
              </option>
            ))}
          </select>
        </div>

        <div className="ts-filter-group">
          <label htmlFor="ts-status">สถานะอนุมัติ:</label>
          <select
            id="ts-status"
            className="ts-filter-select"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">ทั้งหมด</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="ts-filter-group">
          <label htmlFor="ts-from">จากวันสร้าง:</label>
          <input
            id="ts-from"
            type="date"
            className="ts-filter-input"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="ts-filter-group">
          <label htmlFor="ts-to">ถึงวันสร้าง:</label>
          <input
            id="ts-to"
            type="date"
            className="ts-filter-input"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            className="ts-filter-btn ts-clear-btn"
            onClick={clearFilters}
          >
            <RotateCcw size={13} />
            ล้างตัวกรอง
          </button>
        )}

        <div className="ts-filter-spacer" />
        <span className="ts-result-count">
          พบ <strong>{totalItems.toLocaleString()}</strong> รายการ
        </span>
      </div>

      {/* ── Table Wrapper ── */}
      <div className="ts-table-wrap">
        <div className="ts-scroll">
          {pageData.length === 0 ? (
            <div className="ts-empty">
              <div className="ts-empty-icon">📋</div>
              <div className="ts-empty-text">ไม่พบข้อมูลรายงาน MO</div>
              <div className="ts-empty-sub">
                ลองปรับเปลี่ยนตัวกรองค้นหาอีกครั้ง
              </div>
            </div>
          ) : (
            <table className="ts-table">
              <thead>
                <tr>
                  <th
                    className="sticky-left text-center"
                    style={{ minWidth: "60px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <button
                        type="button"
                        className="ts-bulk-toggle-btn"
                        onClick={() => {
                          setShowBulkSelect((prev) => !prev);
                          setSelectedIds([]);
                        }}
                        title={
                          showBulkSelect
                            ? "ปิดการเลือกทีละหลายรายการ"
                            : "เปิดการเลือกทีละหลายรายการ"
                        }
                      >
                        {showBulkSelect ? (
                          <IconBulkSelectOn />
                        ) : (
                          <IconBulkSelectOff />
                        )}
                      </button>
                      {showBulkSelect && (
                        <input
                          type="checkbox"
                          className="ts-bulk-checkbox"
                          checked={
                            pageData.length > 0 &&
                            pageData.every((r) =>
                              selectedIds.includes(r.mo_daily_transaction_id),
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const pageIds = pageData.map(
                                (r) => r.mo_daily_transaction_id,
                              );
                              setSelectedIds((prev) =>
                                Array.from(new Set([...prev, ...pageIds])),
                              );
                            } else {
                              const pageIds = pageData.map(
                                (r) => r.mo_daily_transaction_id,
                              );
                              setSelectedIds((prev) =>
                                prev.filter((id) => !pageIds.includes(id)),
                              );
                            }
                          }}
                          aria-label="เลือกทั้งหมดในหน้านี้"
                        />
                      )}
                    </div>
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 1 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("department_id")}
                    onClick={() => handleSort("department_id")}
                    onMouseEnter={() => setHoveredColIndex(1)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    ภาค{" "}
                    <span className="ts-sort-icon">
                      {sortArrow("department_id")}
                    </span>
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 2 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("manpower")}
                    onClick={() => handleSort("manpower")}
                    onMouseEnter={() => setHoveredColIndex(2)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    กำลังพล{" "}
                    <span className="ts-sort-icon">
                      {sortArrow("manpower")}
                    </span>
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 3 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("leave")}
                    onClick={() => handleSort("leave")}
                    onMouseEnter={() => setHoveredColIndex(3)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    การลา{" "}
                    <span className="ts-sort-icon">{sortArrow("leave")}</span>
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 4 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("uniform")}
                    onClick={() => handleSort("uniform")}
                    onMouseEnter={() => setHoveredColIndex(4)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    แต่งกายผิดระเบียบ{" "}
                    <span className="ts-sort-icon">{sortArrow("uniform")}</span>
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 5 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("rules")}
                    onClick={() => handleSort("rules")}
                    onMouseEnter={() => setHoveredColIndex(5)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    ผิดข้อปฏิบัติ{" "}
                    <span className="ts-sort-icon">{sortArrow("rules")}</span>
                  </th>

                  <th
                    className={hoveredColIndex === 6 ? "ts-col-hovered" : ""}
                    onMouseEnter={() => setHoveredColIndex(6)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    หมายเหตุ/ข้อร้องเรียน
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 7 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("approved_status")}
                    onClick={() => handleSort("approved_status")}
                    onMouseEnter={() => setHoveredColIndex(7)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    สถานะ{" "}
                    <span className="ts-sort-icon">
                      {sortArrow("approved_status")}
                    </span>
                  </th>

                  <th
                    className={`ts-sortable ${hoveredColIndex === 8 ? "ts-col-hovered" : ""}`}
                    aria-sort={sortAria("created_at")}
                    onClick={() => handleSort("created_at")}
                    onMouseEnter={() => setHoveredColIndex(8)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    วันที่สร้าง{" "}
                    <span className="ts-sort-icon">
                      {sortArrow("created_at")}
                    </span>
                  </th>

                  <th
                    className={hoveredColIndex === 9 ? "ts-col-hovered" : ""}
                    onMouseEnter={() => setHoveredColIndex(9)}
                    onMouseLeave={() => setHoveredColIndex(null)}
                  >
                    ผู้สร้างรายงาน
                  </th>

                  <th
                    className="text-center ts-actions-header"
                    style={{ minWidth: "120px" }}
                  >
                    {showBulkSelect ? (
                      <button
                        type="button"
                        className="ts-bulk-delete-btn"
                        disabled={selectedIds.length === 0}
                        onClick={() => setIsDeleteOpen(true)}
                        title="ลบรายการที่เลือกทั้งหมด"
                      >
                        <IconBulkDelete disabled={selectedIds.length === 0} />
                      </button>
                    ) : (
                      "การจัดการ"
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => {
                  const manpower = getManpower(row);
                  const leave = getLeaveTotal(row);
                  const uniform = getUniform(row);
                  const rules = getRules(row);

                  return (
                    <tr key={row.mo_daily_transaction_id}>
                      <td className="sticky-left ts-num font-bold">
                        {showBulkSelect ? (
                          <input
                            type="checkbox"
                            className="ts-bulk-checkbox"
                            checked={selectedIds.includes(
                              row.mo_daily_transaction_id,
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [
                                  ...prev,
                                  row.mo_daily_transaction_id,
                                ]);
                              } else {
                                setSelectedIds((prev) =>
                                  prev.filter(
                                    (id) => id !== row.mo_daily_transaction_id,
                                  ),
                                );
                              }
                            }}
                          />
                        ) : (
                          row.mo_daily_transaction_id
                        )}
                      </td>

                      <td
                        className={
                          hoveredColIndex === 1 ? "ts-col-hovered" : ""
                        }
                        onMouseEnter={() => setHoveredColIndex(1)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {getDeptName(row.department_id)}
                      </td>

                      <td
                        className={`ts-num ${hoveredColIndex === 2 ? "ts-col-hovered" : ""}`}
                        onMouseEnter={() => setHoveredColIndex(2)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {manpower}
                      </td>

                      <td
                        className={`ts-num ${hoveredColIndex === 3 ? "ts-col-hovered" : ""}`}
                        onMouseEnter={() => setHoveredColIndex(3)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {leave}
                      </td>

                      <td
                        className={`ts-num ${hoveredColIndex === 4 ? "ts-col-hovered" : ""}`}
                        onMouseEnter={() => setHoveredColIndex(4)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {uniform}
                      </td>

                      <td
                        className={`ts-num ${hoveredColIndex === 5 ? "ts-col-hovered" : ""}`}
                        onMouseEnter={() => setHoveredColIndex(5)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {rules}
                      </td>

                      <td
                        title={row.warning || row.other_job || "-"}
                        className={
                          hoveredColIndex === 6 ? "ts-col-hovered" : ""
                        }
                        onMouseEnter={() => setHoveredColIndex(6)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {(() => {
                          const note = row.warning || row.other_job || "-";
                          return note.length > 20
                            ? note.slice(0, 20) + "…"
                            : note;
                        })()}
                      </td>

                      <td
                        className={
                          hoveredColIndex === 7 ? "ts-col-hovered" : ""
                        }
                        onMouseEnter={() => setHoveredColIndex(7)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        <span
                          className={`ts-status ${statusClass(row.approved_status)}`}
                        >
                          {statusIcon(row.approved_status)}{" "}
                          {statusLabel(row.approved_status)}
                        </span>
                      </td>

                      <td
                        className={
                          hoveredColIndex === 8 ? "ts-col-hovered" : ""
                        }
                        onMouseEnter={() => setHoveredColIndex(8)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        <div>{formatDate(row.created_at)}</div>
                        <div
                          style={{
                            fontSize: "10.5px",
                            opacity: 0.6,
                            fontWeight: 700,
                          }}
                        >
                          {formatTime(row.created_at)}
                        </div>
                      </td>

                      <td
                        className={
                          hoveredColIndex === 9 ? "ts-col-hovered" : ""
                        }
                        onMouseEnter={() => setHoveredColIndex(9)}
                        onMouseLeave={() => setHoveredColIndex(null)}
                      >
                        {row.created_by || "-"}
                      </td>

                      <td className="ts-actions-col">
                        <div className="ts-actions-container">
                          <button
                            type="button"
                            className="ts-action-btn ts-btn-view"
                            title="ดูรายงาน"
                            onClick={() => handleViewClick(row)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="ts-action-btn ts-btn-edit"
                            title="แก้ไขรายงาน"
                            onClick={() => handleEditClick(row)}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="ts-action-btn ts-btn-delete"
                            title="ลบรายงาน"
                            onClick={() => handleDeleteClick(row)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination (Aligned with OrdersTable.jsx) ── */}
        {totalItems > 0 && (
          <div className="ts-pagination">
            <div className="ts-per-page">
              <span className="ts-hidden-mobile">แสดง:</span>
              <select
                value={perPage}
                onChange={(e) => handlePerPage(Number(e.target.value))}
              >
                {[5, 10, 20, 50, 100].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <span className="ts-hidden-mobile">รายการต่อหน้า</span>
            </div>

            {totalPages > 1 && (
              <div className="ts-page-controls">
                {safePage > 1 && (
                  <button
                    className="ts-page-btn"
                    onClick={() => goPage(safePage - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                )}

                {generatePaginationNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={`e${i}`} className="ts-page-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`ts-page-btn ${p === safePage ? "ts-page-active" : ""}`}
                      onClick={() => goPage(p as number)}
                    >
                      {p}
                    </button>
                  ),
                )}

                {safePage < totalPages && (
                  <button
                    className="ts-page-btn"
                    onClick={() => goPage(safePage + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {isEditModalOpen && editingRecord && (
        <div
          className="ts-modal-overlay"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div className="ts-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ts-modal-header">
              <h3 className="ts-modal-title">
                📝 แก้ไขรายงาน MO #{editingRecord.mo_daily_transaction_id}
              </h3>
              <button
                className="ts-modal-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="ts-modal-body">
              {/* Section 1: Manpower and Leave */}
              <div className="ts-form-section">
                <div className="ts-form-section-title">👥 กำลังพลและการลา</div>
                <div className="ts-grid-3">
                  <div className="ts-form-group">
                    <label>เวร 18 ชม. (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.shift_18_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          shift_18_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>เวร 24 ชม. (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.shift_24_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          shift_24_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>เวร 36 ชม. (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.shift_36_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          shift_36_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ลาป่วย (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.leave_sick_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          leave_sick_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ลากิจ (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.leave_business_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          leave_business_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ลาอื่นๆ (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.leave_other_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          leave_other_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ขาดงาน (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.absent_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          absent_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Rule violations and Clothing */}
              <div className="ts-form-section">
                <div className="ts-form-section-title">
                  👔 ระเบียบและการแต่งกาย
                </div>
                <div className="ts-grid-3">
                  <div className="ts-form-group">
                    <label>ไม่สวมหมวก (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.wear_hat_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          wear_hat_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ไม่สวมเสื้อเวร (นาย)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.wear_shirt_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          wear_shirt_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>กางเกงไม่เรียบร้อย</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.wear_pant_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          wear_pant_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>รองเท้าผิดระเบียบ</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.wear_shoe_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          wear_shoe_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>แอบหลับ (ครั้ง)</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.rule_sleep_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          rule_sleep_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ใช้โทรศัพท์เวลางาน</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.rule_use_phone_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          rule_use_phone_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                  <div className="ts-form-group">
                    <label>ไม่พกบัตรเจ้าหน้าที่</label>
                    <input
                      type="number"
                      className="ts-form-input"
                      value={editingRecord.rule_no_card_count}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          rule_no_card_count: Number(e.target.value),
                        })
                      }
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Text Notes and Status */}
              <div className="ts-form-section">
                <div className="ts-form-section-title">
                  📂 รายละเอียดเพิ่มเติมและสถานะ
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div className="ts-form-group">
                    <label>ภาคสังกัด</label>
                    <select
                      className="ts-form-select"
                      value={editingRecord.department_id}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          department_id: Number(e.target.value),
                        })
                      }
                    >
                      {Object.entries(departmentMap).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ts-form-group">
                    <label>สถานะอนุมัติ</label>
                    <select
                      className="ts-form-select"
                      value={editingRecord.approved_status}
                      onChange={(e) =>
                        setEditingRecord({
                          ...editingRecord,
                          approved_status: e.target.value,
                        })
                      }
                    >
                      <option value="PENDING">รออนุมัติ</option>
                      <option value="APPROVED">อนุมัติ</option>
                      <option value="REJECTED">ไม่อนุมัติ</option>
                    </select>
                  </div>
                </div>
                <div className="ts-form-group" style={{ marginBottom: "12px" }}>
                  <label>ตักเตือน/ข้อร้องเรียน</label>
                  <input
                    type="text"
                    className="ts-form-input"
                    value={editingRecord.warning || ""}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        warning: e.target.value,
                      })
                    }
                    placeholder="รายละเอียดข้อความตักเตือน..."
                  />
                </div>
                <div className="ts-form-group">
                  <label>งานอื่นๆ ที่ได้รับมอบหมาย</label>
                  <input
                    type="text"
                    className="ts-form-input"
                    value={editingRecord.other_job || ""}
                    onChange={(e) =>
                      setEditingRecord({
                        ...editingRecord,
                        other_job: e.target.value,
                      })
                    }
                    placeholder="รายละเอียดงานอื่นๆ..."
                  />
                </div>
              </div>

              <div className="ts-modal-footer">
                <button
                  type="button"
                  className="ts-btn ts-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="ts-btn ts-btn-primary">
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal (read-only) ── */}
      {isViewModalOpen && viewingRecord && (
        <div
          className="ts-modal-overlay"
          onClick={() => setIsViewModalOpen(false)}
        >
          <div className="ts-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ts-modal-header">
              <h3 className="ts-modal-title">
                🔍 ดูรายงาน MO #{viewingRecord.mo_daily_transaction_id}
              </h3>
              <button
                className="ts-modal-close"
                onClick={() => setIsViewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="ts-modal-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <strong>ภาค:</strong>{" "}
                  {getDeptName(viewingRecord.department_id)}
                </div>
                <div>
                  <strong>วันที่สร้าง:</strong>{" "}
                  {formatDate(viewingRecord.created_at)}{" "}
                  {formatTime(viewingRecord.created_at)}
                </div>
                <div>
                  <strong>สถานะ:</strong>{" "}
                  <span
                    className={`ts-status ${statusClass(viewingRecord.approved_status)}`}
                  >
                    {statusIcon(viewingRecord.approved_status)}{" "}
                    {statusLabel(viewingRecord.approved_status)}
                  </span>
                </div>
                <div>
                  <strong>ผู้สร้าง:</strong> {viewingRecord.created_by || "-"}
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>หมายเหตุ:</strong>
                <div style={{ marginTop: 6 }}>
                  {viewingRecord.warning || viewingRecord.other_job || "-"}
                </div>
              </div>
            </div>

            <div className="ts-modal-footer">
              <button
                className="ts-btn ts-btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDeleteDialog
        open={isDeleteOpen}
        title={
          recordToDelete
            ? "🗑 ยืนยันลบรายงาน MO"
            : "🗑 ยืนยันลบรายงาน MO แบบกลุ่ม"
        }
        description={
          recordToDelete ? (
            <span>
              คุณแน่ใจหรือไม่ว่าต้องการลบรายงาน MO รหัส{" "}
              <strong>#{recordToDelete.mo_daily_transaction_id}</strong> ของ{" "}
              <strong>{getDeptName(recordToDelete.department_id)}</strong>{" "}
              ใช่หรือไม่?
              <br />
              <span
                style={{
                  color: "var(--red, #c00000)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                * การกระทำนี้ไม่สามารถย้อนกลับได้
              </span>
            </span>
          ) : (
            <span>
              คุณแน่ใจหรือไม่ว่าต้องการลบรายงาน MO ที่เลือกทั้งหมดจำนวน{" "}
              <strong>{selectedIds.length}</strong> รายการใช่หรือไม่?
              <br />
              <span
                style={{
                  color: "var(--red, #c00000)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                * การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบข้อมูลที่เลือกออกถาวร
              </span>
            </span>
          )
        }
        onCancel={() => {
          setIsDeleteOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

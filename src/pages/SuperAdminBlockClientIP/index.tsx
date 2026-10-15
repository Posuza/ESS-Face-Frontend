import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Ban, Clock3, Lock, Plus, Search, ShieldBan, Trash2, Unlock, X } from "lucide-react";

import PermissionErrorModal from "@/components/registeration/auth/popup/PermissionErrorModal";
import { adminService } from "@/services/admin.service";
import { useAppStore } from "@/store";
import type { BlockedClientIp } from "@/types/api";

import styles from "./SuperAdminBlockClientIP.module.css";

type StatusFilter = "all" | "blocked" | "released";
type PendingAction =
  | { type: "unblock"; entry: BlockedClientIp }
  | { type: "delete"; entry: BlockedClientIp }
  | null;

const PAGE_SIZE = 10;
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function remainingTime(seconds: number) {
  if (seconds <= 0) return "สิ้นสุดแล้ว";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `เหลือ ${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `เหลือ ${hours} ชม. ${remainder} นาที` : `เหลือ ${hours} ชม.`;
}

function attemptLevel(failureCount: number) {
  if (failureCount >= 7) return styles.attemptCritical;
  if (failureCount >= 4) return styles.attemptHigh;
  if (failureCount >= 1) return styles.attemptMedium;
  return styles.attemptLow;
}

export default function SuperAdminBlockClientIP() {
  const session = useAppStore((state) => state.adminSession);
  const adminCode = session?.employee_code ?? "";
  const [entries, setEntries] = useState<BlockedClientIp[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [busyIp, setBusyIp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("15");
  const [blockReason, setBlockReason] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadEntries = useCallback(async () => {
    if (!adminCode) return;
    setError("");
    try {
      setEntries(await adminService.listBlockedClientIps(adminCode));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดรายการ IP ไม่สำเร็จ");
    }
  }, [adminCode]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const counts = useMemo(() => {
    const blocked = entries.filter((entry) => entry.is_blocked).length;
    return { blocked, released: entries.length - blocked };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesSearch = !query || entry.ip_address.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all"
        || (statusFilter === "blocked" && entry.is_blocked)
        || (statusFilter === "released" && !entry.is_blocked);
      return matchesSearch && matchesStatus;
    });
  }, [entries, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredEntries]);

  useEffect(() => setPage(1), [search, statusFilter]);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);

  function openBlockForm(entry?: BlockedClientIp) {
    setIpAddress(entry?.ip_address ?? "");
    setDurationMinutes("15");
    setBlockReason(entry?.reason ?? "");
    setShowBlockForm(true);
  }

  async function submitBlock(event: FormEvent) {
    event.preventDefault();
    const duration = Number(durationMinutes);
    if (!ipAddress.trim() || blockReason.trim().length < 2 || !Number.isInteger(duration) || duration < 1 || duration > 1440) {
      setError("กรุณาระบุ IP, เหตุผล และระยะเวลา 1-1,440 นาที");
      return;
    }
    setBusyIp(ipAddress.trim());
    setError("");
    try {
      await adminService.blockClientIp(adminCode, {
        ip_address: ipAddress.trim(),
        duration_minutes: duration,
        reason: blockReason.trim(),
      });
      setShowBlockForm(false);
      setNotice("บล็อก IP เรียบร้อยแล้ว");
      await loadEntries();
    } catch (blockError) {
      setError(blockError instanceof Error ? blockError.message : "บล็อก IP ไม่สำเร็จ");
    } finally {
      setBusyIp(null);
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    const { type, entry } = pendingAction;
    setBusyIp(entry.ip_address);
    setError("");
    try {
      if (type === "unblock") {
        await adminService.unblockClientIp(adminCode, entry.ip_address);
        setNotice("ยกเลิกการบล็อก IP แล้ว");
      } else {
        await adminService.deleteBlockedClientIp(adminCode, entry.ip_address);
        setNotice("ลบประวัติ IP แล้ว");
      }
      setPendingAction(null);
      await loadEntries();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyIp(null);
    }
  }

  return (
    <section className={styles.page} aria-labelledby="blocked-client-ip-title">
      <div className={styles.heading}>
        <div>
          <h2 id="blocked-client-ip-title">จัดการ IP ที่ถูกบล็อก</h2>
          <p>ตรวจสอบและควบคุม IP ที่ถูกระงับจากการเชื่อมต่อไคลเอนต์</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchRow}>
          <form className={styles.search} onSubmit={(event) => event.preventDefault()}>
            <div className={styles.searchContainer}>
              <input className={styles.searchInput} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา IP address" aria-label="ค้นหา IP address" />
              {search ? <button type="button" className={styles.clearSearchButton} onClick={() => setSearch("")} title="ล้างการค้นหา" aria-label="ล้างการค้นหา"><X size={15} /></button> : null}
            </div>
            <button type="submit" className={styles.searchButton} title="ค้นหา" aria-label="ค้นหา">
              <Search className={styles.searchButtonIcon} size={17} aria-hidden="true" />
              <span className={styles.searchButtonText}>ค้นหา</span>
            </button>
          </form>
          <button type="button" className={styles.addButton} onClick={() => openBlockForm()}><Plus size={17} aria-hidden="true" /><span className={styles.addButtonText}>บล็อก IP</span></button>
        </div>

        <div className={styles.toolbarMeta}>
          <div className={styles.statusFilters} role="group" aria-label="กรองสถานะ IP">
            <button type="button" className={statusFilter === "all" ? styles.filterActive : undefined} onClick={() => setStatusFilter("all")}><span className={styles.statusFilterLabel}>ทั้งหมด</span></button>
            <button type="button" className={statusFilter === "blocked" ? styles.filterActive : undefined} onClick={() => setStatusFilter("blocked")}><span className={styles.statusFilterLabel}>ถูกบล็อก</span></button>
            <button type="button" className={statusFilter === "released" ? styles.filterActive : undefined} onClick={() => setStatusFilter("released")}><span className={styles.statusFilterLabel}>ปลดแล้ว</span></button>
          </div>
          <p className={styles.summary}><ShieldBan className={styles.summaryIcon} size={17} aria-hidden="true" /><span>{counts.blocked} / {counts.released} IP</span></p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <colgroup>
            <col className={styles.sequenceColumn} /><col className={styles.ipColumn} /><col className={styles.reasonColumn} /><col className={styles.failureColumn} />
            <col className={styles.windowColumn} /><col className={styles.expiryColumn} /><col className={styles.statusColumn} /><col className={styles.actionColumn} />
          </colgroup>
          <thead><tr><th>ลำดับ</th><th>IP Address</th><th>เหตุผล</th><th>จำนวนครั้ง</th><th>เริ่มตรวจสอบ</th><th>บล็อกถึง</th><th>สถานะ</th><th className={styles.actionHeader}>จัดการ</th></tr></thead>
          <tbody>
            {paginatedEntries.map((entry, index) => (
              <tr key={entry.ip_address}>
                <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                <td className={styles.ipCell}>
                  <span className={styles.mobileIpLine}>
                    <code>{entry.ip_address}</code>
                    <span className={`${styles.mobileAttempts} ${attemptLevel(entry.failure_count)}`}>
                      {entry.failure_count} ครั้ง
                    </span>
                  </span>
                  <small className={styles.mobileReason}>{entry.reason ?? "ไม่ระบุเหตุผล"}</small>
                </td>
                <td className={styles.reasonCell}>{entry.reason ?? "ไม่ระบุเหตุผล"}</td>
                <td><strong>{entry.failure_count}</strong></td>
                <td className={styles.windowCell}><time dateTime={entry.window_started_at}>{formatDate(entry.window_started_at)}</time></td>
                <td className={styles.expiryCell}><time dateTime={entry.blocked_until ?? undefined}>{formatDate(entry.blocked_until)}</time><small>{remainingTime(entry.retry_after_seconds)}</small></td>
                <td><span className={entry.is_blocked ? styles.blockedBadge : styles.releasedBadge}>{entry.is_blocked ? <Lock size={13} /> : <Unlock size={13} />}{entry.is_blocked ? "ถูกบล็อก" : "ปลดแล้ว"}</span></td>
                <td className={styles.actionCell}>
                  <span className={styles.rowActions}>
                    {entry.is_blocked
                      ? <button type="button" onClick={() => setPendingAction({ type: "unblock", entry })} disabled={busyIp === entry.ip_address} title="ยกเลิกการบล็อก" aria-label={`ยกเลิกการบล็อก ${entry.ip_address}`}><Unlock size={16} /></button>
                      : <button type="button" onClick={() => openBlockForm(entry)} disabled={busyIp === entry.ip_address} title="บล็อกอีกครั้ง" aria-label={`บล็อก ${entry.ip_address} อีกครั้ง`}><Lock size={16} /></button>}
                    <button type="button" className={styles.deleteButton} onClick={() => setPendingAction({ type: "delete", entry })} disabled={busyIp === entry.ip_address} title="ลบประวัติ" aria-label={`ลบประวัติ ${entry.ip_address}`}><Trash2 size={16} /></button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredEntries.length ? <div className={styles.empty}><ShieldBan size={24} /><span>ไม่พบรายการ IP</span></div> : null}
      </div>

      <div className={styles.pagination}>
        <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</button>
        <span>หน้า {currentPage} จาก {totalPages}</span>
        <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>ถัดไป</button>
      </div>

      {showBlockForm ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => !busyIp && setShowBlockForm(false)}>
          <form className={styles.modal} onSubmit={submitBlock} onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}><div><Ban size={20} /><h3>บล็อก IP</h3></div><button type="button" onClick={() => setShowBlockForm(false)} disabled={Boolean(busyIp)} title="ปิด" aria-label="ปิด"><X size={20} /></button></div>
            <div className={styles.formBody}>
              <label>IP Address<input value={ipAddress} onChange={(event) => setIpAddress(event.target.value)} placeholder="เช่น 203.0.113.20" autoFocus required /></label>
              <label>เหตุผลที่บล็อก<input value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="ระบุเหตุผลที่บล็อก IP" maxLength={255} required /></label>
              <label>ระยะเวลา (นาที)<input type="number" min="1" max="1440" step="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required /></label>
              <p><Clock3 size={15} /> สูงสุด 1,440 นาที (24 ชั่วโมง)</p>
            </div>
            <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setShowBlockForm(false)} disabled={Boolean(busyIp)}>ยกเลิก</button><button type="submit" className={styles.primaryButton} disabled={Boolean(busyIp)}><Ban size={17} /> ยืนยัน</button></div>
          </form>
        </div>
      ) : null}

      {pendingAction ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => !busyIp && setPendingAction(null)}>
          <div className={`${styles.modal} ${styles.confirmModal}`} role="dialog" aria-modal="true" aria-labelledby="ip-action-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.confirmIcon}>{pendingAction.type === "unblock" ? <Unlock size={25} /> : <Trash2 size={25} />}</div>
            <h3 id="ip-action-title">{pendingAction.type === "unblock" ? "ยกเลิกการบล็อก IP?" : "ลบประวัติ IP?"}</h3>
            <code>{pendingAction.entry.ip_address}</code>
            <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => setPendingAction(null)} disabled={Boolean(busyIp)}>ยกเลิก</button><button type="button" className={styles.primaryButton} onClick={() => void confirmAction()} disabled={Boolean(busyIp)}>ยืนยัน</button></div>
          </div>
        </div>
      ) : null}

      {error ? <PermissionErrorModal open title="เกิดข้อผิดพลาด" message={error} variant="error" showCloseButton onClose={() => setError("")} /> : null}
      {notice ? <PermissionErrorModal open title="สำเร็จ" message={notice} variant="success" showCloseButton onClose={() => setNotice("")} /> : null}
    </section>
  );
}

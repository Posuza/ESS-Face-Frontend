import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import PermissionErrorModal from "@/components/registeration/auth/popup/PermissionErrorModal";
import { adminService } from "@/services/admin.service";
import { useAppStore } from "@/store";
import type {
  ClientApplication,
  ClientApplicationCreate,
} from "@/types/api";

import styles from "./SuperAdminClientApplications.module.css";

type FormMode = "create" | "edit";
type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function AutoGrowTextarea({
  value,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  placeholder: string;
  className: string;
  ariaLabel: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    function resizeTextarea() {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }

    resizeTextarea();
    window.addEventListener("resize", resizeTextarea);
    return () => window.removeEventListener("resize", resizeTextarea);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className={className}
      value={value}
      placeholder={placeholder}
      rows={1}
      readOnly
      aria-label={ariaLabel}
    />
  );
}

export default function SuperAdminClientApplications() {
  const session = useAppStore((state) => state.adminSession);
  const [applications, setApplications] = useState<ClientApplication[]>([]);
  const [busyId, setBusyId] = useState<number | "create" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [editingApplication, setEditingApplication] = useState<ClientApplication | null>(null);
  const [appName, setAppName] = useState("");
  const [callbackOrigin, setCallbackOrigin] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [revealingKeyId, setRevealingKeyId] = useState<number | null>(null);
  const [privateKeyPreview, setPrivateKeyPreview] = useState<{
    appName: string;
    privateKey: string;
  } | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<ClientApplication | null>(null);
  const [formPublicKey, setFormPublicKey] = useState("");
  const [formPrivateKey, setFormPrivateKey] = useState("");
  const [formPrivateKeyVisible, setFormPrivateKeyVisible] = useState(false);
  const [formKeysChanged, setFormKeysChanged] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(false);

  const adminCode = session?.employee_code ?? "";
  const filteredApplications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "all"
        || (statusFilter === "active" && application.is_active)
        || (statusFilter === "inactive" && !application.is_active);
      const matchesSearch =
        !query
        || application.app_name.toLocaleLowerCase().includes(query)
        || application.public_key.toLocaleLowerCase().includes(query)
        || application.allowed_callback_origin.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [applications, search, statusFilter]);

  const applicationCounts = useMemo(() => {
    const active = applications.filter((application) => application.is_active).length;
    return { active, inactive: applications.length - active };
  }, [applications]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredApplications.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredApplications]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const loadApplications = useCallback(async () => {
    if (!adminCode) return;
    setError("");
    try {
      setApplications(await adminService.listClientApplications(adminCode));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดรายการแอปไม่สำเร็จ");
    }
  }, [adminCode]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  function openCreateForm() {
    setFormMode("create");
    setFormStep(1);
    setEditingApplication(null);
    setAppName("");
    setCallbackOrigin("");
    setFormPublicKey("");
    setFormPrivateKey("");
    setFormPrivateKeyVisible(false);
    setFormKeysChanged(false);
    setError("");
    setNotice("");
  }

  function openEditForm(application: ClientApplication) {
    setFormMode("edit");
    setFormStep(1);
    setEditingApplication(application);
    setAppName(application.app_name);
    setCallbackOrigin(application.allowed_callback_origin);
    setFormPublicKey(application.public_key);
    setFormPrivateKey("");
    setFormPrivateKeyVisible(false);
    setFormKeysChanged(false);
    setError("");
    setNotice("");
  }

  function closeForm() {
    if (busyId !== null) return;
    setFormMode(null);
    setFormStep(1);
    setEditingApplication(null);
    setFormPrivateKey("");
    setFormPrivateKeyVisible(false);
    setFormKeysChanged(false);
  }

  async function generateFormKeyPair() {
    if (!adminCode) return;
    setGeneratingKeys(true);
    setError("");
    try {
      const keyPair = await adminService.generateClientApplicationKeyPair(adminCode);
      setFormPublicKey(keyPair.public_key);
      setFormPrivateKey(keyPair.private_key);
      setFormPrivateKeyVisible(true);
      setFormKeysChanged(true);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "สร้างคีย์ไม่สำเร็จ");
    } finally {
      setGeneratingKeys(false);
    }
  }

  async function toggleFormPrivateKey() {
    if (formPrivateKeyVisible) {
      setFormPrivateKeyVisible(false);
      return;
    }
    if (formPrivateKey) {
      setFormPrivateKeyVisible(true);
      return;
    }
    if (!adminCode || !editingApplication) return;

    setGeneratingKeys(true);
    setError("");
    try {
      const result = await adminService.revealClientApplicationSigningKey(
        adminCode,
        editingApplication.app_registration_id,
      );
      setFormPrivateKey(result.private_key);
      setFormPrivateKeyVisible(true);
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : "แสดง Private Key ไม่สำเร็จ");
    } finally {
      setGeneratingKeys(false);
    }
  }

  async function copyFormKey(value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError("เบราว์เซอร์ไม่อนุญาตให้คัดลอกคีย์");
    }
  }

  function returnToApplicationStep(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setFormPrivateKeyVisible(false);
    setFormStep(1);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminCode || !formMode) return;

    if (formStep === 1) {
      setFormStep(2);
      return;
    }

    const payload: ClientApplicationCreate = {
      app_name: appName.trim(),
      allowed_callback_origin: callbackOrigin.trim(),
      ...(formKeysChanged && formPublicKey && formPrivateKey
        ? { public_key: formPublicKey, private_key: formPrivateKey }
        : {}),
    };
    setError("");
    setNotice("");
    setBusyId(formMode === "create" ? "create" : editingApplication?.app_registration_id ?? null);

    try {
      if (formMode === "create") {
        await adminService.createClientApplication(adminCode, payload);
        setNotice("เพิ่มแอปไคลเอนต์แล้ว");
      } else if (editingApplication) {
        await adminService.updateClientApplication(
          adminCode,
          editingApplication.app_registration_id,
          payload,
        );
        setNotice("บันทึกการตั้งค่าแล้ว");
      }
      setFormMode(null);
      setFormStep(1);
      setEditingApplication(null);
      setFormPublicKey("");
      setFormPrivateKey("");
      setFormPrivateKeyVisible(false);
      setFormKeysChanged(false);
      await loadApplications();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function setApplicationActive(application: ClientApplication, isActive: boolean) {
    if (!adminCode) return;
    setBusyId(application.app_registration_id);
    setError("");
    setNotice("");
    try {
      const updated = await adminService.updateClientApplication(
        adminCode,
        application.app_registration_id,
        { is_active: isActive },
      );
      setApplications((current) =>
        current.map((item) =>
          item.app_registration_id === updated.app_registration_id ? updated : item,
        ),
      );
      setNotice(isActive ? "เปิดใช้งานแอปแล้ว" : "ปิดใช้งานแอปแล้ว");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function copyPublicKey(publicKey: string) {
    try {
      await navigator.clipboard.writeText(publicKey);
      setNotice("คัดลอก Public Key แล้ว");
      setError("");
    } catch {
      setError("เบราว์เซอร์ไม่อนุญาตให้คัดลอก Public Key");
    }
  }

  async function showPrivateKey(application: ClientApplication) {
    const applicationId = application.app_registration_id;
    if (!adminCode) return;
    setRevealingKeyId(applicationId);
    setError("");
    try {
      const result = await adminService.revealClientApplicationSigningKey(
        adminCode,
        applicationId,
      );
      setPrivateKeyPreview({
        appName: application.app_name,
        privateKey: result.private_key,
      });
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : "แสดง Private Key ไม่สำเร็จ");
    } finally {
      setRevealingKeyId(null);
    }
  }

  async function deleteApplication(application: ClientApplication) {
    if (!adminCode) return;
    setBusyId(application.app_registration_id);
    setError("");
    setNotice("");
    try {
      await adminService.deleteClientApplication(
        adminCode,
        application.app_registration_id,
      );
      setDeletionTarget(null);
      setNotice("ลบแอปไคลเอนต์แล้ว");
      await loadApplications();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบแอปไคลเอนต์ไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={styles.page} aria-labelledby="client-applications-title">
      <div className={styles.heading}>
        <div>
          <h2 id="client-applications-title">จัดการแอปไคลเอนต์</h2>
          <p>กำหนด Public Key, callback origin และสถานะการเชื่อมต่อ</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchRow}>
          <form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className={styles.searchContainer}>
              <span className={styles.srOnly}>ค้นหาแอปไคลเอนต์</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อ, Public Key หรือ callback"
                aria-label="ค้นหาแอปไคลเอนต์"
                className={styles.searchInput}
              />
              {search ? (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={() => setSearch("")}
                  title="ล้างการค้นหา"
                  aria-label="ล้างการค้นหา"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            <button
              type="submit"
              className={styles.searchButton}
              title="ค้นหา"
              aria-label="ค้นหา"
            >
              <Search className={styles.searchButtonIcon} size={17} aria-hidden="true" />
              <span className={styles.searchButtonText}>ค้นหา</span>
            </button>
          </form>

          <button
            type="button"
            className={styles.addButton}
            onClick={openCreateForm}
            title="เพิ่มแอป"
            aria-label="เพิ่มแอป"
          >
            <Plus className={styles.addButtonIcon} size={18} aria-hidden="true" />
            <span className={styles.addButtonText}>เพิ่มใหม่</span>
          </button>
        </div>

        <div className={styles.toolbarActions}>
          <div className={styles.statusFilters} role="group" aria-label="กรองสถานะแอป">
            <button
              type="button"
              className={statusFilter === "all" ? styles.filterActive : undefined}
              onClick={() => setStatusFilter("all")}
            >
              <span className={styles.statusFilterLabel}>ทั้งหมด</span>
            </button>
            <button
              type="button"
              className={statusFilter === "active" ? styles.filterActive : undefined}
              onClick={() => setStatusFilter("active")}
            >
              <span className={styles.statusFilterLabel}>เปิดใช้งาน</span>
            </button>
            <button
              type="button"
              className={statusFilter === "inactive" ? styles.filterActive : undefined}
              onClick={() => setStatusFilter("inactive")}
            >
              <span className={styles.statusFilterLabel}>ปิดใช้งาน</span>
            </button>
          </div>
          <p className={styles.filterSummary} aria-live="polite">
            <KeyRound className={styles.filterSummaryIcon} size={17} aria-hidden="true" />
            <span className={styles.filterSummaryCounts}>
              <span>{applicationCounts.active}</span>
              <span aria-hidden="true">/</span>
              <span className={styles.filterSummaryInactive}>{applicationCounts.inactive}</span>
              <span>แอป</span>
            </span>
          </p>
        </div>
      </div>

      {error ? (
        <PermissionErrorModal
          open={Boolean(error)}
          title="เกิดข้อผิดพลาด"
          message={error}
          variant="error"
          showCloseButton
          onClose={() => setError("")}
        />
      ) : null}

      {notice ? (
        <PermissionErrorModal
          open={Boolean(notice)}
          title="สำเร็จ"
          message={notice}
          variant="success"
          showCloseButton
          onClose={() => setNotice("")}
        />
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.desktopTable}>
          <colgroup>
            <col className={styles.sequenceColumn} />
            <col className={styles.applicationColumn} />
            <col className={styles.publicKeyColumn} />
            <col className={styles.actorColumn} />
            <col className={styles.updatedColumn} />
            <col className={styles.statusColumn} />
            <col className={styles.actionColumn} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.sequenceHeader}>ลำดับ</th>
              <th>แอปพลิเคชัน</th>
              <th>Keys</th>
              <th>ผู้ดำเนินการ</th>
              <th>วันเวลา</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedApplications.map((application, index) => {
              const rowBusy = busyId === application.app_registration_id;
              return (
                <tr key={application.app_registration_id}>
                  <td className={styles.sequenceCell}>
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td>
                    <span className={styles.desktopApplication}>
                      <strong>{application.app_name}</strong>
                      <code className={styles.origin}>
                        {application.allowed_callback_origin}
                      </code>
                    </span>
                  </td>
                  <td>
                    <span className={styles.desktopKeyStack}>
                      <span className={styles.desktopKeyItem}>
                        <small>Public Key:</small>
                        <span className={styles.keyCell}>
                          <code>{application.public_key}</code>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => void copyPublicKey(application.public_key)}
                            title="คัดลอก Public Key"
                            aria-label={`คัดลอก Public Key ของ ${application.app_name}`}
                          >
                            <Copy size={16} />
                          </button>
                        </span>
                      </span>
                      <span className={styles.desktopKeyItem}>
                        <small>Private Key:</small>
                        <span className={styles.privateKeyAction}>
                          <code aria-hidden="true">••••••••••••</code>
                          <button
                            type="button"
                            className={styles.revealKeyButton}
                            onClick={() => void showPrivateKey(application)}
                            disabled={revealingKeyId === application.app_registration_id}
                            title="แสดง Private Key"
                            aria-label={`แสดง Private Key ของ ${application.app_name}`}
                          >
                            <Eye size={15} aria-hidden="true" />
                          </button>
                        </span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={styles.actorCell}>
                      <span>สร้าง: <strong>{application.created_by ?? "ไม่ทราบ"}</strong></span>
                      <span>แก้ไข: <strong>{application.updated_by ?? application.created_by ?? "ไม่ทราบ"}</strong></span>
                    </span>
                  </td>
                  <td>
                    <span className={styles.timeCell}>
                      <span>
                        <small>สร้าง:</small>
                        <time dateTime={application.created_at}>{formatDate(application.created_at)}</time>
                      </span>
                      <span>
                        <small>อัปเดต:</small>
                        <time dateTime={application.updated_at}>{formatDate(application.updated_at)}</time>
                      </span>
                    </span>
                  </td>
                  <td>
                    <label className={styles.statusToggle}>
                      <input
                        type="checkbox"
                        checked={application.is_active}
                        disabled={rowBusy}
                        onChange={(event) =>
                          void setApplicationActive(application, event.target.checked)
                        }
                        aria-label={`${application.is_active ? "ปิด" : "เปิด"}ใช้งาน ${application.app_name}`}
                      />
                      <span aria-hidden="true" />
                      <em>{application.is_active ? "เปิด" : "ปิด"}</em>
                    </label>
                  </td>
                  <td>
                    <span className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => openEditForm(application)}
                        disabled={rowBusy}
                        title="แก้ไข"
                        aria-label={`แก้ไข ${application.app_name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => setDeletionTarget(application)}
                        disabled={rowBusy}
                        title="ลบแอป"
                        aria-label={`ลบ ${application.app_name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <table className={styles.mobileTable}>
          <colgroup>
            <col className={styles.mobileSequenceColumn} />
            <col className={styles.mobileDataColumn} />
            <col className={styles.mobileKeyColumn} />
            <col className={styles.mobileTimeColumn} />
            <col className={styles.mobileActorColumn} />
            <col className={styles.mobileStatusColumn} />
            <col className={styles.mobileActionColumn} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.mobileSequenceHeader}>ลำดับ</th>
              <th>แอปพลิเคชัน</th>
              <th>Keys</th>
              <th className={styles.mobileTimeHeader}>วันเวลา</th>
              <th className={styles.mobileActorHeader}>ผู้ดำเนินการ</th>
              <th className={styles.mobileStatusHeader}>สถานะ</th>
              <th className={styles.mobileActionHeader}>
                <span className={styles.mobileActionHeaderLabel}>จัดการ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedApplications.map((application, index) => {
              const rowBusy = busyId === application.app_registration_id;
              return (
                <tr key={application.app_registration_id}>
                  <td className={styles.mobileSequenceCell}>
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className={styles.mobileDataCell}>
                    <div className={styles.mobileApplication}>
                      <strong>{application.app_name}</strong>
                      <code className={styles.mobileOrigin}>
                        {application.allowed_callback_origin}
                      </code>
                    </div>
                  </td>
                  <td className={styles.mobileKeyCell}>
                    <span className={styles.desktopKeyStack}>
                      <span className={styles.desktopKeyItem}>
                        <small>Public Key:</small>
                        <span className={styles.keyCell}>
                          <code>{application.public_key}</code>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => void copyPublicKey(application.public_key)}
                            title="คัดลอก Public Key"
                            aria-label={`คัดลอก Public Key ของ ${application.app_name}`}
                          >
                            <Copy size={15} />
                          </button>
                        </span>
                      </span>
                      <span className={styles.desktopKeyItem}>
                        <small>Private Key:</small>
                        <span className={styles.privateKeyAction}>
                          <code aria-hidden="true">••••••••••••</code>
                          <button
                            type="button"
                            className={styles.revealKeyButton}
                            onClick={() => void showPrivateKey(application)}
                            disabled={revealingKeyId === application.app_registration_id}
                            title="แสดง Private Key"
                            aria-label={`แสดง Private Key ของ ${application.app_name}`}
                          >
                            <Eye size={14} aria-hidden="true" />
                          </button>
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className={styles.mobileTimeCell}>
                    <span className={styles.timeCell}>
                      <span>
                        <small>สร้าง:</small>
                        <time dateTime={application.created_at}>{formatDate(application.created_at)}</time>
                      </span>
                      <span>
                        <small>อัปเดต:</small>
                        <time dateTime={application.updated_at}>{formatDate(application.updated_at)}</time>
                      </span>
                    </span>
                  </td>
                  <td className={styles.mobileActorCell}>
                    <span className={styles.actorCell}>
                      <span>สร้าง: <strong>{application.created_by ?? "ไม่ทราบ"}</strong></span>
                      <span>แก้ไข: <strong>{application.updated_by ?? application.created_by ?? "ไม่ทราบ"}</strong></span>
                    </span>
                  </td>
                  <td className={styles.mobileStatusCell}>
                    <label className={styles.mobileStatusToggle}>
                      <input
                        type="checkbox"
                        checked={application.is_active}
                        disabled={rowBusy}
                        onChange={(event) =>
                          void setApplicationActive(application, event.target.checked)
                        }
                        aria-label={`${application.is_active ? "ปิด" : "เปิด"}ใช้งาน ${application.app_name}`}
                      />
                      <span aria-hidden="true" />
                      <em>{application.is_active ? "เปิด" : "ปิด"}</em>
                    </label>
                  </td>
                  <td className={styles.mobileActionCell}>
                    <span className={styles.mobileManagement}>
                      <label className={`${styles.mobileStatusToggle} ${styles.mobileStatusToggleXs}`}>
                        <input
                          type="checkbox"
                          checked={application.is_active}
                          disabled={rowBusy}
                          onChange={(event) =>
                            void setApplicationActive(application, event.target.checked)
                          }
                          aria-label={`${application.is_active ? "ปิด" : "เปิด"}ใช้งาน ${application.app_name}`}
                        />
                        <span aria-hidden="true" />
                        <em>{application.is_active ? "เปิด" : "ปิด"}</em>
                      </label>
                      <span className={styles.mobileRowActions}>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => openEditForm(application)}
                          disabled={rowBusy}
                          title="แก้ไข"
                          aria-label={`แก้ไข ${application.app_name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.iconButton}
                          onClick={() => setDeletionTarget(application)}
                          disabled={rowBusy}
                          title="ลบแอป"
                          aria-label={`ลบ ${application.app_name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filteredApplications.length && !error ? (
          <div className={styles.empty}>
            <KeyRound size={24} aria-hidden="true" />
            <span>{applications.length ? "ไม่พบแอปที่ตรงกับตัวกรอง" : "ยังไม่มีแอปไคลเอนต์"}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.pagination}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          ก่อนหน้า
        </button>
        <span>หน้า {currentPage} จาก {totalPages}</span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          ถัดไป
        </button>
      </div>

      {deletionTarget ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => busyId === null && setDeletionTarget(null)}
        >
          <section
            className={`${styles.modal} ${styles.confirmModal}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-app-confirm-title"
            aria-describedby="delete-app-confirm-message"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.confirmBody}>
              <span className={styles.confirmIcon} aria-hidden="true">
                <Trash2 size={24} />
              </span>
              <div>
                <h3 id="delete-app-confirm-title">ลบแอปไคลเอนต์?</h3>
                <p id="delete-app-confirm-message">
                  แอป {deletionTarget.app_name} จะถูกลบและไม่สามารถใช้ระบบยืนยันตัวตนได้อีก
                </p>
              </div>
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setDeletionTarget(null)}
                disabled={busyId !== null}
              >
                <X size={16} aria-hidden="true" /> ยกเลิก
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void deleteApplication(deletionTarget)}
                disabled={busyId !== null}
              >
                {busyId !== null
                  ? <RefreshCw size={16} className={styles.spinning} aria-hidden="true" />
                  : <Trash2 size={16} aria-hidden="true" />}
                ลบแอป
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {privateKeyPreview ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setPrivateKeyPreview(null)}
        >
          <section
            className={`${styles.modal} ${styles.privateKeyModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="private-key-preview-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="private-key-preview-title">Private Key</h3>
              <button type="button" className={styles.iconButton} onClick={() => setPrivateKeyPreview(null)} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <div className={styles.privateKeyPreview}>
              <strong>{privateKeyPreview.appName}</strong>
              <code>{privateKeyPreview.privateKey}</code>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void copyFormKey(privateKeyPreview.privateKey)}
              >
                <Copy size={16} aria-hidden="true" /> คัดลอก
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {formMode ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeForm}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-application-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="client-application-form-title">
                {formMode === "create" ? "เพิ่มแอปไคลเอนต์" : "แก้ไขแอปไคลเอนต์"}
              </h3>
              <button type="button" className={styles.iconButton} onClick={closeForm} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitForm}>
              <div className={styles.formStepContent} aria-label={`ขั้นตอน ${formStep} จาก 2`}>
                <div className={`${styles.formStepSection} ${formStep === 2 ? styles.formStepConnected : ""}`}>
                  <span
                    className={`${styles.formStepMarker} ${formStep === 1 ? styles.formStepCurrent : styles.formStepComplete}`}
                    aria-current={formStep === 1 ? "step" : undefined}
                  >
                    1
                  </span>
                  <div className={styles.formStepPanel}>
                    <label>
                      <span>ชื่อแอปพลิเคชัน</span>
                      <input
                        value={appName}
                        onChange={(event) => setAppName(event.target.value)}
                        maxLength={150}
                        required
                        autoFocus
                      />
                    </label>
                    <label>
                      <span>Allowed callback origin</span>
                      <input
                        type="url"
                        value={callbackOrigin}
                        onChange={(event) => setCallbackOrigin(event.target.value)}
                        placeholder="https://app.example.com"
                        maxLength={2048}
                        required
                      />
                      <small>ระบุเฉพาะ scheme, domain และ port ไม่ต้องใส่ path</small>
                    </label>
                  </div>
                </div>

                {formStep === 2 ? (
                  <div className={styles.formStepSection}>
                    <span
                      className={`${styles.formStepMarker} ${styles.formStepCurrent}`}
                      aria-current="step"
                    >
                      2
                    </span>
                    <section className={styles.formKeySection} aria-labelledby="client-key-section-title">
                      <div className={styles.formKeyHeader}>
                        <strong id="client-key-section-title">คีย์สำหรับเชื่อมต่อ</strong>
                        <button
                          type="button"
                          className={styles.generateKeyButton}
                          onClick={() => void generateFormKeyPair()}
                          disabled={
                            generatingKeys
                            || busyId !== null
                            || !appName.trim()
                            || !callbackOrigin.trim()
                          }
                        >
                          <RefreshCw size={15} className={generatingKeys ? styles.spinning : undefined} />
                          {formMode === "create" ? "สร้างคีย์" : "สร้างคีย์ใหม่"}
                        </button>
                      </div>
                      <div className={styles.formKeyRow}>
                        <span>Public Key</span>
                        <AutoGrowTextarea
                          className={styles.formKeyTextarea}
                          value={formPublicKey}
                          placeholder="กดสร้างคีย์"
                          ariaLabel="Public Key"
                        />
                        <button type="button" className={styles.formKeyIconButton} onClick={() => void copyFormKey(formPublicKey)} disabled={!formPublicKey} title="คัดลอก Public Key" aria-label="คัดลอก Public Key">
                          <Copy size={15} />
                        </button>
                      </div>
                      <div className={styles.formKeyRow}>
                        <span>Private Key</span>
                        <AutoGrowTextarea
                          className={styles.formKeyTextarea}
                          value={
                            formPrivateKeyVisible
                              ? formPrivateKey
                              : formPrivateKey
                                ? "•".repeat(formPrivateKey.length)
                                : ""
                          }
                          placeholder="กดสร้างคีย์"
                          ariaLabel={formPrivateKeyVisible ? "Private Key" : "Private Key ถูกซ่อน"}
                        />
                        <span className={styles.formKeyControls}>
                          <button type="button" className={styles.formKeyIconButton} onClick={() => void toggleFormPrivateKey()} disabled={generatingKeys || (!formPrivateKey && !editingApplication)} title={formPrivateKeyVisible ? "ซ่อน Private Key" : "แสดง Private Key"} aria-label={formPrivateKeyVisible ? "ซ่อน Private Key" : "แสดง Private Key"}>
                            {formPrivateKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </span>
                      </div>
                      {formMode === "edit" && !formKeysChanged ? (
                        <small>คีย์เดิมจะไม่เปลี่ยนจนกว่าจะกด “สร้างคีย์ใหม่” และยืนยัน</small>
                      ) : null}
                    </section>
                  </div>
                ) : null}

                <div className={styles.formActions}>
                  {formStep === 1 ? (
                    <button type="submit" className={styles.primaryButton}>
                      ถัดไป <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={returnToApplicationStep}
                        disabled={busyId !== null}
                      >
                        <ArrowLeft size={17} aria-hidden="true" /> ย้อนกลับ
                      </button>
                      <button type="submit" className={styles.primaryButton} disabled={busyId !== null || (formMode === "create" && (!formPublicKey || !formPrivateKey))}>
                        {busyId !== null ? <RefreshCw size={17} className={styles.spinning} /> : <Check size={17} />}
                        ยืนยัน
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

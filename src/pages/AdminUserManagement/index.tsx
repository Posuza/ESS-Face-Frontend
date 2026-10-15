import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faCheck,
  faMagnifyingGlass,
  faUserCheck as faUserCheckSolid,
  faUserPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { TiArrowSortedDown, TiArrowSortedUp } from "react-icons/ti";
import {
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaUserFriends,
} from "react-icons/fa";

import RegisterCameraModal from "@/components/registeration/RegisterCameraModal";
import PermissionErrorModal from "@/components/registeration/auth/popup/PermissionErrorModal";
import {
  canAccessAdminDashboard,
  type AdminUserListOptions,
} from "@/services/admin.service";
import { useAppStore } from "@/store";
import type { AdminEmployee, DirectoryEmployee } from "@/types/api";

import styles from "./AdminUserManagement.module.css";

const ACTIVE_EMPLOYEE_LIST = {
  isActive: true,
  sortBy: "employee_code",
  sortDirection: "asc",
} as const;

type SortField = NonNullable<AdminUserListOptions["sortBy"]>;
type SortDirection = NonNullable<AdminUserListOptions["sortDirection"]>;
type FaceFilter = NonNullable<AdminUserListOptions["faceStatus"]>;

function getListOptions(
  sortBy: SortField,
  sortDirection: SortDirection,
  faceStatus: FaceFilter = "all",
): AdminUserListOptions {
  return { isActive: true, sortBy, sortDirection, faceStatus };
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  return (
    <span className={styles.sortIndicator} aria-hidden="true">
      <TiArrowSortedUp
        className={
          active && direction === "asc"
            ? styles.sortArrowActive
            : styles.sortArrowInactive
        }
      />
      <TiArrowSortedDown
        className={
          active && direction === "desc"
            ? styles.sortArrowActive
            : styles.sortArrowInactive
        }
      />
    </span>
  );
}

const savedAtFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function formatSavedAt(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : savedAtFormatter.format(date);
}

export default function AdminUserManagement() {
  const session = useAppStore((state) => state.adminSession);
  const adminUsers = useAppStore((state) => state.adminUsers);
  const directoryUsers = useAppStore((state) => state.employeeDirectory);
  const adminPage = useAppStore((state) => state.adminUsersPage);
  const directoryPage = useAppStore((state) => state.employeeDirectoryPage);
  const adminTotal = useAppStore((state) => state.adminUsersTotal);
  const directoryTotal = useAppStore((state) => state.employeeDirectoryTotal);
  const busy = useAppStore((state) => state.adminUsersBusy);
  const error = useAppStore((state) => state.adminUsersError);
  const notice = useAppStore((state) => state.adminUsersNotice);
  const load = useAppStore((state) => state.loadAdminUsers);
  const loadDirectory = useAppStore((state) => state.loadEmployeeDirectory);
  const loadEmployeeSummary = useAppStore((state) => state.loadEmployeeSummary);
  const employeeSummary = useAppStore((state) => state.employeeSummary);
  const setPage = useAppStore((state) => state.setAdminUsersPage);
  const setDirectoryPage = useAppStore((state) => state.setEmployeeDirectoryPage);
  const adminAppliedSearch = useAppStore((state) => state.adminUsersAppliedSearch);
  const directoryAppliedSearch = useAppStore(
    (state) => state.employeeDirectoryAppliedSearch,
  );
  const getFaceProfile = useAppStore((state) => state.getAdminFaceProfile);
  const deleteFaceProfile = useAppStore((state) => state.deleteAdminFaceProfile);
  const replaceFaceProfile = useAppStore((state) => state.replaceAdminFaceProfile);
  const clearMessages = useAppStore((state) => state.clearAdminUsersMessages);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("employee_code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [faceFilter, setFaceFilter] = useState<FaceFilter>("all");
  const isUserManager = Boolean(session && canAccessAdminDashboard(session));
  const users: DirectoryEmployee[] = isUserManager ? adminUsers : directoryUsers;
  const page = isUserManager ? adminPage : directoryPage;
  const total = isUserManager ? adminTotal : directoryTotal;
  const appliedSearch = isUserManager ? adminAppliedSearch : directoryAppliedSearch;

  const [cameraTarget, setCameraTarget] =
    useState<AdminEmployee | null>(null);

  const [photoUrl, setPhotoUrl] =
    useState<string | null>(null);

  const [photoTarget, setPhotoTarget] =
    useState<AdminEmployee | null>(null);

  const pages = Math.max(1, Math.ceil(total / 25));
  const dashboardTotal = employeeSummary.total;
  const dashboardRegistered = employeeSummary.registered;
  const dashboardMissing = employeeSummary.missing;
  const registeredPercentage = dashboardTotal > 0
    ? Math.round((dashboardRegistered / dashboardTotal) * 100)
    : 0;
  const missingPercentage = dashboardTotal > 0
    ? Math.round((dashboardMissing / dashboardTotal) * 100)
    : 0;
  const registeredArc = registeredPercentage > 0
    ? Math.min(92, Math.max(8, registeredPercentage))
    : 0;
  const missingArc = missingPercentage > 0
    ? Math.min(92, Math.max(8, missingPercentage))
    : 0;

  useEffect(() => {
    void loadEmployeeSummary({ activeOnly: true });
    if (isUserManager) {
      void load(1, "", ACTIVE_EMPLOYEE_LIST);
    } else {
      void loadDirectory(1, "", ACTIVE_EMPLOYEE_LIST);
    }
  }, [isUserManager, load, loadDirectory, loadEmployeeSummary]);

  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  function handleSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const options = getListOptions(sortBy, sortDirection, faceFilter);
    if (isUserManager) {
      void load(1, search.trim(), options);
    } else {
      void loadDirectory(1, search.trim(), options);
    }
  }

  function handleSort(nextSortBy: SortField) {
    const nextDirection =
      nextSortBy === sortBy && sortDirection === "asc" ? "desc" : "asc";

    setSortBy(nextSortBy);
    setSortDirection(nextDirection);
    const options = getListOptions(nextSortBy, nextDirection, faceFilter);
    if (isUserManager) {
      void load(1, appliedSearch, options);
    } else {
      void loadDirectory(1, appliedSearch, options);
    }
  }

  function handleFaceFilter(nextFilter: FaceFilter) {
    setFaceFilter(nextFilter);
    const options = getListOptions(sortBy, sortDirection, nextFilter);
    if (isUserManager) {
      void load(1, appliedSearch, options);
    } else {
      void loadDirectory(1, appliedSearch, options);
    }
  }

  function clearSearch() {
    setSearch("");
    clearMessages();
    const options = getListOptions(sortBy, sortDirection, faceFilter);
    if (isUserManager) {
      void load(1, "", options);
    } else {
      void loadDirectory(1, "", options);
    }
  }

  async function showPhoto(
    employee: AdminEmployee,
  ) {
    clearMessages();

    try {
      const blob = await getFaceProfile(employee.employee_code);

      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }

      const nextPhotoUrl =
        URL.createObjectURL(blob);

      setPhotoUrl(nextPhotoUrl);
      setPhotoTarget(employee);
    } catch (photoError) {
      console.error("showPhoto error:", photoError);
    }
  }

  async function removePhoto() {
    if (!photoTarget) {
      return;
    }

    clearMessages();

    try {
      await deleteFaceProfile(photoTarget.employee_code);

      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }

      setPhotoTarget(null);
      setPhotoUrl(null);

    } catch (photoError) {
      console.error("removePhoto error:", photoError);
    }
  }

  function closePhotoModal() {
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
    }

    setPhotoTarget(null);
    setPhotoUrl(null);
  }

  function replaceCurrentPhoto() {
    if (!photoTarget) {
      return;
    }

    const employee = photoTarget;

    closePhotoModal();
    setCameraTarget(employee);
  }

  async function handleCaptured(
    dataUrl: string,
  ) {
    if (!cameraTarget) {
      return;
    }

    const employee = cameraTarget;

    clearMessages();

    try {
      await replaceFaceProfile(employee.employee_code, dataUrl);

      setCameraTarget(null);
    } catch (captureError) {
      console.error("handleCaptured error:", captureError);
    }
  }

  return (
    <section
      className={styles.page}
      aria-labelledby="users-title"
    >
      <div className={styles.heading}>
        <div>
          <h2 id="users-title">
            {isUserManager
              ? "จัดการผู้ใช้งาน"
              : "ข้อมูลการลงทะเบียนใบหน้าของคุณ"}
          </h2>
        </div>
      </div>

      <div className={styles.summaryGrid} aria-label="สรุปข้อมูลพนักงาน">
        <div className={`${styles.summaryCard} ${styles.summaryCardAll}`}>
          <span className={styles.summaryText}>
            <span className={styles.summaryLabel}>พนักงานทั้งหมด</span>
            <span className={`${styles.summaryIcon} ${styles.summaryIconBlue}`} aria-hidden="true">
              <FaUsers />
            </span>
          </span>
          <span
            className={`${styles.summaryCountRing} ${styles.summaryCountBlue}`}
          >
            <svg className={styles.summaryRingSvg} viewBox="0 0 100 100" aria-hidden="true">
              <circle
                className={styles.summaryRingValue}
                cx="50"
                cy="50"
                r="45"
                pathLength="100"
                style={{ strokeDasharray: "100 100" }}
              />
            </svg>
            <span className={styles.summaryCountInner}>
              <strong>{dashboardTotal}</strong>
            </span>
          </span>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryCardRegistered}`}>
          <span className={styles.summaryText}>
            <span className={styles.summaryLabel}>ลงทะเบียนแล้ว</span>
            <span className={`${styles.summaryIcon} ${styles.summaryIconGreen}`} aria-hidden="true">
              <FaUserCheck />
            </span>
          </span>
          <span
            className={`${styles.summaryCountRing} ${styles.summaryCountGreen}`}
          >
            <svg className={styles.summaryRingSvg} viewBox="0 0 100 100" aria-hidden="true">
              <circle
                className={styles.summaryRingValue}
                cx="50"
                cy="50"
                r="45"
                pathLength="100"
                style={{
                  strokeDasharray: `${registeredArc} 100`,
                }}
              />
            </svg>
            <span className={styles.summaryCountInner}>
              <strong>{dashboardRegistered}</strong>
            </span>
          </span>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryCardMissing}`}>
          <span className={styles.summaryText}>
            <span className={styles.summaryLabel}>ยังไม่ได้ดำเนินการ</span>
            <span className={`${styles.summaryIcon} ${styles.summaryIconOrange}`} aria-hidden="true">
              <FaUserClock />
            </span>
          </span>
          <span
            className={`${styles.summaryCountRing} ${styles.summaryCountOrange}`}
          >
            <svg className={styles.summaryRingSvg} viewBox="0 0 100 100" aria-hidden="true">
              <circle
                className={styles.summaryRingValue}
                cx="50"
                cy="50"
                r="45"
                pathLength="100"
                style={{
                  strokeDasharray: `${missingArc} 100`,
                }}
              />
            </svg>
            <span className={styles.summaryCountInner}>
              <strong>{dashboardMissing}</strong>
            </span>
          </span>
        </div>
      </div>

      <form
        className={styles.search}
        onSubmit={handleSearch}
      >
        <div className={styles.searchContainer}>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              const nextSearch = event.target.value;
              const shouldReloadAll = search.length > 0 && nextSearch.length === 0;
              setSearch(nextSearch);
              clearMessages();
              if (shouldReloadAll) {
                const options = getListOptions(sortBy, sortDirection, faceFilter);
                if (isUserManager) {
                  void load(1, "", options);
                } else {
                  void loadDirectory(1, "", options);
                }
              }
            }}
            placeholder="ค้นหา: รหัสพนักงาน / ชื่อ / นามสกุล"
            aria-label="ค้นหาพนักงาน"
            className={styles.searchInput}
          />

          {search ? (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={clearSearch}
              title="ล้างการค้นหา"
              aria-label="ล้างการค้นหา"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className={styles.searchButton}
          title="ค้นหา"
          aria-label="ค้นหา"
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className={styles.searchButtonIcon}
          />
          <span className={styles.searchButtonText}>ค้นหา</span>
        </button>
      </form>

      <div className={styles.filterBar}>
        <fieldset className={styles.faceFilters}>
          <legend>กรองผลการสแกนใบหน้า</legend>
          {([
            ["all", "ทั้งหมด"],
            ["missing", "ยังไม่ได้ดำเนินการ"],
            ["registered", "เรียบร้อย"],
          ] as const).map(([value, label]) => (
            <label key={value} className={styles.faceFilterOption}>
              <input
                type="radio"
                name="face-status"
                value={value}
                checked={faceFilter === value}
                disabled={busy}
                onChange={() => handleFaceFilter(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <p className={styles.filterSummary}>
          <span className={styles.filterSummaryDesktop}>
            {isUserManager ? "พนักงานทั้งหมด" : "พนักงานที่เปิดใช้งานทั้งหมด"}{" "}
            {total} คน
          </span>
          <span className={styles.filterSummaryMobile}>
            <FaUserFriends
              className={styles.filterSummaryIcon}
              aria-hidden="true"
            />
            <span>{total} คน</span>
          </span>
        </p>
      </div>

      {error ? (
        <PermissionErrorModal
          open={Boolean(error)}
          title="เกิดข้อผิดพลาด"
          message={error}
          variant="error"
          showCloseButton
          onClose={() => clearMessages()}
        />
      ) : null}

      {notice ? (
        <PermissionErrorModal
          open={Boolean(notice)}
          title="แจ้งเตือน"
          message={notice}
          variant="warning"
          showCloseButton
          onClose={() => clearMessages()}
        />
      ) : null}

      <div
        className={styles.tableWrap}
        aria-busy={busy}
      >
        {/* MD / LG / XL: keep the existing full table */}
        <table
          className={`${styles.desktopTable} ${
            isUserManager ? "" : styles.viewerTable
          }`}
        >
          <colgroup>
            <col className={styles.sequenceColumn} />
            <col className={styles.employeeCodeColumn} />
            <col className={styles.firstNameColumn} />
            <col className={styles.lastNameColumn} />
            <col className={styles.faceResultColumn} />
            <col className={styles.savedAtColumn} />
            {isUserManager ? <col className={styles.imagePathColumn} /> : null}
            {isUserManager ? <col className={styles.actionColumn} /> : null}
          </colgroup>

          <thead>
            <tr>
              <th className={styles.idColumn}>ลำดับ</th>

              <th
                aria-sort={
                  sortBy === "employee_code"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  className={styles.sortHeader}
                  disabled={busy}
                  onClick={() => handleSort("employee_code")}
                  title="เรียงตามรหัสพนักงาน"
                >
                  <span>รหัสพนักงาน</span>
                  <SortIndicator
                    active={sortBy === "employee_code"}
                    direction={sortDirection}
                  />
                </button>
              </th>

              <th>ชื่อ</th>
              <th>นามสกุล</th>

              <th
                aria-sort={
                  sortBy === "face_status"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  className={styles.sortHeader}
                  disabled={busy}
                  onClick={() => handleSort("face_status")}
                  title="เรียงตามผลการสแกนใบหน้า"
                >
                  <span>ผลการสแกนใบหน้า</span>
                  <SortIndicator
                    active={sortBy === "face_status"}
                    direction={sortDirection}
                  />
                </button>
              </th>

              <th>บันทึกล่าสุด</th>
              {isUserManager ? <th>พาธรูปใบหน้า</th> : null}
              {isUserManager ? <th>การจัดการ</th> : null}
            </tr>
          </thead>

          <tbody>
            {users.map((employee, index) => {
              const rowNumber = (page - 1) * 25 + index + 1;
              const adminEmployee = isUserManager
                ? (employee as AdminEmployee)
                : null;

              return (
                <tr key={employee.employee_code}>
                  <td className={styles.idColumn}>
                    <strong className={styles.rowId}>{rowNumber}</strong>
                  </td>

                  <td><strong>{employee.employee_code}</strong></td>

                  <td>{employee.first_name}</td>
                  <td>{employee.last_name}</td>

                  <td>
                    <span
                      className={
                        employee.has_face_profile
                          ? `${styles.faceStatus} ${styles.faceStatusRegistered}`
                          : `${styles.faceStatus} ${styles.faceStatusMissing}`
                      }
                    >
                      {employee.has_face_profile
                        ? "เรียบร้อย"
                        : "ยังไม่ได้ดำเนินการ"}
                    </span>
                  </td>

                  <td className={styles.savedAt}>
                    {formatSavedAt(employee.profile_image_updated_at)}
                  </td>

                  {adminEmployee ? (
                    <td
                      className={styles.imagePath}
                      title={adminEmployee.face_profile_location ?? undefined}
                    >
                      {adminEmployee.face_profile_location ?? "-"}
                    </td>
                  ) : null}

                  {adminEmployee ? (
                    <td className={styles.actions}>
                      <button
                        type="button"
                        className={
                          employee.has_face_profile
                            ? styles.faceActionRegistered
                            : styles.faceActionMissing
                        }
                        title={
                          employee.has_face_profile
                            ? "ดูรูปใบหน้า"
                            : "ลงทะเบียนรูปใบหน้า"
                        }
                        aria-label={
                          employee.has_face_profile
                            ? `ดูรูปใบหน้าของ ${employee.employee_code}`
                            : `ลงทะเบียนรูปใบหน้าของ ${employee.employee_code}`
                        }
                        onClick={() => {
                          if (employee.has_face_profile) {
                            void showPhoto(adminEmployee);
                          } else {
                            setCameraTarget(adminEmployee);
                          }
                        }}
                      >
                        <FontAwesomeIcon
                          icon={
                            employee.has_face_profile
                              ? faUserCheckSolid
                              : faUserPlus
                          }
                        />
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!busy && users.length === 0 ? (
              <tr>
                <td
                  colSpan={isUserManager ? 8 : 6}
                  className={styles.empty}
                >
                  ไม่พบข้อมูลพนักงาน
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* XS / SM: compact 3-column table (+ action for user manager) */}
        <table className={styles.mobileTable}>
          <colgroup>
            <col className={styles.mobileNoColumn} />
            <col className={styles.mobileEmployeeColumn} />
            <col className={styles.mobileFaceColumn} />
            {isUserManager ? <col className={styles.mobileActionColumn} /> : null}
          </colgroup>

          <thead>
            <tr>
              <th>ลำดับ</th>

              <th
                aria-sort={
                  sortBy === "employee_code"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  className={styles.mobileSortHeader}
                  onClick={() => handleSort("employee_code")}
                  title="เรียงตามรหัสพนักงาน"
                  aria-label="เรียงข้อมูลพนักงานตามรหัสพนักงาน"
                >
                  <span>ข้อมูลพนักงาน</span>
                  <SortIndicator
                    active={sortBy === "employee_code"}
                    direction={sortDirection}
                  />
                </button>
              </th>

              <th
                aria-sort={
                  sortBy === "face_status"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  className={styles.mobileSortHeader}
                  onClick={() => handleSort("face_status")}
                  title="เรียงตามสถานะการลงทะเบียนใบหน้า"
                  aria-label="เรียงตามสถานะการลงทะเบียนใบหน้า"
                >
                  <span>สถานะ</span>
                  <SortIndicator
                    active={sortBy === "face_status"}
                    direction={sortDirection}
                  />
                </button>
              </th>

              {isUserManager ? <th>จัดการ</th> : null}
            </tr>
          </thead>

          <tbody>
            {users.map((employee, index) => {
              const rowNumber = (page - 1) * 25 + index + 1;
              const adminEmployee = isUserManager
                ? (employee as AdminEmployee)
                : null;

              return (
                <tr key={`mobile-${employee.employee_code}`}>
                  <td className={styles.mobileNoCell}>{rowNumber}</td>

                  <td className={styles.mobileEmployeeCell}>
                    <span className={styles.mobileEmployeeCodeRow}>
                      <span className={styles.mobileEmployeeCode}>
                        {employee.employee_code}
                      </span>
                    </span>
                    <span className={styles.mobileEmployeeName}>
                      {employee.first_name} {employee.last_name}
                    </span>
                  </td>

                  <td className={styles.mobileFaceCell}>
                    <span
                      className={
                        employee.has_face_profile
                          ? styles.mobileFaceRegistered
                          : styles.mobileFaceMissing
                      }
                    >
                      {employee.has_face_profile
                        ? "เรียบร้อย"
                        : "ยังไม่ได้ดำเนินการ"}
                    </span>
                    <span className={styles.mobileSavedAt}>
                      {formatSavedAt(employee.profile_image_updated_at)}
                    </span>
                  </td>

                  {adminEmployee ? (
                    <td className={styles.mobileActionCell}>
                      <button
                        type="button"
                        className={
                          employee.has_face_profile
                            ? styles.faceActionRegistered
                            : styles.faceActionMissing
                        }
                        title={
                          employee.has_face_profile
                            ? "ดูรูปใบหน้า"
                            : "ลงทะเบียนรูปใบหน้า"
                        }
                        aria-label={
                          employee.has_face_profile
                            ? `ดูรูปใบหน้าของ ${employee.employee_code}`
                            : `ลงทะเบียนรูปใบหน้าของ ${employee.employee_code}`
                        }
                        onClick={() => {
                          if (employee.has_face_profile) {
                            void showPhoto(adminEmployee);
                          } else {
                            setCameraTarget(adminEmployee);
                          }
                        }}
                      >
                        <FontAwesomeIcon
                          icon={
                            employee.has_face_profile
                              ? faUserCheckSolid
                              : faUserPlus
                          }
                        />
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {!busy && users.length === 0 ? (
              <tr>
                <td
                  colSpan={isUserManager ? 4 : 3}
                  className={styles.mobileEmpty}
                >
                  ไม่พบข้อมูลพนักงาน
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div
        className={styles.pagination}
      >
        <button
          type="button"
          disabled={page <= 1 || busy}
          onClick={() =>
            isUserManager
              ? setPage(Math.max(1, page - 1))
              : setDirectoryPage(Math.max(1, page - 1))
          }
        >
          ก่อนหน้า
        </button>

        <span>
          หน้า {page} จาก {pages}
        </span>

        <button
          type="button"
          disabled={
            page >= pages || busy
          }
          onClick={() =>
            isUserManager
              ? setPage(Math.min(pages, page + 1))
              : setDirectoryPage(Math.min(pages, page + 1))
          }
        >
          ถัดไป
        </button>
      </div>

      {photoTarget &&
      photoUrl ? (
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePhotoModal();
            }
          }}
        >
          <div
            className={
              styles.photoModal
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="face-photo-title"
          >
            <div
              className={
                styles.modalHead
              }
            >
              <h3 id="face-photo-title">
                รูปใบหน้า{" "}
                {
                  photoTarget.employee_code
                }
              </h3>

              <button
                type="button"
                title="ปิด"
                aria-label="ปิด"
                onClick={
                  closePhotoModal
                }
              >
                <FontAwesomeIcon
                  icon={faXmark}
                />
              </button>
            </div>

            <img
              src={photoUrl}
              alt={`รูปใบหน้าของ ${photoTarget.employee_code}`}
            />

            <div
              className={
                styles.modalActions
              }
            >
              <button
                type="button"
                onClick={
                  replaceCurrentPhoto
                }
              >
                <FontAwesomeIcon
                  icon={faCamera}
                />

                เปลี่ยนรูป
              </button>

              <button
                type="button"
                className={
                  styles.danger
                }
                onClick={() =>
                  void removePhoto()
                }
              >
                <FontAwesomeIcon
                  icon={faCheck}
                />

                ลบรูป
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RegisterCameraModal
        open={Boolean(cameraTarget)}
        onClose={() =>
          setCameraTarget(null)
        }
        onCaptured={(dataUrl) =>
          void handleCaptured(
            dataUrl,
          )
        }
      />
    </section>
  );
}

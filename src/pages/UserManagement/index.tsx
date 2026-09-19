import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faCheck,
  faMagnifyingGlass,
  faXmark,
  faUserPlus,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";

import RegisterCameraModal from "@/components/RegisterCameraModal";
import PermissionErrorModal from "@/components/auth/popup/PermissionErrorModal";
import { useAppStore } from "@/store";
import type { AdminEmployee } from "@/types/api";

import styles from "./UserManagement.module.css";

export default function UserManagement() {
  const users = useAppStore((state) => state.adminUsers);
  const page = useAppStore((state) => state.adminUsersPage);
  const total = useAppStore((state) => state.adminUsersTotal);
  const busy = useAppStore((state) => state.adminUsersBusy);
  const error = useAppStore((state) => state.adminUsersError);
  const notice = useAppStore((state) => state.adminUsersNotice);
  const load = useAppStore((state) => state.loadAdminUsers);
  const setPage = useAppStore((state) => state.setAdminUsersPage);
  const applySearch = useAppStore((state) => state.applyAdminUsersSearch);
  const getFaceProfile = useAppStore((state) => state.getAdminFaceProfile);
  const deleteFaceProfile = useAppStore((state) => state.deleteAdminFaceProfile);
  const replaceFaceProfile = useAppStore((state) => state.replaceAdminFaceProfile);
  const clearMessages = useAppStore((state) => state.clearAdminUsersMessages);
  const [search, setSearch] = useState("");

  const [cameraTarget, setCameraTarget] =
    useState<AdminEmployee | null>(null);

  const [photoUrl, setPhotoUrl] =
    useState<string | null>(null);

  const [photoTarget, setPhotoTarget] =
    useState<AdminEmployee | null>(null);

  const pages = Math.max(1, Math.ceil(total / 25));

  useEffect(() => {
    void load();
  }, [load]);

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
    void applySearch(search);
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
            จัดการผู้ใช้งาน
          </h2>

          <p>
            พนักงานทั้งหมด {total} คน
          </p>
        </div>
      </div>

      <form
        className={styles.search}
        onSubmit={handleSearch}
      >
        <div className={styles.searchContainer}>
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
          />

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              clearMessages();
            }}
            placeholder="ค้นหารหัส ชื่อ หรืออีเมล"
            aria-label="ค้นหาพนักงาน"
            className={styles.searchInput}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className={styles.searchButton}
        >
          ค้นหา
        </button>
      </form>

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
        <table>
          <thead>
            <tr>
              <th className={styles.idColumn}>
                ลำดับ
              </th>

              <th>
                พนักงาน
              </th>

              <th>
                บทบาท
              </th>

              <th>
                สถานะ
              </th>

              <th>
                รูปใบหน้า
              </th>

              <th>
                การจัดการ
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map(
              (employee, index) => {
                const rowNumber =
                  (page - 1) * 25 +
                  index +
                  1;

                return (
                  <tr
                    key={
                      employee.employee_code
                    }
                  >
                    <td
                      className={
                        styles.idColumn
                      }
                    >
                      <strong
                        className={
                          styles.rowId
                        }
                      >
                        {rowNumber}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {
                          employee.employee_code
                        }
                      </strong>

                      <span>
                        {
                          employee.first_name
                        }{" "}
                        {
                          employee.last_name
                        }
                      </span>
                    </td>

                    <td>
                      {employee.role_name ??
                        employee.role_id}
                    </td>

                    <td>
                      <span
                        className={
                          employee.is_active
                            ? styles.active
                            : styles.inactive
                        }
                      >
                        {employee.is_active
                          ? "เปิดใช้งาน"
                          : "ปิดใช้งาน"}
                      </span>
                    </td>

                    <td>
                      {employee.has_face_profile
                        ? (employee.face_profile_location ?? "มีรูปแล้ว")
                        : "ยังไม่มี"}
                    </td>

                    <td
                      className={
                        styles.actions
                      }
                    >
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
                          if (
                            employee.has_face_profile
                          ) {
                            void showPhoto(
                              employee,
                            );
                          } else {
                            setCameraTarget(
                              employee,
                            );
                          }
                        }}
                      >
                        <FontAwesomeIcon
                          icon={
                            employee.has_face_profile
                              ? faUserCheck
                              : faUserPlus
                          }
                        />
                      </button>
                    </td>
                  </tr>
                );
              },
            )}

            {!busy &&
            users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={styles.empty}
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
            setPage(Math.max(1, page - 1))
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
            setPage(Math.min(pages, page + 1))
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

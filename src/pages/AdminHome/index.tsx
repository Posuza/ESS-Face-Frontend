import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { TbUserScan, TbUserHexagon } from "react-icons/tb";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import AdminHeader from "@/layout/AdminHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import RegisterModelSettings from "@/pages/RegisterModelSettings";
import UserManagement from "@/pages/UserManagement";
import VerificationModelSettings from "@/pages/VerificationModelSettings";
import { canEditAdminModels } from "@/services/admin.service";
import { useAppStore } from "@/store";

import styles from "./AdminHome.module.css";

type AdminView = "home" | "users" | "register-model" | "verify-model";

export default function AdminHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAppStore((state) => state.adminSession);
  const logoutAdmin = useAppStore((state) => state.logoutAdmin);
  const section = searchParams.get("section");
  const view: AdminView =
    section === "users" || section === "register-model" || section === "verify-model"
      ? section
      : "home";

  if (!session) return <Navigate to="/admin/login" replace />;

  const displayName = `${session.first_name} ${session.last_name}`.trim();
  const canEditModels = canEditAdminModels(session);
  const allowedView: AdminView =
    canEditModels || view === "home" || view === "users" ? view : "users";

  function logout() {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  }

  function setView(nextView: AdminView) {
    if (nextView === "home") {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ section: nextView }, { replace: true });
  }

  return (
    <main className={styles.page}>
      {allowedView === "home" ? (
        <div className={styles.homeShell}>
          <section className={styles.homeCard} aria-labelledby="admin-home-title">
            <AdminHeader empCode={session.employee_code} displayName={displayName} />
            <h2 id="admin-home-title" className={styles.title}>หน้าหลักผู้ดูแลระบบ</h2>
            <div className={styles.menuStack}>
              <button type="button" className={styles.menuButton} onClick={() => setView("users")}>
                <span className={styles.menuBox}>
                  <span className={styles.iconWrap} aria-hidden="true"><FontAwesomeIcon icon={faUserGroup} /></span>
                  <span className={styles.menuText}>จัดการผู้ใช้งาน</span>
                </span>
              </button>
              {canEditModels ? (
                <>
                  <button type="button" className={styles.menuButton} onClick={() => setView("register-model")}>
                    <span className={styles.menuBox}>
                      <span className={styles.iconWrap} aria-hidden="true"><TbUserHexagon size={24} /></span>
                      <span className={styles.menuText}>ตั้งค่าโมเดลลงทะเบียน</span>
                    </span>
                  </button>
                  <button type="button" className={styles.menuButton} onClick={() => setView("verify-model")}>
                    <span className={styles.menuBox}>
                      <span className={styles.iconWrap} aria-hidden="true"><TbUserScan size={24} /></span>
                      <span className={styles.menuText}>ตั้งค่าโมเดลยืนยันตัวตน</span>
                    </span>
                  </button>
                </>
              ) : null}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.homeLogout} onClick={logout}>
                ออกจากระบบ <FontAwesomeIcon icon={faRightFromBracket} />
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.workspace}>
          <AdminHeader empCode={session.employee_code} displayName={displayName} />
          {allowedView === "users" ? (
            <ErrorBoundary>
              <UserManagement />
            </ErrorBoundary>
          ) : null}
          {allowedView === "register-model" ? (
            <ErrorBoundary>
              <RegisterModelSettings />
            </ErrorBoundary>
          ) : null}
          {allowedView === "verify-model" ? (
            <ErrorBoundary>
              <VerificationModelSettings />
            </ErrorBoundary>
          ) : null}
          <div className={styles.workspaceActions}>
            <button type="button" className={styles.workspaceBack} onClick={() => setView("home")}>
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

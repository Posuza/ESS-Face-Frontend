import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import AdminHeader from "@/layout/AdminHeader";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminUserManagement from "@/pages/AdminUserManagement";
import {
  canAccessAdminDashboard,
  isSuperAdminRole,
} from "@/services/admin.service";
import { useAppStore } from "@/store";

import styles from "./AdminHome.module.css";

type AdminView = "home" | "users";

export default function AdminHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAppStore((state) => state.adminSession);
  const logoutAdmin = useAppStore((state) => state.logoutAdmin);
  const section = searchParams.get("section");
  const view: AdminView = section === "users" ? "users" : "home";

  if (!session) return <Navigate to="/admin/login" replace />;
  if (isSuperAdminRole(session.role_name)) {
    return <Navigate to="/super-admin/home" replace />;
  }

  const displayName = `${session.first_name} ${session.last_name}`.trim();
  const isUserManager = canAccessAdminDashboard(session);

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
      {view === "home" ? (
        <div className={styles.homeShell}>
          <section className={styles.homeCard} aria-labelledby="admin-home-title">
            <AdminHeader empCode={session.employee_code} displayName={displayName} />
            <h2 id="admin-home-title" className={styles.title}>
              {isUserManager ? "หน้าหลักผู้ดูแลระบบ" : "หน้าหลักข้อมูลพนักงาน"}
            </h2>
            <div className={styles.menuStack}>
              <button type="button" className={styles.menuButton} onClick={() => setView("users")}>
                <span className={styles.menuBox}>
                  <span className={styles.iconWrap} aria-hidden="true"><FontAwesomeIcon icon={faUserGroup} /></span>
                  <span className={styles.menuText}>
                    {isUserManager ? "จัดการผู้ใช้งาน" : "ข้อมูลพนักงาน"}
                  </span>
                </span>
              </button>
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
          {view === "users" ? (
            <ErrorBoundary>
              <AdminUserManagement />
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

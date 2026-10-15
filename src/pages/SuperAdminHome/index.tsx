import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { TbUserScan, TbUserHexagon } from "react-icons/tb";
import { Activity, KeyRound, ShieldBan } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import AdminHeader from "@/layout/AdminHeader";
import ErrorBoundary from "@/components/registeration/ErrorBoundary";
import RegisterModelSettings from "@/pages/SuperAdminRegisterModelSettings";
import SuperAdminUserManagement from "@/pages/SuperAdminUserManagement";
import SuperAdminClientApplications from "@/pages/SuperAdminClientApplications";
import SuperAdminBlockClientIP from "@/pages/SuperAdminBlockClientIP";
import SuperAdminPresenceMonitor from "@/pages/SuperAdminPresenceMonitor";
import VerificationModelSettings from "@/pages/SuperAdminVerificationModelSettings";
import { isSuperAdminRole } from "@/services/admin.service";
import { useAppStore } from "@/store";

import styles from "./SuperAdminHome.module.css";

type AdminView =
  | "home"
  | "users"
  | "client-applications"
  | "blocked-client-ips"
  | "presence-monitor"
  | "register-model"
  | "verify-model";

export default function SuperAdminHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAppStore((state) => state.adminSession);
  const logoutAdmin = useAppStore((state) => state.logoutAdmin);
  const section = searchParams.get("section");
  const view: AdminView =
    section === "users" ||
    section === "client-applications" ||
    section === "blocked-client-ips" ||
    section === "presence-monitor" ||
    section === "register-model" ||
    section === "verify-model"
      ? section
      : "home";

  if (!session) return <Navigate to="/super-admin/login" replace />;
  if (!isSuperAdminRole(session.role_name)) {
    return <Navigate to="/admin/home" replace />;
  }

  const displayName = `${session.first_name} ${session.last_name}`.trim();
  const allowedView = view;

  function logout() {
    logoutAdmin();
    navigate("/super-admin/login", { replace: true });
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
            <h2 id="admin-home-title" className={styles.title}>หน้าหลัก Super Admin</h2>
            <div className={styles.menuStack}>
              <button type="button" className={styles.menuButton} onClick={() => setView("users")}>
                <span className={styles.menuBox}>
                  <span className={styles.iconWrap} aria-hidden="true"><FontAwesomeIcon icon={faUserGroup} /></span>
                  <span className={styles.menuText}>จัดการผู้ใช้งาน</span>
                </span>
              </button>
              <button type="button" className={styles.menuButton} onClick={() => setView("client-applications")}>
                <span className={styles.menuBox}>
                  <span className={styles.iconWrap} aria-hidden="true"><KeyRound size={22} /></span>
                  <span className={styles.menuText}>จัดการแอปไคลเอนต์</span>
                </span>
              </button>
              <button type="button" className={styles.menuButton} onClick={() => setView("blocked-client-ips")}>
                <span className={styles.menuBox}>
                  <span className={styles.iconWrap} aria-hidden="true"><ShieldBan size={22} /></span>
                  <span className={styles.menuText}>จัดการ IP ที่ถูกบล็อก</span>
                </span>
              </button>
              <button type="button" className={styles.menuButton} onClick={() => setView("presence-monitor")}>
                <span className={styles.menuBox}>
                  <span className={styles.iconWrap} aria-hidden="true"><Activity size={22} /></span>
                  <span className={styles.menuText}>ติดตามการเชื่อมต่อ</span>
                </span>
              </button>
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
              <SuperAdminUserManagement />
            </ErrorBoundary>
          ) : null}
          {allowedView === "client-applications" ? (
            <ErrorBoundary>
              <SuperAdminClientApplications />
            </ErrorBoundary>
          ) : null}
          {allowedView === "blocked-client-ips" ? (
            <ErrorBoundary>
              <SuperAdminBlockClientIP />
            </ErrorBoundary>
          ) : null}
          {allowedView === "presence-monitor" ? (
            <ErrorBoundary>
              <SuperAdminPresenceMonitor />
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

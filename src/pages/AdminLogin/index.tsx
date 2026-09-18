import { useState, type FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faLock,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { Navigate, useNavigate } from "react-router-dom";

import Header from "@/layout/Header";
import PermissionErrorModal from "@/components/auth/popup/PermissionErrorModal";
import { useAppStore } from "@/store";

import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const session = useAppStore((state) => state.adminSession);
  const loginAdmin = useAppStore((state) => state.loginAdmin);
  const busy = useAppStore((state) => state.adminLoginBusy);
  const storeError = useAppStore((state) => state.adminLoginError);
  const permissionDenied = useAppStore((state) => state.adminPermissionDenied);
  const clearAdminLoginError = useAppStore((state) => state.clearAdminLoginError);
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const displayError = error || storeError;

  if (session) {
    return <Navigate to="/admin/home" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[A-Z0-9]{6}$/.test(employeeCode)) {
      setError("กรุณากรอกรหัสพนักงาน 6 ตัว โดยใช้ตัวอักษรหรือตัวเลข");
      return;
    }
    if (password.length !== 6) {
      setError("กรุณากรอกรหัสผ่าน 6 ตัว");
      return;
    }
    setError("");
    clearAdminLoginError();
    try {
      await loginAdmin(employeeCode, password);
      navigate("/admin/home", { replace: true });
    } catch (loginError) {
      if (!(loginError instanceof Error && loginError.message.includes("ไม่มีสิทธิ์"))) {
        setError(loginError instanceof Error ? loginError.message : "เข้าสู่ระบบไม่สำเร็จ");
      }
    }
  }

  return (
    <main className={styles["guts-bg"]}>
      <div className={styles["guts-app-header"]} aria-label="Admin Login">
        <Header empCode="" displayName="" showUserCard={false} />
      </div>

      <section className={styles["guts-card"]} aria-labelledby="admin-login-title">
        <h2 id="admin-login-title" className={styles["guts-card-title"]}>เข้าสู่ระบบผู้ดูแล</h2>

        <form className={styles["guts-form"]} onSubmit={submit}>
          {/* Employee Code Field */}
          <label className={styles["guts-label"]}>
            <span>รหัสพนักงาน</span>
            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <FontAwesomeIcon icon={faUserShield} />
              </span>

              <input
                className={[
                  styles["guts-input"],
                  styles["guts-input--with-left"],
                ].join(" ")}
                value={employeeCode}
                onChange={(event) => {
                  setEmployeeCode(
                    event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6),
                  );
                  setError("");
                  clearAdminLoginError();
                }}
                autoComplete="username"
                maxLength={6}
                autoFocus
              />
            </div>
          </label>

          {/* Password Field */}
          <label className={styles["guts-label"]}>
            <span>รหัสผ่าน</span>
            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <FontAwesomeIcon icon={faLock} />
              </span>

              <input
                className={[
                  styles["guts-input"],
                  styles["guts-input--with-left"],
                  styles["guts-input--with-right"],
                ].join(" ")}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value.replace(/\s/g, "").slice(0, 6));
                  setError("");
                  clearAdminLoginError();
                }}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={6}
              />

              <button
                type="button"
                className={styles["guts-icon-right-btn"]}
                onClick={() => setShowPassword((value) => !value)}
                title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>

          <PermissionErrorModal
            open={permissionDenied || Boolean(displayError)}
            message={
              permissionDenied
                ? "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้ดูแล"
                : displayError
            }
            variant="warning"
            onClose={() => {
              setError("");
              clearAdminLoginError();
            }}
          />

          {/* Submit Button */}
          <button className={styles["guts-btn"]} type="submit" disabled={busy}>
            {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </section>
    </main>
  );
}

import { useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import styles from "./PasswordLogin.module.css";

type Props = {
  empCode: string;
  pin: string;
  loading?: boolean;
  onChangeEmp: (value: string) => void;
  onChangePin: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
  onChangePassword: () => void;
};

export default function PasswordLogin({
  empCode,
  pin,
  loading = false,
  onChangeEmp,
  onChangePin,
  onSubmit,
  onBack,
  onForgotPassword,
  onChangePassword,
}: Props) {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className={styles["login-panel"]}>
      <section className={styles["guts-card"]} aria-label="Login form">
        <div className={styles["guts-card-title"]}>เข้าสู่ระบบ</div>

        <form
          className={styles["guts-form"]}
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) onSubmit();
          }}
        >
          <div>
            <div className={styles["guts-label"]}>รหัสพนักงาน (6 หลัก)</div>
            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                className={`${styles["guts-input"]} ${styles["guts-input--with-left"]}`}
                value={empCode}
                onChange={(e) => onChangeEmp(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                disabled={loading}
                aria-label="Employee code 6 digits"
              />
            </div>
          </div>

          <div>
            <div className={styles["guts-label"]}>กรอกรหัส (6 ตัวอักษร)</div>
            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                className={`${styles["guts-input"]} ${styles["guts-input--with-left"]} ${styles["guts-input--with-right"]}`}
                value={pin}
                onChange={(e) => onChangePin(e.target.value)}
                autoComplete="off"
                type={showPin ? "text" : "password"}
                maxLength={6}
                disabled={loading}
                aria-label="PIN 6 characters"
              />
              <button
                type="button"
                className={styles["guts-icon-right-btn"]}
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? "ซ่อนรหัส PIN" : "แสดงรหัส PIN"}
                disabled={loading}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button className={styles["guts-btn"]} type="submit" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "กดเข้าสู่ระบบ"}
          </button>

          <div className={styles["guts-links"]}>
            <button type="button" className={`${styles["guts-link"]} ${styles.primary}`} onClick={onForgotPassword}>
              คลิกลืมรหัสผ่าน
            </button>
            <button type="button" className={`${styles["guts-link"]} ${styles.primary}`} onClick={onChangePassword}>
              เปลี่ยนรหัสผ่าน
            </button>
            <button type="button" className={`${styles["guts-link"]} ${styles.secondary}`} onClick={() => alert("TODO: คู่มือการใช้งาน")}>
              คลิกอ่านคู่มือ
            </button>
          </div>
        </form>
      </section>

      <button type="button" className={styles["guts-back-btn"]} onClick={onBack} disabled={loading}>
        ย้อนกลับ
      </button>
    </div>
  );
}

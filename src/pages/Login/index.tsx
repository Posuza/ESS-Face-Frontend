import React, { useState, useEffect } from "react";
import Header from "@/layout/Header";
import ForgotPasswordModal from "@/components/auth/models/ForgotPasswordModal";
import ChangePasswordModal from "@/components/auth/models/ChangePasswordModal";
import TimingMessagePopUp from "@/components/auth/popup/TimingMessagePopUp";
import FirstLoginModal from "@/components/auth/models/FirstLoginModal";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/store/store";
import styles from "./Login.module.css";

type Props = {
  onLoginSuccess: (empCode: string, displayName: string) => void;
};

export default function Login({ onLoginSuccess }: Props) {
  const [empCode, setEmpCode] = useState(
    () => sessionStorage.getItem("emp_code") || "",
  );
  const [pin, setPin] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [changeOldPin, setChangeOldPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null,
  );
  const [firstLoginOpen, setFirstLoginOpen] = useState(false);

  const authError = useStore((s) => s.authError);
  const authErrorKey = useStore((s) => s.authErrorKey);
  const authContacts = useStore((s) => s.authContacts);

  // Open failed modal when server error or local validation error exists
  useEffect(() => {
    setShowFailedModal(!!authError || !!localErrorMessage);
  }, [authError, localErrorMessage]);

  const handleSubmit = async () => {
    // Local validation: step-by-step behavior
    const empValidNow = /^\d{6}$/.test(empCode);
    const pinValidNow = pin.length === 6;

    // If both fields are empty, show both messages together
    if (empCode.trim() === "" && pin.trim() === "") {
      setLocalErrorMessage(
        "กรุณากรอกรหัสพนักงาน 6 หลัก \n และ \n รหัสผ่าน 6 ตัวอักษร",
      );
      return;
    }

    // If employee is present but not valid, show emp message only
    if (!empValidNow) {
      setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
      return;
    }

    // Employee valid -> check pin
    if (!pinValidNow) {
      setLocalErrorMessage("กรุณากรอกรหัสผ่าน 6 ตัวอักษร");
      return;
    }

    // All good — call store directly
    const success = await useStore.getState().login(empCode, pin);
    if (success) {
      const emp = useStore.getState().authEmployee;
      if (emp) {
        const displayName =
          `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;
        setEmpCode(emp.employee_code);
        onLoginSuccess(emp.employee_code, displayName);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!/^\d{6}$/.test(empCode)) {
      return {
        success: false,
        message: "กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง",
      };
    }
    const { forgotPassword } = useStore.getState();
    return await forgotPassword(empCode);
  };

  const handleChangePassword = async (oldPin: string, newPin: string) => {
    const { changePassword } = useStore.getState();
    return await changePassword(empCode, oldPin, newPin);
  };

  return (
    <main className={styles["guts-bg"]}>
      {/* ✅ ใช้ Header ร่วมทุกหน้า */}
      <div
        className={styles["guts-app-header"]}
        aria-label="Employee Self Service"
      >
        <Header showUserCard={false} />
      </div>

      <section className={styles["guts-card"]} aria-label="Login form">
        <div className={styles["guts-card-title"]}>เข้าสู่ระบบ</div>

        <form
          className={styles["guts-form"]}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {/* Employee */}
          <div>
            <div className={styles["guts-label"]}>รหัสพนักงาน (6 หลัก)</div>

            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <User size={18} />
              </span>

              <input
                className={[
                  styles["guts-input"],
                  styles["guts-input--with-left"],
                ].join(" ")}
                value={empCode}
                onChange={(e) => {
                  setEmpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (localErrorMessage) setLocalErrorMessage(null);
                }}
                inputMode="numeric"
                autoComplete="off"
                aria-label="Employee code 6 digits"
              />
            </div>
          </div>

          {/* password */}
          <div>
            <div className={styles["guts-label"]}>กรอกรหัส (6 ตัวอักษร)</div>

            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true">
                <Lock size={18} />
              </span>

              <input
                className={[
                  styles["guts-input"],
                  styles["guts-input--with-left"],
                  styles["guts-input--with-right"],
                ].join(" ")}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\s/g, "").slice(0, 6));
                  if (localErrorMessage) setLocalErrorMessage(null);
                }}
                inputMode="text"
                autoComplete="off"
                type={showPin ? "text" : "password"}
                maxLength={6}
                aria-label="PIN 6 digits"
              />

              <button
                type="button"
                className={styles["guts-icon-right-btn"]}
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? "ซ่อนรหัส PIN" : "แสดงรหัส PIN"}
                title={showPin ? "ซ่อนรหัส" : "แสดงรหัส"}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remove inline error, use modal instead */}

          <button className={styles["guts-btn"]} type="submit">
            กดเข้าสู่ระบบ
          </button>

          <div className={styles["guts-links"]}>
            <button
              type="button"
              className={[styles["guts-link"], styles.primary].join(" ")}
              onClick={() => setForgotOpen(true)}
            >
              คลิกลืมรหัสผ่าน
            </button>
            <button
              type="button"
              className={[styles["guts-link"], styles.primary].join(" ")}
              onClick={() => setChangePassOpen(true)}
            >
              เปลี่ยนรหัสผ่าน
            </button>
            <button
              type="button"
              className={[styles["guts-link"], styles.secondary].join(" ")}
              onClick={() => alert("TODO: คู่มือการใช้งาน")}
            >
              คลิกอ่านคู่มือ
            </button>
          </div>
        </form>
      </section>

      {/* Login Failed Modal */}
      <TimingMessagePopUp
        open={showFailedModal}
        variant={
          localErrorMessage || authErrorKey === "INVALID_CREDENTIALS"
            ? "warning"
            : "error"
        }
        message={authError || localErrorMessage || ""}
        // Use server-provided authErrorKey first. Avoid referencing localErrorKey here to prevent runtime ReferenceError from stale bundles.
        errorKey={authErrorKey || null}
        contacts={authContacts}
        onClose={() => {
          setShowFailedModal(false);
          setLocalErrorMessage(null);
        }}
      />

      <ForgotPasswordModal
        open={forgotOpen}
        empCode={empCode}
        onChangeEmp={(v) => setEmpCode(v.replace(/\D/g, "").slice(0, 6))}
        onClose={() => {
          setPin("");
          setForgotOpen(false);
        }}
        onSend={handleForgotPassword}
      />

      <ChangePasswordModal
        open={changePassOpen}
        empCode={empCode}
        oldPin={changeOldPin}
        newPin={changeNewPin}
        onChangeEmp={(v) => setEmpCode(v.replace(/\D/g, "").slice(0, 6))}
        onChangeOldPin={setChangeOldPin}
        onChangeNewPin={setChangeNewPin}
        onClose={() => {
          setChangePassOpen(false);
          setChangeOldPin("");
          setChangeNewPin("");
        }}
        onForgotPassword={() => {
          setChangePassOpen(false);
          setChangeOldPin("");
          setChangeNewPin("");
          setForgotOpen(true);
        }}
        onSubmit={() => handleChangePassword(changeOldPin, changeNewPin)}
      />

      <FirstLoginModal
        open={firstLoginOpen}
        empCode={empCode}
        onClose={() => setFirstLoginOpen(false)}
        onRequestPassword={async () => {
          const { forgotPassword } = useStore.getState();
          await forgotPassword(empCode);
          setFirstLoginOpen(false);
        }}
      />
    </main>
  );
}

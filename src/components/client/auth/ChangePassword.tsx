import { useState } from "react";
import { CheckCircle, Eye, EyeOff, Lock, User } from "lucide-react";
import TimingMessagePopUp from "@/components/client/auth/popup/TimingMessagePopUp";
import BigIconSuccessSmsPopUp from "@/components/client/auth/popup/BigIconSuccessSmsPopUp";
import styles from "./ChangePassword.module.css";

type Result = {
  success: boolean;
  message: string;
  error?: string;
  contacts?: Array<{ team?: string; email?: string }>;
};

type Props = {
  empCode: string;
  oldPin: string;
  newPin: string;
  onChangeEmp: (value: string) => void;
  onChangeOldPin: (value: string) => void;
  onChangeNewPin: (value: string) => void;
  onBack: () => void;
  onForgotPassword: () => void;
  onSubmit: () => Promise<Result>;
};

export default function ChangePassword({
  empCode,
  oldPin,
  newPin,
  onChangeEmp,
  onChangeOldPin,
  onChangeNewPin,
  onBack,
  onForgotPassword,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultContacts, setResultContacts] = useState<Array<{ team?: string; email?: string }> | undefined>();

  const handleSubmit = async () => {
    if (!/^\d{6}$/.test(empCode)) return setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
    if (!/^\d{6}$/.test(oldPin)) return setLocalErrorMessage("กรุณากรอกรหัสผ่านล่าสุดเป็นตัวเลข 6 หลัก");
    if (!/^\d{6}$/.test(newPin)) return setLocalErrorMessage("กรุณากรอกรหัสผ่านใหม่เป็นตัวเลข 6 หลัก");
    if (oldPin === newPin) return setLocalErrorMessage("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านล่าสุด");

    setLocalErrorMessage(null);
    setLoading(true);
    try {
      const result = await onSubmit();
      setResultSuccess(result.success);
      setResultMessage(result.message || (result.success ? "เปลี่ยนรหัสผ่านสำเร็จ" : "เกิดข้อผิดพลาด"));
      setResultContacts(result.contacts);
      setShowResult(true);
    } catch {
      setResultSuccess(false);
      setResultMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายบุคคล");
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  const passwordField = (
    label: string,
    value: string,
    show: boolean,
    setShow: (value: boolean) => void,
    onChange: (value: string) => void,
  ) => (
    <div>
      <div className={styles["guts-label"]}>{label}</div>
      <div className={styles["guts-field"]}>
        <span className={styles["guts-icon-left"]} aria-hidden="true"><Lock size={18} /></span>
        <input
          className={`${styles["guts-input"]} ${styles["guts-input--with-left"]} ${styles["guts-input--with-right"]}`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
          type={show ? "text" : "password"}
          maxLength={6}
          inputMode="numeric"
          autoComplete={label.includes("ล่าสุด") ? "current-password" : "new-password"}
          disabled={loading}
        />
        <button type="button" className={styles["guts-icon-right-btn"]} onClick={() => setShow(!show)} disabled={loading} aria-label={show ? "ซ่อนรหัส" : "แสดงรหัส"}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles["login-panel"]}>
      <section className={styles["guts-card"]} aria-label="Change password">
        <div className={styles["guts-card-title"]}>เปลี่ยนรหัสผ่าน</div>
        <div className={styles["guts-form"]}>
          <div>
            <div className={styles["guts-label"]}>รหัสพนักงาน (6 หลัก)</div>
            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true"><User size={18} /></span>
              <input className={`${styles["guts-input"]} ${styles["guts-input--with-left"]}`} value={empCode} onChange={(e) => onChangeEmp(e.target.value)} inputMode="numeric" autoComplete="off" disabled={loading} />
            </div>
          </div>

          {passwordField("รหัสผ่านล่าสุด (6 หลัก)", oldPin, showOldPin, setShowOldPin, onChangeOldPin)}
          {passwordField("รหัสผ่านใหม่ (6 หลัก)", newPin, showNewPin, setShowNewPin, onChangeNewPin)}

          <button type="button" className={styles["guts-btn"]} onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
          <button type="button" className={`${styles["guts-link"]} ${styles.primary}`} onClick={onForgotPassword} disabled={loading}>คลิกลืมรหัสผ่าน</button>
        </div>
      </section>

      <button type="button" className={styles["guts-back-btn"]} onClick={onBack} disabled={loading}>ย้อนกลับ</button>

      <TimingMessagePopUp open={!!localErrorMessage} variant="warning" message={localErrorMessage || ""} errorKey={null} onClose={() => setLocalErrorMessage(null)} />
      {resultSuccess ? (
        <BigIconSuccessSmsPopUp open={showResult} icon={<CheckCircle />} iconColor="#16a34a" title="เปลี่ยนรหัสผ่านสำเร็จ" subText="ระบบได้เปลี่ยนรหัสผ่านของคุณเรียบร้อยแล้ว" onClose={() => { setShowResult(false); onBack(); }} />
      ) : (
        <TimingMessagePopUp open={showResult} variant="warning" message={resultMessage} errorKey={null} contacts={resultContacts} closeOnBackdrop closeOnEsc onClose={() => setShowResult(false)} />
      )}
    </div>
  );
}

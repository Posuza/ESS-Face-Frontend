import { useEffect, useRef, useState } from "react";
import { User, X, MailCheck } from "lucide-react";
import styles from "./ForgotPasswordModal.module.css";
import TimingMessagePopUp from "../popup/TimingMessagePopUp";
import BigIconSuccessSmsPopUp from "../popup/BigIconSuccessSmsPopUp";

type Props = {
  open: boolean;
  empCode: string;
  onChangeEmp: (v: string) => void;
  onClose: () => void;
  onSend: () => Promise<{
    success: boolean;
    message: string;
    error?: string;
    contacts?: Array<{ team?: string; email?: string }>;
  }>;
};

export default function ForgotPasswordModal({
  open,
  empCode,
  onChangeEmp,
  onClose,
  onSend,
}: Props) {
  const empValid = /^\d{6}$/.test(empCode);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultContacts, setResultContacts] = useState<
    Array<{ team?: string; email?: string }> | undefined
  >(undefined);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      // Reset states when modal opens
      setShowResult(false);
      setResultSuccess(false);
      setResultMessage("");
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSend = async () => {
    setLoading(true);
    try {
      const result = await onSend();
      setResultSuccess(result.success);
      if (result.success) {
        setResultMessage("ระบบได้ส่งรหัสผ่านไปยังอีเมลที่ลงทะเบียนไว้แล้ว");
      } else {
        setResultMessage(result.message || "เกิดข้อผิดพลาด");
        setResultContacts(result.contacts);
      }
      setShowResult(true);
    } catch (err) {
      setResultSuccess(false);
      setResultMessage(
        "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายบุคคล",
      );
      setShowResult(true);
    } finally {
      setLoading(false);
    }
  };

  const closeResult = () => {
    setShowResult(false);
    setResultSuccess(false);
  };

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Forgot password"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.head}>
          <h3 className={styles.title}>ลืมรหัสผ่าน</h3>

          <X
            size={35}
            strokeWidth={2.5}
            onClick={onClose}
            className={styles.closeBtn}
          />
        </div>

        <>
          <p className={styles.desc}>
            กรอกรหัสพนักงาน 6 หลัก แล้วกดส่งรหัส
            ระบบจะส่งรหัสไปยังอีเมลที่ลงทะเบียนไว้
          </p>

          <div className={styles.form}>
            <div className={styles.label}>รหัสพนักงาน (6 หลัก)</div>
            <div className={styles.field}>
              <span className={styles.iconLeft} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                ref={inputRef}
                className={styles.inputWithIcon}
                value={empCode}
                onChange={(e) => {
                  onChangeEmp(e.target.value);
                }}
                inputMode="numeric"
                autoComplete="off"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={loading}
              onClick={handleSend}
            >
              {loading ? "กำลังส่ง..." : "กดส่งรหัสผ่าน"}
            </button>

            <button
              type="button"
              className={styles.backBtn}
              onClick={onClose}
              disabled={loading}
            >
              ย้อนกลับ
            </button>
          </div>

          {/*<div className={styles.warn} style={{ marginTop: 10 }}>
            **ระบบจะส่งรหัสไปอีเมลที่ลงทะเบียนไว้
            <br />
            หากไม่ได้รับอีเมล กรุณาติดต่อฝ่ายบุคคล
          </div>*/}
        </>
      </div>

      {resultSuccess ? (
        <BigIconSuccessSmsPopUp
          open={showResult}
          icon={<MailCheck size={80} />}
          iconColor="gray"
          title="กรุณาตรวจสอบรหัสผ่านของคุณในอีเมล์"
          subText={resultMessage}
          onClose={() => {
            setShowResult(false);
            setResultSuccess(false);
            onClose();
          }}
        />
      ) : (
        <TimingMessagePopUp
          open={showResult}
          variant="warning"
          message={resultMessage}
          errorKey={null}
          contacts={resultContacts}
          closeOnBackdrop={true}
          closeOnEsc={true}
          onClose={closeResult}
        />
      )}
    </div>
  );
}

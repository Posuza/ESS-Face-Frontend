import { useEffect, useState, useCallback } from "react";
import { LogOut, Check, X } from "lucide-react";
import styles from "./LogoutPopUp.module.css";

export type LogoutStatus = "attempt" | "success" | "fail";

type Props = {
  open: boolean;
  /** Which visual state to show */
  status: LogoutStatus;
  /** Called when popup finishes closing animation */
  onClose: () => void;
  /** Called when user clicks OK on fail state */
  onRetry?: () => void;
  /** Title per state */
  titles?: {
    attempt?: string;
    success?: string;
    fail?: string;
  };
  /** Sub-text per state */
  subTexts?: {
    attempt?: string;
    success?: string;
    fail?: string;
  };
};

const EXIT_DURATION = 200;

const DEFAULT_TITLES = {
  attempt: "กำลังออกจากระบบ",
  success: "ออกจากระบบสำเร็จ",
  fail: "ออกจากระบบไม่สำเร็จ",
};

const DEFAULT_SUBTEXTS = {
  attempt: "กรุณารอสักครู่...",
  success: "",
  fail: "กรุณาลองอีกครั้งหรือติดต่อทีมพัฒนา",
};

export default function LogoutPopUp({
  open,
  status,
  onClose,
  onRetry,
  titles,
  subTexts,
}: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [closing, setClosing] = useState(false);

  const t = { ...DEFAULT_TITLES, ...titles };
  const s = { ...DEFAULT_SUBTEXTS, ...subTexts };

  // Mount / unmount with exit animation
  useEffect(() => {
    if (open) {
      setClosing(false);
      setShouldRender(true);
    } else if (shouldRender) {
      setClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, EXIT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  const startClosing = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setShouldRender(false);
      setClosing(false);
      onClose?.();
    }, EXIT_DURATION);
  }, [closing, onClose]);

  // Auto-close on success after 1.5s
  useEffect(() => {
    if (!shouldRender || closing || status !== "success") return;
    const timer = setTimeout(() => startClosing(), 1500);
    return () => clearTimeout(timer);
  }, [shouldRender, closing, status, startClosing]);

  // Attempt auto-close safeguard: close after 8s even if no response
  useEffect(() => {
    if (!shouldRender || closing || status !== "attempt") return;
    const timer = setTimeout(() => startClosing(), 8000);
    return () => clearTimeout(timer);
  }, [shouldRender, closing, status, startClosing]);

  if (!shouldRender) return null;

  const isAttempt = status === "attempt";
  const isSuccess = status === "success";
  const isFail = status === "fail";

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={t.attempt}
      onClick={() => {
        if (isFail) startClosing();
      }}
    >
      <div
        className={`${styles.modal} ${closing ? styles.modalClosing : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Icon ── */}
        <div className={styles.iconBadge}>
          <div className={styles.iconWrap}>
            {isAttempt && <LogOut className={styles.attemptIcon} />}
            {isSuccess && <Check className={styles.successIcon} />}
            {isFail && <X className={styles.failIcon} />}
          </div>
        </div>

        {/* ── Title ── */}
        <h2
          className={`${styles.title} ${
            isSuccess ? styles.titleSuccess : isFail ? styles.titleFail : ""
          }`}
        >
          {isAttempt && t.attempt}
          {isSuccess && t.success}
          {isFail && t.fail}
        </h2>

        {/* ── Sub-text ── */}
        {(isAttempt || isFail) && (
          <p className={styles.subText}>
            {isAttempt && s.attempt}
            {isFail && s.fail}
          </p>
        )}

        {/* ── Progress bar (attempt only) ── */}
        {isAttempt && (
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressBar} />
          </div>
        )}

        {/* ── OK button (fail only) ── */}
        {isFail && (
          <button
            type="button"
            className={styles.okBtn}
            onClick={() => {
              onRetry?.();
              startClosing();
            }}
          >
            ตกลง
          </button>
        )}
      </div>
    </div>
  );
}

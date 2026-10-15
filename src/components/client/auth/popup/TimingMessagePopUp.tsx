import { useEffect } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import styles from "./TimingMessagePopUp.module.css";

type Props = {
  open: boolean;
  message?: string;
  /** @default "warning" */
  variant?: "warning" | "error";
  errorKey?: string | null;
  contacts?: Array<{ team?: string; email?: string }>;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose?: () => void;
};

export default function TimingMessagePopUp({
  open,
  message = "",
  variant = "error",
  errorKey,
  contacts,
  closeOnBackdrop = true,
  closeOnEsc = true,
  onClose,
}: Props) {
  // Listen for Escape key to close the popup
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEsc, onClose]);

  // Auto-close timing logic — 3s without contacts, 4s with contacts
  useEffect(() => {
    if (!open) return;

    const showContacts =
      contacts && contacts.length > 0 && errorKey !== "INVALID_CREDENTIALS";
    const delay = showContacts ? 4000 : 3000;

    const timer = setTimeout(() => {
      onClose?.();
    }, delay);

    return () => clearTimeout(timer);
  }, [open, contacts, errorKey, onClose]);

  if (!open) return null;

  const showContacts =
    contacts && contacts.length > 0 && errorKey !== "INVALID_CREDENTIALS";

  // Determine Title text dynamically based on the error type/message content
  let titleText = "แจ้งเตือน";
  if (variant === "error") {
    const isConnectionError =
      errorKey === "PROXY_AUTH_REQUIRED" ||
      errorKey === "NETWORK_AUTH_REQUIRED" ||
      errorKey === "INTERNAL_ERROR" ||
      !errorKey ||
      message.includes("เชื่อมต่อ") ||
      message.includes("เซิร์ฟเวอร์") ||
      message.includes("ฐานข้อมูล") ||
      message.includes("server") ||
      message.includes("database") ||
      message.includes("connect");

    titleText = isConnectionError
      ? "ข้อผิดพลาดในการเชื่อมต่อ"
      : "เกิดข้อผิดพลาด";
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
      onClick={() => {
        if (!closeOnBackdrop) return;
        onClose?.();
      }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.badge} aria-hidden="true">
          {variant === "error" ? (
            <AlertCircle className={styles.badgeIcon} />
          ) : (
            <AlertTriangle className={styles.badgeIcon} />
          )}
        </div>

        <div
          className={
            variant === "error" ? styles.errorTitle : styles.warningTitle
          }
        >
          {titleText}
        </div>

        <div className={styles.body}>
          <div className={styles.messageArea}>
            {message.split("\n").map((line, i) => (
              <div key={i} className={styles.messageLine}>
                {line}
              </div>
            ))}

            {showContacts && (
              <div className={styles.contacts}>
                {contacts.map((c, idx) => (
                  <div key={idx} className={styles.contact}>
                    {/*<div>
                      <span className={styles.contactLabel}>ติดต่อ: </span>
                      <span className={styles.contactValue}>
                        {c.team || "ไม่ระบุ"}
                      </span>
                    </div>*/}
                    {c.email && (
                      <div className={styles.contactEmail}>( {c.email} )</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import faceScanIcon from "@/assets/common/face-scan.svg";
import styles from "./MessagePopUp.module.css";

type Props = {
  open: boolean;
  message?: string;
  /** @default "warning" */
  variant?: "warning" | "error";
  errorKey?: string | null;
  contacts?: Array<{ team?: string; email?: string }>;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
};

export default function MessagePopUp({
  open,
  message = "",
  variant = "warning",
  errorKey,
  contacts,
  closeOnBackdrop = false,
  closeOnEsc = false,
  actionHref,
  actionLabel = "ลงทะเบียนใบหน้า",
  onAction,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const showContacts =
    contacts && contacts.length > 0 && errorKey !== "INVALID_CREDENTIALS";

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
        if (closeOnBackdrop) onClose();
      }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="ปิดหน้าต่างแจ้งเตือน"
          onClick={onClose}
        >
          <X className={styles.closeIcon} aria-hidden="true" />
        </button>

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
                    {c.email && (
                      <div className={styles.contactEmail}>({c.email})</div>
                    )}
                  </div>
                ))}
              </div>
            )}


              <div className={styles.orDivider} aria-hidden="true">
                <span className={styles.orLine} />
                <span className={styles.orText}>หรือ</span>
                <span className={styles.orLine} />
              </div>


            {actionHref && (
              <Link className={styles.actionLink} to={actionHref} onClick={onAction}>
                <span className={styles.actionCenter}>
                  <span className={styles.actionIconWrap} aria-hidden="true">
                    <img
                      className={styles.actionIcon}
                      src={faceScanIcon}
                      alt=""
                    />
                  </span>

                  <span className={styles.actionLabel}>{actionLabel}</span>
                </span>

                <ChevronRight
                  className={styles.actionChevron}
                  aria-hidden="true"
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

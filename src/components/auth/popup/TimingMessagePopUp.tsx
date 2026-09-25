import { useEffect } from "react";
import { AlertCircle, AlertTriangle, BookOpen } from "lucide-react";

import styles from "./TimingMessagePopUp.module.css";

type Props = {
  open: boolean;
  message?: string;
  variant?: "warning" | "error";
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  showTutorialAction?: boolean;
  tutorialLabel?: string;
  onViewTutorial?: () => void;
  onClose?: () => void;
};

export default function TimingMessagePopUp({
  open,
  message = "",
  variant = "error",
  closeOnBackdrop = true,
  closeOnEsc = true,
  showTutorialAction = false,
  tutorialLabel = "ดูบทเรียน",
  onViewTutorial,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEsc, onClose, open]);

  useEffect(() => {
    if (!open || showTutorialAction) return;

    const timer = window.setTimeout(() => onClose?.(), 3000);
    return () => window.clearTimeout(timer);
  }, [onClose, open, showTutorialAction]);

  if (!open) return null;

  const isConnectionError =
    variant === "error" &&
    [
      "เชื่อมต่อ",
      "เซิร์ฟเวอร์",
      "ฐานข้อมูล",
      "server",
      "database",
      "connect",
    ].some((term) => message.toLowerCase().includes(term));

  const title =
    variant === "warning"
      ? "แจ้งเตือน"
      : isConnectionError
        ? "ข้อผิดพลาดในการเชื่อมต่อ"
        : "เกิดข้อผิดพลาด";

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (closeOnBackdrop) onClose?.();
      }}
    >
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.badge} aria-hidden="true">
          {variant === "error" ? (
            <AlertCircle className={styles.badgeIcon} />
          ) : (
            <AlertTriangle className={styles.badgeIcon} />
          )}
        </div>

        <div className={variant === "error" ? styles.errorTitle : styles.warningTitle}>
          {title}
        </div>

        <div className={styles.messageArea}>
          {message.split("\n").map((line, index) => (
            <div className={styles.messageLine} key={`${line}-${index}`}>
              {line}
            </div>
          ))}
        </div>

        {showTutorialAction && onViewTutorial ? (
          <button
            type="button"
            onClick={onViewTutorial}
            style={{
              minHeight: 40,
              marginTop: 14,
              padding: "0 16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              border: "1px solid #07577d",
              borderRadius: 999,
              background: "#07577d",
              color: "#fff",
              font: "inherit",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <BookOpen size={17} strokeWidth={2} aria-hidden="true" />
            {tutorialLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

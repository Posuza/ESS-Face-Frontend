import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

import styles from "./PermissionErrorModal.module.css";

interface PermissionErrorModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
  title?: string;
  variant?: "warning" | "error" | "success";
  autoCloseMs?: number;
  showCloseButton?: boolean;
}

export default function PermissionErrorModal({
  open,
  onClose,
  message = "บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้ดูแล",
  title,
  variant = "warning",
  autoCloseMs,
  showCloseButton = false,
}: PermissionErrorModalProps) {
  const hasActionButton = showCloseButton || variant === "success";
  const resolvedAutoCloseMs = autoCloseMs ?? (hasActionButton ? 0 : 3000);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || resolvedAutoCloseMs <= 0) return;
    const timer = window.setTimeout(onClose, resolvedAutoCloseMs);
    return () => window.clearTimeout(timer);
  }, [open, onClose, resolvedAutoCloseMs, autoCloseMs]);

  if (!open) return null;

  const modalTitle =
    title ??
    (variant === "success"
      ? "สำเร็จ"
      : variant === "error"
        ? "เกิดข้อผิดพลาด"
        : "แจ้งเตือน");
  const icon =
    variant === "success"
      ? faCircleCheck
      : variant === "error"
        ? faCircleExclamation
        : faTriangleExclamation;
  const variantClass =
    variant === "success"
      ? styles.success
      : variant === "error"
        ? styles.error
        : styles.warning;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      onClick={onClose}
    >
      <div
        className={[styles.modal, variantClass].join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.badge} aria-hidden="true">
          <FontAwesomeIcon icon={icon} />
        </div>

        <div
          className={
            variant === "success"
              ? styles.successTitle
              : variant === "error"
                ? styles.errorTitle
                : styles.warningTitle
          }
        >
          {modalTitle}
        </div>

        <div className={styles.body}>
          <div className={styles.messageArea}>
            {message.split("\n").map((line, index) => (
              <div className={styles.messageLine} key={`${line}-${index}`}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {hasActionButton ? (
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ตกลง
          </button>
        ) : null}
      </div>
    </div>
  );
}

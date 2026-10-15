import { useEffect, useState, useCallback } from "react";
import { CircleCheckBig, X } from "lucide-react";
import styles from "./FaceForgetPassSuccessSmsPopUp.module.css";

type Props = {
  open: boolean;
  message?: string;
  contacts?: Array<{ team?: string; email?: string }>;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose?: () => void;
};

const EXIT_ANIMATION_DURATION = 200; // ms, matches CSS exit animations

export default function FaceForgetPassSuccessSmsPopUp({
  open,
  message = "",
  contacts,
  closeOnBackdrop = false,
  closeOnEsc = true,
  onClose,
}: Props) {
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

  // Track the open prop: open → mount immediately, close → animate out then unmount
  useEffect(() => {
    if (open) {
      setClosing(false);
      setShouldRender(true);
    } else if (shouldRender) {
      setClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setClosing(false);
      }, EXIT_ANIMATION_DURATION);
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
    }, EXIT_ANIMATION_DURATION);
  }, [closing, onClose]);

  // Listen for Escape key to close
  useEffect(() => {
    if (!shouldRender || !closeOnEsc || closing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") startClosing();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldRender, closeOnEsc, closing, startClosing]);

  if (!shouldRender) return null;

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="สำเร็จ"
      onClick={() => {
        if (!closeOnBackdrop) return;
        startClosing();
      }}
    >
      <div
        className={`${styles.modal} ${closing ? styles.modalClosing : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={startClosing}
          aria-label="ปิด"
        >
          <X size={22} strokeWidth={2.6} />
        </button>

        <div className={styles.badge} aria-hidden="true">
          <CircleCheckBig className={styles.badgeIcon} />
        </div>

        <div className={styles.passwordBox}>
          <div className={styles.passwordLabel}>รหัสผ่าน :</div>
          <div className={styles.passwordValue}>{message}</div>
        </div>
      </div>
    </div>
  );
}

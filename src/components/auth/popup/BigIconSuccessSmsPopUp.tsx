import { useEffect, useState, useCallback, type ReactNode } from "react";
import { Check } from "lucide-react";
import styles from "./BigIconSuccessSmsPopUp.module.css";

type Props = {
  open: boolean;
  /** Large icon displayed at the top of the popup */
  icon?: ReactNode;
  /** Color applied to the default check icon and the icon ring (CSS color string) */
  iconColor?: string;
  /** Bold headline shown below the icon */
  title?: string;
  /** Smaller descriptive text shown below the title */
  subText?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  onClose?: () => void;
};

const EXIT_ANIMATION_DURATION = 200;

export default function BigIconSuccessSmsPopUp({
  open,
  icon,
  iconColor = "#16a34a",
  title = "สำเร็จ",
  subText = "",
  closeOnBackdrop = false,
  closeOnEsc = true,
  onClose,
}: Props) {
  const [shouldRender, setShouldRender] = useState(open);
  const [closing, setClosing] = useState(false);

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

  useEffect(() => {
    if (!shouldRender || !closeOnEsc || closing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") startClosing();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shouldRender, closeOnEsc, closing, startClosing]);

  useEffect(() => {
    if (!shouldRender || closing) return;
    const timer = setTimeout(() => {
      startClosing();
    }, 3000);
    return () => clearTimeout(timer);
  }, [shouldRender, closing, startClosing]);

  if (!shouldRender) return null;

  return (
    <div
      className={`${styles.backdrop} ${closing ? styles.backdropClosing : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => {
        if (!closeOnBackdrop) return;
        startClosing();
      }}
    >
      <div
        className={`${styles.modal} ${closing ? styles.modalClosing : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Icon (no ring) ── */}
        <div className={styles.iconBadge}>
          <div className={styles.iconWrap} style={{ color: iconColor }}>
            {icon ?? <Check className={styles.defaultIcon} />}
          </div>
        </div>

        {/* ── Title ── */}
        {/*{title && (
          <h2 className={styles.title} style={{ color: iconColor }}>
            {title}
          </h2>
        )}*/}

        {/* ── Sub-text ── */}
        {subText && <p className={styles.subText}> {title}</p>}

        {/* ── Progress bar ── */}
        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressBar} />
        </div>
      </div>
    </div>
  );
}

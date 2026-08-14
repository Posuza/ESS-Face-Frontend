import styles from "./MoLoadingPopup.module.css";

type Props = {
  open: boolean;
  message?: string;
};

export default function MoLoadingPopup({
  open,
  message = "กำลังโหลดข้อมูล...",
}: Props) {
  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className={styles.modal}>
        <div className={styles.spinner} />
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}

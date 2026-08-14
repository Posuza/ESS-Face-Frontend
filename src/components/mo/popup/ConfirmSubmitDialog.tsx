import styles from "./ConfirmSubmitDialog.module.css";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
};

export default function ConfirmSubmitDialog({
  open,
  onCancel,
  onConfirm,
  title = "ยืนยันบันทึกการแก้ไข?",
  description = "ระบบจะบันทึกข้อมูลที่แก้ไขทั้งหมด",
}: Props) {
  if (!open) return null;

  return (
    <div className={styles["dialog-overlay"]} role="dialog" aria-modal="true">
      <div className={styles["dialog-card"]}>
        <div className={styles["dialog-title"]}>{title}</div>
        <div className={styles["dialog-desc"]}>{description}</div>

        <div className={styles["dialog-actions"]}>
          <button
            type="button"
            className={[styles.btn, styles["cancel-btn"]].join(" ")}
            onClick={onCancel}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className={[styles.btn, styles["confirm-btn"]].join(" ")}
            onClick={onConfirm}
          >
            ยืนยันบันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

export { ConfirmSubmitDialog };

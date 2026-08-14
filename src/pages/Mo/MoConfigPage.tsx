import styles from "./MoHome.module.css";
import type { ReactNode } from "react";

type Props = {
  onCancel: () => void;
};

export default function MoConfigPage({ onCancel }: Props) {
  return (
    <>
      <div className={styles["location-list"]}>
        <div className={styles["location-header"]}>ตั้งค่า MO</div>

        <div style={{ padding: 16 }}>
          <p>
            หน้าตั้งค่าสำหรับ MO (ตัวอย่าง) — ใช้เพื่อปรับค่าการทำงานของระบบ
            เช่น ค่าเริ่มต้นของการกรอง, สิทธิ์ผู้ใช้, หรือตัวเลือกการแจ้งเตือน
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <button
              className={styles["guts-btn"]}
              onClick={() => alert("Save (placeholder)")}
            >
              บันทึกการตั้งค่า (ตัวอย่าง)
            </button>
            <button
              className={styles["guts-btn"]}
              onClick={() => alert("Reset (placeholder)")}
            >
              รีเซ็ตเป็นค่าเริ่มต้น
            </button>
          </div>
        </div>
      </div>

      <div className={styles["guts-back-outer"]}>
        <button
          type="button"
          className={[styles["guts-btn"], styles["guts-back-btn"]].join(" ")}
          onClick={onCancel}
        >
          Back
        </button>
      </div>
    </>
  );
}

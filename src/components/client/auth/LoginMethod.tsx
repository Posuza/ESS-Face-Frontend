import { Asterisk } from "lucide-react";
import faceScanUrl from "@/assets/common/face-scan2.svg";
import styles from "./LoginMethod.module.css";

type Props = {
  onSelectFace: () => void;
  onSelectPassword: () => void;
};

export default function LoginMethod({
  onSelectFace,
  onSelectPassword,
}: Props) {
  return (
    <section className={styles["method-card"]} aria-label="เลือกวิธีการเข้าสู่ระบบ">
      <h1 className={styles["method-title"]}>กรุณาเลือกวิธีการเข้าสู่ระบบ</h1>

      <div className={styles["method-list"]}>
        <button
          type="button"
          className={styles["method-button"]}
          onClick={onSelectFace}
        >
          <span className={styles["method-icon"]} aria-hidden="true">
            <img className={styles["face-method-svg"]} src={faceScanUrl} alt="" />
          </span>
          <span className={styles["method-text"]}>สแกนใบหน้า</span>
        </button>

        <button
          type="button"
          className={styles["method-button"]}
          onClick={onSelectPassword}
        >
          <span className={styles["method-icon"]} aria-hidden="true">
            <span className={styles["password-glyph"]}>
              <span className={styles["password-stars"]}>
                <Asterisk size={28} strokeWidth={3.5} />
                <Asterisk size={28} strokeWidth={3.5} />
                <Asterisk size={28} strokeWidth={3.5} />
              </span>
              <span className={styles["password-line"]} />
            </span>
          </span>
          <span className={styles["method-text"]}>รหัสผ่าน</span>
        </button>
      </div>
    </section>
  );
}

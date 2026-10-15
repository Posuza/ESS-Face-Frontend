import { User } from "lucide-react";
import MessagePopUp from "@/components/client/auth/popup/MessagePopUp";
import {
  buildFaceRegistrationUrl,
  rememberClientAuthReturn,
} from "@/store/clientReturnSite";
import { useClientAuthStore } from "@/store/clientAuthStore";
import styles from "./FaceLogin.module.css";

type Props = {
  empCode: string;
  loading?: boolean;
  checkingFaceProfile?: boolean;
  missingFaceProfileOpen?: boolean;
  onChangeEmp: (value: string) => void;
  onScanFace: () => void;
  onCloseMissingFaceProfile: () => void;
  onBack: () => void;
};

export default function FaceLogin({
  empCode,
  loading = false,
  checkingFaceProfile = false,
  missingFaceProfileOpen = false,
  onChangeEmp,
  onScanFace,
  onCloseMissingFaceProfile,
  onBack,
}: Props) {
  const publicKey = useClientAuthStore((state) => state.publicKey);
  const returnTo = useClientAuthStore((state) => state.returnTo);
  const registrationReturn = {
    empCode,
    returnStep: "face" as const,
    publicKey,
    returnTo,
  };

  return (
    <>
      <div className={`${styles["login-panel"]} ${styles["face-panel"]}`}>
        <section className={`${styles["guts-card"]} ${styles["face-card"]}`} aria-label="Face login form">
          <div className={styles["guts-card-title"]}>เข้าสู่ระบบ</div>

          <div className={styles["guts-form"]}>
            <div>
              <div className={styles["guts-label"]}>รหัสพนักงาน (6 หลัก)</div>
              <div className={styles["guts-field"]}>
                <span className={styles["guts-icon-left"]} aria-hidden="true">
                  <User size={18} />
                </span>
                <input
                  className={`${styles["guts-input"]} ${styles["guts-input--with-left"]}`}
                  value={empCode}
                  onChange={(e) => onChangeEmp(e.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={loading}
                  aria-label="Employee code 6 digits"
                />
              </div>
            </div>

            <button className={styles["guts-btn"]} type="button" onClick={onScanFace} disabled={loading}>
              {checkingFaceProfile ? "กำลังตรวจสอบ..." : "สแกนใบหน้า"}
            </button>
          </div>
        </section>

        <button type="button" className={styles["guts-back-btn"]} onClick={onBack} disabled={loading}>
          ย้อนกลับ
        </button>
      </div>

      <MessagePopUp
        open={missingFaceProfileOpen}
        variant="warning"
        message={'ยังไม่มีข้อมูลใบหน้า\nกรุณาติดต่อช่องทางไลน์ "GUTS ESS"'}
        actionHref={buildFaceRegistrationUrl(registrationReturn)}
        onAction={() => rememberClientAuthReturn(registrationReturn)}
        onClose={onCloseMissingFaceProfile}
      />
    </>
  );
}

// src/layout/Header/index.tsx
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

import logoSrc from "@/assets/logo/logoguts.svg";
import { useAppStore } from "@/store";
import styles from "./Header.module.css";

type Props = {
  empCode?: string;
  displayName?: string;
  showUserCard?: boolean;
};

export default function Header({
  empCode: providedEmpCode,
  displayName: providedDisplayName,
  showUserCard = true,
}: Props) {
  const adminSession = useAppStore((state) => state.adminSession);
  const empCode = providedEmpCode ?? adminSession?.employee_code ?? "";
  const displayName =
    providedDisplayName ??
    (adminSession
      ? `${adminSession.first_name} ${adminSession.last_name}`.trim() ||
        adminSession.employee_code
      : "");

  return (
    <header className={styles.header}>
      <h1 className={styles.logo}>
        <img className={styles.logoImage} src={logoSrc} alt="GUTS" />
      </h1>

      <div className={styles.subEn}>
        <span className={styles.redLetter}>E</span>mployee{" "}
        <span className={styles.redLetter}>S</span>elf{" "}
        <span className={styles.redLetter}>S</span>ervice
      </div>

      <div className={styles.subTh}>ระบบบริการตนเอง</div>

      {showUserCard ? (
        <div className={styles.usercard} role="status" aria-label="ผู้ใช้งาน">
          <span className={styles.usercardIcon} aria-hidden="true">
            <FontAwesomeIcon icon={faUser} />
          </span>
          <span className={styles.usercardLabel}>ผู้ใช้งาน:</span>
          <span className={styles.usercardValue}>
            {empCode}
            {displayName ? `-${displayName}` : ""}
          </span>
        </div>
      ) : null}

      <div className={styles.divider} />
    </header>
  );
}

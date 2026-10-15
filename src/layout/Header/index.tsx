// src/layout/Header/index.tsx
import logoSrc from "@/assets/logo/logoguts.svg";
import styles from "./Header.module.css";

type Props = {
  empCode?: string;
  displayName?: string;
  showUserCard?: boolean;
  showDivider?: boolean;
};

export default function Header({ showDivider = false }: Props) {

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

      {showDivider ? <div className={styles.divider} /> : null}
    </header>
  );
}

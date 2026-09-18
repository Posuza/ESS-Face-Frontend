// src/pages/Home/index.tsx
//
// The frontend captures a guided photo; backend extracts and compares
// the face embedding so enrollment and verification use the same model.
import { useEffect, useRef, useState, type FormEvent } from "react";

import Header from "@/layout/Header";
import LoadingModal from "@/components/LoadingModal";
import PermissionErrorModal from "@/components/auth/popup/PermissionErrorModal";
import RegisterCameraModal from "@/components/RegisterCameraModal";
import { preloadRegisterCameraModels } from "@/components/ai/registerCameraPreloader";
import { useAppStore } from "@/store";
import type { EmployeeProfile } from "@/types/api";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faMagnifyingGlass,
  faRightFromBracket,
  faRotateLeft,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

import styles from "./Home.module.css";

type Props = {
  employee: EmployeeProfile | null;
};

type Status = "idle" | "submitting" | "success" | "failed";

export default function Home({
  employee,
}: Props) {
  const lookupEmployee = useAppStore((state) => state.lookupEmployee);
  const employeeLookupBusy = useAppStore((state) => state.employeeLookupBusy);
  const clearEmployeeSession = useAppStore((state) => state.clearEmployeeSession);
  const clearLookupError = useAppStore((state) => state.clearEmployeeLookupError);
  const setEmployeeRoute = useAppStore((state) => state.setEmployeeRoute);
  const getEmployeeProfileImage = useAppStore((state) => state.getEmployeeProfileImage);
  const enrollEmployeeFace = useAppStore((state) => state.enrollEmployeeFace);
  const resetFaceActionState = useAppStore((state) => state.resetFaceActionState);
  const [employeeCode, setEmployeeCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [camOpen, setCamOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraLoadError, setCameraLoadError] = useState("");
  const [cameraSettingsReady, setCameraSettingsReady] = useState(false);
  const [photo, setPhoto] = useState("");
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const verifyReqRef = useRef(0);

  useEffect(() => {
    if (!employee) return;

    let canceled = false;
    let objectUrl = "";

    void getEmployeeProfileImage(employee.employee_code)
      .then((blob) => {
        if (canceled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setPhoto(objectUrl);
        } else {
          setPhoto("");
        }
      })
      .catch(() => {
        if (!canceled) setPhotoLoadFailed(true);
      })
      .finally(() => {
        if (!canceled) setPhotoLoading(false);
      });

    return () => {
      canceled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employee, getEmployeeProfileImage]);

  async function searchEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = employeeCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
      return;
    }

    setErrorMessage("");
    clearLookupError();
    resetFaceActionState();
    try {
      await lookupEmployee(code);
      setPhoto("");
      setPhotoLoading(true);
      setPhotoLoadFailed(false);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ไม่สามารถค้นหาพนักงานได้");
    }
  }

  if (!employee) {
    return (
      <main className="guts-bg">
        <div className={`guts-home ${styles.pageShell}`}>
          <section className="guts-home-card" aria-label="Face Register Lookup">
            <Header empCode="" displayName="" showUserCard={false} />
            <div className={`guts-fv-card ${styles.fvCard}`}>
              <h2 className={styles.warningTitle}>! ห้ามสวม</h2>
              <p className={styles.warningSubtitle}>(หมวก / แมส / หน้ากาก และแว่นตา)</p>
              <div className={`guts-fv-frame ${styles.fvFrame}`} aria-label="กรอบแสดงรูปลงทะเบียนใบหน้า">
                <div className={styles.fvEmpty}>
                  <div className={styles.fvEmptyIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faCamera} />
                  </div>
                  <div className={styles.fvEmptyText}>ค้นหาพนักงานก่อนลงทะเบียน สแกนใบหน้า</div>
                </div>
              </div>
              <form className={styles.lookupForm} onSubmit={searchEmployee}>
                <label className={styles.lookupLabel} htmlFor="register-employee-code">
                  กรอกรหัสพนักงานของท่าน
                </label>
                <div className={styles.lookupField}>
                  <span className={styles.lookupIconLeft} aria-hidden="true">
                    <FontAwesomeIcon icon={faUser} />
                  </span>

                  <input
                    id="register-employee-code"
                    className={[styles.lookupInput, styles.lookupInputWithLeft].join(" ")}
                    value={employeeCode}
                    onChange={(event) => {
                      setEmployeeCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                      setErrorMessage("");
                      clearLookupError();
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    aria-label="Employee code 6 digits"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className={`guts-fv-primary ${styles.fvPrimary}`}
                  disabled={employeeLookupBusy || employeeCode.length !== 6}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  {employeeLookupBusy ? "กำลังค้นหา..." : "ค้นหา"}
                </button>
              </form>
            </div>
          </section>
        </div>
        <PermissionErrorModal
          open={Boolean(errorMessage)}
          title="ไม่สามารถดำเนินการได้"
          message={errorMessage}
          variant="error"
          showCloseButton
          onClose={() => setErrorMessage("")}
        />
      </main>
    );
  }

  const empCode = employee.employee_code;
  const displayName = `${employee.first_name} ${employee.last_name}`.trim();

  async function handleCaptured(dataUrl: string) {
    const previousPhoto = photo;
    setCamOpen(false);
    setPhoto(dataUrl);
    setErrorMessage("");
    setStatus("submitting");

    const reqId = ++verifyReqRef.current;
    try {
      await enrollEmployeeFace(empCode, dataUrl, empCode);
      if (reqId !== verifyReqRef.current) return;
      setPhotoLoadFailed(false);
      setStatus("success");
    } catch (error) {
      if (reqId !== verifyReqRef.current) return;
      setPhoto(previousPhoto);
      setErrorMessage(
        error instanceof Error ? error.message : "ลงทะเบียนใบหน้าไม่สำเร็จ",
      );
      setStatus("failed");
    }
  }

  function retry() {
    verifyReqRef.current++;
    setErrorMessage("");
    resetFaceActionState();
    setStatus("idle");
    void openCamera();
  }

  async function openCamera() {
    setErrorMessage("");
    setCameraLoadError("");
    setCameraSettingsReady(false);
    resetFaceActionState();
    setCameraLoading(true);
    try {
      await preloadRegisterCameraModels();
      setCameraSettingsReady(true);
      setCamOpen(true);
    } catch (error) {
      setCameraLoadError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถโหลดพารามิเตอร์โมเดลได้",
      );
    } finally {
      setCameraLoading(false);
    }
  }

  function logout() {
    verifyReqRef.current++;
    setEmployeeCode("");
    setStatus("idle");
    setCamOpen(false);
    setCameraLoading(false);
    setCameraLoadError("");
    setCameraSettingsReady(false);
    setPhoto("");
    setPhotoLoading(true);
    setPhotoLoadFailed(false);
    setErrorMessage("");
    resetFaceActionState();
    clearEmployeeSession();
  }

  const isBusy = status === "submitting";
  const isSuccess = status === "success";
  const hasFacePhoto = Boolean(photo);
  const fullName =
    `${employee.name_prefix || ""}${displayName}`.trim() || empCode;
  const profileDetails: [string, string][] = [
    ["ชื่อ-นามสกุล", fullName],
    ["รหัสพนักงาน", employee.employee_code],
    ["อีเมล", employee.email || "-"],
  ];

  return (
    <main className="guts-bg">
      <div className={`guts-home ${styles.pageShell}`}>
        <section className="guts-home-card" aria-label="Face Verify Gate">
          <Header empCode={empCode} displayName={displayName} />

          <div className={`guts-fv-card ${styles.fvCard}`}>
            <h2 className={styles.warningTitle}>! ห้ามสวม</h2>
            <p className={styles.warningSubtitle}>(หมวก / แมส / หน้ากาก และแว่นตา)</p>
            <section className={styles.profileDetails} aria-label="ข้อมูลพนักงาน">
              <div
                className={`guts-fv-frame ${styles.fvFrame}`}
                aria-label="กรอบแสดงรูปยืนยันตัวตน"
              >
                {hasFacePhoto ? (
                  <img
                    className={`guts-fv-img ${styles.fvImg}`}
                    src={photo}
                    alt="รูปยืนยันตัวตน"
                  />
                ) : (
                  <div className={styles.fvEmpty}>
                    <div className={styles.fvEmptyIcon} aria-hidden="true">
                      <FontAwesomeIcon icon={faCamera} />
                    </div>
                    <div className={styles.fvEmptyText}>
                      {photoLoading
                        ? "กำลังโหลดรูปใบหน้า..."
                        : photoLoadFailed
                          ? "ไม่สามารถโหลดรูปใบหน้าได้"
                          : "ยังไม่มีรูปใบหน้าอ้างอิง"}
                    </div>
                  </div>
                )}
              </div>

            </section>

            {isSuccess ? (
              <PermissionErrorModal
                open={isSuccess}
                title="สำเร็จ"
                message="บันทึกรูปใบหน้าสำเร็จ"
                variant="success"
                showCloseButton
                onClose={() => setStatus("idle")}
              />
            ) : null}

            {isBusy ? (
              <div className={styles.fvLocHint}>
                กำลังลงทะเบียนรูปใบหน้าอ้างอิง...
              </div>
            ) : null}

            {errorMessage ? (
              <PermissionErrorModal
                open={Boolean(errorMessage)}
                title="ไม่สามารถลงทะเบียนใบหน้าได้"
                message={errorMessage}
                variant="error"
                showCloseButton
                onClose={() => setErrorMessage("")}
              />
            ) : null}

            {cameraLoading ? (
              <LoadingModal
                isOpen={cameraLoading}
                message="กำลังโหลดโมเดลระบบ..."
              />
            ) : null}

            {cameraLoadError ? (
              <PermissionErrorModal
                open={Boolean(cameraLoadError)}
                title="ไม่สามารถเปิดกล้องได้"
                message={cameraLoadError}
                variant="error"
                showCloseButton
                onClose={() => setCameraLoadError("")}
              />
            ) : null}

            <section className={styles.userInfoPanel} aria-label="ข้อมูลพนักงาน">
              <div className={styles.userInfoTitle}>ข้อมูลพนักงาน</div>
              <dl>
                {profileDetails.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {hasFacePhoto ? (
              <button
                type="button"
                className={`guts-fv-primary ${styles.fvPrimary}`}
                onClick={() => setEmployeeRoute("verify")}
                disabled={photoLoading || isBusy}
              >
                ทดสอบสแกนใบหน้า
              </button>
            ) : status !== "failed" ? (
              <button
                type="button"
                className={`guts-fv-primary ${styles.fvPrimary}`}
                onClick={openCamera}
                disabled={isBusy || photoLoading || cameraLoading}
              >
                <FontAwesomeIcon icon={faCamera} className={styles.fvPrimaryIcon} />
                กดถ่ายภาพ ส่งบันทึกใบหน้า
              </button>
            ) : (
              <button
                type="button"
                className={`guts-fv-primary ${styles.fvPrimary}`}
                onClick={retry}
                disabled={cameraLoading}
              >
                <FontAwesomeIcon icon={faRotateLeft} />
                ลองใหม่
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={logout}
            disabled={isBusy}
          >
            ออกจากระบบ
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </section>
      </div>

      <RegisterCameraModal
        open={camOpen}
        modelSettingsPreloaded={cameraSettingsReady}
        onClose={() => {
          setCamOpen(false);
          setCameraSettingsReady(false);
        }}
        onCaptured={(dataUrl) => void handleCaptured(dataUrl)}
      />
    </main>
  );
}

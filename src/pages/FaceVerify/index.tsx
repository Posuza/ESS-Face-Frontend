// src/pages/FaceVerifyGate/index.tsx
//
// The frontend captures a guided photo; backend extracts and compares
// the face embedding so enrollment and verification use the same model.
import { useEffect, useRef, useState, type FormEvent } from "react";

import Header from "@/layout/Header";
import LoadingModal from "@/components/LoadingModal";
import PermissionErrorModal from "@/components/auth/popup/PermissionErrorModal";
import VerificationCameraModal from "@/components/auth/models/VerificationCameraModal1";
import { scheduleIdleModelPreload } from "@/components/ai/modelPreloadScheduler";
import { preloadVerificationCameraModels } from "@/components/ai/verificationCameraPreloader";
import { useAppStore } from "@/store";
import type { EmployeeProfile } from "@/types/api";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faCheckCircle,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import styles from "./FaceVerifyGate.module.css";

type Props = {
  employee: EmployeeProfile | null;
  onBack: () => void;
};

type Status = "idle" | "submitting" | "success" | "failed";

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function FaceVerify({
  employee,
  onBack,
}: Props) {
  const lookupEmployee = useAppStore((state) => state.lookupEmployee);
  const employeeLookupBusy = useAppStore((state) => state.employeeLookupBusy);
  const clearLookupError = useAppStore((state) => state.clearEmployeeLookupError);
  const verifyEmployeeFace = useAppStore((state) => state.verifyEmployeeFace);
  const resetFaceActionState = useAppStore((state) => state.resetFaceActionState);
  const [employeeCode, setEmployeeCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [camOpen, setCamOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraLoadError, setCameraLoadError] = useState("");
  const [cameraSettingsReady, setCameraSettingsReady] = useState(false);
  const [photo, setPhoto] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    message: string;
    score?: number;
    threshold?: number;
  } | null>(null);

  const verifyReqRef = useRef(0);
  const capturedFromCameraRef = useRef(false);
  const autoOpenedEmployeeRef = useRef<string | null>(null);

  useEffect(
    () => scheduleIdleModelPreload(preloadVerificationCameraModels, "verification models"),
    [],
  );

  async function openCamera() {
    setErrorMessage("");
    setCameraLoadError("");
    setCameraSettingsReady(false);
    resetFaceActionState();
    setCameraLoading(true);
    try {
      await preloadVerificationCameraModels();
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

  useEffect(() => {
    if (!employee || photo || status !== "idle" || camOpen || cameraLoading) return;
    if (autoOpenedEmployeeRef.current === employee.employee_code) return;
    autoOpenedEmployeeRef.current = employee.employee_code;
    void openCamera();
  }, [employee, photo, status, camOpen, cameraLoading]);

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
      setVerificationResult(null);
      setStatus("idle");
      autoOpenedEmployeeRef.current = code;
      void openCamera();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ไม่สามารถค้นหาพนักงานได้");
    }
  }

  if (!employee) {
    return (
      <main className="guts-bg">
        <div className={`guts-home ${styles.pageShell}`}>
          <section className="guts-home-card" aria-label="Face Verify Lookup">
            <Header empCode="" displayName="" showUserCard={false} />
            <div className={`guts-fv-card ${styles.fvCard}`}>
              <h2 className={styles.screenTitle}>ทดสอบ<br />สแกนใบหน้า</h2>
              <div className={`guts-fv-frame ${styles.fvFrame}`} aria-label="กรอบแสดงรูปยืนยันตัวตน">
                <div className={styles.fvEmpty}>
                  <div className={styles.fvEmptyIcon} aria-hidden="true">
                    <FontAwesomeIcon icon={faCamera} />
                  </div>
                  <div className={styles.fvEmptyText}>ค้นหาพนักงานก่อนสแกนใบหน้า</div>
                </div>
              </div>
              <form className={styles.lookupForm} onSubmit={searchEmployee}>
                <label className={styles.lookupLabel} htmlFor="verify-employee-code">
                  กรอกรหัสพนักงานของท่าน
                </label>
                <input
                  id="verify-employee-code"
                  className={styles.lookupInput}
                  value={employeeCode}
                  onChange={(event) => {
                    setEmployeeCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setErrorMessage("");
                    clearLookupError();
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  placeholder="699999"
                  autoFocus
                />
                <button
                  type="submit"
                  className={`guts-fv-primary ${styles.fvPrimary}`}
                  disabled={employeeLookupBusy || employeeCode.length !== 6}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                  {employeeLookupBusy ? "กำลังค้นหา..." : "ค้นหา"}
                </button>
              </form>
              <button type="button" className={`guts-fv-secondary ${styles.fvLogoutBtn}`} onClick={onBack}>
                กลับหน้าหลัก
              </button>
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
      </main>
    );
  }

  const empCode = employee.employee_code;
  const displayName = `${employee.first_name} ${employee.last_name}`.trim();

  async function handleCaptured(dataUrl: string) {
    capturedFromCameraRef.current = true;
    setCamOpen(false);
    setPhoto(dataUrl);
    setErrorMessage("");
    setStatus("submitting");

    const reqId = ++verifyReqRef.current;
    const result = await verifyEmployeeFace(empCode, dataUrl);

    if (reqId !== verifyReqRef.current) return;

    // Set verification result regardless of success or failure
    setVerificationResult({
      message: result.message,
      score: result.score,
      threshold: result.threshold,
    });

    if (result.is_match) {
      setStatus("success");
    } else {
      setStatus("failed");
    }
  }

  function closeCamera() {
    setCamOpen(false);
    setCameraSettingsReady(false);
    if (capturedFromCameraRef.current) {
      capturedFromCameraRef.current = false;
      return;
    }

    if (!photo && status === "idle") {
      onBack();
    }
  }

  const isBusy = status === "submitting";
  const isSuccess = status === "success";
  const fullName =
    `${employee.name_prefix || ""}${displayName}`.trim() || empCode;
  const profileDetails: [string, string][] = [
    ["ชื่อ", fullName],
    ["รหัสพนักงาน", employee.employee_code],
    ["อีเมล", employee.email || "-"],
  ];

  return (
    <main className="guts-bg">
      <div className={`guts-home ${styles.pageShell}`}>
        <section className="guts-home-card" aria-label="Face Verify Gate">
          <Header empCode={empCode} displayName={displayName} />

            <div className={`guts-fv-card ${styles.fvCard}`}>
            <div className={styles.screenTitle}>
              {isSuccess ? (
                "ผลการยืนยันตัวตน"
              ) : (
                <>ทดสอบ สแกนใบหน้า</>
              )}
            </div>

            <div
              className={`guts-fv-frame ${styles.fvFrame}`}
              aria-label="กรอบแสดงรูปยืนยันตัวตน"
            >
              {photo ? (
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
                  <div className={styles.fvEmptyText}>ยังไม่มีภาพถ่าย</div>
                </div>
              )}
            </div>

            {isSuccess && verificationResult ? (
              <section
                className={`${styles.statusPanel} ${styles.statusSuccess}`}
                role="status"
                aria-label="ผลการยืนยันใบหน้า"
              >
                <div className={styles.statusBanner}>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>{verificationResult.message || "ยืนยันใบหน้าสำเร็จ"}</span>
                </div>
                <dl className={styles.statusMetrics}>
                  {typeof verificationResult.score === "number" ? (
                    <div>
                      <dt>คะแนนความเหมือน</dt>
                      <dd>{formatPercent(verificationResult.score)}</dd>
                    </div>
                  ) : null}
                  {typeof verificationResult.threshold === "number" ? (
                    <div>
                      <dt>เกณฑ์ที่กำหนด</dt>
                      <dd>{formatPercent(verificationResult.threshold)}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            {!isSuccess && status !== "failed" ? (
              <section
                className={`${styles.statusPanel} ${styles.statusIdentity}`}
                aria-label="ข้อมูลใบหน้าที่ค้นพบ"
              >
                <div className={styles.statusBanner}>
                  <span>ใบหน้าของท่านคือ</span>
                </div>
                <div className={styles.identityValue}>
                  <strong>{employee.employee_code} - {displayName || "-"}</strong>
                </div>
              </section>
            ) : null}

            {status === "failed" ? (
              <section
                className={`${styles.statusPanel} ${styles.statusFailed}`}
                role="alert"
                aria-label="ผลการยืนยันใบหน้า"
              >
                <div className={styles.statusBanner}>
                  <span>{errorMessage || "ใบหน้าไม่ตรงกับข้อมูลพนักงาน กรุณาลองใหม่"}</span>
                </div>
                <dl className={styles.statusMetrics}>
                  <div>
                    <dt>คะแนนความเหมือน</dt>
                    <dd>
                      {typeof verificationResult?.score === "number"
                        ? formatPercent(verificationResult.score)
                        : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt>เกณฑ์ที่กำหนด</dt>
                    <dd>
                      {typeof verificationResult?.threshold === "number"
                        ? formatPercent(verificationResult.threshold)
                        : "N/A"}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}

            {isBusy ? (
              <LoadingModal
                isOpen={isBusy}
                message="กำลังตรวจสอบใบหน้ากับข้อมูลในระบบ..."
              />
            ) : null}

            {errorMessage && status !== "failed" ? (
              <PermissionErrorModal
                open={Boolean(errorMessage)}
                title="ใบหน้าไม่ตรงกับข้อมูลพนักงาน กรุณาลองใหม่"
                message={errorMessage || "ใบหน้าไม่ตรงกับข้อมูลพนักงาน กรุณาลองใหม่"}
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

            {status === "success" || status === "failed" ? (
              <section className={styles.profileDetails} aria-label="ข้อมูลพนักงาน">
                <dl>
                  {profileDetails.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

          </div>

          <button
            type="button"
            className={`guts-fv-secondary ${styles.fvBackButton}`}
            onClick={onBack}
            disabled={isBusy || cameraLoading}
          >
            กลับหน้าหลัก
          </button>
        </section>
      </div>

      <VerificationCameraModal
        open={camOpen}
        modelSettingsPreloaded={cameraSettingsReady}
        onClose={closeCamera}
        onCaptured={(dataUrl) => void handleCaptured(dataUrl)}
      />
    </main>
  );
}

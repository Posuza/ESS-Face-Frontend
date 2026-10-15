// src/pages/Home/index.tsx
//
// The frontend captures a guided photo; backend extracts and compares
// the face embedding so enrollment and verification use the same model.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import Header from "@/layout/Header";
import LoadingModal from "@/components/registeration/LoadingModal";
import PermissionErrorModal from "@/components/registeration/auth/popup/PermissionErrorModal";
import TimingMessagePopUp from "@/components/registeration/auth/popup/TimingMessagePopUp";
import TutorialModal from "@/components/registeration/auth/models/TutorialModal";
import RegisterCameraModal from "@/components/registeration/RegisterCameraModal";
import { scheduleIdleModelPreload } from "@/components/registeration/ai/modelPreloadScheduler";
import { preloadRegisterCameraModels } from "@/components/registeration/ai/registerCameraPreloader";
import { useAppStore } from "@/store";
import {
  buildClientAuthReturnUrl,
  clearClientAuthReturn,
  getClientAuthReturn,
} from "@/store/clientReturnSite";
import type { EmployeeProfile } from "@/types/api";
import faceScan from "@/assets/common/face-scan2.svg";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faRightFromBracket,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { ArrowLeft, CirclePlay, Eye, EyeOff, Lock, ScanFace, User } from "lucide-react";

import styles from "./Home.module.css";

type Props = {
  employee: EmployeeProfile | null;
};

type Status = "idle" | "submitting" | "success" | "failed";
type LoginPopupVariant = "warning" | "error";

function getEmployeeCodeFromUrl(): string {
  const value = new URLSearchParams(window.location.search)
    .get("employee_code")
    ?.trim();

  if (value && /^\d{6}$/.test(value)) return value;
  return getClientAuthReturn()?.empCode || "";
}

export default function Home({
  employee,
}: Props) {
  const navigate = useNavigate();
  const loginEmployee = useAppStore((state) => state.loginEmployee);
  const employeeLoginBusy = useAppStore((state) => state.employeeLoginBusy);
  const clearEmployeeLoginError = useAppStore((state) => state.clearEmployeeLoginError);
  const clearEmployeeSession = useAppStore((state) => state.clearEmployeeSession);
  const setEmployeeRoute = useAppStore((state) => state.setEmployeeRoute);
  const getEmployeeProfileImage = useAppStore((state) => state.getEmployeeProfileImage);
  const enrollEmployeeFace = useAppStore((state) => state.enrollEmployeeFace);
  const resetFaceActionState = useAppStore((state) => state.resetFaceActionState);
  const returnSite = useAppStore((state) => state.returnSite);
  const returnToSource = useAppStore((state) => state.returnToSource);
  const [employeeCode, setEmployeeCode] = useState(getEmployeeCodeFromUrl);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [camOpen, setCamOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraLoadError, setCameraLoadError] = useState("");
  const [cameraSettingsReady, setCameraSettingsReady] = useState(false);
  const [photo, setPhoto] = useState("");
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loginPopupVariant, setLoginPopupVariant] =
    useState<LoginPopupVariant>("warning");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [clientAuthReturn] = useState(getClientAuthReturn);

  const verifyReqRef = useRef(0);

  function returnToClientAuth() {
    if (!clientAuthReturn) return;
    clearEmployeeSession();
    clearClientAuthReturn();
    navigate(buildClientAuthReturnUrl(clientAuthReturn), { replace: true });
  }

  useEffect(
    () => scheduleIdleModelPreload(preloadRegisterCameraModels, "registration models"),
    [],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!clientAuthReturn || url.searchParams.get("fresh_login") !== "1") return;

    url.searchParams.delete("fresh_login");
    window.history.replaceState(window.history.state, "", url.href);
    clearEmployeeSession();
  }, [clearEmployeeSession, clientAuthReturn]);

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

  async function submitEmployeeLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = employeeCode.trim();

    if (!code && !password) {
      setLoginPopupVariant("warning");
      setErrorMessage(
        "กรุณากรอกรหัสพนักงาน 6 หลัก\nและ\nรหัสผ่านเป็นตัวเลข 6 หลัก",
      );
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setLoginPopupVariant("warning");
      setErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
      return;
    }

    if (!/^\d{6}$/.test(password)) {
      setLoginPopupVariant("warning");
      setErrorMessage("กรุณากรอกรหัสผ่านเป็นตัวเลข 6 หลัก");
      return;
    }

    setErrorMessage("");
    clearEmployeeLoginError();
    resetFaceActionState();

    try {
      await loginEmployee(code, password);
      setPassword("");
      setShowPassword(false);
      setPhoto("");
      setPhotoLoading(true);
      setPhotoLoadFailed(false);
      setStatus("idle");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถเข้าสู่ระบบได้";
      setLoginPopupVariant(
        message.includes("รหัสผ่านไม่ถูกต้อง") ? "warning" : "error",
      );
      setErrorMessage(message);
    }
  }

  if (!employee) {
    return (
      <main className="guts-bg">
        <div className={`guts-home ${styles.pageShell}`}>
          <section className="guts-home-card" aria-label="Face Register Login">
            <Header empCode="" displayName="" showUserCard={false} />

            <div className={styles.fvCard}>
              <h4 className={styles.cardTitle}>
                ระบบจัดเก็บข้อมูลใบหน้า
                <br />
                เพื่อจะใช้สแกนเข้าสู่ระบบ <span style={{ color: '#ef2f24', fontWeight: 900 }}>ESS</span>
              </h4>
              <h4 className={styles.warningTitle}>! ห้ามสวม</h4>
              <p className={styles.warningSubtitle}>
                (หมวก / แมส / หน้ากาก และแว่นตา)
              </p>

              <div
                className={`guts-fv-frame ${styles.fvFrame}`}
                aria-label="กรอบแสดงรูปลงทะเบียนใบหน้า"
              >
                <div className={styles.fvEmpty}>
                  <img
                    className={styles.faceScanArtwork}
                    src={faceScan}
                    alt=""
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className={styles.tutorialTrigger}
                    onClick={() => setTutorialOpen(true)}
                    aria-label="ดูบทเรียนการลงทะเบียนใบหน้า"
                  >
                    <CirclePlay
                      className={styles.tutorialIcon}
                      strokeWidth={2.1}
                      aria-hidden="true"
                    />
                    <span className={styles.tutorialText}>
                      กดเพื่อดูบทเรียนลงทะเบียน
                    </span>
                  </button>
                </div>
              </div>

              <form className={styles.lookupForm} onSubmit={submitEmployeeLogin}>
                <div>
                  <label
                    className={styles.lookupLabel}
                    htmlFor="register-employee-code"
                  >
                    รหัสพนักงาน (6 หลัก)
                  </label>
                  <div className={styles.lookupField}>
                    <span className={styles.lookupIconLeft} aria-hidden="true">
                      <User size={18} />
                    </span>
                    <input
                      id="register-employee-code"
                      className={[
                        styles.lookupInput,
                        styles.lookupInputWithLeft,
                      ].join(" ")}
                      value={employeeCode}
                      onChange={(event) => {
                        setEmployeeCode(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        );
                        setErrorMessage("");
                        clearEmployeeLoginError();
                      }}
                      inputMode="numeric"
                      autoComplete="username"
                      maxLength={6}
                      aria-label="Employee code 6 digits"
                      disabled={employeeLoginBusy}
                      autoFocus={!employeeCode}
                    />
                  </div>
                </div>

                <div>
                  <label className={styles.lookupLabel} htmlFor="register-password">
                    กรอกรหัสผ่าน (6 หลัก)
                  </label>
                  <div className={styles.lookupField}>
                    <span className={styles.lookupIconLeft} aria-hidden="true">
                      <Lock size={18} />
                    </span>
                    <input
                      id="register-password"
                      className={[
                        styles.lookupInput,
                        styles.lookupInputWithLeft,
                        styles.lookupInputWithRight,
                      ].join(" ")}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value.replace(/\D/g, "").slice(0, 6));
                        setErrorMessage("");
                        clearEmployeeLoginError();
                      }}
                      autoComplete="current-password"
                      inputMode="numeric"
                      maxLength={6}
                      aria-label="Password 6 digits"
                      disabled={employeeLoginBusy}
                      autoFocus={Boolean(employeeCode)}
                    />
                    <button
                      type="button"
                      className={styles.lookupIconRightButton}
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      disabled={employeeLoginBusy}
                    >
                      {showPassword ? (
                        <EyeOff className={styles.loginOutlineIcon} strokeWidth={1.7} />
                      ) : (
                        <Eye className={styles.loginOutlineIcon} strokeWidth={1.7} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.loginButton}
                  disabled={employeeLoginBusy}
                >
                  {employeeLoginBusy ? "กำลังเข้าสู่ระบบ..." : "กดเข้าสู่ระบบ"}
                </button>

              </form>

            </div>

            {clientAuthReturn || returnSite ? (
              <div className={styles.returnButtonContainer}>
                {clientAuthReturn ? (
                  <button
                    type="button"
                    className={styles.returnButton}
                    onClick={returnToClientAuth}
                    disabled={employeeLoginBusy}
                  >
                    กลับหน้าหลัก
                  </button>
                ) : returnSite ? (
                  <button
                    type="button"
                    className={styles.returnButton}
                    onClick={returnToSource}
                    disabled={employeeLoginBusy}
                    title={`กลับไปยัง ${returnSite.origin}`}
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                    กลับหน้าหลัก
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <TimingMessagePopUp
          open={Boolean(errorMessage)}
          message={errorMessage}
          variant={loginPopupVariant}
          showTutorialAction
          tutorialLabel="ดูบทเรียนการลงทะเบียน"
          onViewTutorial={() => {
            setErrorMessage("");
            setTutorialOpen(true);
          }}
          onClose={() => setErrorMessage("")}
        />

        <TutorialModal
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
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
    setPassword("");
    setShowPassword(false);
    clearEmployeeLoginError();
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

          <div className={styles.fvCard}>
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
                onClose={() => {
                  setStatus("idle");
                }}
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
                <ScanFace className={styles.fvPrimaryIcon} aria-hidden="true" />
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
            onClick={clientAuthReturn ? returnToClientAuth : logout}
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

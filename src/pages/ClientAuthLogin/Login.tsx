import React, { useState, useEffect } from "react";
import Header from "@/layout/Header";
import TimingMessagePopUp from "@/components/client/auth/popup/TimingMessagePopUp";
import ClientVerificationCameraModal from "@/components/client/auth/models/ClientVerificationCameraModal";
import { preloadCameraModels } from "@/components/client/auth/ailoader/preloadCameraModels";
import { scheduleCameraModelPreload } from "@/components/client/auth/ailoader/modelPreloadScheduler";
import MoLoadingPopup from "@/components/client/MoLoadingPopup";
import { useClientAuthStore as useStore } from "@/store/clientAuthStore";
import LoginMethod from "@/components/client/auth/LoginMethod";
import PasswordLogin from "@/components/client/auth/PasswordLogin";
import FaceLogin from "@/components/client/auth/FaceLogin";
import ForgotPassword from "@/components/client/auth/ForgotPassword";
import ChangePassword from "@/components/client/auth/ChangePassword";
import styles from "./Login.module.css";

type Props = {
  onLoginSuccess: (empCode: string, displayName: string, ticket?: string) => void;
};

export type LoginStep =
  | "method"
  | "password"
  | "face"
  | "forgotPassword"
  | "changePassword";

const LOGIN_STEP_STORAGE_KEY = "ess.login.step.v1";
const LOGIN_EMP_CODE_STORAGE_KEY = "ess.login.emp-code.v1";
const LOGIN_STEPS: LoginStep[] = [
  "method",
  "password",
  "face",
  "forgotPassword",
  "changePassword",
];

function storedLoginStep(): LoginStep {
  const incoming = new URLSearchParams(window.location.search).get(
    "login_step",
  ) as LoginStep;
  if (LOGIN_STEPS.includes(incoming)) return incoming;

  const stored = sessionStorage.getItem(LOGIN_STEP_STORAGE_KEY) as LoginStep;
  return LOGIN_STEPS.includes(stored) ? stored : "method";
}

function storedEmpCode(): string {
  const incoming = new URLSearchParams(window.location.search).get(
    "employee_code",
  );
  if (incoming && /^\d{6}$/.test(incoming)) return incoming;

  const draft = sessionStorage.getItem(LOGIN_EMP_CODE_STORAGE_KEY);
  if (draft && /^\d{6}$/.test(draft)) return draft;

  return sessionStorage.getItem("emp_code") || "";
}

type LoadingAction = "faceProfile" | "faceLogin" | null;

export default function Login({ onLoginSuccess }: Props) {
  const [empCode, setEmpCode] = useState(storedEmpCode);
  const [pin, setPin] = useState("");
  const [loginStep, setLoginStep] = useState<LoginStep>(storedLoginStep);
  const [faceCameraOpen, setFaceCameraOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [changeOldPin, setChangeOldPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [missingFaceProfileOpen, setMissingFaceProfileOpen] = useState(false);

  const authError = useStore((s) => s.authError);
  const authErrorKey = useStore((s) => s.authErrorKey);
  const authContacts = useStore((s) => s.authContacts);
  const authLoading = useStore((s) => s.authLoading);
  const loading = loadingAction !== null || authLoading;

  useEffect(() => scheduleCameraModelPreload("verify"), []);

  useEffect(() => {
    sessionStorage.setItem(LOGIN_STEP_STORAGE_KEY, loginStep);
  }, [loginStep]);

  useEffect(() => {
    if (empCode) {
      sessionStorage.setItem(LOGIN_EMP_CODE_STORAGE_KEY, empCode);
    } else {
      sessionStorage.removeItem(LOGIN_EMP_CODE_STORAGE_KEY);
    }
  }, [empCode]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (
      !url.searchParams.has("login_step") &&
      !url.searchParams.has("employee_code")
    ) {
      return;
    }

    url.searchParams.delete("login_step");
    url.searchParams.delete("employee_code");
    window.history.replaceState(window.history.state, "", url.href);
  }, []);

  useEffect(() => {
    setShowFailedModal(!!authError || !!localErrorMessage);
  }, [authError, localErrorMessage]);

  const updateEmpCode = (value: string) => {
    setEmpCode(value.replace(/\D/g, "").slice(0, 6));
    setMissingFaceProfileOpen(false);
    if (localErrorMessage) setLocalErrorMessage(null);
    if (useStore.getState().authError) {
      useStore.getState().clearAuthError();
    }
  };

  const goTo = (step: LoginStep) => {
    setLocalErrorMessage(null);
    setMissingFaceProfileOpen(false);
    useStore.getState().clearAuthError();
    setLoginStep(step);
  };

  const goBackToMethods = () => {
    setPin("");
    setLocalErrorMessage(null);
    setMissingFaceProfileOpen(false);
    useStore.getState().clearAuthError();
    setLoginStep("method");
  };

  const handleSubmit = async () => {
    const empValidNow = /^\d{6}$/.test(empCode);
    const pinValidNow = pin.length === 6;

    if (empCode.trim() === "" && pin.trim() === "") {
      setLocalErrorMessage(
        "กรุณากรอกรหัสพนักงาน 6 หลัก \n และ \n รหัสผ่าน 6 ตัวอักษร",
      );
      return;
    }
    if (!empValidNow) {
      setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลัก");
      return;
    }
    if (!pinValidNow) {
      setLocalErrorMessage("กรุณากรอกรหัสผ่าน 6 ตัวอักษร");
      return;
    }

    const success = await useStore.getState().login(empCode, pin);
    if (!success) return;

    const state = useStore.getState();
    if (state.issuedTicket) {
      sessionStorage.removeItem(LOGIN_STEP_STORAGE_KEY);
      sessionStorage.removeItem(LOGIN_EMP_CODE_STORAGE_KEY);
      onLoginSuccess(empCode, empCode, state.issuedTicket);
      return;
    }

    const emp = state.authEmployee;
    if (!emp) return;

    const displayName =
      `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;
    setEmpCode(emp.employee_code);
    sessionStorage.removeItem(LOGIN_STEP_STORAGE_KEY);
    sessionStorage.removeItem(LOGIN_EMP_CODE_STORAGE_KEY);
    onLoginSuccess(emp.employee_code, displayName);
  };

  const handleForgotPassword = async () => {
    if (!/^\d{6}$/.test(empCode)) {
      return {
        success: false,
        message: "กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง",
      };
    }
    return await useStore.getState().forgotPassword(empCode);
  };

  const handleChangePassword = async (oldPin: string, newPin: string) => {
    return await useStore.getState().changePassword(empCode, oldPin, newPin);
  };

  const handleFaceLoginScan = async () => {
    setMissingFaceProfileOpen(false);
    setLocalErrorMessage(null);
    useStore.getState().clearAuthError();

    if (!/^\d{6}$/.test(empCode)) {
      setLocalErrorMessage("กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง");
      return;
    }

    setLoadingAction("faceProfile");
    let openingCamera = false;

    try {
      const profile = await useStore
        .getState()
        .lookupEmployeeFaceProfile(empCode);

      if (!profile.has_face_profile) {
        setLoadingMessage(null);
        setLoadingAction(null);
        setShowFailedModal(false);
        setMissingFaceProfileOpen(true);
        return;
      }

      setLoadingMessage("กำลังเตรียมระบบสแกนใบหน้า...");
      await preloadCameraModels("verify");
      setLoadingMessage("กำลังเปิดกล้อง...");
      openingCamera = true;
      setFaceCameraOpen(true);
    } catch (error) {
      console.error("[ClientAuth] Unable to prepare face scanner:", error);
      setLocalErrorMessage(
        error instanceof Error
          ? `ไม่สามารถเตรียมระบบสแกนใบหน้าได้: ${error.message}`
          : "ไม่สามารถเตรียมระบบสแกนใบหน้าได้",
      );
    } finally {
      if (!openingCamera) {
        setLoadingMessage(null);
        setLoadingAction(null);
      }
    }
  };

  const handleFaceCaptured = async (imageDataUrl: string) => {
    setLoadingAction("faceLogin");
    setLoadingMessage("กำลังเข้าสู่ระบบด้วยใบหน้า...");

    try {
      const success = await useStore
        .getState()
        .faceLogin(empCode, imageDataUrl);

      if (!success) return;
      const state = useStore.getState();
      if (state.issuedTicket) {
        sessionStorage.removeItem(LOGIN_STEP_STORAGE_KEY);
        sessionStorage.removeItem(LOGIN_EMP_CODE_STORAGE_KEY);
        onLoginSuccess(empCode, empCode, state.issuedTicket);
        return;
      }

      const emp = state.authEmployee;
      if (!emp) return;

      const displayName =
        `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_code;
      setEmpCode(emp.employee_code);
      sessionStorage.removeItem(LOGIN_STEP_STORAGE_KEY);
      sessionStorage.removeItem(LOGIN_EMP_CODE_STORAGE_KEY);
      onLoginSuccess(emp.employee_code, displayName);
    } finally {
      setFaceCameraOpen(false);
      setLoadingMessage(null);
      setLoadingAction(null);
    }
  };

  return (
    <main className={styles["guts-bg"]}>
      <div
        className={styles["guts-app-header"]}
        aria-label="Employee Self Service"
      >
        <Header showUserCard={false} showDivider />
      </div>

      <div className={styles["login-stage"]}>
        {loginStep === "method" && (
          <LoginMethod
            onSelectFace={() => goTo("face")}
            onSelectPassword={() => goTo("password")}
          />
        )}

        {loginStep === "password" && (
          <PasswordLogin
            empCode={empCode}
            pin={pin}
            loading={authLoading}
            onChangeEmp={updateEmpCode}
            onChangePin={(value) => {
              setPin(value.replace(/\s/g, "").slice(0, 6));
              if (localErrorMessage) setLocalErrorMessage(null);
            }}
            onSubmit={handleSubmit}
            onBack={goBackToMethods}
            onForgotPassword={() => goTo("forgotPassword")}
            onChangePassword={() => goTo("changePassword")}
          />
        )}

        {loginStep === "face" && (
          <FaceLogin
            empCode={empCode}
            loading={loading}
            checkingFaceProfile={loadingAction === "faceProfile"}
            missingFaceProfileOpen={missingFaceProfileOpen}
            onChangeEmp={updateEmpCode}
            onScanFace={handleFaceLoginScan}
            onCloseMissingFaceProfile={() => setMissingFaceProfileOpen(false)}
            onBack={goBackToMethods}
          />
        )}

        {loginStep === "forgotPassword" && (
          <ForgotPassword
            empCode={empCode}
            onChangeEmp={updateEmpCode}
            onBack={() => goTo("password")}
            onSend={handleForgotPassword}
          />
        )}

        {loginStep === "changePassword" && (
          <ChangePassword
            empCode={empCode}
            oldPin={changeOldPin}
            newPin={changeNewPin}
            onChangeEmp={updateEmpCode}
            onChangeOldPin={setChangeOldPin}
            onChangeNewPin={setChangeNewPin}
            onBack={() => {
              setChangeOldPin("");
              setChangeNewPin("");
              goTo("password");
            }}
            onForgotPassword={() => {
              setChangeOldPin("");
              setChangeNewPin("");
              goTo("forgotPassword");
            }}
            onSubmit={() => handleChangePassword(changeOldPin, changeNewPin)}
          />
        )}
      </div>

      <TimingMessagePopUp
        open={
          showFailedModal &&
          !missingFaceProfileOpen &&
          (loginStep === "password" || loginStep === "face")
        }
        variant={
          localErrorMessage || authErrorKey === "INVALID_CREDENTIALS"
            ? "warning"
            : "error"
        }
        message={authError || localErrorMessage || ""}
        errorKey={authErrorKey || null}
        contacts={authContacts}
        onClose={() => {
          setShowFailedModal(false);
          setLocalErrorMessage(null);
          useStore.getState().clearAuthError();
        }}
      />

      <MoLoadingPopup open={!!loadingMessage} message={loadingMessage || undefined} />

      <ClientVerificationCameraModal
        open={faceCameraOpen}
        onClose={() => {
          setFaceCameraOpen(false);
          setLoadingMessage(null);
          setLoadingAction(null);
        }}
        onCaptured={handleFaceCaptured}
        onReady={() => {
          setLoadingMessage(null);
          setLoadingAction(null);
        }}
        onSetupError={(message) => {
          setFaceCameraOpen(false);
          setLoadingMessage(null);
          setLoadingAction(null);
          setLocalErrorMessage(message);
        }}
        closeOnBackdrop={false}
        closeOnEsc={true}
      />
    </main>
  );
}

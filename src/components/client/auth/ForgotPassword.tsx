import { useState } from "react";
import { MailCheck, User } from "lucide-react";
import TimingMessagePopUp from "@/components/client/auth/popup/TimingMessagePopUp";
import MessagePopUp from "@/components/client/auth/popup/MessagePopUp";
import BigIconSuccessSmsPopUp from "@/components/client/auth/popup/BigIconSuccessSmsPopUp";
import FaceForgetPassSuccessSmsPopUp from "@/components/client/auth/popup/FaceForgetPassSuccessSmsPopUp";
import ClientVerificationCameraModal from "@/components/client/auth/models/ClientVerificationCameraModal";
import { preloadCameraModels } from "@/components/client/auth/ailoader/preloadCameraModels";
import MoLoadingPopup from "@/components/client/MoLoadingPopup";
import { useClientAuthStore as useStore } from "@/store/clientAuthStore";
import {
  buildFaceRegistrationUrl,
  rememberClientAuthReturn,
} from "@/store/clientReturnSite";
import styles from "./ForgotPassword.module.css";

type Result = {
  success: boolean;
  message: string;
  error?: string;
  contacts?: Array<{ team?: string; email?: string }>;
};

type Props = {
  empCode: string;
  onChangeEmp: (value: string) => void;
  onBack: () => void;
  onSend: () => Promise<Result>;
};

export default function ForgotPassword({ empCode, onChangeEmp, onBack, onSend }: Props) {
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"scan" | "send" | "faceVerify" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [missingFaceProfile, setMissingFaceProfile] = useState(false);
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resultContacts, setResultContacts] = useState<Array<{ team?: string; email?: string }> | undefined>();
  const [camOpen, setCamOpen] = useState(false);
  const [successMode, setSuccessMode] = useState<"email" | "face">("email");
  const loading = loadingAction !== null;
  const empValid = /^\d{6}$/.test(empCode);
  const publicKey = useStore((state) => state.publicKey);
  const returnTo = useStore((state) => state.returnTo);
  const registrationReturn = {
    empCode,
    returnStep: "forgotPassword" as const,
    publicKey,
    returnTo,
  };

  const handleSend = async () => {
    setShowResult(false);
    setMissingFaceProfile(false);
    setSuccessMode("email");
    setLoadingAction("send");
    setLoadingMessage("กำลังส่งรหัสผ่าน...");
    try {
      const result = await onSend();
      setResultSuccess(result.success);
      setResultMessage(result.success ? "ระบบได้ส่งรหัสผ่านไปยังอีเมลที่ลงทะเบียนไว้แล้ว" : result.message || "เกิดข้อผิดพลาด");
      setResultContacts(result.contacts);
      setShowResult(true);
    } catch {
      setResultSuccess(false);
      setResultMessage("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งหรือติดต่อฝ่ายบุคคล");
      setShowResult(true);
    } finally {
      setLoadingMessage(null);
      setLoadingAction(null);
    }
  };

  const handleScanFace = async () => {
    setShowResult(false);
    setMissingFaceProfile(false);
    if (!empValid) {
      setResultSuccess(false);
      setResultMessage("กรุณากรอกรหัสพนักงาน 6 หลักให้ถูกต้อง");
      setShowResult(true);
      return;
    }

    setLoadingAction("scan");
    let openingCamera = false;
    let profileChecked = false;

    try {
      const profile = await useStore.getState().lookupEmployeeFaceProfile(empCode);
      profileChecked = true;
      if (!profile.has_face_profile) {
        setLoadingMessage(null);
        setLoadingAction(null);
        setResultSuccess(false);
        setMissingFaceProfile(true);
        setResultMessage('ยังไม่มีข้อมูลใบหน้า\nกรุณาติดต่อช่องทางไลน์ "GUTS ESS"');
        setShowResult(true);
        return;
      }

      setShowResult(false);
      setLoadingMessage("กำลังเตรียมระบบสแกนใบหน้า...");
      await preloadCameraModels("verify");
      setLoadingMessage("กำลังเปิดกล้อง...");
      openingCamera = true;
      setCamOpen(true);
    } catch (error) {
      setResultSuccess(false);
      setResultMessage(!profileChecked && error instanceof Error ? error.message : "ไม่สามารถเตรียมระบบสแกนใบหน้าได้");
      setShowResult(true);
    } finally {
      if (!openingCamera) {
        setLoadingMessage(null);
        setLoadingAction(null);
      }
    }
  };

  const handleFaceCaptured = async (imageDataUrl: string) => {
    setShowResult(false);
    setMissingFaceProfile(false);
    setLoadingAction("faceVerify");
    setLoadingMessage("กำลังยืนยันใบหน้า...");
    try {
      const result = await useStore.getState().recoverPasswordWithFace(
        empCode,
        imageDataUrl,
      );
      const ok = result.success && result.is_match;
      setResultSuccess(ok);
      setSuccessMode("face");
      setResultMessage(ok ? result.password || "ไม่พบรหัสผ่าน กรุณาติดต่อ GutsEssCenter" : result.message || "ใบหน้าไม่ตรงกับข้อมูลพนักงาน");
      setShowResult(true);
    } catch {
      setLoadingMessage(null);
      setLoadingAction(null);
      setResultSuccess(false);
      setMissingFaceProfile(true);
      setResultMessage('ยังไม่มีข้อมูลใบหน้า\nกรุณาติดต่อช่องทางไลน์ "GUTS ESS"');
      setShowResult(true);
    } finally {
      setLoadingMessage(null);
      setLoadingAction(null);
    }
  };

  return (
    <div className={styles["login-panel"]}>
      <section className={styles["guts-card"]} aria-label="Forgot password">
        <div className={styles["guts-card-title"]}>ลืมรหัสผ่าน</div>
        <p className={styles["page-desc"]}>กรอกรหัสพนักงาน 6 หลัก แล้วกดส่งรหัส ระบบจะส่งรหัสไปยังอีเมลที่ลงทะเบียนไว้</p>

        <div className={styles["guts-form"]}>
          <div>
            <div className={styles["guts-label"]}>รหัสพนักงาน (6 หลัก)</div>
            <div className={styles["guts-field"]}>
              <span className={styles["guts-icon-left"]} aria-hidden="true"><User size={18} /></span>
              <input className={`${styles["guts-input"]} ${styles["guts-input--with-left"]}`} value={empCode} onChange={(e) => onChangeEmp(e.target.value)} inputMode="numeric" autoComplete="off" disabled={loading} />
            </div>
          </div>

          <button type="button" className={styles["guts-btn"]} onClick={handleScanFace} disabled={loading}>
            {loadingAction === "scan" ? "กำลังตรวจสอบ..." : "สแกนใบหน้า"}
          </button>
          <button type="button" className={styles["guts-btn"]} onClick={handleSend} disabled={loading}>
            {loadingAction === "send" ? "กำลังส่ง..." : "กดส่งรหัสผ่าน"}
          </button>
        </div>
      </section>

      <button type="button" className={styles["guts-back-btn"]} onClick={onBack} disabled={loading}>ย้อนกลับ</button>

      {resultSuccess && successMode === "face" ? (
        <FaceForgetPassSuccessSmsPopUp open={showResult} message={resultMessage} onClose={() => { setShowResult(false); setResultSuccess(false); onBack(); }} />
      ) : resultSuccess ? (
        <BigIconSuccessSmsPopUp open={showResult} icon={<MailCheck size={80} />} iconColor="gray" title="กรุณาตรวจสอบรหัสผ่านของคุณในอีเมล์" subText={resultMessage} onClose={() => { setShowResult(false); setResultSuccess(false); onBack(); }} />
      ) : missingFaceProfile ? (
        <MessagePopUp
          open={showResult}
          variant="warning"
          message={resultMessage}
          contacts={resultContacts}
          actionHref={buildFaceRegistrationUrl(registrationReturn)}
          onAction={() => rememberClientAuthReturn(registrationReturn)}
          onClose={() => {
            setShowResult(false);
            setMissingFaceProfile(false);
          }}
        />
      ) : (
        <TimingMessagePopUp open={showResult} variant="warning" message={resultMessage} errorKey={null} contacts={resultContacts} closeOnBackdrop closeOnEsc onClose={() => setShowResult(false)} />
      )}

      <MoLoadingPopup open={!!loadingMessage} message={loadingMessage || undefined} />
      <ClientVerificationCameraModal
        open={camOpen}
        onClose={() => { setCamOpen(false); setLoadingMessage(null); setLoadingAction(null); }}
        onCaptured={handleFaceCaptured}
        onReady={() => { setLoadingMessage(null); setLoadingAction(null); }}
        onSetupError={(message) => { setCamOpen(false); setLoadingMessage(null); setLoadingAction(null); setResultSuccess(false); setMissingFaceProfile(false); setResultMessage(message); setShowResult(true); }}
        closeOnBackdrop={false}
        closeOnEsc
      />
    </div>
  );
}

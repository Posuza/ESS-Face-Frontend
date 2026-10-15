import { useEffect } from "react";
import ClientVerificationCameraModal from "@/components/client/auth/models/ClientVerificationCameraModal";
import { scheduleCameraModelPreload } from "@/components/client/auth/ailoader/modelPreloadScheduler";

type Props = {
  open: boolean;
  onClose: () => void;
  onCaptured: (dataUrl: string) => void;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
};

/**
 * Attendance uses the same verified capture pipeline as face login so that a
 * green guide always represents a stable, compliant, live face.
 */
export default function CameraModal(props: Props) {
  useEffect(() => scheduleCameraModelPreload("verify"), []);

  return <ClientVerificationCameraModal {...props} />;
}

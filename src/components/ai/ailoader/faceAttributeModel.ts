import {
  getTinyComplianceMessage,
  loadTinyComplianceModel,
} from "./tinyComplianceModel";
import {
  getLegacyFaceAttributeMessage,
  loadLegacyFaceAttributeModel,
} from "./faceAttributeLegacyModel";
import {
  activeComplianceModel,
  loadFaceModelSettings,
} from "../faceModelSettings";
import type { FaceMode } from "@/types/api";

type FaceLandmark = { x: number; y: number; z?: number };
type FaceImageSource = HTMLVideoElement | HTMLCanvasElement;

const ACTIVE_FACE_COMPLIANCE_MODEL =
  import.meta.env.VITE_FACE_COMPLIANCE_MODEL === "legacy-tflite"
    ? "legacy-tflite"
    : "tiny-onnx";
let runtimeFaceComplianceModel: "tiny-onnx" | "legacy-tflite" | "disabled" =
  ACTIVE_FACE_COMPLIANCE_MODEL;

type LoadFaceAttributeOptions =
  | { skipSettingsReload: true; mode?: FaceMode }
  | { skipSettingsReload?: false; mode: FaceMode };

export function loadFaceAttributeModel(
  options: LoadFaceAttributeOptions = { mode: "verify" },
) {
  const settingsPromise = options.skipSettingsReload
    ? Promise.resolve()
    : loadFaceModelSettings(options.mode);

  return settingsPromise.then(() => {
    const activeModel = activeComplianceModel();
    if (!activeModel) {
      runtimeFaceComplianceModel = "disabled";
      return null;
    }
    runtimeFaceComplianceModel =
      activeModel === "face_attrib_legacy" ? "legacy-tflite" : "tiny-onnx";
    if (runtimeFaceComplianceModel === "legacy-tflite") {
      return loadLegacyFaceAttributeModel();
    }

    return loadTinyComplianceModel().catch((error: unknown) => {
      console.warn(
        "[FaceCompliance] Tiny ONNX model failed; falling back to FaceAttribNet.",
        error,
      );
      runtimeFaceComplianceModel = "legacy-tflite";
      return loadLegacyFaceAttributeModel();
    });
  });
}

export async function getFaceAttributeMessage(
  source: FaceImageSource,
  landmarks: FaceLandmark[],
  timestamp: number,
): Promise<string | null> {
  if (runtimeFaceComplianceModel === "disabled") return null;
  return runtimeFaceComplianceModel === "legacy-tflite"
    ? getLegacyFaceAttributeMessage(source, landmarks, timestamp)
    : getTinyComplianceMessage(source, landmarks);
}

import { loadAntiSpoofClassifier } from "./antiSpoofClassifier";
import {
  loadFaceAttributeClassifier,
} from "./faceAttributeClassifier";
import { isFaceModelActive, loadFaceModelSettings } from "./faceModelSettings";
import { loadFaceDetector } from "./faceDetectorLoader";
import type { FaceMode } from "@/types/api";

export async function preloadCameraModels(mode: FaceMode) {
  await loadFaceModelSettings(mode);

  await Promise.all([
    loadFaceDetector(),
    loadFaceAttributeClassifier({ skipSettingsReload: true }),
    isFaceModelActive("minifasnet_v2")
      ? loadAntiSpoofClassifier()
      : Promise.resolve(null),
  ]);
}

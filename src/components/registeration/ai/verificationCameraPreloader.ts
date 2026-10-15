import { loadAntiSpoofModel } from "./ailoader/antiSpoofModel";
import { loadFaceAttributeModel } from "./ailoader/faceAttributeModel";
import { loadFaceDetector } from "./ailoader/faceDetectorModel";
import { isFaceModelActive, loadFaceModelSettings } from "./faceModelSettings";

export async function preloadVerificationCameraModels() {
  await loadFaceModelSettings("verify");

  await Promise.all([
    isFaceModelActive("face_detector")
      ? loadFaceDetector()
      : Promise.resolve(null),
    loadFaceAttributeModel({ skipSettingsReload: true, mode: "verify" }),
    isFaceModelActive("minifasnet_v2")
      ? loadAntiSpoofModel()
      : Promise.resolve(null),
  ]);
}

export async function preloadVerificationCameraModels1() {
  await loadFaceModelSettings("verify");

  await Promise.all([
    isFaceModelActive("face_detector")
      ? loadFaceDetector()
      : Promise.resolve(null),
    loadFaceAttributeModel({ skipSettingsReload: true, mode: "verify" }),
    isFaceModelActive("minifasnet_v2")
      ? loadAntiSpoofModel()
      : Promise.resolve(null),
  ]);
}

import { loadAntiSpoofModel } from "./ailoader/antiSpoofModel";
import { loadFaceAttributeModel } from "./ailoader/faceAttributeModel";
import { loadFaceLandmarker } from "./ailoader/faceLandmarkerModel";
import { isFaceModelActive, loadFaceModelSettings } from "./faceModelSettings";

export async function preloadRegisterCameraModels() {
  await loadFaceModelSettings("register");

  await Promise.all([
    loadFaceLandmarker(),
    loadFaceAttributeModel({ skipSettingsReload: true, mode: "register" }),
    isFaceModelActive("minifasnet_v2")
      ? loadAntiSpoofModel()
      : Promise.resolve(null),
  ]);
}

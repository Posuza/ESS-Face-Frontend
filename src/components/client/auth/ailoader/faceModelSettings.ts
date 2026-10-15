import { clientAuthService } from "@/services/clientAuth.service";
import type { FaceMode } from "@/types/api";
import type { FrontendModel } from "@/types/api";

let frontendModels: FrontendModel[] = [];
let loadPromise: Promise<void> | null = null;

export function loadFaceModelSettings(mode: FaceMode): Promise<void> {
  if (mode !== "verify") {
    return Promise.reject(new Error("Client authentication only supports verify mode"));
  }
  if (frontendModels.length > 0) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = clientAuthService
      .getFrontendModelSettings()
      .then((models) => {
        frontendModels = models;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

export function getFaceModelValue(modelKey: string, settingKey: string, fallback: number) {
  const value = frontendModels.find((model) => model.model_key === modelKey)
    ?.settings_values?.[settingKey]?.value;
  return typeof value === "number" ? value : fallback;
}

export function isFaceModelActive(modelKey: string, fallback = true) {
  const active = frontendModels.find((model) => model.model_key === modelKey)?.active;
  return typeof active === "boolean" ? active : fallback;
}

export function activeComplianceModel() {
  return frontendModels.find(
    (model) => model.model_role === "face_compliance" && model.active,
  )?.model_key;
}

export function getFaceModelValueForMode(
  modelKey: string,
  mode: FaceMode,
  settingKey: string,
  fallback: number,
) {
  const model = frontendModels.find((item) => item.model_key === modelKey);
  const modeKey = `${mode}_${settingKey}`;
  const modeValue = model?.settings_values[modeKey]?.value;
  if (typeof modeValue === "number") return modeValue;
  return getFaceModelValue(modelKey, settingKey, fallback);
}

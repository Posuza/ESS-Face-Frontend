import { useAppStore } from "@/store";
import type { FaceMode } from "@/types/api";

export function loadFaceModelSettings(mode: FaceMode): Promise<void> {
  return useAppStore.getState().loadFrontendModelSettings(mode);
}

export function getFaceModelValue(modelKey: string, settingKey: string, fallback: number) {
  return useAppStore.getState().getFaceModelValue(modelKey, settingKey, fallback);
}

export function isFaceModelActive(modelKey: string, fallback = true) {
  return useAppStore.getState().isFaceModelActive(modelKey, fallback);
}

export function activeComplianceModel() {
  return useAppStore.getState().activeComplianceModel();
}

export function getFaceModelValueForMode(
  modelKey: string,
  mode: FaceMode,
  settingKey: string,
  fallback: number,
) {
  const state = useAppStore.getState();
  const model = state.frontendModels.find((item) => item.model_key === modelKey);
  const modeKey = `${mode}_${settingKey}`;
  const modeValue = model?.settings_values[modeKey]?.value;
  if (typeof modeValue === "number") return modeValue;
  return state.getFaceModelValue(modelKey, settingKey, fallback);
}

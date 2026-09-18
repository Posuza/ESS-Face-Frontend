import { adminService } from "@/services/admin.service";
import type { FaceMode, ModelGroup, ModelSchema, ModelSettingsDocument } from "@/types/api";

import type { AppSliceCreator } from "../types";

function updateDocumentModel(
  document: ModelSettingsDocument | null,
  group: ModelGroup,
  modelKey: string,
  change: (model: ModelSchema) => void,
) {
  if (!document) return document;
  const next = structuredClone(document);
  const model = next.model_schemas[group].find((item) => item.model_key === modelKey);
  if (model) change(model);
  return next;
}

function modelsByKey(document: ModelSettingsDocument, group: ModelGroup, modelKeys: string[]) {
  const keys = new Set(modelKeys);
  return document.model_schemas[group].filter((model) => keys.has(model.model_key));
}

function normalizeModelSettingsDocument(document: ModelSettingsDocument) {
  const next = structuredClone(document);
  const landmarker = next.model_schemas.frontend_models.find(
    (model) => model.model_key === "face_landmarker",
  );

  if (landmarker) {
    landmarker.settings_values.require_feature_target_alignment ??= {
      value: 1,
      default: 1,
      min: 0,
      max: 1,
      step: 1,
    };
    landmarker.settings_values.require_eye_alignment ??= {
      value: 1,
      default: 1,
      min: 0,
      max: 1,
      step: 1,
    };
    landmarker.settings_values.require_nose_zone ??= {
      value: 1,
      default: 1,
      min: 0,
      max: 1,
      step: 1,
    };
    landmarker.settings_values.require_mouth_zone ??= {
      value: 1,
      default: 1,
      min: 0,
      max: 1,
      step: 1,
    };
    landmarker.settings_values.show_debug_markers ??= {
      value: 0,
      default: 0,
      min: 0,
      max: 1,
      step: 1,
    };
    landmarker.settings_values.min_average_brightness ??= {
      value: 50,
      default: 50,
      min: 0,
      max: 255,
      step: 1,
    };
    landmarker.settings_values.max_average_brightness ??= {
      value: 214,
      default: 214,
      min: 0,
      max: 255,
      step: 1,
    };
    landmarker.settings_values.max_dark_pixel_ratio ??= {
      value: 0.48,
      default: 0.48,
      min: 0,
      max: 1,
      step: 0.01,
    };
    landmarker.settings_values.max_bright_pixel_ratio ??= {
      value: 0.42,
      default: 0.42,
      min: 0,
      max: 1,
      step: 0.01,
    };
  }

  return next;
}

export type ModelSettingsSlice = {
  modelSettingsDocument: ModelSettingsDocument | null;
  savedModelSettingsDocument: ModelSettingsDocument | null;
  modelSettingsBusy: boolean;
  modelSettingsError: string;
  modelSettingsNotice: string;
  modelSettingsMode: FaceMode | null;
  loadModelSettings: (mode: FaceMode) => Promise<void>;
  updateModelSetting: (
    group: ModelGroup,
    modelKey: string,
    change: (model: ModelSchema) => void,
  ) => void;
  setModelActive: (group: ModelGroup, model: ModelSchema, active: boolean) => void;
  saveModelSettingsGroup: (group: ModelGroup, scopeLabel: string) => Promise<void>;
  saveModelSettingsModels: (
    group: ModelGroup,
    modelKeys: string[],
    scopeLabel: string,
  ) => Promise<void>;
  resetModelSettings: (
    scopeLabel: string,
    group?: ModelGroup,
    modelKey?: string,
  ) => Promise<void>;
  cancelModelSettingsGroup: (group: ModelGroup, scopeLabel: string) => void;
  cancelModelSettingsModels: (
    group: ModelGroup,
    modelKeys: string[],
    scopeLabel: string,
  ) => void;
  isModelSettingsGroupDirty: (group: ModelGroup) => boolean;
  isModelSettingsModelsDirty: (group: ModelGroup, modelKeys: string[]) => boolean;
};

export const createModelSettingsSlice: AppSliceCreator<ModelSettingsSlice> = (set, get) => ({
  modelSettingsDocument: null,
  savedModelSettingsDocument: null,
  modelSettingsBusy: true,
  modelSettingsError: "",
  modelSettingsNotice: "",
  modelSettingsMode: null,

  async loadModelSettings(mode) {
    const adminCode = get().adminSession?.employee_code;
    if (!adminCode) {
      set({ modelSettingsBusy: false, modelSettingsError: "กรุณาเข้าสู่ระบบผู้ดูแล" });
      return;
    }

    set({ modelSettingsBusy: true, modelSettingsError: "" });
    try {
      const document = normalizeModelSettingsDocument(
        await adminService.getModelSettings(adminCode, mode),
      );
      set({
        modelSettingsDocument: document,
        savedModelSettingsDocument: structuredClone(document),
        modelSettingsBusy: false,
        modelSettingsMode: mode ?? null,
      });
    } catch (error) {
      set({
        modelSettingsBusy: false,
        modelSettingsError:
          error instanceof Error ? error.message : "ไม่สามารถโหลดการตั้งค่าโมเดลได้",
      });
    }
  },

  updateModelSetting(group, modelKey, change) {
    set((state) => ({
      modelSettingsDocument: updateDocumentModel(
        state.modelSettingsDocument,
        group,
        modelKey,
        change,
      ),
    }));
  },

  setModelActive(group, model, active) {
    set((state) => ({
      modelSettingsDocument: updateDocumentModel(
        state.modelSettingsDocument,
        group,
        model.model_key,
        (target) => {
          target.active = active;
        },
      ),
    }));

    if (active && group === "frontend_models" && model.model_role === "face_compliance") {
      set((state) => {
        if (!state.modelSettingsDocument) return {};
        const next = structuredClone(state.modelSettingsDocument);
        for (const candidate of next.model_schemas.frontend_models) {
          if (candidate.model_role === "face_compliance") {
            candidate.active = candidate.model_key === model.model_key;
          }
        }
        return { modelSettingsDocument: next };
      });
    }
  },

  async saveModelSettingsGroup(group, scopeLabel) {
    const adminCode = get().adminSession?.employee_code;
    const document = get().modelSettingsDocument;
    if (!adminCode || !document) return;

    set({ modelSettingsBusy: true, modelSettingsError: "" });
    try {
      const modelsToSave = [...document.model_schemas[group]].sort(
        (left, right) => Number(right.active) - Number(left.active),
      );
      for (const model of modelsToSave) {
        await adminService.updateModel(adminCode, group, model, get().modelSettingsMode ?? "verify");
      }
      set((state) => {
        const next = structuredClone(state.savedModelSettingsDocument ?? document);
        next.model_schemas[group] = structuredClone(document.model_schemas[group]);
        return {
          savedModelSettingsDocument: next,
          ...(group === "frontend_models"
            ? {
                frontendModels: structuredClone(document.model_schemas.frontend_models),
              }
            : {}),
          modelSettingsNotice: `บันทึก ${scopeLabel} แล้ว`,
          modelSettingsBusy: false,
        };
      });
    } catch (error) {
      set({
        modelSettingsBusy: false,
        modelSettingsError:
          error instanceof Error ? error.message : "ไม่สามารถบันทึกการตั้งค่าโมเดลได้",
      });
    }
  },

  async saveModelSettingsModels(group, modelKeys, scopeLabel) {
    const adminCode = get().adminSession?.employee_code;
    const document = get().modelSettingsDocument;
    if (!adminCode || !document || modelKeys.length === 0) return;

    set({ modelSettingsBusy: true, modelSettingsError: "" });
    try {
      const modelsToSave = modelsByKey(document, group, modelKeys).sort(
        (left, right) => Number(right.active) - Number(left.active),
      );
      for (const model of modelsToSave) {
        await adminService.updateModel(adminCode, group, model, get().modelSettingsMode ?? "verify");
      }
      set((state) => {
        const next = structuredClone(state.savedModelSettingsDocument ?? document);
        for (const model of modelsToSave) {
          const index = next.model_schemas[group].findIndex(
            (item) => item.model_key === model.model_key,
          );
          if (index >= 0) {
            next.model_schemas[group][index] = structuredClone(model);
          }
        }
        return {
          savedModelSettingsDocument: next,
          ...(group === "frontend_models"
            ? {
                frontendModels: structuredClone(next.model_schemas.frontend_models),
              }
            : {}),
          modelSettingsNotice: `บันทึก ${scopeLabel} แล้ว`,
          modelSettingsBusy: false,
        };
      });
    } catch (error) {
      set({
        modelSettingsBusy: false,
        modelSettingsError:
          error instanceof Error ? error.message : "ไม่สามารถบันทึกการตั้งค่าโมเดลได้",
      });
    }
  },

  async resetModelSettings(scopeLabel, group, modelKey) {
    const adminCode = get().adminSession?.employee_code;
    if (!adminCode) return;

    set({ modelSettingsBusy: true, modelSettingsError: "" });
    try {
      const resetDocument = await adminService.resetModelSettings(
        adminCode,
        get().modelSettingsMode ?? "verify",
        group,
        modelKey,
      );
      set((state) => {
        let document = resetDocument;
        if (state.modelSettingsDocument && group) {
          document = structuredClone(state.modelSettingsDocument);
          if (!modelKey) {
            document.model_schemas[group] = structuredClone(resetDocument.model_schemas[group]);
          } else {
            const resetModel = resetDocument.model_schemas[group].find(
              (model) => model.model_key === modelKey,
            );
            const modelIndex = document.model_schemas[group].findIndex(
              (model) => model.model_key === modelKey,
            );
            if (resetModel && modelIndex >= 0) {
              document.model_schemas[group][modelIndex] = structuredClone(resetModel);
            }
          }
        }

        return {
          modelSettingsDocument: document,
          savedModelSettingsDocument: structuredClone(resetDocument),
          ...(group === "frontend_models" || !group
            ? {
                frontendModels: structuredClone(document.model_schemas.frontend_models),
              }
            : {}),
          modelSettingsNotice: `คืนค่าเริ่มต้นสำเร็จ${scopeLabel ? `: ${scopeLabel}` : ""}`,
          modelSettingsBusy: false,
        };
      });
    } catch (error) {
      set({
        modelSettingsBusy: false,
        modelSettingsError: error instanceof Error ? error.message : "ไม่สามารถคืนค่าเริ่มต้นได้",
      });
    }
  },

  cancelModelSettingsGroup(group, scopeLabel) {
    const savedDocument = get().savedModelSettingsDocument;
    if (!savedDocument) return;
    set((state) => {
      if (!state.modelSettingsDocument) return {};
      const next = structuredClone(state.modelSettingsDocument);
      next.model_schemas[group] = structuredClone(savedDocument.model_schemas[group]);
      return {
        modelSettingsDocument: next,
        modelSettingsError: "",
        modelSettingsNotice: `ยกเลิกการเปลี่ยนแปลงสำเร็จ${scopeLabel ? `: ${scopeLabel}` : ""}`,
      };
    });
  },

  cancelModelSettingsModels(group, modelKeys, scopeLabel) {
    const savedDocument = get().savedModelSettingsDocument;
    if (!savedDocument || modelKeys.length === 0) return;
    const keys = new Set(modelKeys);
    set((state) => {
      if (!state.modelSettingsDocument) return {};
      const next = structuredClone(state.modelSettingsDocument);
      for (const savedModel of savedDocument.model_schemas[group]) {
        if (!keys.has(savedModel.model_key)) continue;
        const index = next.model_schemas[group].findIndex(
          (model) => model.model_key === savedModel.model_key,
        );
        if (index >= 0) {
          next.model_schemas[group][index] = structuredClone(savedModel);
        }
      }
      return {
        modelSettingsDocument: next,
        modelSettingsError: "",
        ...(group === "frontend_models"
          ? {
              frontendModels: structuredClone(savedDocument.model_schemas.frontend_models),
            }
          : {}),
        modelSettingsNotice: `ยกเลิกการเปลี่ยนแปลงสำเร็จ${scopeLabel ? `: ${scopeLabel}` : ""}`,
      };
    });
  },

  isModelSettingsGroupDirty(group) {
    const { modelSettingsDocument, savedModelSettingsDocument } = get();
    if (!modelSettingsDocument || !savedModelSettingsDocument) return false;
    return (
      JSON.stringify(modelSettingsDocument.model_schemas[group]) !==
      JSON.stringify(savedModelSettingsDocument.model_schemas[group])
    );
  },

  isModelSettingsModelsDirty(group, modelKeys) {
    const { modelSettingsDocument, savedModelSettingsDocument } = get();
    if (!modelSettingsDocument || !savedModelSettingsDocument || modelKeys.length === 0) {
      return false;
    }
    return (
      JSON.stringify(modelsByKey(modelSettingsDocument, group, modelKeys)) !==
      JSON.stringify(modelsByKey(savedModelSettingsDocument, group, modelKeys))
    );
  },
});

import { frontendModelSettingsService } from "@/services/frontendModelSettings.service";
import type { FaceMode, FrontendModel } from "@/types/api";

import type { AppSliceCreator } from "../types";

let loadPromise: Promise<void> | null = null;
let loadPromiseMode: FaceMode | undefined;

function normalizeFrontendModels(frontendModels: FrontendModel[]) {
  const next = structuredClone(frontendModels);
  const landmarker = next.find((model) => model.model_key === "face_landmarker");
  const detector = next.find((model) => model.model_key === "face_detector");

  if (detector) {
    detector.settings_values.require_feature_target_alignment ??= {
      value: 1,
    };
    detector.settings_values.require_eye_alignment ??= {
      value: 1,
    };
    detector.settings_values.require_nose_zone ??= {
      value: 1,
    };
    detector.settings_values.require_mouth_zone ??= {
      value: 1,
    };
    detector.settings_values.min_average_brightness ??= {
      value: 35,
    };
    detector.settings_values.max_average_brightness ??= {
      value: 225,
    };
    detector.settings_values.max_dark_pixel_ratio ??= {
      value: 0.48,
    };
    detector.settings_values.max_bright_pixel_ratio ??= {
      value: 0.42,
    };
    detector.settings_values.eye_center_x_tolerance ??= {
      value: 10,
    };
    detector.settings_values.eye_center_y_tolerance ??= {
      value: 9,
    };
    detector.settings_values.min_eye_distance ??= {
      value: 56,
    };
    detector.settings_values.max_eye_distance ??= {
      value: 84,
    };
    detector.settings_values.min_face_guide_height ??= {
      value: 152,
    };
    detector.settings_values.max_face_guide_height ??= {
      value: 210,
    };
    detector.settings_values.guide_boundary_tolerance ??= {
      value: 1.16,
    };
    detector.settings_values.nose_x_ratio_max ??= {
      value: 0.34,
    };
    detector.settings_values.min_nose_below_eyes_ratio ??= {
      value: 0.12,
    };
    detector.settings_values.max_nose_below_eyes_ratio ??= {
      value: 1.2,
    };
    detector.settings_values.mouth_x_ratio_max ??= {
      value: 0.5,
    };
    detector.settings_values.min_mouth_below_nose_ratio ??= {
      value: 0.12,
    };
    detector.settings_values.max_mouth_below_nose_ratio ??= {
      value: 1.15,
    };
    detector.settings_values.landmark_eye_tilt_max ??= {
      value: 0.14,
    };
    detector.settings_values.landmark_nose_x_ratio_max ??= {
      value: 0.24,
    };
    detector.settings_values.capture_ready_eye_center_x_tolerance ??= {
      value: 2,
    };
    detector.settings_values.capture_ready_eye_center_y_tolerance ??= {
      value: 2,
    };
    detector.settings_values.capture_ready_min_eye_distance ??= {
      value: 60,
    };
    detector.settings_values.capture_ready_max_eye_distance ??= {
      value: 80,
    };
    detector.settings_values.max_capture_ready_center_shift_ratio ??= {
      value: 0.01,
    };
    detector.settings_values.max_capture_ready_eye_distance_ratio ??= {
      value: 0.01,
    };
    detector.settings_values.capture_ready_lock_hold_ms ??= {
      value: 800,
    };
    detector.settings_values.max_stable_face_movement ??= {
      value: 2.4,
    };
    detector.settings_values.max_capture_ready_face_movement ??= {
      value: 0.8,
    };
    detector.settings_values.max_capture_ready_eye_distance_change ??= {
      value: 0.5,
    };
  }

  if (landmarker) {
    landmarker.settings_values.show_debug_markers ??= {
      value: 0,
    };
    landmarker.settings_values.min_average_brightness ??= {
      value: 50,
    };
    landmarker.settings_values.max_average_brightness ??= {
      value: 214,
    };
    landmarker.settings_values.max_dark_pixel_ratio ??= {
      value: 0.48,
    };
    landmarker.settings_values.max_bright_pixel_ratio ??= {
      value: 0.42,
    };
  }

  return next;
}

export type FrontendModelSettingsSlice = {
  frontendModels: FrontendModel[];
  loadFrontendModelSettings: (mode: FaceMode) => Promise<void>;
  getFaceModelValue: (modelKey: string, settingKey: string, fallback: number) => number;
  isFaceModelActive: (modelKey: string, fallback?: boolean) => boolean;
  activeComplianceModel: () => string | undefined;
};

export const createFrontendModelSettingsSlice: AppSliceCreator<FrontendModelSettingsSlice> = (
  set,
  get,
) => ({
  frontendModels: [],

  loadFrontendModelSettings(mode) {
    if (!loadPromise || loadPromiseMode !== mode) {
      loadPromiseMode = mode;
      loadPromise = frontendModelSettingsService
        .list(mode)
        .then((frontendModels) => {
          set({ frontendModels: normalizeFrontendModels(frontendModels) });
        })
        .catch((error) => {
          console.warn("[FaceModels] Unable to load backend model settings:", error);
          throw error;
        })
        .finally(() => {
          loadPromise = null;
          loadPromiseMode = undefined;
        });
    }
    return loadPromise;
  },

  getFaceModelValue(modelKey, settingKey, fallback) {
    const value = get().frontendModels.find((model) => model.model_key === modelKey)
      ?.settings_values?.[settingKey]?.value;
    return typeof value === "number" ? value : fallback;
  },

  isFaceModelActive(modelKey, fallback = true) {
    const active = get().frontendModels.find((model) => model.model_key === modelKey)?.active;
    return typeof active === "boolean" ? active : fallback;
  },

  activeComplianceModel() {
    return get().frontendModels.find(
      (model) => model.model_role === "face_compliance" && model.active,
    )?.model_key;
  },
});

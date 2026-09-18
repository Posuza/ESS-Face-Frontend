import { useEffect, useState, type CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft, faSave, faServer, faWindowMaximize, faXmark } from "@fortawesome/free-solid-svg-icons";

import PermissionErrorModal from "@/components/auth/popup/PermissionErrorModal";
import {
  AdminFaceVisualGuide,
  BOX_GUIDE_OUTLINE,
  type AdminFaceVisualGuideValues,
} from "@/components/ai/FaceVisualGuide";
import { useAppStore } from "@/store";
import type { ModelGroup, ModelSchema, SettingMetadata } from "@/types/api";

import styles from "./ModelSettings.module.css";

const ROLE_LABELS: Record<string, string> = {
  face_detection: "Face detection",
  face_recognition: "Face recognition",
  face_compliance: "Face compliance",
  face_landmarks: "Face landmarks",
  anti_spoof: "Anti-spoofing",
  image_quality: "Image quality",
};

const SETTING_LABELS: Record<string, string> = {
  score_threshold: "Detection score threshold",
  nms_threshold: "NMS threshold",
  cosine_threshold: "Cosine similarity threshold",
  glasses_threshold: "Glasses threshold",
  mask_threshold: "Mask threshold",
  sunglasses_threshold: "Sunglasses threshold",
  minimum_eye_openness: "Minimum eye openness",
  eyewear_threshold: "Eyewear threshold",
  eyes_occluded_threshold: "Eyes occluded threshold",
  nose_occluded_threshold: "Nose occluded threshold",
  mouth_occluded_threshold: "Mouth occluded threshold",
  real_score_threshold: "Real score threshold",
  eye_center_x_tolerance: "Eye center X tolerance",
  eye_center_y_tolerance: "Eye center Y tolerance",
  min_eye_distance: "Minimum eye distance",
  max_eye_distance: "Maximum eye distance",
  min_face_guide_height: "Minimum face height",
  max_face_guide_height: "Maximum face height",
  guide_boundary_tolerance: "Guide boundary tolerance",
  nose_x_ratio_max: "Nose X tolerance",
  min_nose_below_eyes_ratio: "Minimum nose below eyes",
  max_nose_below_eyes_ratio: "Maximum nose below eyes",
  mouth_x_ratio_max: "Mouth X tolerance",
  min_mouth_below_nose_ratio: "Minimum mouth below nose",
  max_mouth_below_nose_ratio: "Maximum mouth below nose",
  landmark_eye_tilt_max: "Maximum eye tilt",
  landmark_nose_x_ratio_max: "Landmark nose X tolerance",
  capture_ready_eye_center_x_tolerance: "Capture-ready eye center X tolerance",
  capture_ready_eye_center_y_tolerance: "Capture-ready eye center Y tolerance",
  capture_ready_min_eye_distance: "Capture-ready minimum eye distance",
  capture_ready_max_eye_distance: "Capture-ready maximum eye distance",
  max_capture_ready_center_shift_ratio: "Capture-ready center shift ratio",
  max_capture_ready_eye_distance_ratio: "Capture-ready eye distance ratio",
  capture_ready_lock_hold_ms: "Capture-ready hold time",
  max_stable_face_movement: "Maximum stable face movement",
  max_capture_ready_face_movement: "Capture-ready face movement",
  max_capture_ready_eye_distance_change: "Capture-ready eye distance change",
  min_average_brightness: "Minimum average brightness",
  max_average_brightness: "Maximum average brightness",
  max_dark_pixel_ratio: "Maximum dark pixel ratio",
  max_bright_pixel_ratio: "Maximum bright pixel ratio",
  min_brightness: "Minimum brightness",
  max_brightness: "Maximum brightness",
  min_blur_score: "Minimum blur score",
  min_face_area_ratio: "Minimum face area ratio",
};

const TOGGLE_ADMIN_SETTINGS = new Set(["require_feature_target_alignment", "show_debug_markers"]);
const FACE_LANDMARKER_TOGGLE_SETTINGS = [
  {
    key: "require_eye_alignment",
    label: "Eye alignment",
  },
  {
    key: "require_nose_zone",
    label: "Nose zone",
  },
  {
    key: "require_mouth_zone",
    label: "Mouth zone",
  },
] as const;
const FACE_LANDMARKER_PANELS = [
  {
    key: "eye",
    label: "Eyes",
    description: "Eye center and near/far eye distance",
    settingKeys: ["eye_center_x_tolerance", "eye_center_y_tolerance", "min_eye_distance", "max_eye_distance"],
    toggleKey: "require_eye_alignment",
    swatch: "eyeSwatch",
  },
  {
    key: "nose",
    label: "Nose",
    description: "Nose horizontal and vertical position",
    settingKeys: ["nose_x_ratio_max", "min_nose_below_eyes_ratio", "max_nose_below_eyes_ratio"],
    toggleKey: "require_nose_zone",
    swatch: "noseSwatch",
  },
  {
    key: "mouth",
    label: "Mouth",
    description: "Mouth horizontal and vertical position",
    settingKeys: ["mouth_x_ratio_max", "min_mouth_below_nose_ratio", "max_mouth_below_nose_ratio"],
    toggleKey: "require_mouth_zone",
    swatch: "mouthSwatch",
  },
  {
    key: "circle",
    label: "Circle",
    description: "Face size and circle boundary tolerance",
    settingKeys: ["min_face_guide_height", "max_face_guide_height", "guide_boundary_tolerance"],
    toggleKey: undefined,
    swatch: "boundarySwatch",
  },
  {
    key: "quality",
    label: "Quality",
    description: "Straight-face tilt and nose center checks",
    settingKeys: ["landmark_eye_tilt_max", "landmark_nose_x_ratio_max"],
    toggleKey: undefined,
    swatch: "qualitySwatch",
  },
  {
    key: "lighting",
    label: "Lighting",
    description: "Brightness and exposure limits",
    settingKeys: ["min_average_brightness", "max_average_brightness", "max_dark_pixel_ratio", "max_bright_pixel_ratio"],
    toggleKey: undefined,
    swatch: "lightingSwatch",
  },
] as const;
const FACE_DETECTOR_PANELS = [
  {
    key: "position",
    label: "Position",
    description: "Face center and eye distance before green",
    settingKeys: ["eye_center_x_tolerance", "eye_center_y_tolerance", "min_eye_distance", "max_eye_distance"],
    toggleKey: "require_eye_alignment",
    swatch: "eyeSwatch",
  },
  {
    key: "box",
    label: "Box",
    description: "Face size and guide boundary",
    settingKeys: ["min_face_guide_height", "max_face_guide_height", "guide_boundary_tolerance"],
    toggleKey: undefined,
    swatch: "boundarySwatch",
  },
  {
    key: "features",
    label: "Features",
    description: "Nose and mouth placement checks",
    settingKeys: ["nose_x_ratio_max", "min_nose_below_eyes_ratio", "max_nose_below_eyes_ratio", "mouth_x_ratio_max", "min_mouth_below_nose_ratio", "max_mouth_below_nose_ratio"],
    toggleKey: "require_feature_target_alignment",
    swatch: "noseSwatch",
  },
  {
    key: "green",
    label: "Green Lock",
    description: "Stricter checks after the guide turns green",
    settingKeys: ["capture_ready_eye_center_x_tolerance", "capture_ready_eye_center_y_tolerance", "capture_ready_min_eye_distance", "capture_ready_max_eye_distance", "max_capture_ready_face_movement", "max_capture_ready_eye_distance_change", "max_capture_ready_center_shift_ratio", "max_capture_ready_eye_distance_ratio", "capture_ready_lock_hold_ms"],
    toggleKey: undefined,
    swatch: "qualitySwatch",
  },
  {
    key: "lighting",
    label: "Lighting",
    description: "Brightness and exposure limits",
    settingKeys: ["min_average_brightness", "max_average_brightness", "max_dark_pixel_ratio", "max_bright_pixel_ratio"],
    toggleKey: undefined,
    swatch: "lightingSwatch",
  },
] as const;
const HIDDEN_ADMIN_SETTINGS = new Set([
  "required_samples",
  ...TOGGLE_ADMIN_SETTINGS,
  ...FACE_LANDMARKER_TOGGLE_SETTINGS.map((setting) => setting.key),
]);
type FaceLandmarkerPanel = (typeof FACE_LANDMARKER_PANELS)[number]["key"];
type FaceDetectorPanel = (typeof FACE_DETECTOR_PANELS)[number]["key"];
const REQUIRED_MODEL_KEYS = new Set(["scrfd_detector", "arcface_recognizer", "face_detector", "face_landmarker"]);

function percentage(value: number, metadata: SettingMetadata) {
  const range = metadata.max - metadata.min;
  return range > 0 ? Math.min(100, Math.max(0, ((value - metadata.min) / range) * 100)) : 50;
}

function thumbPosition(position: number) {
  const thumbRadius = 9;
  const inset = thumbRadius - (position / 100) * thumbRadius * 2;
  return `calc(${position}% + ${inset}px)`;
}

function isFrontendComplianceModel(group: ModelGroup, modelRole: string) {
  return group === "frontend_models" && modelRole === "face_compliance";
}

function setFrontendComplianceMode(modelKey: string | null) {
  useAppStore.setState((state) => {
    if (!state.modelSettingsDocument) return {};
    const next = structuredClone(state.modelSettingsDocument);
    for (const model of next.model_schemas.frontend_models) {
      if (model.model_role === "face_compliance") {
        model.active = modelKey !== null && model.model_key === modelKey;
      }
    }
    return { modelSettingsDocument: next };
  });
}

function settingValue(model: ModelSchema, key: string, fallback: number) {
  const value = model.settings_values[key]?.value;
  return typeof value === "number" ? value : fallback;
}

export default function VerificationModelSettings() {
  const settingsMode = "verify";
  const document = useAppStore((state) => state.modelSettingsDocument);
  const busy = useAppStore((state) => state.modelSettingsBusy);
  const error = useAppStore((state) => state.modelSettingsError);
  const notice = useAppStore((state) => state.modelSettingsNotice);
  const load = useAppStore((state) => state.loadModelSettings);
  const updateModel = useAppStore((state) => state.updateModelSetting);
  const setActive = useAppStore((state) => state.setModelActive);
  const saveModels = useAppStore((state) => state.saveModelSettingsModels);
  const reset = useAppStore((state) => state.resetModelSettings);
  const cancelModels = useAppStore((state) => state.cancelModelSettingsModels);
  const isModelsDirty = useAppStore((state) => state.isModelSettingsModelsDirty);
  const [faceLandmarkerPanel, setFaceLandmarkerPanel] = useState<FaceLandmarkerPanel>("eye");
  const [faceDetectorPanel, setFaceDetectorPanel] = useState<FaceDetectorPanel>("position");

  useEffect(() => { void load(settingsMode); }, [load]);

  const modelGroups: Array<{ key: ModelGroup; title: string; description: string; icon: typeof faServer }> = [
    { key: "backend_models", title: "Backend Models", description: "Server-side settings from ai/config/verification_model_setting.json", icon: faServer },
    { key: "frontend_models", title: "Frontend Models", description: "Browser-side settings from ai/config/verification_model_setting.json", icon: faWindowMaximize },
  ];

  const modeSettingKey = (model: ModelSchema, key: string) => {
    const candidate = `${settingsMode}_${key}`;
    return model.settings_values[candidate] ? candidate : key;
  };

  const displaySettingKey = (key: string) =>
    key.replace(/^register_/, "").replace(/^verify_/, "");

  function renderSettings(model: ModelSchema, group: ModelGroup, settingKeys?: readonly string[]) {
    const hasModeSettings = Object.keys(model.settings_values).some((key) =>
      key.startsWith("register_") || key.startsWith("verify_"),
    );
    const settings = settingKeys
      ? settingKeys
          .map((key) => {
            const resolvedKey = modeSettingKey(model, key);
            return [resolvedKey, model.settings_values[resolvedKey]] as const;
          })
          .filter((entry): entry is readonly [string, SettingMetadata] => Boolean(entry[1]))
      : Object.entries(model.settings_values).filter(([key]) => {
          if (HIDDEN_ADMIN_SETTINGS.has(displaySettingKey(key))) return false;
          if (!hasModeSettings) return true;
          if (key.startsWith("register_")) return false;
          if (key.startsWith("verify_")) return true;
          return !model.settings_values[`register_${key}`] && !model.settings_values[`verify_${key}`];
        });

    return settings.length ? (
      <div className={styles.settings}>
        {settings.map(([key, metadata]) => {
            const valuePosition = percentage(metadata.value, metadata);
            const defaultPosition = percentage(metadata.default, metadata);
            const sliderStyle = {
              "--value-position": `${valuePosition}%`,
              "--thumb-position": thumbPosition(valuePosition),
              "--default-position": thumbPosition(defaultPosition),
            } as CSSProperties;
            return (
              <label key={key} className={styles.setting}>
                <strong>{SETTING_LABELS[displaySettingKey(key)] ?? displaySettingKey(key).replaceAll("_", " ")}</strong>
                <div className={styles.sliderControl} style={sliderStyle}>
                  <div className={styles.limits} aria-hidden="true">
                    <small>{metadata.min}</small>
                    <small>{metadata.max}</small>
                  </div>
                  <div className={styles.track}>
                    <output className={metadata.value === metadata.default ? styles.defaultValue : styles.changedValue}>
                      {metadata.value}
                    </output>
                    <span className={styles.defaultTick} aria-hidden="true" />
                    <input
                      type="range"
                      min={metadata.min}
                      max={metadata.max}
                      step={metadata.step}
                      value={metadata.value}
                      aria-label={SETTING_LABELS[displaySettingKey(key)] ?? displaySettingKey(key).replaceAll("_", " ")}
                      onChange={(event) => updateModel(group, model.model_key, (target) => { target.settings_values[key].value = Number(event.target.value); })}
                    />
                  </div>
                </div>
              </label>
            );
          })}
      </div>
    ) : <p className={styles.noSettings}>ไม่มีค่าที่ผู้ดูแลสามารถปรับได้</p>;
  }

  function renderCardFooter(group: ModelGroup, modelKeys: string[], scopeLabel: string) {
    if (!isModelsDirty(group, modelKeys)) return null;

    return (
      <div className={styles.cardActions}>
        <button
          type="button"
          onClick={() => cancelModels(group, modelKeys, scopeLabel)}
          disabled={busy}
        >
          <FontAwesomeIcon icon={faXmark} /> ยกเลิก
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => void saveModels(group, modelKeys, scopeLabel)}
          disabled={busy}
        >
          <FontAwesomeIcon icon={faSave} /> บันทึก
        </button>
      </div>
    );
  }

  function renderFaceLandmarkerToggles(model: ModelSchema) {
    const setting = model.settings_values[modeSettingKey(model, "require_feature_target_alignment")];
    const debugSetting = model.settings_values[modeSettingKey(model, "show_debug_markers")];
    if (!setting && !debugSetting) return null;
    const enabled = !setting || setting.value >= 1;

    return (
      <div className={styles.inlineSettings}>
        {setting ? (
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => updateModel("frontend_models", model.model_key, (target) => {
                target.settings_values[modeSettingKey(target, "require_feature_target_alignment")].value = event.target.checked ? 1 : 0;
              })}
            />
            <span>บังคับใช้งาน</span>
          </label>
        ) : null}
        {debugSetting ? (
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={debugSetting.value >= 1}
              onChange={(event) => updateModel("frontend_models", model.model_key, (target) => {
                target.settings_values[modeSettingKey(target, "show_debug_markers")].value = event.target.checked ? 1 : 0;
              })}
            />
            <span>Show debug markers</span>
          </label>
        ) : null}
      </div>
    );
  }

  function renderFaceDetectorToggles(model: ModelSchema) {
    const setting = model.settings_values[modeSettingKey(model, "require_feature_target_alignment")];
    if (!setting) return null;
    return (
      <div className={styles.inlineSettings}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={setting.value >= 1}
            onChange={(event) => updateModel("frontend_models", model.model_key, (target) => {
              target.settings_values[modeSettingKey(target, "require_feature_target_alignment")].value = event.target.checked ? 1 : 0;
            })}
          />
          <span>บังคับใช้งาน</span>
        </label>
      </div>
    );
  }

  function renderFaceLandmarkerPanelButton(
    model: ModelSchema,
    panel: (typeof FACE_LANDMARKER_PANELS)[number],
    enabled: boolean,
  ) {
    const active = faceLandmarkerPanel === panel.key;
    const toggle = panel.toggleKey ? model.settings_values[modeSettingKey(model, panel.toggleKey)] : undefined;
    const toggleEnabled = !toggle || toggle.value >= 1;
    const swatchClass = styles[panel.swatch as keyof typeof styles];

    return (
      <button
        type="button"
        key={panel.key}
        className={[styles.previewTab, active ? styles.previewTabActive : ""].join(" ")}
        onClick={() => setFaceLandmarkerPanel(panel.key)}
      >
        <span className={[styles.previewTabSwatch, swatchClass].join(" ")} />
        <span className={styles.previewTabText}>
          <strong>{panel.label}</strong>
        </span>
        {toggle ? (
          <input
            type="checkbox"
            checked={toggleEnabled}
            disabled={!enabled}
            aria-label={`${panel.label} validation`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => updateModel("frontend_models", model.model_key, (target) => {
              target.settings_values[modeSettingKey(target, panel.toggleKey!)].value = event.target.checked ? 1 : 0;
            })}
          />
        ) : null}
      </button>
    );
  }

  function renderFaceDetectorPanelButton(
    model: ModelSchema,
    panel: (typeof FACE_DETECTOR_PANELS)[number],
    enabled: boolean,
  ) {
    const active = faceDetectorPanel === panel.key;
    const toggle = panel.toggleKey ? model.settings_values[modeSettingKey(model, panel.toggleKey)] : undefined;
    const toggleEnabled = !toggle || toggle.value >= 1;
    const swatchClass = styles[panel.swatch as keyof typeof styles];

    return (
      <button
        type="button"
        key={panel.key}
        className={[styles.previewTab, active ? styles.previewTabActive : ""].join(" ")}
        onClick={() => setFaceDetectorPanel(panel.key)}
      >
        <span className={[styles.previewTabSwatch, swatchClass].join(" ")} />
        <span className={styles.previewTabText}>
          <strong>{panel.label}</strong>
        </span>
        {toggle ? (
          <input
            type="checkbox"
            checked={toggleEnabled}
            disabled={!enabled}
            aria-label={`${panel.label} validation`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => updateModel("frontend_models", model.model_key, (target) => {
              target.settings_values[modeSettingKey(target, panel.toggleKey!)].value = event.target.checked ? 1 : 0;
            })}
          />
        ) : null}
      </button>
    );
  }

  function renderFaceDetectorWorkbench(model: ModelSchema) {
    const masterSetting = model.settings_values[modeSettingKey(model, "require_feature_target_alignment")];
    const enabled = !masterSetting || masterSetting.value >= 1;
    const selectedPanel =
      FACE_DETECTOR_PANELS.find((panel) => panel.key === faceDetectorPanel) ?? FACE_DETECTOR_PANELS[0];

    return (
      <div className={styles.landmarkWorkbench}>
        {renderFaceDetectorPreview(model)}
        <div className={styles.landmarkControlPanel}>
          <div className={styles.previewTabs}>
            {FACE_DETECTOR_PANELS.map((panel) => renderFaceDetectorPanelButton(model, panel, enabled))}
          </div>
          <div className={styles.panelSettings}>
            <div className={styles.panelSettingsHeader}>
              <strong>{selectedPanel.label}</strong>
              <span>{selectedPanel.description}</span>
            </div>
            {renderSettings(model, "frontend_models", selectedPanel.settingKeys)}
          </div>
        </div>
      </div>
    );
  }

  function renderFaceLandmarkerWorkbench(model: ModelSchema) {
    const masterSetting = model.settings_values[modeSettingKey(model, "require_feature_target_alignment")];
    const enabled = !masterSetting || masterSetting.value >= 1;
    const selectedPanel =
      FACE_LANDMARKER_PANELS.find((panel) => panel.key === faceLandmarkerPanel) ?? FACE_LANDMARKER_PANELS[0];

    return (
      <div className={styles.landmarkWorkbench}>
        {renderFaceLandmarkerPreview(model)}
        <div className={styles.landmarkControlPanel}>
          <div className={styles.previewTabs}>
            {FACE_LANDMARKER_PANELS.map((panel) => renderFaceLandmarkerPanelButton(model, panel, enabled))}
          </div>
          <div className={styles.panelSettings}>
            <div className={styles.panelSettingsHeader}>
              <strong>{selectedPanel.label}</strong>
              <span>{selectedPanel.description}</span>
            </div>
            {renderSettings(model, "frontend_models", selectedPanel.settingKeys)}
          </div>
        </div>
      </div>
    );
  }

  function modeSettingValue(model: ModelSchema, key: string, fallback: number) {
    return settingValue(model, modeSettingKey(model, key), fallback);
  }

  function renderFaceLandmarkerPreview(model: ModelSchema) {
    const values: AdminFaceVisualGuideValues = {
      eyeCenterXTolerance: modeSettingValue(model, "eye_center_x_tolerance", 10),
      eyeCenterYTolerance: modeSettingValue(model, "eye_center_y_tolerance", 8),
      minEyeDistance: modeSettingValue(model, "min_eye_distance", 56),
      maxEyeDistance: modeSettingValue(model, "max_eye_distance", 89),
      guideTolerance: modeSettingValue(model, "guide_boundary_tolerance", 1.16),
      noseXRatio: modeSettingValue(model, "nose_x_ratio_max", 0.2),
      noseMinRatio: modeSettingValue(model, "min_nose_below_eyes_ratio", 0.3),
      noseMaxRatio: modeSettingValue(model, "max_nose_below_eyes_ratio", 1),
      mouthXRatio: modeSettingValue(model, "mouth_x_ratio_max", 0.25),
      mouthMinRatio: modeSettingValue(model, "min_mouth_below_nose_ratio", 0.1),
      mouthMaxRatio: modeSettingValue(model, "max_mouth_below_nose_ratio", 0.8),
      minFaceHeight: modeSettingValue(model, "min_face_guide_height", 164),
      maxFaceHeight: modeSettingValue(model, "max_face_guide_height", 199),
      eyeTiltMax: modeSettingValue(model, "landmark_eye_tilt_max", 0.09),
      noseQualityXRatio: modeSettingValue(model, "landmark_nose_x_ratio_max", 0.14),
    };

    return (
      <AdminFaceVisualGuide
        activePanel={faceLandmarkerPanel}
        enabledPanels={{
          eye:
            modeSettingValue(model, "require_feature_target_alignment", 1) >= 1 &&
            modeSettingValue(model, "require_eye_alignment", 1) >= 1,
          nose:
            modeSettingValue(model, "require_feature_target_alignment", 1) >= 1 &&
            modeSettingValue(model, "require_nose_zone", 1) >= 1,
          mouth:
            modeSettingValue(model, "require_feature_target_alignment", 1) >= 1 &&
            modeSettingValue(model, "require_mouth_zone", 1) >= 1,
        }}
        showDebugMarkers={modeSettingValue(model, "show_debug_markers", 0) >= 1}
        values={values}
        onPanelChange={setFaceLandmarkerPanel}
      />
    );
  }

  function renderFaceDetectorPreview(model: ModelSchema) {
    const eyeCenterX = 120;
    const eyeCenterY = 128;
    const minEyeDistance = modeSettingValue(model, "min_eye_distance", 56);
    const maxEyeDistance = modeSettingValue(model, "max_eye_distance", 84);
    const readyMinEyeDistance = modeSettingValue(model, "capture_ready_min_eye_distance", 60);
    const readyMaxEyeDistance = modeSettingValue(model, "capture_ready_max_eye_distance", 80);
    const eyeToleranceX = modeSettingValue(model, "eye_center_x_tolerance", 10);
    const eyeToleranceY = modeSettingValue(model, "eye_center_y_tolerance", 9);
    const readyEyeToleranceX = modeSettingValue(model, "capture_ready_eye_center_x_tolerance", 2);
    const readyEyeToleranceY = modeSettingValue(model, "capture_ready_eye_center_y_tolerance", 2);
    const guideTolerance = modeSettingValue(model, "guide_boundary_tolerance", 1.16);
    const minFaceHeight = modeSettingValue(model, "min_face_guide_height", 152);
    const maxFaceHeight = modeSettingValue(model, "max_face_guide_height", 210);
    const noseXRatio = modeSettingValue(model, "nose_x_ratio_max", 0.34);
    const noseMinRatio = modeSettingValue(model, "min_nose_below_eyes_ratio", 0.12);
    const noseMaxRatio = modeSettingValue(model, "max_nose_below_eyes_ratio", 1.2);
    const mouthXRatio = modeSettingValue(model, "mouth_x_ratio_max", 0.5);
    const mouthMinRatio = modeSettingValue(model, "min_mouth_below_nose_ratio", 0.12);
    const mouthMaxRatio = modeSettingValue(model, "max_mouth_below_nose_ratio", 1.15);
    const featureEyeDistance = 72;
    const noseZone = {
      x: eyeCenterX - featureEyeDistance * noseXRatio,
      y: eyeCenterY + featureEyeDistance * noseMinRatio,
      width: featureEyeDistance * noseXRatio * 2,
      height: featureEyeDistance * Math.max(0.08, noseMaxRatio - noseMinRatio),
    };
    const mouthZone = {
      x: eyeCenterX - featureEyeDistance * mouthXRatio,
      y: 179.8 + featureEyeDistance * mouthMinRatio,
      width: featureEyeDistance * mouthXRatio * 2,
      height: featureEyeDistance * Math.max(0.08, mouthMaxRatio - mouthMinRatio),
    };
    const active = faceDetectorPanel;

    return (
      <div className={styles.detectorPreview}>
        <div className={styles.previewCanvas}>
          <svg viewBox="0 0 240 320" role="img" aria-label="Face detector box guide preview">
            <rect x="0" y="0" width="240" height="320" fill="#f7fafc" />
            <ellipse
              cx="120"
              cy="155.5"
              rx={88.3 * guideTolerance}
              ry={109.8 * guideTolerance}
              className={[styles.previewBoundary, styles.detectorGuide, active === "box" ? styles.detectorGuideActive : ""].join(" ")}
            />
            <path d={BOX_GUIDE_OUTLINE} className={styles.detectorBoxOutline} />
            <rect
              x={eyeCenterX - eyeToleranceX}
              y={eyeCenterY - eyeToleranceY}
              width={eyeToleranceX * 2}
              height={eyeToleranceY * 2}
              className={[styles.detectorPositionZone, styles.detectorGuide, active === "position" ? styles.detectorGuideActive : ""].join(" ")}
            />
            <line x1={eyeCenterX - maxEyeDistance / 2} y1="128" x2={eyeCenterX - minEyeDistance / 2} y2="128" className={[styles.detectorRangeLine, styles.detectorGuide, active === "position" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1={eyeCenterX + minEyeDistance / 2} y1="128" x2={eyeCenterX + maxEyeDistance / 2} y2="128" className={[styles.detectorRangeLine, styles.detectorGuide, active === "position" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1={eyeCenterX} y1="112" x2={eyeCenterX} y2="252" className={[styles.detectorFeatureCenterLine, styles.detectorGuide, active === "features" ? styles.detectorGuideActive : ""].join(" ")} />
            <rect
              x={noseZone.x}
              y={noseZone.y}
              width={noseZone.width}
              height={noseZone.height}
              className={[styles.detectorNoseZone, styles.detectorGuide, active === "features" ? styles.detectorGuideActive : ""].join(" ")}
            />
            <rect
              x={mouthZone.x}
              y={mouthZone.y}
              width={mouthZone.width}
              height={mouthZone.height}
              className={[styles.detectorMouthZone, styles.detectorGuide, active === "features" ? styles.detectorGuideActive : ""].join(" ")}
            />
            <rect
              x={eyeCenterX - readyEyeToleranceX}
              y={eyeCenterY - readyEyeToleranceY}
              width={readyEyeToleranceX * 2}
              height={readyEyeToleranceY * 2}
              className={[styles.detectorReadyZone, styles.detectorGuide, active === "green" ? styles.detectorGuideActive : ""].join(" ")}
            />
            <line x1={eyeCenterX - readyMaxEyeDistance / 2} y1="146" x2={eyeCenterX - readyMinEyeDistance / 2} y2="146" className={[styles.detectorReadyLine, styles.detectorGuide, active === "green" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1={eyeCenterX + readyMinEyeDistance / 2} y1="146" x2={eyeCenterX + readyMaxEyeDistance / 2} y2="146" className={[styles.detectorReadyLine, styles.detectorGuide, active === "green" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1="44" y1={155.5 - minFaceHeight / 2} x2="196" y2={155.5 - minFaceHeight / 2} className={[styles.previewMinLine, styles.detectorGuide, active === "box" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1="34" y1={155.5 - maxFaceHeight / 2} x2="206" y2={155.5 - maxFaceHeight / 2} className={[styles.previewMaxLine, styles.detectorGuide, active === "box" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1="44" y1={155.5 + minFaceHeight / 2} x2="196" y2={155.5 + minFaceHeight / 2} className={[styles.previewMinLine, styles.detectorGuide, active === "box" ? styles.detectorGuideActive : ""].join(" ")} />
            <line x1="34" y1={155.5 + maxFaceHeight / 2} x2="206" y2={155.5 + maxFaceHeight / 2} className={[styles.previewMaxLine, styles.detectorGuide, active === "box" ? styles.detectorGuideActive : ""].join(" ")} />
            <circle cx="83.3" cy="128" r="3" className={styles.previewEyePoint} />
            <circle cx="156.7" cy="128" r="3" className={styles.previewEyePoint} />
            <circle cx="120" cy="179.8" r="3" className={styles.previewNosePoint} />
            <circle cx="120" cy="217.6" r="3" className={styles.previewMouthPoint} />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="models-title">
      <div className={styles.heading}>
        <div>
          <h2 id="models-title">ตั้งค่าโมเดลยืนยันตัวตน</h2>
          <p>ค่าที่ใช้ตอนยืนยันตัวตน (ผ่อนปรนตำแหน่งและคุณภาพเล็กน้อย)</p>
        </div>
      </div>
      {error ? (
        <PermissionErrorModal
          open={Boolean(error)}
          title="เกิดข้อผิดพลาด"
          message={error}
          variant="error"
          showCloseButton
          onClose={() => {
            useAppStore.setState({ modelSettingsError: "" });
          }}
        />
      ) : null}
      {notice && (
        <PermissionErrorModal
          open={Boolean(notice)}
          title="สำเร็จ"
          message={notice}
          variant="success"
          showCloseButton
          onClose={() => {
            useAppStore.setState({ modelSettingsNotice: "" });
          }}
        />
      )}
      <div className={styles.groups} aria-busy={busy}>
        {modelGroups.map((modelGroup) => (
          <section className={styles.groupSection} key={modelGroup.key} aria-labelledby={`${modelGroup.key}-title`}>
            <div className={styles.groupHeading}>
              <div className={styles.groupTitle}>
                <FontAwesomeIcon icon={modelGroup.icon} />
                <div><h3 id={`${modelGroup.key}-title`}>{modelGroup.title}</h3><p>{modelGroup.description}</p></div>
              </div>
            </div>
            <div className={styles.models}>
              {modelGroup.key === "frontend_models" ? (() => {
                const complianceModels =
                  document?.model_schemas.frontend_models.filter(
                    (model) => model.model_role === "face_compliance",
                  ) ?? [];
                const selectedComplianceModel = complianceModels.find((model) => model.active);
                const complianceEnabled = Boolean(selectedComplianceModel);
                const complianceModelKeys = complianceModels.map((model) => model.model_key);

                return (
                  <article className={styles.model} key="frontend-compliance-mode">
                    <div className={styles.modePicker} aria-label="เลือกโหมด Face Compliance">
                      <div className={styles.modePickerHeader}>
                        <div className={styles.modePickerText}>
                          <strong>Face Compliance Active Mode</strong>
                          <span>เลือกโมเดลที่ใช้ตรวจแว่นตา ดวงตา จมูก และปากตอนเปิดกล้อง</span>
                        </div>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={complianceEnabled}
                            onChange={(event) => {
                              setFrontendComplianceMode(
                                event.target.checked
                                  ? selectedComplianceModel?.model_key ?? complianceModels[0]?.model_key ?? null
                                  : null,
                              );
                            }}
                          />
                          <span>เปิดใช้งาน</span>
                        </label>
                      </div>
                      {complianceEnabled ? (
                        <div className={styles.modeOptions}>
                          {complianceModels.map((item) => (
                            <label
                              className={[styles.modeOption, item.active ? styles.modeOptionActive : ""].join(" ")}
                              key={item.model_key}
                            >
                              <input
                                type="radio"
                                name="frontend-compliance-mode"
                                checked={item.active}
                                onChange={() => setFrontendComplianceMode(item.model_key)}
                              />
                              <span>{item.model_name}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {selectedComplianceModel ? renderSettings(selectedComplianceModel, "frontend_models") : null}
                    {renderCardFooter("frontend_models", complianceModelKeys, "Face Compliance")}
                  </article>
                );
              })() : null}
              {(document?.model_schemas[modelGroup.key] ?? [])
                .filter((model) => {
                  return !isFrontendComplianceModel(modelGroup.key, model.model_role);
                })
                .map((model) => (
                <article className={styles.model} key={model.model_key}>
                  <div className={styles.modelHead}>
                    <div className={styles.modelIdentity}><h3>{model.model_name}</h3><span>{ROLE_LABELS[model.model_role] ?? model.model_role.replaceAll("_", " ")}</span></div>
                    <div className={styles.modelActions}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          name={model.model_key}
                          checked={model.active}
                          disabled={REQUIRED_MODEL_KEYS.has(model.model_key)}
                          onChange={(event) => setActive(modelGroup.key, model, event.target.checked)}
                        />
                        <span>{model.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
                      </label>
                    </div>
                  </div>
                  {model.model_key === "face_landmarker" ? renderFaceLandmarkerToggles(model) : null}
                  {model.model_key === "face_detector" ? renderFaceDetectorToggles(model) : null}
                  {model.model_key === "face_landmarker"
                    ? renderFaceLandmarkerWorkbench(model)
                    : model.model_key === "face_detector"
                      ? renderFaceDetectorWorkbench(model)
                      : renderSettings(model, modelGroup.key)}
                  {renderCardFooter(modelGroup.key, [model.model_key], model.model_name)}
                </article>
              ))}
            </div>
            <div className={styles.sectionActions}>
              <button type="button" onClick={() => {
                if (!busy) {
                  void reset(modelGroup.title, modelGroup.key);
                }
              }} disabled={busy}>
                <FontAwesomeIcon icon={faRotateLeft} /> คืนค่าเริ่มต้นทั้งหมด
              </button>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

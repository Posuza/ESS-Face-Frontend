import { useEffect, useRef, useState } from "react";
import styles from "./VerificationCameraModal1.module.css";
import {
  getFaceAttributeMessage,
  loadFaceAttributeModel,
} from "@/components/ai/ailoader/faceAttributeModel";
import {
  getAntiSpoofResult,
  loadAntiSpoofModel,
  updateAntiSpoofDecision,
} from "@/components/ai/ailoader/antiSpoofModel";
import {
  loadFaceDetector,
  type DetectedFace,
  type LoadedFaceDetector,
} from "@/components/ai/ailoader/faceDetectorModel";
import { BOX_GUIDE_OUTLINE } from "@/components/ai/FaceVisualGuide";
import {
  getFaceModelValueForMode,
  isFaceModelActive,
  loadFaceModelSettings,
} from "@/components/ai/faceModelSettings";

export type CameraModalProps = {
  open: boolean;
  onClose: () => void;

  /** ได้รูปกลับไปเป็น dataUrl */
  onCaptured: (dataUrl: string) => void;
  onReady?: () => void;
  onSetupError?: (message: string) => void;

  /** ถ้าจะให้ปิดด้วยการคลิกฉากหลัง */
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  modelSettingsPreloaded?: boolean;
};

type Point = { x: number; y: number };
type NormalizedLandmark = { x: number; y: number; z?: number };
type FeaturePoints = {
  leftEye: Point;
  rightEye: Point;
  nose: Point;
  mouth: Point;
};
type GuideContrast = "dark" | "light";

const STABLE_HOLD_MS = 3000;
const INVALID_CONFIRMATION_FRAMES = 2;
const DETECTION_INTERVAL_MS = 60;
const LIGHTING_INTERVAL_MS = 500;
const ATTRIBUTE_INTERVAL_MS = 600;
const ATTRIBUTE_CLEAR_CONFIRMATIONS = 2;
const ANTI_SPOOF_INTERVAL_MS = 450;
const LANDMARK_SMOOTHING_ALPHA = 0.35;
const SMOOTHING_RESET_MISS_FRAMES = 10;
const MAX_STABLE_FACE_MOVEMENT = 2.4;
const MAX_CAPTURE_READY_FACE_MOVEMENT = 0.9;
const MAX_CAPTURE_READY_EYE_DISTANCE_CHANGE = 2;
const REQUIRE_FEATURE_TARGET_ALIGNMENT = true;
const EYE_CENTER_X_TOLERANCE = 10;
const EYE_CENTER_Y_TOLERANCE = 8;
const MIN_EYE_DISTANCE = 56;
const MAX_EYE_DISTANCE = 89;
const MIN_FACE_GUIDE_HEIGHT = 164;
const MAX_FACE_GUIDE_HEIGHT = 199;
const MIN_AVERAGE_BRIGHTNESS = 50;
const MAX_AVERAGE_BRIGHTNESS = 214;
const MAX_DARK_PIXEL_RATIO = 0.48;
const MAX_BRIGHT_PIXEL_RATIO = 0.42;
const LOW_LIGHT_GUIDE_AVERAGE = 120;
const OVERLAY_WIDTH = 240;
const OVERLAY_HEIGHT = 320;
const GUIDE_CENTER = { x: 120, y: 155.5 };
const GUIDE_RADIUS = { x: 88.3, y: 109.8 };
const GUIDE_BOUNDARY_TOLERANCE = 1.16;
const CORE_FACE_LANDMARK_INDICES = [10, 152, 33, 263, 234, 454, 1, 13, 14];

function faceDetectorSetting(settingKey: string, fallback: number = Number.NaN) {
  return getFaceModelValueForMode("face_detector", "verify", settingKey, fallback);
}

function isEnabledSetting(settingKey: string) {
  return faceDetectorSetting(settingKey) >= 1;
}

function requireFeatureTargetAlignment() {
  return isEnabledSetting("require_feature_target_alignment");
}

function faceLandmarkerToggle(key: string) {
  return isEnabledSetting(key);
}
const GUIDE_TARGETS: FeaturePoints = {
  leftEye: { x: 83.3, y: 128 },
  rightEye: { x: 156.7, y: 128 },
  nose: { x: 120, y: 179.8 },
  mouth: { x: 120, y: 217.6 },
};

function averagePoint(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function distance(pointA: Point, pointB: Point) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

function mapLandmarkToOverlay(
  _source: HTMLCanvasElement,
  landmark: NormalizedLandmark,
): Point {
  return {
    x: landmark.x * OVERLAY_WIDTH,
    y: landmark.y * OVERLAY_HEIGHT,
  };
}

function drawMirroredCoverFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (sourceWidth <= 0 || sourceHeight <= 0) return false;

  if (canvas.width !== OVERLAY_WIDTH) canvas.width = OVERLAY_WIDTH;
  if (canvas.height !== OVERLAY_HEIGHT) canvas.height = OVERLAY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) return false;

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = OVERLAY_WIDTH / OVERLAY_HEIGHT;
  let cropX = 0;
  let cropY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceAspect > targetAspect) {
    cropWidth = sourceHeight * targetAspect;
    cropX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetAspect;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  context.save();
  context.translate(OVERLAY_WIDTH, 0);
  context.scale(-1, 1);
  context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT);
  context.restore();
  return true;
}

function normalizeDetectedFaceBox(face: DetectedFace) {
  const box = face.box as Partial<{
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  }>;
  const xMin = Number(box.xMin ?? 0);
  const yMin = Number(box.yMin ?? 0);
  const width = Number(
    box.width ?? (box.xMax != null ? Number(box.xMax) - xMin : 0),
  );
  const height = Number(
    box.height ?? (box.yMax != null ? Number(box.yMax) - yMin : 0),
  );

  return { xMin, yMin, width, height };
}

function getSyntheticLandmarksFromBox(
  face: DetectedFace,
  source: HTMLCanvasElement,
): NormalizedLandmark[] {
  const { xMin, yMin, width, height } = normalizeDetectedFaceBox(face);
  const left = Math.max(0, xMin / source.width);
  const right = Math.min(1, (xMin + width) / source.width);
  const top = Math.max(0, yMin / source.height);
  const bottom = Math.min(1, (yMin + height) / source.height);
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
    { x: centerX, y: centerY },
  ];
}

function getNamedKeypoint(face: DetectedFace, name: string): Point | null {
  const keypoint = face.keypoints?.find((point) => point.name === name);
  if (
    !keypoint ||
    !Number.isFinite(keypoint.x) ||
    !Number.isFinite(keypoint.y)
  ) {
    return null;
  }

  return { x: keypoint.x, y: keypoint.y };
}

function getFeaturePointsFromFace(face: DetectedFace): FeaturePoints | null {
  const namedEyeA = getNamedKeypoint(face, "leftEye");
  const namedEyeB = getNamedKeypoint(face, "rightEye");
  const nose = getNamedKeypoint(face, "noseTip");
  const mouth = getNamedKeypoint(face, "mouthCenter");

  if (namedEyeA && namedEyeB && nose && mouth) {
    const [leftEye, rightEye] =
      namedEyeA.x <= namedEyeB.x
        ? [namedEyeA, namedEyeB]
        : [namedEyeB, namedEyeA];

    return { leftEye, rightEye, nose, mouth };
  }

  const { xMin, yMin, width, height } = normalizeDetectedFaceBox(face);
  if (
    !Number.isFinite(xMin) ||
    !Number.isFinite(yMin) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const left = xMin;
  const right = xMin + width;
  const top = yMin;
  const centerX = xMin + width / 2;

  return {
    leftEye: { x: left + width * 0.32, y: top + height * 0.38 },
    rightEye: { x: right - width * 0.32, y: top + height * 0.38 },
    nose: { x: centerX, y: top + height * 0.56 },
    mouth: { x: centerX, y: top + height * 0.72 },
  };
}

function smoothFeaturePoints(next: FeaturePoints, previous: FeaturePoints | null) {
  const smoothPoint = (nextPoint: Point, previousPoint?: Point): Point =>
    previousPoint
      ? {
          x:
            previousPoint.x +
            (nextPoint.x - previousPoint.x) * LANDMARK_SMOOTHING_ALPHA,
          y:
            previousPoint.y +
            (nextPoint.y - previousPoint.y) * LANDMARK_SMOOTHING_ALPHA,
        }
      : nextPoint;

  return {
    leftEye: smoothPoint(next.leftEye, previous?.leftEye),
    rightEye: smoothPoint(next.rightEye, previous?.rightEye),
    nose: smoothPoint(next.nose, previous?.nose),
    mouth: smoothPoint(next.mouth, previous?.mouth),
  };
}

function getAverageFeatureMovement(
  previous: FeaturePoints | null,
  next: FeaturePoints,
) {
  if (!previous) return 0;

  return (
    distance(previous.leftEye, next.leftEye) +
    distance(previous.rightEye, next.rightEye) +
    distance(previous.nose, next.nose) +
    distance(previous.mouth, next.mouth)
  ) / 4;
}

function getRawFeaturePoints(
  video: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
): FeaturePoints {
  const eyeA = averagePoint([33, 133, 159, 145].map((idx) => mapLandmarkToOverlay(video, landmarks[idx])));
  const eyeB = averagePoint([263, 362, 386, 374].map((idx) => mapLandmarkToOverlay(video, landmarks[idx])));
  const [leftEye, rightEye] = eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA];

  return {
    leftEye,
    rightEye,
    nose: mapLandmarkToOverlay(video, landmarks[1]),
    mouth: averagePoint([13, 14, 61, 291].map((idx) => mapLandmarkToOverlay(video, landmarks[idx]))),
  };
}

function isInsideGuide(point: Point) {
  const nx = (point.x - GUIDE_CENTER.x) / GUIDE_RADIUS.x;
  const ny = (point.y - GUIDE_CENTER.y) / GUIDE_RADIUS.y;
  const tolerance = faceDetectorSetting("guide_boundary_tolerance", GUIDE_BOUNDARY_TOLERANCE);
  return nx * nx + ny * ny <= tolerance * tolerance;
}

function getVideoLightingCheck(
  video: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
): { message: string | null; guideContrast: GuideContrast } {
  const sampleWidth = 120;
  const sourceWidth = video.width || 1;
  const sourceHeight = video.height || 1;
  const sampleHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * sampleWidth));
  if (canvas.width !== sampleWidth) canvas.width = sampleWidth;
  if (canvas.height !== sampleHeight) canvas.height = sampleHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { message: null, guideContrast: "dark" };

  ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  const pixels = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let total = 0;
  let dark = 0;
  let bright = 0;

  for (let i = 0; i < pixels.length; i += 16) {
    const value = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    total += value;
    if (value < 35) dark++;
    if (value > 235) bright++;
  }

  const count = pixels.length / 16;
  const average = total / count;
  const guideContrast: GuideContrast = average < LOW_LIGHT_GUIDE_AVERAGE ? "light" : "dark";

  if (
    average < faceDetectorSetting("min_average_brightness", MIN_AVERAGE_BRIGHTNESS) ||
    dark / count > faceDetectorSetting("max_dark_pixel_ratio", MAX_DARK_PIXEL_RATIO)
  ) {
    return { message: "แสงน้อยเกินไป เพิ่มแสงสว่าง", guideContrast };
  }

  if (
    average > faceDetectorSetting("max_average_brightness", MAX_AVERAGE_BRIGHTNESS) ||
    bright / count > faceDetectorSetting("max_bright_pixel_ratio", MAX_BRIGHT_PIXEL_RATIO)
  ) {
    return { message: "แสงจ้าเกินไป หลีกเลี่ยงแสงแรง", guideContrast };
  }

  return { message: null, guideContrast };
}

function getFaceDistanceMessage(
  video: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
): string | null {
  const forehead = mapLandmarkToOverlay(video, landmarks[10]);
  const chin = mapLandmarkToOverlay(video, landmarks[152]);
  const faceGuideHeight = Math.abs(chin.y - forehead.y);

  if (faceGuideHeight < faceDetectorSetting("min_face_guide_height", MIN_FACE_GUIDE_HEIGHT)) {
    return "ขยับเข้าใกล้กล้อง";
  }

  if (faceGuideHeight > faceDetectorSetting("max_face_guide_height", MAX_FACE_GUIDE_HEIGHT)) {
    return "ขยับออกจากกล้องเล็กน้อย";
  }

  return null;
}

function getGuideCheck(
  video: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
  previousPoints: FeaturePoints | null,
): { message: string | null; points: FeaturePoints } {
  const points = smoothFeaturePoints(getRawFeaturePoints(video, landmarks), previousPoints);
  const coreFacePoints = CORE_FACE_LANDMARK_INDICES.map((idx) =>
    mapLandmarkToOverlay(video, landmarks[idx]),
  );
  if (coreFacePoints.some((point) => !isInsideGuide(point))) {
    return { message: "จัดใบหน้าให้อยู่ในกรอบทั้งหมด", points };
  }

  if (requireFeatureTargetAlignment()) {
    const eyeCenter = {
      x: (points.leftEye.x + points.rightEye.x) / 2,
      y: (points.leftEye.y + points.rightEye.y) / 2,
    };
    const eyeDistance = distance(points.leftEye, points.rightEye);
    const targetEyeCenter = {
      x: (GUIDE_TARGETS.leftEye.x + GUIDE_TARGETS.rightEye.x) / 2,
      y: (GUIDE_TARGETS.leftEye.y + GUIDE_TARGETS.rightEye.y) / 2,
    };

    if (faceLandmarkerToggle("require_eye_alignment")) {
      const eyeCenterXOffset = eyeCenter.x - targetEyeCenter.x;
      const eyeCenterYOffset = eyeCenter.y - targetEyeCenter.y;
      const eyeCenterXTolerance = faceDetectorSetting(
        "eye_center_x_tolerance",
        EYE_CENTER_X_TOLERANCE,
      );
      const eyeCenterYTolerance = faceDetectorSetting(
        "eye_center_y_tolerance",
        EYE_CENTER_Y_TOLERANCE,
      );

      if (eyeCenterXOffset > eyeCenterXTolerance) {
        return { message: "ขยับใบหน้าไปทางซ้ายเล็กน้อย", points };
      }
      if (eyeCenterXOffset < -eyeCenterXTolerance) {
        return { message: "ขยับใบหน้าไปทางขวาเล็กน้อย", points };
      }
      if (eyeCenterYOffset > eyeCenterYTolerance) {
        return { message: "ขยับใบหน้าขึ้นเล็กน้อย", points };
      }
      if (eyeCenterYOffset < -eyeCenterYTolerance) {
        return { message: "ขยับใบหน้าลงเล็กน้อย", points };
      }
      if (eyeDistance < faceDetectorSetting("min_eye_distance", MIN_EYE_DISTANCE)) {
        return { message: "ขยับเข้าใกล้กล้อง", points };
      }
      if (eyeDistance > faceDetectorSetting("max_eye_distance", MAX_EYE_DISTANCE)) {
        return { message: "ขยับออกจากกล้องเล็กน้อย", points };
      }
    }

    const noseHorizontalOffset = Math.abs(points.nose.x - eyeCenter.x);
    const noseBelowEyes = points.nose.y - eyeCenter.y;

    if (faceLandmarkerToggle("require_nose_zone")) {
      if (
        noseHorizontalOffset >
          eyeDistance * faceDetectorSetting("nose_x_ratio_max", 0.20) ||
        noseBelowEyes <
          eyeDistance * faceDetectorSetting("min_nose_below_eyes_ratio", 0.30) ||
        noseBelowEyes >
          eyeDistance * faceDetectorSetting("max_nose_below_eyes_ratio", 1.0)
      ) {
        return { message: "จัดใบหน้าให้อยู่กึ่งกลางและมองตรง", points };
      }
    }

    const mouthHorizontalOffset = Math.abs(points.mouth.x - eyeCenter.x);
    const mouthBelowNose = points.mouth.y - points.nose.y;

    if (faceLandmarkerToggle("require_mouth_zone")) {
      if (
        mouthHorizontalOffset >
          eyeDistance * faceDetectorSetting("mouth_x_ratio_max", 0.25) ||
        mouthBelowNose <
          eyeDistance * faceDetectorSetting("min_mouth_below_nose_ratio", 0.10) ||
        mouthBelowNose >
          eyeDistance * faceDetectorSetting("max_mouth_below_nose_ratio", 0.80)
      ) {
        return { message: "จัดใบหน้าให้ตรงและเห็นครบ", points };
      }
    }
  }

  return { message: null, points };
}

function getFaceBoxGuideMessage(points: FeaturePoints, captureReady: boolean) {
  const eyeCenter = {
    x: (points.leftEye.x + points.rightEye.x) / 2,
    y: (points.leftEye.y + points.rightEye.y) / 2,
  };
  const eyeDistance = distance(points.leftEye, points.rightEye);
  const targetEyeCenter = {
    x: (GUIDE_TARGETS.leftEye.x + GUIDE_TARGETS.rightEye.x) / 2,
    y: (GUIDE_TARGETS.leftEye.y + GUIDE_TARGETS.rightEye.y) / 2,
  };
  const eyeCenterXOffset = eyeCenter.x - targetEyeCenter.x;
  const eyeCenterYOffset = eyeCenter.y - targetEyeCenter.y;
  const eyeCenterXTolerance = captureReady
    ? faceDetectorSetting("capture_ready_eye_center_x_tolerance")
    : faceDetectorSetting("eye_center_x_tolerance");
  const eyeCenterYTolerance = captureReady
    ? faceDetectorSetting("capture_ready_eye_center_y_tolerance")
    : faceDetectorSetting("eye_center_y_tolerance");
  const minEyeDistance = captureReady
    ? faceDetectorSetting("capture_ready_min_eye_distance")
    : faceDetectorSetting("min_eye_distance");
  const maxEyeDistance = captureReady
    ? faceDetectorSetting("capture_ready_max_eye_distance")
    : faceDetectorSetting("max_eye_distance");

  if (eyeCenterXOffset > eyeCenterXTolerance) return "ขยับใบหน้าไปทางซ้ายเล็กน้อย";
  if (eyeCenterXOffset < -eyeCenterXTolerance) return "ขยับใบหน้าไปทางขวาเล็กน้อย";
  if (eyeCenterYOffset > eyeCenterYTolerance) return "ขยับใบหน้าขึ้นเล็กน้อย";
  if (eyeCenterYOffset < -eyeCenterYTolerance) return "ขยับใบหน้าลงเล็กน้อย";
  if (eyeDistance < minEyeDistance) {
    return "ขยับเข้าใกล้กล้อง";
  }
  if (eyeDistance > maxEyeDistance) {
    return "ขยับออกจากกล้องเล็กน้อย";
  }
  if (!isInsideGuide(points.leftEye) || !isInsideGuide(points.rightEye)) {
    return "จัดใบหน้าให้อยู่ในกรอบ";
  }

  const eyeTilt = Math.abs(points.leftEye.y - points.rightEye.y) / Math.max(eyeDistance, 1);
  if (eyeTilt > faceDetectorSetting("landmark_eye_tilt_max")) {
    return "ตั้งใบหน้าให้ตรง";
  }

  const noseHorizontalOffset = Math.abs(points.nose.x - eyeCenter.x);
  const noseBelowEyes = points.nose.y - eyeCenter.y;
  if (
    noseHorizontalOffset >
      eyeDistance * faceDetectorSetting("nose_x_ratio_max") ||
    noseBelowEyes <
      eyeDistance * faceDetectorSetting("min_nose_below_eyes_ratio") ||
    noseBelowEyes >
      eyeDistance * faceDetectorSetting("max_nose_below_eyes_ratio")
  ) {
    return "มองตรงเข้ากล้อง";
  }

  const mouthHorizontalOffset = Math.abs(points.mouth.x - eyeCenter.x);
  const mouthBelowNose = points.mouth.y - points.nose.y;
  if (
    mouthHorizontalOffset >
      eyeDistance * faceDetectorSetting("mouth_x_ratio_max") ||
    mouthBelowNose <
      eyeDistance * faceDetectorSetting("min_mouth_below_nose_ratio") ||
    mouthBelowNose >
      eyeDistance * faceDetectorSetting("max_mouth_below_nose_ratio")
  ) {
    return "มองตรงเข้ากล้อง";
  }

  return null;
}

function getCaptureReadyLockMessage(
  points: FeaturePoints,
  readyEyeDistance: number | null,
  readyEyeCenter: Point | null,
) {
  const currentEyeDistance = distance(points.leftEye, points.rightEye);
  const currentEyeCenter = {
    x: (points.leftEye.x + points.rightEye.x) / 2,
    y: (points.leftEye.y + points.rightEye.y) / 2,
  };
  const eyeDistanceLimit = faceDetectorSetting(
    "max_capture_ready_eye_distance_change",
  );
  const centerShiftRatioLimit = faceDetectorSetting(
    "max_capture_ready_center_shift_ratio",
  );
  const eyeDistanceRatioLimit = faceDetectorSetting(
    "max_capture_ready_eye_distance_ratio",
  );

  if (
    readyEyeDistance !== null &&
    Math.abs(currentEyeDistance - readyEyeDistance) > eyeDistanceLimit
  ) {
    return "กรุณาอยู่นิ่งๆ ไม่ขยับเข้าออกจากกล้อง";
  }

  if (
    readyEyeCenter !== null &&
    Math.max(
      Math.abs(currentEyeCenter.x - readyEyeCenter.x) / OVERLAY_WIDTH,
      Math.abs(currentEyeCenter.y - readyEyeCenter.y) / OVERLAY_HEIGHT,
    ) > centerShiftRatioLimit
  ) {
    return "กรุณาอยู่นิ่งๆ ไม่ขยับใบหน้า";
  }

  if (
    readyEyeDistance !== null &&
    Math.abs(currentEyeDistance - readyEyeDistance) /
      Math.max(readyEyeDistance, 1) >
      eyeDistanceRatioLimit
  ) {
    return "กรุณาอยู่นิ่งๆ ไม่ขยับเข้าออกจากกล้อง";
  }

  return null;
}

function getLandmarkQualityMessage(
  video: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
) {
  if (landmarks.length < 468) {
    return "ระบบติดตามใบหน้ายังไม่นิ่ง";
  }

  const leftEye = mapLandmarkToOverlay(video, landmarks[33]);
  const rightEye = mapLandmarkToOverlay(video, landmarks[263]);
  const nose = mapLandmarkToOverlay(video, landmarks[1]);
  const mouth = mapLandmarkToOverlay(video, landmarks[13]);
  const eyeDistance = distance(leftEye, rightEye);
  const eyeLineY = (leftEye.y + rightEye.y) / 2;

  if (eyeDistance < 40) {
    return "ขยับเข้าใกล้ ดวงตายังไม่ชัดเจน";
  }

  if (nose.y <= eyeLineY || mouth.y <= nose.y) {
    return "ให้เห็นดวงตา จมูก และปากชัดเจน";
  }

  const eyeTilt = Math.abs(leftEye.y - rightEye.y) / Math.max(eyeDistance, 1);
  const faceCenterX = (mapLandmarkToOverlay(video, landmarks[234]).x + mapLandmarkToOverlay(video, landmarks[454]).x) / 2;
  const noseHorizontalOffset = Math.abs(nose.x - faceCenterX) / Math.max(eyeDistance, 1);

  if (
    eyeTilt > faceDetectorSetting("landmark_eye_tilt_max", 0.09) ||
    noseHorizontalOffset > faceDetectorSetting("landmark_nose_x_ratio_max", 0.14)
  ) {
    return "มองตรงเข้ากล้อง";
  }

  return null;
}

export default function VerificationCameraModal1({
  open,
  onClose,
  onCaptured,
  onReady,
  onSetupError,
  closeOnBackdrop = true,
  closeOnEsc = true,
  modelSettingsPreloaded = false,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<LoadedFaceDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const validSinceRef = useRef<number | null>(null);
  const smoothedPointsRef = useRef<FeaturePoints | null>(null);
  const stablePointsRef = useRef<FeaturePoints | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const invalidReadingRef = useRef<{ message: string; count: number } | null>(null);
  const lastCheckRef = useRef(0);
  const lastLightingCheckRef = useRef(0);
  const lightingMessageRef = useRef<string | null>(null);
  const lastAttributeCheckRef = useRef(0);
  const attributeMessageRef = useRef<string | null>(null);
  const attributeClearCountRef = useRef(0);
  const attributeCheckInFlightRef = useRef(false);
  const attributeCheckGenerationRef = useRef(0);
  const lastAntiSpoofCheckRef = useRef(0);
  const antiSpoofScoresRef = useRef<number[]>([]);
  const antiSpoofMessageRef = useRef<string | null>(null);
  const antiSpoofPassedRef = useRef(false);
  const antiSpoofCheckInFlightRef = useRef(false);
  const antiSpoofCheckGenerationRef = useRef(0);
  const complianceReadyRef = useRef(false);
  const detectingRef = useRef(false);
  const smoothingMissCountRef = useRef(0);
  const autoCaptureTriggeredRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onSetupErrorRef = useRef(onSetupError);
  const captureReadyRef = useRef(false);
  const captureReadyEyeDistanceRef = useRef<number | null>(null);
  const captureReadyEyeCenterRef = useRef<Point | null>(null);
  const finalCaptureInFlightRef = useRef(false);
  const autoCaptureTimerRef = useRef<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [faceInCircle, setFaceInCircle] = useState(false);
  const [captureReady, setCaptureReady] = useState(false);
  const [faceMessage, setFaceMessage] = useState("จัดใบหน้าให้อยู่ในกรอบ");
  const [guideContrast, setGuideContrast] = useState<GuideContrast>("dark");

  useEffect(() => {
    onReadyRef.current = onReady;
    onSetupErrorRef.current = onSetupError;
  }, [onReady, onSetupError]);

  function resetAttributeCheck() {
    attributeCheckGenerationRef.current += 1;
    lastAttributeCheckRef.current = 0;
    attributeMessageRef.current = null;
    attributeClearCountRef.current = 0;
  }

  function resetAntiSpoofCheck() {
    antiSpoofCheckGenerationRef.current += 1;
    lastAntiSpoofCheckRef.current = 0;
    antiSpoofScoresRef.current = [];
    antiSpoofMessageRef.current = null;
    antiSpoofPassedRef.current = false;
  }

  function clearAutoCaptureTimer() {
    if (autoCaptureTimerRef.current === null) return;
    window.clearTimeout(autoCaptureTimerRef.current);
    autoCaptureTimerRef.current = null;
  }

  function setInvalidFaceMessage(message: string, immediate = false) {
    if (!immediate) {
      const previous = invalidReadingRef.current;
      invalidReadingRef.current =
        previous?.message === message
          ? { message, count: previous.count + 1 }
          : { message, count: 1 };

      if (invalidReadingRef.current.count < INVALID_CONFIRMATION_FRAMES) return;
    }

    if (captureReadyRef.current || finalCaptureInFlightRef.current) {
      console.log("[VerificationCameraModal1] green cancelled message:", message);
    }

    validSinceRef.current = null;
    autoCaptureTriggeredRef.current = false;
    clearAutoCaptureTimer();
    finalCaptureInFlightRef.current = false;
    stablePointsRef.current = null;
    captureReadyRef.current = false;
    captureReadyEyeDistanceRef.current = null;
    captureReadyEyeCenterRef.current = null;
    setCaptureReady(false);
    setFaceInCircle(false);
    setBusy(false);
    setFaceMessage(message);
  }

  function setValidFaceMessage(now: number, points: FeaturePoints) {
    invalidReadingRef.current = null;
    if (validSinceRef.current === null) {
      validSinceRef.current = now;
    }

    const remaining = Math.max(0, STABLE_HOLD_MS - (now - validSinceRef.current));
    setFaceInCircle(true);

    if (remaining > 0) {
      captureReadyRef.current = false;
      captureReadyEyeDistanceRef.current = null;
      captureReadyEyeCenterRef.current = null;
      clearAutoCaptureTimer();
      setCaptureReady(false);
      setFaceMessage(`อยู่นิ่งๆ... ${Math.ceil(remaining / 1000)}`);
      return;
    }

    if (!captureReadyRef.current) {
      captureReadyEyeDistanceRef.current = distance(points.leftEye, points.rightEye);
      captureReadyEyeCenterRef.current = {
        x: (points.leftEye.x + points.rightEye.x) / 2,
        y: (points.leftEye.y + points.rightEye.y) / 2,
      };
      resetAttributeCheck();
      resetAntiSpoofCheck();
      console.log("[VerificationCameraModal1] green ready baseline", {
        eyeDistance: captureReadyEyeDistanceRef.current,
        eyeCenter: captureReadyEyeCenterRef.current,
      });
    }
    captureReadyRef.current = true;
    setCaptureReady(true);
    setFaceMessage("พร้อมถ่ายภาพ");
    if (!autoCaptureTriggeredRef.current) {
      autoCaptureTriggeredRef.current = true;
      const lockHoldMs = Math.max(
        0,
        faceDetectorSetting("capture_ready_lock_hold_ms"),
      );
      console.log("[VerificationCameraModal1] auto capture scheduled", {
        lockHoldMs,
      });
      autoCaptureTimerRef.current = window.setTimeout(() => {
        autoCaptureTimerRef.current = null;
        console.log("[VerificationCameraModal1] auto capture timer fired", {
          captureReady: captureReadyRef.current,
          finalCaptureInFlight: finalCaptureInFlightRef.current,
        });
        if (!captureReadyRef.current || finalCaptureInFlightRef.current) return;
        void capture(true);
      }, lockHoldMs);
    }
  }

  useEffect(() => {
    if (!open || !closeOnEsc) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEsc, onClose]);

  useEffect(() => {
    if (!open) return;

    let canceled = false;
    setBusy(false);
    setIsReady(false);
    setHasFace(false);
    setFaceInCircle(false);
    captureReadyRef.current = false;
    captureReadyEyeDistanceRef.current = null;
    captureReadyEyeCenterRef.current = null;
    clearAutoCaptureTimer();
    finalCaptureInFlightRef.current = false;
    setCaptureReady(false);
    setGuideContrast("dark");
    validSinceRef.current = null;
    smoothedPointsRef.current = null;
    stablePointsRef.current = null;
    latestLandmarksRef.current = null;
    invalidReadingRef.current = null;
    lastCheckRef.current = 0;
    lastLightingCheckRef.current = 0;
    lightingMessageRef.current = null;
    resetAttributeCheck();
    resetAntiSpoofCheck();
    complianceReadyRef.current = false;
    detectingRef.current = false;
    smoothingMissCountRef.current = 0;
    autoCaptureTriggeredRef.current = false;
    setFaceMessage("จัดใบหน้าให้อยู่ในกรอบ");

    const startCamera = async () => {
      try {
        setBusy(true);

        if (!modelSettingsPreloaded) {
          await loadFaceModelSettings("verify");
        }

        const aiStartedAt = performance.now();
        const [detector] = await Promise.all([
          detectorRef.current
            ? Promise.resolve(detectorRef.current)
            : loadFaceDetector(),
          loadFaceAttributeModel({
            skipSettingsReload: true,
            mode: "verify",
          }),
          isFaceModelActive("minifasnet_v2")
            ? loadAntiSpoofModel()
            : Promise.resolve(null),
        ]);
        console.info("[VerificationCameraModal1] Parallel frontend AI preload ready", {
          aiLoadMs: Math.round(performance.now() - aiStartedAt),
          cached: modelSettingsPreloaded,
        });
        detectorRef.current = detector;
        if (canceled) return;
        complianceReadyRef.current = true;

        if (!navigator.mediaDevices?.getUserMedia) {
          onSetupErrorRef.current?.("อุปกรณ์นี้ไม่รองรับการใช้งานกล้อง");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 960 },
            aspectRatio: { ideal: 0.75 },
          },
          audio: false,
        });

        if (canceled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;

        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = async () => {
            try {
              await video.play();
              if (canceled) return;
              setFaceMessage("จัดใบหน้าให้อยู่ในกรอบ");
              setIsReady(true);
              onReadyRef.current?.();
            } catch (error) {
              console.error("[VerificationCameraModal1] Camera setup error:", error);
              onSetupErrorRef.current?.("ไม่สามารถเริ่มภาพจากกล้องได้");
            }
          };
        }
      } catch (error) {
        console.error("[VerificationCameraModal1] MediaPipe load/camera error:", error);
        onSetupErrorRef.current?.("ไม่สามารถโหลดตัวติดตามใบหน้าหรือเปิดกล้องได้");
      } finally {
        setBusy(false);
      }
    };

    void startCamera();

    return () => {
      canceled = true;
      detectingRef.current = false;
      smoothingMissCountRef.current = 0;
      autoCaptureTriggeredRef.current = false;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      setIsReady(false);
      setHasFace(false);
      setFaceInCircle(false);
      captureReadyRef.current = false;
      captureReadyEyeDistanceRef.current = null;
      captureReadyEyeCenterRef.current = null;
      clearAutoCaptureTimer();
      finalCaptureInFlightRef.current = false;
      setCaptureReady(false);
      setGuideContrast("dark");
      validSinceRef.current = null;
      smoothedPointsRef.current = null;
      stablePointsRef.current = null;
      latestLandmarksRef.current = null;
      invalidReadingRef.current = null;
      attributeCheckGenerationRef.current += 1;
      antiSpoofCheckGenerationRef.current += 1;
      complianceReadyRef.current = false;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, modelSettingsPreloaded]);

  useEffect(() => {
    if (!open || !isReady) return;
    const callbackVideo = videoRef.current;

    const scheduleNext = () => {
      if (callbackVideo && typeof callbackVideo.requestVideoFrameCallback === "function") {
        videoFrameCallbackRef.current = callbackVideo.requestVideoFrameCallback(() => {
          void loop();
        });
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        void loop();
      });
    };

    async function loop() {
      const video = videoRef.current;
      const previewCanvas = previewCanvasRef.current;
      const detector = detectorRef.current;
      const now = performance.now();

      if (!open) return;
      if (finalCaptureInFlightRef.current) {
        scheduleNext();
        return;
      }

      if (
        !video ||
        !previewCanvas ||
        !detector ||
        video.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0
      ) {
        resetAntiSpoofCheck();
        setInvalidFaceMessage("กล้องกำลังเริ่มทำงาน...", true);
        scheduleNext();
        return;
      }

      if (now - lastCheckRef.current < DETECTION_INTERVAL_MS || detectingRef.current) {
        scheduleNext();
        return;
      }

      lastCheckRef.current = now;
      detectingRef.current = true;

      try {
        if (!drawMirroredCoverFrame(video, previewCanvas)) {
          setInvalidFaceMessage("กล้องกำลังเริ่มทำงาน...", true);
          return;
        }

        if (now - lastLightingCheckRef.current >= LIGHTING_INTERVAL_MS) {
          lastLightingCheckRef.current = now;
          lightingCanvasRef.current ??= document.createElement("canvas");
          const lightingCheck = getVideoLightingCheck(
            previewCanvas,
            lightingCanvasRef.current,
          );
          lightingMessageRef.current = lightingCheck.message;
          setGuideContrast(lightingCheck.guideContrast);
        }

        const faces = await detector.estimateFaces(previewCanvas, {
          flipHorizontal: false,
        });

        if (faces.length === 0) {
          setHasFace(false);
          smoothingMissCountRef.current += 1;
          if (smoothingMissCountRef.current >= SMOOTHING_RESET_MISS_FRAMES) {
            smoothedPointsRef.current = null;
          }
          latestLandmarksRef.current = null;
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage("ไม่พบใบหน้า", true);
          return;
        }

        if (faces.length > 1) {
          setHasFace(true);
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage("พบหลายใบหน้า ให้มีใบหน้าเดียวในกรอบ", true);
          return;
        }

        setHasFace(true);
        smoothingMissCountRef.current = 0;
        const face = faces.reduce((largest, current) => {
          const largestBox = normalizeDetectedFaceBox(largest);
          const currentBox = normalizeDetectedFaceBox(current);
          return currentBox.width * currentBox.height >
            largestBox.width * largestBox.height
            ? current
            : largest;
        }, faces[0]);
        const rawPoints = getFeaturePointsFromFace(face);
        if (!rawPoints) {
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage("ตรวจจับตำแหน่งใบหน้าไม่ชัดเจน", true);
          return;
        }
        const landmarks = getSyntheticLandmarksFromBox(face, previewCanvas);
        latestLandmarksRef.current = landmarks;

        const points = smoothFeaturePoints(rawPoints, smoothedPointsRef.current);
        smoothedPointsRef.current = points;
        const isGreenHold =
          captureReadyRef.current && !finalCaptureInFlightRef.current;

        if (isGreenHold) {
          const movement = getAverageFeatureMovement(
            stablePointsRef.current,
            points,
          );
          stablePointsRef.current = points;
          if (movement > faceDetectorSetting("max_capture_ready_face_movement")) {
            console.log("[VerificationCameraModal1] green hold cancelled by movement", {
              movement,
              limit: faceDetectorSetting("max_capture_ready_face_movement"),
            });
            setInvalidFaceMessage("กรุณาอยู่นิ่งๆ ไม่ขยับใบหน้า", true);
            return;
          }

          const lockMessage = getCaptureReadyLockMessage(
            points,
            captureReadyEyeDistanceRef.current,
            captureReadyEyeCenterRef.current,
          );
          if (lockMessage) {
            console.log("[VerificationCameraModal1] green hold cancelled by lock", {
              lockMessage,
              readyEyeDistance: captureReadyEyeDistanceRef.current,
              readyEyeCenter: captureReadyEyeCenterRef.current,
            });
            setInvalidFaceMessage(lockMessage, true);
            return;
          }

          setFaceInCircle(true);
          setCaptureReady(true);
          setFaceMessage("พร้อมถ่ายภาพ");
          return;
        }

        const guideMessage = getFaceBoxGuideMessage(points, false);
        if (guideMessage) {
          stablePointsRef.current = null;
          resetAttributeCheck();
          resetAntiSpoofCheck();
          setInvalidFaceMessage(guideMessage);
          return;
        }

        const lightingMessage = lightingMessageRef.current;
        if (lightingMessage) {
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage(lightingMessage);
          return;
        }

        if (!isGreenHold && !complianceReadyRef.current) {
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage("กรุณาอยู่นิ่งๆ", true);
          return;
        }

        if (!isGreenHold && (
          now - lastAttributeCheckRef.current >= ATTRIBUTE_INTERVAL_MS &&
          !attributeCheckInFlightRef.current
        )) {
          lastAttributeCheckRef.current = now;
          attributeCheckInFlightRef.current = true;
          const generation = attributeCheckGenerationRef.current;
          void getFaceAttributeMessage(previewCanvas, landmarks, now)
            .then((message) => {
              if (generation !== attributeCheckGenerationRef.current) return;
              attributeMessageRef.current = message;
              attributeClearCountRef.current = message
                ? 0
                : attributeClearCountRef.current + 1;
            })
            .catch((error) => {
              console.warn("[VerificationCameraModal1] Face compliance check error:", error);
              if (generation !== attributeCheckGenerationRef.current) return;
              attributeMessageRef.current = "ระบบตรวจการบังใบหน้ากำลังกู้คืน ลองอีกครั้ง";
              attributeClearCountRef.current = 0;
            })
            .finally(() => {
              attributeCheckInFlightRef.current = false;
            });
        }
        if (!isGreenHold && attributeMessageRef.current) {
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage(attributeMessageRef.current);
          return;
        }
        if (
          !isGreenHold &&
          attributeClearCountRef.current < ATTRIBUTE_CLEAR_CONFIRMATIONS
        ) {
          stablePointsRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage("กรุณาอยู่นิ่งๆ", true);
          return;
        }

        if (!isGreenHold && !antiSpoofPassedRef.current) {
          if (
            now - lastAntiSpoofCheckRef.current >= ANTI_SPOOF_INTERVAL_MS &&
            !antiSpoofCheckInFlightRef.current
          ) {
            lastAntiSpoofCheckRef.current = now;
            antiSpoofCheckInFlightRef.current = true;
            const generation = antiSpoofCheckGenerationRef.current;
            void getAntiSpoofResult(previewCanvas, landmarks)
              .then((antiSpoofResult) => {
                if (generation !== antiSpoofCheckGenerationRef.current) return;
                antiSpoofMessageRef.current = antiSpoofResult.message;

                if (antiSpoofResult.realScore !== null) {
                  const decision = updateAntiSpoofDecision(
                    antiSpoofScoresRef.current,
                    antiSpoofResult.realScore,
                  );
                  antiSpoofScoresRef.current = decision.scores;
                  antiSpoofPassedRef.current = decision.passed;
                  antiSpoofMessageRef.current =
                    decision.message === "กำลังตรวจสอบใบหน้าจริง..."
                      ? null
                      : decision.message;
                }
              })
              .catch((error) => {
                console.warn("[VerificationCameraModal1] Anti-spoof check error:", error);
                if (generation !== antiSpoofCheckGenerationRef.current) return;
                antiSpoofMessageRef.current = "ระบบตรวจใบหน้าจริงกำลังกู้คืน กรุณาอยู่นิ่ง";
              })
              .finally(() => {
                antiSpoofCheckInFlightRef.current = false;
              });
          }

          if (!antiSpoofPassedRef.current) {
            stablePointsRef.current = null;
            setInvalidFaceMessage(
              antiSpoofMessageRef.current ?? "กรุณาอยู่นิ่งๆ",
              true,
            );
            return;
          }
        }

        const movement = getAverageFeatureMovement(
          stablePointsRef.current,
          points,
        );
        stablePointsRef.current = points;
        const movementLimit = captureReadyRef.current
          ? faceDetectorSetting("max_capture_ready_face_movement")
          : faceDetectorSetting("max_stable_face_movement");

        if (movement > movementLimit) {
          setInvalidFaceMessage("กรุณาอยู่นิ่งๆ ไม่ขยับใบหน้า", true);
          return;
        }

        if (captureReadyRef.current) {
          const lockMessage = getCaptureReadyLockMessage(
            points,
            captureReadyEyeDistanceRef.current,
            captureReadyEyeCenterRef.current,
          );
          if (lockMessage) {
            setInvalidFaceMessage(lockMessage, true);
            return;
          }
        }

        setValidFaceMessage(now, points);
      } catch (error) {
        console.warn("[VerificationCameraModal1] Face detector error:", error);
        resetAntiSpoofCheck();
        setInvalidFaceMessage("ระบบติดตามใบหน้ากำลังกู้คืน ถือกล้องให้นิ่ง", true);
      } finally {
        detectingRef.current = false;
        scheduleNext();
      }
    }

    scheduleNext();

    return () => {
      if (
        videoFrameCallbackRef.current !== null &&
        callbackVideo &&
        typeof callbackVideo.cancelVideoFrameCallback === "function"
      ) {
        callbackVideo.cancelVideoFrameCallback(videoFrameCallbackRef.current);
        videoFrameCallbackRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, isReady]);

  const canCapture = isReady && !busy && captureReady;

  const capture = async (auto = false) => {
    const video = videoRef.current;
    const previewCanvas = previewCanvasRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;
    console.log("[VerificationCameraModal1] capture requested", {
      auto,
      hasVideo: !!video,
      hasPreviewCanvas: !!previewCanvas,
      hasCanvas: !!canvas,
      hasDetector: !!detector,
      captureReadyState: captureReady,
      captureReadyRef: captureReadyRef.current,
      finalCaptureInFlight: finalCaptureInFlightRef.current,
    });
    if (!video || !previewCanvas || !canvas || !detector || (!auto && !captureReady)) {
      console.log("[VerificationCameraModal1] capture skipped: missing dependency or not ready");
      return;
    }
    if (finalCaptureInFlightRef.current) {
      console.log("[VerificationCameraModal1] capture skipped: already in flight");
      return;
    }

    const failCapture = (message: string) => {
      console.log("[VerificationCameraModal1] capture failed", { message });
      finalCaptureInFlightRef.current = false;
      setInvalidFaceMessage(message, true);
    };

    finalCaptureInFlightRef.current = true;
    setBusy(true);
    console.log("[VerificationCameraModal1] final capture started");

    if (!drawMirroredCoverFrame(video, previewCanvas)) {
      failCapture("กล้องกำลังเริ่มทำงาน...");
      return;
    }

    let faces: DetectedFace[];
    try {
      faces = await detector.estimateFaces(previewCanvas, {
        flipHorizontal: false,
      });
    } catch (error) {
      console.warn("[VerificationCameraModal1] Final face detector check error:", error);
      failCapture("ระบบติดตามใบหน้ากำลังกู้คืน ถือกล้องให้นิ่ง");
      return;
    }

    if (faces.length === 0) {
      failCapture("ไม่พบใบหน้า");
      return;
    }
    if (faces.length > 1) {
      failCapture("พบหลายใบหน้า ให้มีใบหน้าเดียวในกรอบ");
      return;
    }

    const face = faces[0];
    console.log("[VerificationCameraModal1] final face detected", {
      faces: faces.length,
      box: normalizeDetectedFaceBox(face),
    });
    const finalPoints = getFeaturePointsFromFace(face);
    if (!finalPoints) {
      failCapture("ตรวจจับตำแหน่งใบหน้าไม่ชัดเจน");
      return;
    }

    const landmarks = getSyntheticLandmarksFromBox(face, previewCanvas);
    latestLandmarksRef.current = landmarks;
    if (!landmarks) {
      failCapture("ไม่พบใบหน้า");
      return;
    }
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      failCapture("ไม่สามารถบันทึกรูปจากกล้องได้");
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    console.log("[VerificationCameraModal1] capture success", {
      width,
      height,
      dataUrlLength: dataUrl.length,
    });
    onCaptured(dataUrl);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="ห้ามสวมหมวก แมส หน้ากาก และแว่นตา"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${styles.modal} ${!isReady ? styles.modalPreparing : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={`${styles.title} ${styles.warningTitle}`}>
            <span className={styles.warningTitleMain}>! ห้ามสวม</span>
            <span className={styles.warningTitleSub}>(หมวก / แมส / หน้ากาก และแว่นตา)</span>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.frame}>
            <video
              ref={videoRef}
              className={`guts-fv-video ${styles.video}`}
              playsInline
              muted
            />
            <canvas ref={previewCanvasRef} className={styles.analysisCanvas} />

            <div
              className={[
                styles.overlayContainer,
                faceInCircle ? styles.perfectMatch : "",
                !faceInCircle && guideContrast === "light" ? styles.lightGuide : "",
                hasFace && !faceInCircle ? styles.pendingMatch : "",
              ].join(" ")}
              aria-hidden="true"
            >
              <svg
                className={styles.maskSvg}
                viewBox="0 0 240 320"
                preserveAspectRatio="xMidYMid meet"
                focusable="false"
              >
                <path
                  className={styles.glowingOutline}
                  d={BOX_GUIDE_OUTLINE}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            <div
              className={styles.status}
              style={{ color: faceInCircle ? "#00FF00" : hasFace ? "#FFB020" : "#fff" }}
            >
              {faceMessage}
            </div>

            <canvas ref={canvasRef} className={styles.canvas} />
          </div>

          {/*
          <button type="button" className={styles.captureBtn} onClick={() => void capture()} disabled={!canCapture}>
            <FontAwesomeIcon icon={faCamera} />
            ถ่ายภาพ
          </button>
          */}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import styles from "./VerificationCameraModal.module.css";
import {
  getFaceAttributeMessage,
  loadFaceAttributeModel,
} from "@/components/ai/ailoader/faceAttributeModel";
import {
  getAntiSpoofResult,
  loadAntiSpoofModel,
  updateAntiSpoofDecision,
} from "@/components/ai/ailoader/antiSpoofModel";
import { loadFaceLandmarker, type LoadedFaceLandmarker } from "@/components/ai/ailoader/faceLandmarkerModel";
import { loadFaceDetector } from "@/components/ai/ailoader/faceDetectorModel";
import { FACE_GUIDE_OUTLINE } from "@/components/ai/FaceVisualGuide";
import { getFaceModelValueForMode, isFaceModelActive, loadFaceModelSettings } from "@/components/ai/faceModelSettings";

export type CameraModalProps = {
  open: boolean;
  onClose: () => void;

  /** ได้รูปกลับไปเป็น dataUrl */
  onCaptured: (dataUrl: string) => void;

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
const FACE_GUIDE_TRANSFORM = "translate(18.8 30.2) scale(0.285)";
const GUIDE_CENTER = { x: 120, y: 155.5 };
const GUIDE_RADIUS = { x: 88.3, y: 109.8 };
const GUIDE_BOUNDARY_TOLERANCE = 1.16;
const CORE_FACE_LANDMARK_INDICES = [10, 152, 33, 263, 234, 454, 1, 13, 14];
const DEFAULT_SHOW_FACE_DEBUG = false;

function faceLandmarkerSetting(settingKey: string, fallback: number) {
  return getFaceModelValueForMode("face_landmarker", "verify", settingKey, fallback);
}

function showFaceDebugMarkers() {
  return faceLandmarkerSetting("show_debug_markers", DEFAULT_SHOW_FACE_DEBUG ? 1 : 0) >= 1;
}

function requireFeatureTargetAlignment() {
  return faceLandmarkerSetting("require_feature_target_alignment", REQUIRE_FEATURE_TARGET_ALIGNMENT ? 1 : 0) >= 1;
}

function faceLandmarkerToggle(key: string) {
  return faceLandmarkerSetting(key, 1) >= 1;
}
const GUIDE_TARGETS: FeaturePoints = {
  leftEye: { x: 83.3, y: 137.7 },
  rightEye: { x: 156.7, y: 137.7 },
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

function getMarkerFeaturePoints(
  video: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
): FeaturePoints {
  const fallback = getRawFeaturePoints(video, landmarks);
  const eyeA = landmarks[468]
    ? mapLandmarkToOverlay(video, landmarks[468])
    : fallback.leftEye;
  const eyeB = landmarks[473]
    ? mapLandmarkToOverlay(video, landmarks[473])
    : fallback.rightEye;
  const [leftEye, rightEye] = eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA];

  return {
    leftEye,
    rightEye,
    nose: mapLandmarkToOverlay(video, landmarks[1]),
    mouth: averagePoint([13, 14].map((idx) => mapLandmarkToOverlay(video, landmarks[idx]))),
  };
}

function isInsideGuide(point: Point) {
  const nx = (point.x - GUIDE_CENTER.x) / GUIDE_RADIUS.x;
  const ny = (point.y - GUIDE_CENTER.y) / GUIDE_RADIUS.y;
  const tolerance = faceLandmarkerSetting("guide_boundary_tolerance", GUIDE_BOUNDARY_TOLERANCE);
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
    average < faceLandmarkerSetting("min_average_brightness", MIN_AVERAGE_BRIGHTNESS) ||
    dark / count > faceLandmarkerSetting("max_dark_pixel_ratio", MAX_DARK_PIXEL_RATIO)
  ) {
    return { message: "แสงน้อยเกินไป เพิ่มแสงสว่าง", guideContrast };
  }

  if (
    average > faceLandmarkerSetting("max_average_brightness", MAX_AVERAGE_BRIGHTNESS) ||
    bright / count > faceLandmarkerSetting("max_bright_pixel_ratio", MAX_BRIGHT_PIXEL_RATIO)
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

  if (faceGuideHeight < faceLandmarkerSetting("min_face_guide_height", MIN_FACE_GUIDE_HEIGHT)) {
    return "ขยับเข้าใกล้กล้อง";
  }

  if (faceGuideHeight > faceLandmarkerSetting("max_face_guide_height", MAX_FACE_GUIDE_HEIGHT)) {
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
      const eyeCenterXTolerance = faceLandmarkerSetting(
        "eye_center_x_tolerance",
        EYE_CENTER_X_TOLERANCE,
      );
      const eyeCenterYTolerance = faceLandmarkerSetting(
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
      if (eyeDistance < faceLandmarkerSetting("min_eye_distance", MIN_EYE_DISTANCE)) {
        return { message: "ขยับเข้าใกล้กล้อง", points };
      }
      if (eyeDistance > faceLandmarkerSetting("max_eye_distance", MAX_EYE_DISTANCE)) {
        return { message: "ขยับออกจากกล้องเล็กน้อย", points };
      }
    }

    const noseHorizontalOffset = Math.abs(points.nose.x - eyeCenter.x);
    const noseBelowEyes = points.nose.y - eyeCenter.y;

    if (faceLandmarkerToggle("require_nose_zone")) {
      if (
        noseHorizontalOffset >
          eyeDistance * faceLandmarkerSetting("nose_x_ratio_max", 0.20) ||
        noseBelowEyes <
          eyeDistance * faceLandmarkerSetting("min_nose_below_eyes_ratio", 0.30) ||
        noseBelowEyes >
          eyeDistance * faceLandmarkerSetting("max_nose_below_eyes_ratio", 1.0)
      ) {
        return { message: "จัดใบหน้าให้อยู่กึ่งกลางและมองตรง", points };
      }
    }

    const mouthHorizontalOffset = Math.abs(points.mouth.x - eyeCenter.x);
    const mouthBelowNose = points.mouth.y - points.nose.y;

    if (faceLandmarkerToggle("require_mouth_zone")) {
      if (
        mouthHorizontalOffset >
          eyeDistance * faceLandmarkerSetting("mouth_x_ratio_max", 0.25) ||
        mouthBelowNose <
          eyeDistance * faceLandmarkerSetting("min_mouth_below_nose_ratio", 0.10) ||
        mouthBelowNose >
          eyeDistance * faceLandmarkerSetting("max_mouth_below_nose_ratio", 0.80)
      ) {
        return { message: "จัดใบหน้าให้ตรงและเห็นครบ", points };
      }
    }
  }

  return { message: null, points };
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
    eyeTilt > faceLandmarkerSetting("landmark_eye_tilt_max", 0.09) ||
    noseHorizontalOffset > faceLandmarkerSetting("landmark_nose_x_ratio_max", 0.14)
  ) {
    return "มองตรงเข้ากล้อง";
  }

  return null;
}

export default function VerificationCameraModal({
  open,
  onClose,
  onCaptured,
  closeOnBackdrop = true,
  closeOnEsc = true,
  modelSettingsPreloaded = false,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<LoadedFaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const validSinceRef = useRef<number | null>(null);
  const smoothedPointsRef = useRef<FeaturePoints | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const invalidReadingRef = useRef<{ message: string; count: number } | null>(null);
  const lastCheckRef = useRef(0);
  const lastLightingCheckRef = useRef(0);
  const lightingMessageRef = useRef<string | null>(null);
  const lastAttributeCheckRef = useRef(0);
  const attributeMessageRef = useRef<string | null>("กำลังตรวจแว่นตาและการบังใบหน้า...");
  const attributeClearCountRef = useRef(0);
  const attributeCheckInFlightRef = useRef(false);
  const attributeCheckGenerationRef = useRef(0);
  const lastAntiSpoofCheckRef = useRef(0);
  const antiSpoofScoresRef = useRef<number[]>([]);
  const antiSpoofMessageRef = useRef<string | null>("กำลังตรวจสอบใบหน้าจริง...");
  const antiSpoofPassedRef = useRef(false);
  const antiSpoofCheckInFlightRef = useRef(false);
  const antiSpoofCheckGenerationRef = useRef(0);
  const complianceReadyRef = useRef(false);
  const detectingRef = useRef(false);
  const smoothingMissCountRef = useRef(0);
  const autoCaptureTriggeredRef = useRef(false);

  const [busy, setBusy] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [faceInCircle, setFaceInCircle] = useState(false);
  const [captureReady, setCaptureReady] = useState(false);
  const [faceMessage, setFaceMessage] = useState("กำลังเปิดกล้อง...");
  const [debugPoints, setDebugPoints] = useState<FeaturePoints | null>(null);
  const [guideContrast, setGuideContrast] = useState<GuideContrast>("dark");

  function resetAttributeCheck() {
    attributeCheckGenerationRef.current += 1;
    lastAttributeCheckRef.current = 0;
    attributeMessageRef.current = "กำลังตรวจแว่นตาและการบังใบหน้า...";
    attributeClearCountRef.current = 0;
  }

  function resetAntiSpoofCheck() {
    antiSpoofCheckGenerationRef.current += 1;
    lastAntiSpoofCheckRef.current = 0;
    antiSpoofScoresRef.current = [];
    antiSpoofMessageRef.current = "กำลังตรวจสอบใบหน้าจริง...";
    antiSpoofPassedRef.current = false;
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

    validSinceRef.current = null;
    autoCaptureTriggeredRef.current = false;
    setCaptureReady(false);
    setFaceInCircle(false);
    setFaceMessage(message);
  }

  function setValidFaceMessage(now: number) {
    invalidReadingRef.current = null;
    if (validSinceRef.current === null) {
      validSinceRef.current = now;
    }

    const remaining = Math.max(0, STABLE_HOLD_MS - (now - validSinceRef.current));
    setFaceInCircle(true);

    if (remaining > 0) {
      setCaptureReady(false);
      setFaceMessage(`อยู่นิ่งๆ... ${Math.ceil(remaining / 1000)}`);
      return;
    }

    setCaptureReady(true);
    setFaceMessage("พร้อมถ่ายภาพ");
    if (!autoCaptureTriggeredRef.current) {
      autoCaptureTriggeredRef.current = true;
      void capture(true);
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
    setCaptureReady(false);
    setDebugPoints(null);
    setGuideContrast("dark");
    validSinceRef.current = null;
    smoothedPointsRef.current = null;
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
    setFaceMessage("กำลังเปิดกล้อง...");

    const startCamera = async () => {
      try {
        setBusy(true);

        if (!modelSettingsPreloaded) {
          await loadFaceModelSettings("verify");
        }

        const aiStartedAt = performance.now();
        const [landmarker] = await Promise.all([
          landmarkerRef.current
            ? Promise.resolve(landmarkerRef.current)
            : loadFaceLandmarker(),
          isFaceModelActive("face_detector")
            ? loadFaceDetector()
            : Promise.resolve(null),
          loadFaceAttributeModel({
            skipSettingsReload: true,
            mode: "verify",
          }),
          isFaceModelActive("minifasnet_v2")
            ? loadAntiSpoofModel()
            : Promise.resolve(null),
        ]);
        console.info("[VerificationCameraModal] Parallel frontend AI preload ready", {
          aiLoadMs: Math.round(performance.now() - aiStartedAt),
          cached: modelSettingsPreloaded,
        });
        landmarkerRef.current = landmarker;
        if (canceled) return;
        complianceReadyRef.current = true;

        if (!navigator.mediaDevices?.getUserMedia) {
          setFaceMessage("อุปกรณ์นี้ไม่รองรับการใช้งานกล้อง");
          return;
        }

        if (!canceled) setFaceMessage("กำลังขอสิทธิ์ใช้งานกล้อง...");
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
          setFaceMessage("กำลังเริ่มภาพจากกล้อง...");
          video.srcObject = stream;
          video.onloadedmetadata = async () => {
            try {
              await video.play();
              if (canceled) return;
              setIsReady(true);
              setFaceMessage("จัดใบหน้าให้อยู่ในกรอบ");
            } catch {
              setFaceMessage("ไม่สามารถเริ่มภาพจากกล้องได้");
            }
          };
        }
      } catch (error) {
        console.error("[CameraModal] MediaPipe load/camera error:", error);
        setFaceMessage("ไม่สามารถโหลดตัวติดตามใบหน้าหรือเปิดกล้องได้");
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
      setCaptureReady(false);
      setDebugPoints(null);
      setGuideContrast("dark");
      validSinceRef.current = null;
      smoothedPointsRef.current = null;
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
      const landmarker = landmarkerRef.current;
      const now = performance.now();

      if (!open) return;

      if (
        !video ||
        !previewCanvas ||
        !landmarker ||
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

        const result = landmarker.detectForVideo(previewCanvas, now);
        const faces = result.faceLandmarks;

        if (faces.length === 0) {
          setHasFace(false);
          smoothingMissCountRef.current += 1;
          if (smoothingMissCountRef.current >= SMOOTHING_RESET_MISS_FRAMES) {
            smoothedPointsRef.current = null;
          }
          latestLandmarksRef.current = null;
          resetAntiSpoofCheck();
          setInvalidFaceMessage("ไม่พบใบหน้า", true);
          return;
        }

        if (faces.length > 1) {
          setHasFace(true);
          resetAntiSpoofCheck();
          setInvalidFaceMessage("พบหลายใบหน้า ให้มีใบหน้าเดียวในกรอบ", true);
          return;
        }

        setHasFace(true);
        smoothingMissCountRef.current = 0;
        const landmarks = faces[0] as NormalizedLandmark[];
        latestLandmarksRef.current = landmarks;

        const guideCheck = getGuideCheck(previewCanvas, landmarks, smoothedPointsRef.current);
        smoothedPointsRef.current = guideCheck.points;
        if (showFaceDebugMarkers()) setDebugPoints(getMarkerFeaturePoints(previewCanvas, landmarks));

        const distanceMessage = getFaceDistanceMessage(previewCanvas, landmarks);
        if (distanceMessage) {
          resetAntiSpoofCheck();
          setInvalidFaceMessage(distanceMessage);
          return;
        }

        if (guideCheck.message) {
          resetAttributeCheck();
          resetAntiSpoofCheck();
          setInvalidFaceMessage(guideCheck.message);
          return;
        }

        const qualityMessage = getLandmarkQualityMessage(previewCanvas, landmarks);
        if (qualityMessage) {
          resetAntiSpoofCheck();
          setInvalidFaceMessage(qualityMessage);
          return;
        }

        const lightingMessage = lightingMessageRef.current;
        if (lightingMessage) {
          resetAntiSpoofCheck();
          setInvalidFaceMessage(lightingMessage);
          return;
        }

        if (!complianceReadyRef.current) {
          resetAntiSpoofCheck();
          setInvalidFaceMessage("กำลังตรวจแว่นตาและการบังใบหน้า...", true);
          return;
        }

        if (
          now - lastAttributeCheckRef.current >= ATTRIBUTE_INTERVAL_MS &&
          !attributeCheckInFlightRef.current
        ) {
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
              console.warn("[CameraModal] Face compliance check error:", error);
              if (generation !== attributeCheckGenerationRef.current) return;
              attributeMessageRef.current = "ระบบตรวจการบังใบหน้ากำลังกู้คืน ลองอีกครั้ง";
              attributeClearCountRef.current = 0;
            })
            .finally(() => {
              attributeCheckInFlightRef.current = false;
            });
        }
        if (attributeMessageRef.current) {
          resetAntiSpoofCheck();
          setInvalidFaceMessage(attributeMessageRef.current);
          return;
        }
        if (attributeClearCountRef.current < ATTRIBUTE_CLEAR_CONFIRMATIONS) {
          resetAntiSpoofCheck();
          setInvalidFaceMessage("กำลังตรวจแว่นตาและการบังใบหน้า...", true);
          return;
        }

        if (!antiSpoofPassedRef.current) {
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
                  antiSpoofMessageRef.current = decision.message;
                }
              })
              .catch((error) => {
                console.warn("[CameraModal] Anti-spoof check error:", error);
                if (generation !== antiSpoofCheckGenerationRef.current) return;
                antiSpoofMessageRef.current = "ระบบตรวจใบหน้าจริงกำลังกู้คืน กรุณาอยู่นิ่ง";
              })
              .finally(() => {
                antiSpoofCheckInFlightRef.current = false;
              });
          }

          if (!antiSpoofPassedRef.current) {
            setInvalidFaceMessage(
              antiSpoofMessageRef.current ?? "กำลังตรวจสอบใบหน้าจริง...",
              true,
            );
            return;
          }
        }

        setValidFaceMessage(now);
      } catch (error) {
        console.warn("[CameraModal] MediaPipe detection error:", error);
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
    if (!video || !previewCanvas || !canvas || (!auto && !captureReady)) return;

    const landmarks = latestLandmarksRef.current;
    if (!landmarks) {
      setInvalidFaceMessage("ไม่พบใบหน้า", true);
      return;
    }
    let attributeMessage: string | null;
    try {
      attributeMessage = await getFaceAttributeMessage(previewCanvas, landmarks, performance.now());
    } catch (error) {
      console.warn("[CameraModal] Face compliance check error:", error);
      setInvalidFaceMessage("ระบบตรวจการบังใบหน้ากำลังกู้คืน ลองอีกครั้ง", true);
      return;
    }
    if (attributeMessage) {
      attributeClearCountRef.current = 0;
      attributeMessageRef.current = attributeMessage;
      setInvalidFaceMessage(attributeMessage, true);
      return;
    }
    if (!antiSpoofPassedRef.current) {
      setInvalidFaceMessage("ตรวจใบหน้าจริงให้เสร็จก่อนถ่ายภาพ", true);
      return;
    }

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    onCaptured(canvas.toDataURL("image/jpeg", 0.92));
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
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
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
                <defs>
                  <mask id="face-hole-mask" maskUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="240" height="320" fill="white" />
                    <path
                      d={FACE_GUIDE_OUTLINE}
                      fill="black"
                      transform={FACE_GUIDE_TRANSFORM}
                    />
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="240"
                  height="320"
                  className={styles.darkBackdrop}
                  mask="url(#face-hole-mask)"
                />
                <path
                  className={styles.glowingOutline}
                  d={FACE_GUIDE_OUTLINE}
                  transform={FACE_GUIDE_TRANSFORM}
                  vectorEffect="non-scaling-stroke"
                />
                {showFaceDebugMarkers() && debugPoints ? (
                  <g aria-hidden="true">
                    <circle cx={debugPoints.leftEye.x} cy={debugPoints.leftEye.y} r="1.6" fill="#00e5ff" stroke="#101114" strokeWidth="0.6" opacity="0.7" />
                    <circle cx={debugPoints.rightEye.x} cy={debugPoints.rightEye.y} r="1.6" fill="#00e5ff" stroke="#101114" strokeWidth="0.6" opacity="0.7" />
                    <circle cx={debugPoints.nose.x} cy={debugPoints.nose.y} r="1.6" fill="#ff4dff" stroke="#101114" strokeWidth="0.6" opacity="0.7" />
                    <circle cx={debugPoints.mouth.x} cy={debugPoints.mouth.y} r="1.6" fill="#39ff88" stroke="#101114" strokeWidth="0.6" opacity="0.7" />
                  </g>
                ) : null}
              </svg>
            </div>

            <span className={`guts-fv-corner tl ${styles.corner} ${styles.tl}`} aria-hidden="true" />
            <span className={`guts-fv-corner tr ${styles.corner} ${styles.tr}`} aria-hidden="true" />
            <span className={`guts-fv-corner bl ${styles.corner} ${styles.bl}`} aria-hidden="true" />
            <span className={`guts-fv-corner br ${styles.corner} ${styles.br}`} aria-hidden="true" />

            <div
              className={styles.status}
              style={{ color: faceInCircle ? "#00FF00" : hasFace ? "#FFB020" : "#fff" }}
            >
              {isReady ? faceMessage : faceMessage}
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

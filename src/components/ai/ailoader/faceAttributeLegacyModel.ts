import {
  FilesetResolver,
  ImageClassifier,
  type ImageSource,
} from "@mediapipe/tasks-vision";

import { getFaceModelValue } from "../faceModelSettings";

type FaceLandmark = { x: number; y: number; z?: number };
type FaceImageSource = HTMLVideoElement | HTMLCanvasElement;

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "/models/face_attrib_net.tflite";
const INPUT_SIZE = 128;

const GLASSES_THRESHOLD = 0.05;
const MASK_THRESHOLD = 0.35;
const SUNGLASSES_THRESHOLD = 0.25;
const MIN_EYE_OPENNESS = 0.25;

let classifierPromise: Promise<ImageClassifier> | null = null;
let classifier: ImageClassifier | null = null;
let classifierLoadFailed = false;
let visionPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;

const cropCanvas = document.createElement("canvas");
cropCanvas.width = INPUT_SIZE;
cropCanvas.height = INPUT_SIZE;

function loadVisionFileset() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(WASM_URL);
  }
  return visionPromise;
}

export function loadLegacyFaceAttributeModel() {
  if (!classifierPromise) {
    classifierPromise = loadVisionFileset()
      .then((vision) =>
        ImageClassifier.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          maxResults: 5,
          scoreThreshold: 0,
        }).then((loadedClassifier) => {
          classifier = loadedClassifier;
          return loadedClassifier;
        }),
      )
      .catch((error: unknown) => {
        classifierLoadFailed = true;
        throw error;
      });
  }
  return classifierPromise;
}

export function classifyLegacyFaceAttributeScores(
  image: ImageSource,
  timestamp: number,
) {
  if (!classifier) {
    throw new Error("Face attribute classifier is not loaded.");
  }

  const result = classifier.classifyForVideo(image, timestamp);
  const scores = new Map<number, number>();
  for (const classification of result.classifications) {
    for (const category of classification.categories) {
      scores.set(category.index, category.score);
    }
  }
  return scores;
}

function getSourceSize(source: FaceImageSource) {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.width, height: source.height };
}

function drawFaceCrop(source: FaceImageSource, landmarks: FaceLandmark[]) {
  const xs = landmarks.map((landmark) => landmark.x);
  const ys = landmarks.map((landmark) => landmark.y);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(1, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(1, Math.max(...ys));
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const cropSize = Math.min(1, Math.max(faceWidth * 1.35, faceHeight * 1.18));
  const sourceX = Math.max(0, Math.min(1 - cropSize, centerX - cropSize / 2));
  const sourceY = Math.max(0, Math.min(1 - cropSize, centerY - cropSize / 2));
  const context = cropCanvas.getContext("2d", { willReadFrequently: false });
  const sourceSize = getSourceSize(source);

  if (!context || cropSize <= 0) {
    throw new Error("Unable to prepare the face attribute crop.");
  }

  context.drawImage(
    source,
    sourceX * sourceSize.width,
    sourceY * sourceSize.height,
    cropSize * sourceSize.width,
    cropSize * sourceSize.height,
    0,
    0,
    INPUT_SIZE,
    INPUT_SIZE,
  );
  return cropCanvas;
}

export function getLegacyFaceAttributeMessage(
  source: FaceImageSource,
  landmarks: FaceLandmark[],
  timestamp: number,
): string | null {
  if (!classifier) {
    return classifierLoadFailed
      ? "ไม่สามารถโหลดระบบตรวจแว่นตาและการบังใบหน้าได้"
      : "กำลังตรวจแว่นตาและการบังใบหน้า...";
  }
  const scores = classifyLegacyFaceAttributeScores(
    drawFaceCrop(source, landmarks),
    timestamp,
  );

  const leftEyeOpen = scores.get(0) ?? 0;
  const rightEyeOpen = scores.get(1) ?? 0;
  const glasses = scores.get(2) ?? 0;
  const mask = scores.get(3) ?? 0;
  const sunglasses = scores.get(4) ?? 0;

  if (
    glasses >=
      getFaceModelValue("face_attrib_legacy", "glasses_threshold", GLASSES_THRESHOLD) ||
    sunglasses >=
      getFaceModelValue(
        "face_attrib_legacy",
        "sunglasses_threshold",
        SUNGLASSES_THRESHOLD,
      )
  ) {
    return "ถอดแว่นตาทั้งหมดก่อนถ่ายภาพ";
  }
  if (
    mask >= getFaceModelValue("face_attrib_legacy", "mask_threshold", MASK_THRESHOLD)
  ) {
    return "ถอดหน้ากากอนามัยก่อนถ่ายภาพ";
  }
  const minimumEyeOpenness = getFaceModelValue(
    "face_attrib_legacy",
    "minimum_eye_openness",
    MIN_EYE_OPENNESS,
  );
  if (leftEyeOpen < minimumEyeOpenness || rightEyeOpen < minimumEyeOpenness) {
    return "เปิดตาทั้งสองข้างและอย่าให้ถูกบัง";
  }
  return null;
}

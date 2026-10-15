import { ort } from "./onnxRuntime";
import { getFaceModelValue, isFaceModelActive } from "./faceModelSettings";

type FaceLandmark = { x: number; y: number; z?: number };
type FaceImageSource = HTMLVideoElement | HTMLCanvasElement;

export type AntiSpoofResult = {
  realScore: number | null;
  message: string | null;
};

export type AntiSpoofDecision = {
  scores: number[];
  passed: boolean;
  message: string | null;
};

const MODEL_URL = "/models/2.7_80x80_MiniFASNetV2.onnx";
const INPUT_SIZE = 80;
const CROP_SCALE = 2.7;
const REQUIRED_SCORES = 3;
const MIN_MEDIAN_REAL_SCORE = 0.55;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let session: ort.InferenceSession | null = null;
let sessionLoadFailed = false;

const cropCanvas = document.createElement("canvas");
cropCanvas.width = INPUT_SIZE;
cropCanvas.height = INPUT_SIZE;

function softmax(values: number[]) {
  const maxValue = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - maxValue));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function getSourceSize(source: FaceImageSource) {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.width, height: source.height };
}

function createAntiSpoofTensor(source: FaceImageSource, landmarks: FaceLandmark[]) {
  const xs = landmarks.map((landmark) => landmark.x);
  const ys = landmarks.map((landmark) => landmark.y);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.min(1, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.min(1, Math.max(...ys));
  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  const cropWidth = Math.min(1, faceWidth * CROP_SCALE);
  const cropHeight = Math.min(1, faceHeight * CROP_SCALE);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const sourceX = Math.max(0, Math.min(1 - cropWidth, centerX - cropWidth / 2));
  const sourceY = Math.max(0, Math.min(1 - cropHeight, centerY - cropHeight / 2));
  const context = cropCanvas.getContext("2d", { willReadFrequently: true });
  const sourceSize = getSourceSize(source);

  if (!context || cropWidth <= 0 || cropHeight <= 0) {
    throw new Error("Unable to prepare the anti-spoof face crop.");
  }

  context.drawImage(
    source,
    sourceX * sourceSize.width,
    sourceY * sourceSize.height,
    cropWidth * sourceSize.width,
    cropHeight * sourceSize.height,
    0,
    0,
    INPUT_SIZE,
    INPUT_SIZE,
  );

  const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const planeSize = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(planeSize * 3);

  // MiniFASNet was trained with OpenCV BGR pixels in the [0, 255] range.
  for (let pixelIndex = 0; pixelIndex < planeSize; pixelIndex += 1) {
    const rgbaIndex = pixelIndex * 4;
    input[pixelIndex] = pixels[rgbaIndex + 2];
    input[planeSize + pixelIndex] = pixels[rgbaIndex + 1];
    input[planeSize * 2 + pixelIndex] = pixels[rgbaIndex];
  }

  return new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

export function loadAntiSpoofClassifier() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    })
      .then((loadedSession) => {
        session = loadedSession;
        return loadedSession;
      })
      .catch((error: unknown) => {
        sessionLoadFailed = true;
        sessionPromise = null;
        throw error;
      });
  }
  return sessionPromise;
}

export async function getAntiSpoofResult(
  source: FaceImageSource,
  landmarks: FaceLandmark[],
): Promise<AntiSpoofResult> {
  if (!isFaceModelActive("minifasnet_v2")) {
    return { realScore: 1, message: null };
  }
  if (!session) {
    return {
      realScore: null,
      message: sessionLoadFailed
        ? "ไม่สามารถโหลดระบบตรวจใบหน้าจริงได้"
        : "กำลังตรวจสอบใบหน้าจริง...",
    };
  }

  try {
    const inputName = session.inputNames[0] ?? "input";
    const outputName = session.outputNames[0] ?? "output";
    const outputs = await session.run({
      [inputName]: createAntiSpoofTensor(source, landmarks),
    });
    const output = outputs[outputName];

    if (!output || output.data.length < 3) {
      throw new Error("The anti-spoof model returned an invalid result.");
    }

    // Output classes: paper photo, real face, screen photo.
    const scores = softmax([0, 1, 2].map((index) => Number(output.data[index])));
    return { realScore: scores[1], message: null };
  } catch (error) {
    console.warn("[FaceAntiSpoof] Inference error:", error);
    return { realScore: null, message: "ระบบตรวจใบหน้าจริงกำลังกู้คืน กรุณาอยู่นิ่ง" };
  }
}

export function updateAntiSpoofDecision(
  previousScores: number[],
  realScore: number,
): AntiSpoofDecision {
  if (!isFaceModelActive("minifasnet_v2")) {
    return { scores: [1], passed: true, message: null };
  }
  const requiredScores = getFaceModelValue(
    "minifasnet_v2",
    "required_samples",
    REQUIRED_SCORES,
  );
  const scores = [...previousScores, realScore].slice(-requiredScores);
  if (scores.length < requiredScores) {
    return {
      scores,
      passed: false,
      message: "กำลังตรวจสอบใบหน้าจริง...",
    };
  }

  const sortedScores = [...scores].sort((left, right) => left - right);
  const medianScore = sortedScores[Math.floor(sortedScores.length / 2)];
  if (
    medianScore <
    getFaceModelValue(
      "minifasnet_v2",
      "real_score_threshold",
      MIN_MEDIAN_REAL_SCORE,
    )
  ) {
    return {
      scores,
      passed: false,
      message: "อาจเป็นรูปถ่ายหรือหน้าจอ กรุณาใช้ใบหน้าจริง",
    };
  }

  return { scores, passed: true, message: null };
}

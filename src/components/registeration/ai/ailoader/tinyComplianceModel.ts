import * as ort from "onnxruntime-web/wasm";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

import { getFaceModelValue } from "../faceModelSettings";

type FaceLandmark = { x: number; y: number; z?: number };
type FaceImageSource = HTMLVideoElement | HTMLCanvasElement;

const MODEL_URL = "/models/tiny_compliance_v3_single.onnx";
const INPUT_SIZE = 96;

// Replace these defaults with calibrated validation thresholds when available.
const EYEWEAR_THRESHOLD = 0.5;
const EYES_OCCLUDED_THRESHOLD = 0.72;
const NOSE_OCCLUDED_THRESHOLD = 0.5;
const MOUTH_OCCLUDED_THRESHOLD = 0.5;

ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = {
  wasm: ortWasmUrl,
};

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let session: ort.InferenceSession | null = null;
let sessionLoadFailed = false;

const cropCanvas = document.createElement("canvas");
cropCanvas.width = INPUT_SIZE;
cropCanvas.height = INPUT_SIZE;

function sigmoid(value: number) {
  if (value >= 0) {
    return 1 / (1 + Math.exp(-value));
  }
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function getSourceSize(source: FaceImageSource) {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.width, height: source.height };
}

function createFaceTensor(source: FaceImageSource, landmarks: FaceLandmark[]) {
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
  const context = cropCanvas.getContext("2d", { willReadFrequently: true });
  const sourceSize = getSourceSize(source);

  if (!context || cropSize <= 0) {
    throw new Error("Unable to prepare the face compliance crop.");
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

  const pixels = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const planeSize = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(planeSize * 3);

  for (let pixelIndex = 0; pixelIndex < planeSize; pixelIndex += 1) {
    const rgbaIndex = pixelIndex * 4;
    input[pixelIndex] = pixels[rgbaIndex] / 255;
    input[planeSize + pixelIndex] = pixels[rgbaIndex + 1] / 255;
    input[planeSize * 2 + pixelIndex] = pixels[rgbaIndex + 2] / 255;
  }

  return new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

export function loadTinyComplianceModel() {
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

export async function getTinyComplianceMessage(
  source: FaceImageSource,
  landmarks: FaceLandmark[],
): Promise<string | null> {
  if (!session) {
    return sessionLoadFailed
      ? "ไม่สามารถโหลดระบบตรวจแว่นตาและการบังใบหน้าได้"
      : "กำลังตรวจแว่นตาและการบังใบหน้า...";
  }

  const inputName = session.inputNames[0] ?? "image";
  const outputName = session.outputNames[0] ?? "logits";
  const results = await session.run({ [inputName]: createFaceTensor(source, landmarks) });
  const output = results[outputName];

  if (!output || output.data.length < 4) {
    throw new Error("The tiny compliance model returned an invalid result.");
  }

  // Model output order: eyewear, eyes_occluded, nose_occluded, mouth_occluded.
  const scores = [0, 1, 2, 3].map((index) => sigmoid(Number(output.data[index])));
  const [eyewear, eyesOccluded, noseOccluded, mouthOccluded] = scores;

  if (
    eyewear >=
    getFaceModelValue("tiny_compliance_v3", "eyewear_threshold", EYEWEAR_THRESHOLD)
  ) {
    return "ถอดแว่นตาทั้งหมดก่อนถ่ายภาพ";
  }
  if (
    eyesOccluded >=
    getFaceModelValue(
      "tiny_compliance_v3",
      "eyes_occluded_threshold",
      EYES_OCCLUDED_THRESHOLD,
    )
  ) {
    return "ให้เห็นดวงตาทั้งสองข้างชัดเจนและไม่ถูกบัง";
  }
  if (
    noseOccluded >=
      getFaceModelValue(
        "tiny_compliance_v3",
        "nose_occluded_threshold",
        NOSE_OCCLUDED_THRESHOLD,
      ) ||
    mouthOccluded >=
      getFaceModelValue(
        "tiny_compliance_v3",
        "mouth_occluded_threshold",
        MOUTH_OCCLUDED_THRESHOLD,
      )
  ) {
    return "ให้เห็นจมูกและปากชัดเจน";
  }
  return null;
}

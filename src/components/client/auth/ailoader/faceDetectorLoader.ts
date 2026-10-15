import * as faceDetection from "@tensorflow-models/face-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

const LOCAL_DETECTOR_MODEL_URL = "/models/mediapipe_face_detector_short/model.json";
const TFHUB_DETECTOR_MODEL_URL =
  "https://tfhub.dev/mediapipe/tfjs-model/face_detection/short/1";

let detectorPromise: Promise<faceDetection.FaceDetector> | null = null;

async function createDetector(detectorModelUrl: string) {
  await tf.ready();
  await tf.setBackend("webgl");
  await tf.ready();

  return faceDetection.createDetector(
    faceDetection.SupportedModels.MediaPipeFaceDetector,
    {
      runtime: "tfjs",
      modelType: "short",
      maxFaces: 2,
      detectorModelUrl,
    } as faceDetection.MediaPipeFaceDetectorTfjsModelConfig,
  );
}

export function loadFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = createDetector(LOCAL_DETECTOR_MODEL_URL)
      .catch((error: unknown) => {
        console.warn(
          "[FaceDetector] Local TFJS detector failed; falling back to TFHub.",
          error,
        );
        return createDetector(TFHUB_DETECTOR_MODEL_URL);
      })
      .catch((error: unknown) => {
        detectorPromise = null;
        throw error;
      });
  }

  return detectorPromise;
}

export type LoadedFaceDetector = faceDetection.FaceDetector;
export type DetectedFace = faceDetection.Face;

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "/models/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let landmarker: FaceLandmarker | null = null;
let visionPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;

function loadVisionFileset() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(WASM_URL);
  }
  return visionPromise;
}

export function loadFaceLandmarker() {
  if (landmarker) return Promise.resolve(landmarker);

  if (!landmarkerPromise) {
    landmarkerPromise = loadVisionFileset()
      .then((vision) =>
        FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
        }),
      )
      .then((loadedLandmarker) => {
        landmarker = loadedLandmarker;
        return loadedLandmarker;
      })
      .catch((error: unknown) => {
        landmarkerPromise = null;
        throw error;
      });
  }

  return landmarkerPromise;
}

export type LoadedFaceLandmarker = FaceLandmarker;

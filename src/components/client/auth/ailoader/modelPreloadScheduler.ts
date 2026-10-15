import type { FaceMode } from "@/types/api";
import { preloadCameraModels } from "./preloadCameraModels";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const completedModes = new Set<FaceMode>();
const activeModes = new Set<FaceMode>();
const scheduledModes = new Map<FaceMode, () => void>();

export function scheduleCameraModelPreload(mode: FaceMode): () => void {
  if (
    completedModes.has(mode) ||
    activeModes.has(mode) ||
    scheduledModes.has(mode)
  ) {
    return () => undefined;
  }

  const idleWindow = window as IdleWindow;
  let canceled = false;

  const startPreload = () => {
    scheduledModes.delete(mode);
    if (canceled || completedModes.has(mode) || activeModes.has(mode)) return;

    activeModes.add(mode);
    void preloadCameraModels(mode)
      .then(() => {
        completedModes.add(mode);
      })
      .catch((error: unknown) => {
        console.warn(`[FaceModels] Background ${mode} preload failed:`, error);
      })
      .finally(() => {
        activeModes.delete(mode);
      });
  };

  let cancelScheduled: () => void;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(startPreload, {
      timeout: 2_000,
    });
    cancelScheduled = () => idleWindow.cancelIdleCallback?.(handle);
  } else {
    const handle = window.setTimeout(startPreload, 500);
    cancelScheduled = () => window.clearTimeout(handle);
  }

  const cancel = () => {
    if (canceled || activeModes.has(mode)) return;
    canceled = true;
    cancelScheduled();
    scheduledModes.delete(mode);
  };
  scheduledModes.set(mode, cancel);
  return cancel;
}

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export function scheduleIdleModelPreload(
  preload: () => Promise<void>,
  label: string,
) {
  const idleWindow = window as IdleWindow;
  let canceled = false;

  const run = () => {
    if (canceled) return;
    void preload().catch((error: unknown) => {
      console.warn(`[FaceModels] ${label} background preload failed:`, error);
    });
  };

  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(run, { timeout: 1500 });
    return () => {
      canceled = true;
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(run, 500);
  return () => {
    canceled = true;
    window.clearTimeout(handle);
  };
}

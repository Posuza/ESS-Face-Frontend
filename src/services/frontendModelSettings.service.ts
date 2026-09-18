import { API_URL } from "@/config/api.config";
import type { FaceMode, FrontendModel } from "@/types/api";

export const frontendModelSettingsService = {
  async list(mode: FaceMode): Promise<FrontendModel[]> {
    const query = `?mode=${encodeURIComponent(mode)}`;
    const response = await fetch(`${API_URL}/model-settings/frontend${query}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to load face model settings");
    const data = (await response.json()) as { frontend_models?: FrontendModel[] };
    return Array.isArray(data.frontend_models) ? data.frontend_models : [];
  },
};

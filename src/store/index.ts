import { create } from "zustand";

import { createAdminUsersSlice } from "./slices/adminUsersSlice";
import { createAuthSlice } from "./slices/authSlice";
import { createEmployeeSlice } from "./slices/employeeSlice";
import { createFaceActionSlice } from "./slices/faceActionSlice";
import { createFrontendModelSettingsSlice } from "./slices/frontendModelSettingsSlice";
import { createModelSettingsSlice } from "./slices/modelSettingsSlice";
import type { AppState } from "./types";

export const useAppStore = create<AppState>()((...store) => ({
  ...createAuthSlice(...store),
  ...createEmployeeSlice(...store),
  ...createAdminUsersSlice(...store),
  ...createModelSettingsSlice(...store),
  ...createFaceActionSlice(...store),
  ...createFrontendModelSettingsSlice(...store),
}));

export type { AppState };

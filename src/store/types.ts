import type { StateCreator } from "zustand";

import type { AdminUsersSlice } from "./slices/adminUsersSlice";
import type { AuthSlice } from "./slices/authSlice";
import type { EmployeeSlice } from "./slices/employeeSlice";
import type { FaceActionSlice } from "./slices/faceActionSlice";
import type { FrontendModelSettingsSlice } from "./slices/frontendModelSettingsSlice";
import type { ModelSettingsSlice } from "./slices/modelSettingsSlice";

export type AppState = AuthSlice &
  EmployeeSlice &
  AdminUsersSlice &
  ModelSettingsSlice &
  FaceActionSlice &
  FrontendModelSettingsSlice;

export type AppSliceCreator<T> = StateCreator<AppState, [], [], T>;

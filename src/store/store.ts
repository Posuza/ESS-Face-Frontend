import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createSectorReportSlice } from "./Slice/moDailyTransactionSlice";
import type { SectorReportSlice } from "./Slice/moDailyTransactionSlice";
import { createDivisionSlice } from "./Slice/divisionSlice";
import type { DivisionSlice } from "./Slice/divisionSlice";
import { createMoReportPdfExportSlice } from "./Slice/moReportPdfExportSlice";
import type { MoReportPdfExportSlice } from "./Slice/moReportPdfExportSlice";
import { createAuthSlice } from "./Slice/auth";
import type { AuthSlice } from "./Slice/auth";

// Centralize all exports for components to import from a single entry point
export * from "./Slice/moDailyTransactionSlice";
export * from "./Slice/moReportPdfExportSlice";
export * from "./Slice/auth";
export * from "./Slice/divisionSlice";

// set up connect all slice to store
export const useStore = create<
  SectorReportSlice & AuthSlice & DivisionSlice & MoReportPdfExportSlice
>()(
  devtools((...a) => ({
    ...createSectorReportSlice(...a),
    ...createDivisionSlice(...a),
    ...createMoReportPdfExportSlice(...a),
    ...createAuthSlice(...a),
  })),
);

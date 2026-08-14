import type { StateCreator } from "zustand";
import {
  moReportPdfExportService,
  type MoReportExportFilters,
  type MoReportExportJob,
  type MoReportExportType,
} from "../../services/moReportPdfExport.Service";

export interface MoReportPdfExportSlice {
  isPdfExportLoading: boolean;
  pdfExportError: string | null;
  currentPdfExportJob: MoReportExportJob | null;
  downloadMoReportPdfExport: (payload: {
    report_type: MoReportExportType;
    filters: MoReportExportFilters;
    requested_by: string;
  }) => Promise<void>;
}

export const createMoReportPdfExportSlice: StateCreator<
  MoReportPdfExportSlice,
  [],
  [],
  MoReportPdfExportSlice
> = (set) => ({
  isPdfExportLoading: false,
  pdfExportError: null,
  currentPdfExportJob: null,

  downloadMoReportPdfExport: async (payload) => {
    set({
      isPdfExportLoading: true,
      pdfExportError: null,
      currentPdfExportJob: null,
    });
    try {
      const queuedJob = await moReportPdfExportService.queueExport(payload);
      set({ currentPdfExportJob: queuedJob });
      const completedJob = await moReportPdfExportService.waitForExport(
        queuedJob.mo_report_export_job_id,
        (job) => set({ currentPdfExportJob: job }),
      );
      await moReportPdfExportService.downloadExport(completedJob);
      set({ isPdfExportLoading: false, currentPdfExportJob: completedJob });
    } catch (error: any) {
      set({ pdfExportError: error.message, isPdfExportLoading: false });
      throw error;
    }
  },
});

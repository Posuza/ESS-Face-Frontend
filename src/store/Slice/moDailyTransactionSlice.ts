import type { StateCreator } from "zustand";
import {
  sectorReportService,
  type SectorReport,
  type EmployeeTodayReport,
  type DistinctDiscipline,
} from "../../services/moReporTransaction.Service";
import type { AuthEmployee } from "./auth";

export interface SectorReportFilters {
  field_id?: number;
  department_id?: number;
  division_id?: number;
  created_by?: string;
  start_date?: string;
  end_date?: string;
  approved_status?: string;
}

export interface SectorReportSlice {
  reports: SectorReport[];
  currentReport: SectorReport | null;
  isLoading: boolean;
  error: string | null;
  reportCache: Record<string, SectorReport[]>; // Add reportCache to the interface

  fetchReports: (filters?: SectorReportFilters) => Promise<SectorReport[]>;
  clearReports: () => void;
  fetchReportById: (id: number) => Promise<void>;
  createReport: (data: any) => Promise<void>;
  updateReport: (id: number, data: any) => Promise<void>;
  deleteReport: (id: number) => Promise<void>;

  /**
   * Fetch today's existing report for a department + employee.
   * Returns division info (via division_name), disciplines array, and extra discipline-like
   * flat fields (e.g. discipline_other_count, other1_count, …) as
   * key/label/value items.
   */
  fetchEmployeeTodayReport: (
    departmentId: number,
    empCode: string,
  ) => Promise<EmployeeTodayReport>;

  /**
   * Fetch all distinct discipline types (key + label only) from across all reports.
   * Deduplicates by key — no values, no ids.
   */
  fetchDistinctDisciplineTypes: () => Promise<DistinctDiscipline[]>;

  fetchDistinctGuardPostMovementStatuses: () => Promise<string[]>;

  fetchAvailableReportDivisions: (
    departmentId: number,
  ) => Promise<
    { division_id: number; division_name: string; department_id: number }[]
  >;
}

type SectorReportSliceDependencies = {
  authEmployee: AuthEmployee | null;
};

export const createSectorReportSlice: StateCreator<
  SectorReportSlice & SectorReportSliceDependencies,
  [],
  [],
  SectorReportSlice
> = (set) => ({
  reports: [],
  currentReport: null,
  isLoading: false,
  error: null,
  reportCache: {},

  clearReports: () =>
    set({
      reports: [],
      currentReport: null,
      error: null,
      reportCache: {},
    }),

  fetchReports: async (filters?: SectorReportFilters) => {
    const cacheKey = JSON.stringify(filters || {});
    // Bypass cache — always fetch fresh data
    set({ isLoading: true, error: null });
    console.log("SectorReportSlice: Fetching with filters:", filters);
    try {
      const reports = await sectorReportService.getAll(filters);
      // Update cache and state
      set((state) => ({
        reports,
        isLoading: false,
        reportCache: { ...state.reportCache, [cacheKey]: reports },
      }));
      return reports;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchReportById: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const currentReport = await sectorReportService.getById(id);
      set({ currentReport, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createReport: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newReport = await sectorReportService.create(data);
      set((state) => ({
        reports: [newReport, ...state.reports],
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateReport: async (id: number, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedReport = await sectorReportService.update(id, data);
      set((state) => ({
        reports: state.reports.map((r) => (r.id === id ? updatedReport : r)),
        currentReport:
          state.currentReport?.id === id ? updatedReport : state.currentReport,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteReport: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await sectorReportService.delete(id);
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== id),
        currentReport:
          state.currentReport?.id === id ? null : state.currentReport,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchEmployeeTodayReport: async (departmentId, empCode) => {
    set({ isLoading: true, error: null });
    try {
      const result = await sectorReportService.getEmployeeTodayReport(
        departmentId,
        empCode,
      );
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchAvailableReportDivisions: async (departmentId) => {
    set({ isLoading: true, error: null });
    try {
      const result =
        await sectorReportService.getAvailableReportDivisions(departmentId);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchDistinctDisciplineTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await sectorReportService.getDistinctDisciplineTypes();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchDistinctGuardPostMovementStatuses: async () => {
    set({ isLoading: true, error: null });
    try {
      const result =
        await sectorReportService.getDistinctGuardPostMovementStatuses();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
});

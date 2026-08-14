import type { StateCreator } from "zustand";
import {
  divisionService,
  type Division,
} from "../../services/division.Service";

export interface DivisionSlice {
  divisions: Division[];
  divisionsLoading: boolean;

  fetchDivisionsByDepartment: (departmentId: number) => Promise<Division[]>;
}

export const createDivisionSlice: StateCreator<DivisionSlice> = (set) => ({
  divisions: [],
  divisionsLoading: false,

  fetchDivisionsByDepartment: async (departmentId: number) => {
    set({ divisionsLoading: true });
    try {
      const divisions = await divisionService.getByDepartment(departmentId);
      set({ divisions, divisionsLoading: false });
      return divisions;
    } catch (error) {
      set({ divisionsLoading: false });
      throw error;
    }
  },
});

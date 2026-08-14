import { useCallback } from "react";
import { useStore } from "../store/store";
import { buildReportFilters } from "../utils/mo/positionAccess";
import type { SectorReport } from "../services/moReporTransaction.Service";

/**
 * Hook that wraps fetchReports with position-based access control.
 *
 * Field viewers see all child departments, directors see their department,
 * and managers see their division.
 */
export function usePositionReports() {
  const employee = useStore((state) => state.authEmployee);
  const reports = useStore((state) => state.reports);
  const isLoading = useStore((state) => state.isLoading);
  const fetchReports = useStore((state) => state.fetchReports);

  const fetchWithPosition = useCallback(() => {
    if (!employee) return Promise.resolve<SectorReport[]>([]);
    return fetchReports(buildReportFilters(employee));
  }, [employee, fetchReports]);

  return { reports, isLoading, fetchWithPosition };
}

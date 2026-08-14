import type { AuthEmployee } from "../../store/Slice/auth";
import type { SectorReportFilters } from "../../store/Slice/moDailyTransactionSlice";
import { getPositionRankConfig } from "./workflowConfig";
import { getLocalTodayYYYYMMDD } from "./date";

/** Access levels for report data scope. */
export const AccessLevel = {
  /** position 7: see reports in every department under their field */
  FIELD_ONLY: "FIELD_ONLY",
  /** position 1,5: see all reports in their department + can approve */
  DEPARTMENT_ONLY: "DEPARTMENT_ONLY",
  /** position 2,6: see reports in their division only, no approval */
  DIVISION_ONLY: "DIVISION_ONLY",
  /** position 3,4: see only their own reports, no approval */
  OWN_ONLY: "OWN_ONLY",
} as const;

export type AccessLevel = (typeof AccessLevel)[keyof typeof AccessLevel];

/** Determine access level from position_id. */
export function getAccessLevel(positionId?: number | string | null): AccessLevel {
  if (Number(positionId) === 7) return AccessLevel.FIELD_ONLY;
  const rank = getPositionRankConfig(positionId);
  if (!rank) return AccessLevel.OWN_ONLY;
  if (rank.rankLevel === 1) return AccessLevel.DEPARTMENT_ONLY;
  return AccessLevel.DIVISION_ONLY;
}

/** Resolve access using both position and the employee's organization scope. */
export function getEmployeeAccessLevel(
  employee: AuthEmployee | null,
): AccessLevel {
  if (employee?.field_id != null && employee.department_id == null) {
    return AccessLevel.FIELD_ONLY;
  }
  return getAccessLevel(employee?.position_id);
}

/** Whether this position can approve/reject reports. */
export function canApprove(
  positionId?: number | string | null,
  positionIsActive?: boolean,
): boolean {
  // Deactivated positions cannot approve
  if (positionIsActive === false) return false;
  return getAccessLevel(positionId) === AccessLevel.DEPARTMENT_ONLY;
}

export function isAdminRole(roleName?: string | null): boolean {
  return String(roleName ?? "").trim().toLowerCase() === "admin";
}

export function canSeeDepartmentGroup(
  positionId?: number | string | null,
): boolean {
  const level = getAccessLevel(positionId);
  return (
    level === AccessLevel.FIELD_ONLY ||
    level === AccessLevel.DEPARTMENT_ONLY
  );
}

export function canSeeFieldGroup(
  employee: AuthEmployee | null,
): boolean {
  return getEmployeeAccessLevel(employee) === AccessLevel.FIELD_ONLY;
}

export function canManageReports(employee: AuthEmployee | null): boolean {
  return (
    canApprove(employee?.position_id) ||
    isAdminRole(employee?.role_name)
  );
}

/**
 * Whether this position is read-only (can only VIEW reports, never create/edit/delete).
 *
 * Read-only positions: field-wide viewers, positions 3/4, unknown positions,
 * or deactivated positions.
 */
export function isReadOnly(
  positionId?: number | string | null,
  positionIsActive?: boolean,
): boolean {
  // Deactivated positions are always read-only
  if (positionIsActive === false) return true;
  const level = getAccessLevel(positionId);
  return level === AccessLevel.FIELD_ONLY || level === AccessLevel.OWN_ONLY;
}

export function canAccessMoDashboard(employee: AuthEmployee | null): boolean {
  return !!employee && !isReadOnly(employee.position_id);
}

/**
 * Get division scoping filter based on employee role.
 * Director (position 1 or 5) sees all divisions — returns empty filter.
 * Everyone else sees only their own division.
 * If the employee has no division_id, returns -1 to ensure no results.
 */
export function getDivisionScope(employee: AuthEmployee | null): {
  division_id?: number;
} {
  if (!employee) return {};
  const level = getEmployeeAccessLevel(employee);
  if (
    level === AccessLevel.FIELD_ONLY ||
    level === AccessLevel.DEPARTMENT_ONLY
  ) {
    return {};
  }
  if (employee.division_id != null) {
    return { division_id: employee.division_id };
  }
  // No division assigned — return invalid ID so API returns nothing
  return { division_id: -1 };
}

/**
 * Build fetch filters based on employee's position and data.
 *
 * @param employee - The authenticated employee object
 * @param dateRange - Optional start/end date overrides (defaults to today)
 * @returns Filters to pass to fetchReports
 */
export function buildReportFilters(
  employee: AuthEmployee | null,
  dateRange?: { start_date?: string; end_date?: string },
): SectorReportFilters {
  if (!employee) return {};

  const dates = {
    start_date: dateRange?.start_date ?? getLocalTodayYYYYMMDD(),
    end_date: dateRange?.end_date ?? getLocalTodayYYYYMMDD(),
  };

  const level = getEmployeeAccessLevel(employee);

  switch (level) {
    case AccessLevel.FIELD_ONLY:
      return {
        ...dates,
        field_id: employee.field_id ?? -1,
      };

    case AccessLevel.DEPARTMENT_ONLY:
      // See all reports in the department — no extra filters
      return employee.department_id
        ? { ...dates, department_id: employee.department_id }
        : dates;

    case AccessLevel.DIVISION_ONLY:
      // See only their division's reports.
      return {
        ...dates,
        department_id: employee.department_id ?? -1,
        division_id: employee.division_id != null ? employee.division_id : -1,
      };

    case AccessLevel.OWN_ONLY:
      // See only their division's reports.
      return {
        ...dates,
        department_id: employee.department_id ?? -1,
        division_id: employee.division_id != null ? employee.division_id : -1,
      };

    default:
      return dates;
  }
}

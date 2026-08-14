import type { AuthEmployee } from "../../store/Slice/auth";
import type { SectorReport } from "../../services/moReporTransaction.Service";
import { getWorkflowRankByPositionId } from "./workflowConfig";
import { canApprove as hasDepartmentAuthority } from "./positionAccess";
import {
  getNextWorkflowRank,
  getPreviousWorkflowRank,
  makeWorkflowStatus,
  parseWorkflowStatus,
  WorkflowState,
} from "./workflowStatus";

export function getWorkflowRank(
  positionId?: number | string | null,
): string | null {
  return getWorkflowRankByPositionId(positionId);
}

function isLowestWorkflowRank(rankCode: string): boolean {
  return getPreviousWorkflowRank(rankCode) == null;
}

export function canApproveWorkflowStep(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank) return false;
  const { rank: workflowRank, state } = parseWorkflowStatus(
    report?.workflow_status,
  );
  return (
    report?.approved_status === "PENDING" &&
    workflowRank === rank &&
    state === WorkflowState.WAITING &&
    !isLowestWorkflowRank(rank)
  );
}

export function canSendBackWorkflowStep(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank) return false;
  const { rank: workflowRank, state } = parseWorkflowStatus(
    report?.workflow_status,
  );
  return (
    workflowRank === rank &&
    (
      state === WorkflowState.WAITING ||
      state === WorkflowState.RETURNED_TO ||
      state === WorkflowState.APPROVED
    ) &&
    !isLowestWorkflowRank(rank)
  );
}

export function canEditReportContent(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank) return false;
  if (hasDepartmentAuthority(employee?.position_id)) return true;

  const { rank: workflowRank, state } = parseWorkflowStatus(
    report?.workflow_status,
  );
  const isCreator =
    !!employee?.employee_code &&
    report?.created_by === employee.employee_code;

  if (state === WorkflowState.RETURNED_TO) {
    return workflowRank === rank && isCreator;
  }
  if (
    state === WorkflowState.WAITING &&
    isCreator
  ) {
    const nextRank = getNextWorkflowRank(rank);
    return workflowRank === rank || workflowRank === nextRank;
  }
  if (workflowRank !== rank) return false;
  return (
    state === WorkflowState.EDITING &&
    report?.updated_by === employee?.employee_code
  );
}

export const canApproveWorkflow = canApproveWorkflowStep;
export const canSendBackWorkflow = canSendBackWorkflowStep;
export const canEditWorkflow = canEditReportContent;

export function isWorkflowLockedByOther(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const { state } = parseWorkflowStatus(report?.workflow_status);
  return (
    state === WorkflowState.EDITING &&
    !!report?.updated_by &&
    report.updated_by !== employee?.employee_code
  );
}

export function isWorkflowEditingByEmployee(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): boolean {
  const rank = getWorkflowRank(employee?.position_id);
  if (!rank || !employee?.employee_code) return false;
  const { rank: workflowRank, state } = parseWorkflowStatus(
    report?.workflow_status,
  );
  return (
    workflowRank === rank &&
    state === WorkflowState.EDITING &&
    report?.updated_by === employee.employee_code
  );
}

export function getRestoreWorkflowStatus(
  employee: AuthEmployee | null,
  report?: Partial<SectorReport> | null,
): string | null {
  const actorRank = getWorkflowRank(employee?.position_id);
  if (!actorRank) return null;

  const { rank: workflowRank, state } = parseWorkflowStatus(
    report?.workflow_status,
  );
  if (state !== WorkflowState.EDITING) {
    return report?.workflow_status ?? null;
  }

  if (report?.approved_status === "REJECTED") {
    if (report.approved_by === employee?.employee_code) {
      const returnedRank = getPreviousWorkflowRank(actorRank) || actorRank;
      return makeWorkflowStatus(returnedRank, WorkflowState.RETURNED_TO);
    }
    return makeWorkflowStatus(actorRank, WorkflowState.RETURNED_TO);
  }

  if (report?.approved_status === "APPROVED") {
    return makeWorkflowStatus(workflowRank || actorRank, WorkflowState.APPROVED);
  }

  const waitingRank = getNextWorkflowRank(actorRank) || workflowRank || actorRank;
  return makeWorkflowStatus(waitingRank, WorkflowState.WAITING);
}

import {
  getWorkflowRankByPositionId,
  getWorkflowRankLabel as getConfiguredWorkflowRankLabel,
  WORKFLOW_RANKS,
} from "./workflowConfig";

export const WorkflowState = {
  WAITING: "WAITING",
  EDITING: "EDITING",
  RETURNED_TO: "RETURNED_TO",
  APPROVED: "APPROVED",
} as const;

export type WorkflowState = (typeof WorkflowState)[keyof typeof WorkflowState];

export type ParsedWorkflowStatus = {
  rank: string;
  state: string;
};

const workflowPrefixes: Array<[string, WorkflowState]> = [
  ["RETURNED_TO_", WorkflowState.RETURNED_TO],
  ["WAITING_", WorkflowState.WAITING],
  ["EDITING_", WorkflowState.EDITING],
  ["APPROVED_", WorkflowState.APPROVED],
];

function normalizeRank(rankCode?: string | null): string {
  return String(rankCode ?? "").trim().toUpperCase();
}

export function makeWorkflowStatus(rankCode: string, state: string): string {
  const rank = normalizeRank(rankCode);
  const normalizedState = String(state ?? "").trim().toUpperCase();
  if (normalizedState === WorkflowState.WAITING) return `WAITING_${rank}`;
  if (normalizedState === WorkflowState.EDITING) return `EDITING_${rank}`;
  if (normalizedState === WorkflowState.RETURNED_TO) return `RETURNED_TO_${rank}`;
  if (normalizedState === WorkflowState.APPROVED) return `APPROVED_${rank}`;
  return `${normalizedState}_${rank}`;
}

export function parseWorkflowStatus(
  workflowStatus?: string | null,
): ParsedWorkflowStatus {
  const value = String(workflowStatus ?? "").trim().toUpperCase();

  for (const [prefix, state] of workflowPrefixes) {
    if (value.startsWith(prefix)) {
      return { rank: value.slice(prefix.length), state };
    }
  }

  const index = value.lastIndexOf("_");
  if (index < 0) return { rank: "", state: "" };

  const legacyRank = value.slice(0, index);
  const legacyState = value.slice(index + 1);
  if (legacyState === "PENDING") {
    return { rank: legacyRank, state: WorkflowState.WAITING };
  }
  if (legacyState === "REJECTED") {
    return {
      rank: getPreviousWorkflowRank(legacyRank) || legacyRank,
      state: WorkflowState.RETURNED_TO,
    };
  }

  return { rank: legacyRank, state: legacyState };
}

export function parseMoWorkflowStatus(workflowStatus?: string | null): {
  state: string;
  rank: string;
} {
  const { rank, state } = parseWorkflowStatus(workflowStatus);
  return { state, rank };
}

export function getNextWorkflowRank(rankCode?: string | null): string | null {
  const rank = normalizeRank(rankCode);
  const orderedRanks = [...WORKFLOW_RANKS].sort(
    (a, b) => b.rankLevel - a.rankLevel,
  );
  const index = orderedRanks.findIndex((item) => item.rankCode === rank);
  if (index < 0 || index >= orderedRanks.length - 1) return null;
  return orderedRanks[index + 1].rankCode;
}

export function getPreviousWorkflowRank(rankCode?: string | null): string | null {
  const rank = normalizeRank(rankCode);
  const orderedRanks = [...WORKFLOW_RANKS].sort(
    (a, b) => b.rankLevel - a.rankLevel,
  );
  const index = orderedRanks.findIndex((item) => item.rankCode === rank);
  if (index <= 0) return null;
  return orderedRanks[index - 1].rankCode;
}

export function getWorkflowRankLabel(workflowStatus?: string | null): string {
  const { rank } = parseWorkflowStatus(workflowStatus);
  return getConfiguredWorkflowRankLabel(rank);
}

export function getMoWorkflowRankLabel(rank?: string | null): string {
  return getConfiguredWorkflowRankLabel(rank);
}

export function getMoWorkflowRankByPositionId(
  positionId?: number | string | null,
): string {
  return getWorkflowRankByPositionId(positionId) ?? "";
}


export type WorkflowRankCode = string;

export type MoPositionRankConfig = {
  positionId: number;
  positionName: string;
  rankLevel: number;
  rankCode: WorkflowRankCode;
  rankName: string;
};

export type WorkflowRankConfig = {
  rankLevel: number;
  rankCode: WorkflowRankCode;
  rankName: string;
  positionIds: number[];
};

export const MO_POSITION_RANKS: MoPositionRankConfig[] = [
  {
    positionId: 1,
    positionName: "ผู้อำนวยการ",
    rankLevel: 1,
    rankCode: "DIRECTOR",
    rankName: "ผู้อำนวยการ",
  },
  {
    positionId: 5,
    positionName: "รองผู้อำนวยการ",
    rankLevel: 1,
    rankCode: "DIRECTOR",
    rankName: "ผู้อำนวยการ",
  },
  {
    positionId: 2,
    positionName: "ผู้จัดการเขต",
    rankLevel: 2,
    rankCode: "MANAGER",
    rankName: "ผู้จัดการ",
  },
  {
    positionId: 6,
    positionName: "รองผู้จัดการเขต",
    rankLevel: 2,
    rankCode: "MANAGER",
    rankName: "ผู้จัดการ",
  },
];

export const WORKFLOW_RANKS: WorkflowRankConfig[] = Array.from(
  MO_POSITION_RANKS.reduce((rankMap, positionRank) => {
    const current = rankMap.get(positionRank.rankCode);
    if (current) {
      current.positionIds.push(positionRank.positionId);
      return rankMap;
    }

    rankMap.set(positionRank.rankCode, {
      rankLevel: positionRank.rankLevel,
      rankCode: positionRank.rankCode,
      rankName: positionRank.rankName,
      positionIds: [positionRank.positionId],
    });
    return rankMap;
  }, new Map<WorkflowRankCode, WorkflowRankConfig>()).values(),
).sort((a, b) => a.rankLevel - b.rankLevel);

export function normalizePositionId(
  positionId?: number | string | null,
): number | null {
  if (positionId == null || positionId === "") return null;
  const parsed = Number(positionId);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getWorkflowRankByPositionId(
  positionId?: number | string | null,
): WorkflowRankCode | null {
  const normalizedPositionId = normalizePositionId(positionId);
  const positionRank = MO_POSITION_RANKS.find(
    (item) => item.positionId === normalizedPositionId,
  );
  return positionRank?.rankCode ?? null;
}

export function getPositionRankConfig(
  positionId?: number | string | null,
): MoPositionRankConfig | null {
  const normalizedPositionId = normalizePositionId(positionId);
  return (
    MO_POSITION_RANKS.find(
      (item) => item.positionId === normalizedPositionId,
    ) ?? null
  );
}

export function getWorkflowRankConfig(
  rankCode?: string | null,
): WorkflowRankConfig | null {
  const normalizedRank = String(rankCode ?? "").trim().toUpperCase();
  return (
    WORKFLOW_RANKS.find((item) => item.rankCode === normalizedRank) ?? null
  );
}

export function getWorkflowRankLabel(rankCode?: string | null): string {
  const normalizedRank = String(rankCode ?? "").trim().toUpperCase();
  return getWorkflowRankConfig(normalizedRank)?.rankName ?? "ผู้ใช้อื่น";
}

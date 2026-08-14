import {
  getMoWorkflowRankByPositionId,
  getMoWorkflowRankLabel,
  getNextWorkflowRank,
  parseMoWorkflowStatus,
} from "./workflowStatus";

export type MoWorkflowTone = "pending" | "approved" | "rejected";

export type MoWorkflowDisplayStatus = {
  label: string;
  tone: MoWorkflowTone;
  state: string;
  rank: string;
};

type MoWorkflowReport = {
  approved_status?: string | null;
  workflow_status?: string | null;
};

type MoWorkflowViewer = {
  position_id?: number | string | null;
};

function getNextMoWorkflowRank(rank?: string | null) {
  return getNextWorkflowRank(rank) ?? "";
}

function getRoleAwareWaitingLabel(rank: string, viewerRank: string) {
  if (rank === "GM" && viewerRank !== "GM") {
    return viewerRank === "DIRECTOR"
      ? "อนุมัติเรียบร้อยแล้ว"
      : `${getMoWorkflowRankLabel("DIRECTOR")}อนุมัติเรียบร้อยแล้ว`;
  }

  if (rank === viewerRank) {
    return "รอดำเนินการอนุมัติ";
  }

  return `รอ${getMoWorkflowRankLabel(rank)}อนุมัติ`;
}

function getRoleAwareReturnedLabel(rank: string, viewerRank: string) {
  if (rank === viewerRank) {
    return "กรุณาแก้ไขและส่งใหม่";
  }

  if (rank === "DIRECTOR" && viewerRank === "MANAGER") {
    return `${getMoWorkflowRankLabel("DIRECTOR")}อนุมัติเรียบร้อยแล้ว`;
  }

  const returnedByRank = getNextMoWorkflowRank(rank);
  if (returnedByRank) {
    return `${getMoWorkflowRankLabel(returnedByRank)}ส่งกลับให้${getMoWorkflowRankLabel(rank)}แก้ไข`;
  }

  return `ส่งกลับให้${getMoWorkflowRankLabel(rank)}แก้ไข`;
}

function getRoleAwareApprovedLabel(rank: string, viewerRank: string) {
  if (rank === viewerRank) {
    return "อนุมัติเรียบร้อยแล้ว";
  }

  return `${getMoWorkflowRankLabel(rank)}อนุมัติเรียบร้อยแล้ว`;
}

export function getMoWorkflowDisplayStatus(
  report?: MoWorkflowReport | null,
  viewer?: MoWorkflowViewer | null,
): MoWorkflowDisplayStatus {
  const approvedStatus = String(report?.approved_status ?? "PENDING")
    .trim()
    .toUpperCase();
  const { state, rank } = parseMoWorkflowStatus(report?.workflow_status);
  const rankLabel = getMoWorkflowRankLabel(rank);
  const viewerRank = getMoWorkflowRankByPositionId(viewer?.position_id);

  if (state === "WAITING") {
    return {
      label: getRoleAwareWaitingLabel(rank, viewerRank),
      tone: "pending",
      state,
      rank,
    };
  }

  if (state === "EDITING") {
    return {
      label: `${rankLabel}กำลังตรวจสอบแก้ไข`,
      tone: "pending",
      state,
      rank,
    };
  }

  if (state === "RETURNED_TO") {
    return {
      label: getRoleAwareReturnedLabel(rank, viewerRank),
      tone: "rejected",
      state,
      rank,
    };
  }

  if (state === "APPROVED") {
    return {
      label: getRoleAwareApprovedLabel(rank, viewerRank),
      tone: "approved",
      state,
      rank,
    };
  }

  if (approvedStatus === "APPROVED") {
    return {
      label: "อนุมัติเรียบร้อยแล้ว",
      tone: "approved",
      state,
      rank,
    };
  }

  if (approvedStatus === "REJECTED") {
    return {
      label: "รอการดำเนินการแก้ไข",
      tone: "rejected",
      state,
      rank,
    };
  }

  return {
    label: "รอการอนุมัติ",
    tone: "pending",
    state,
    rank,
  };
}


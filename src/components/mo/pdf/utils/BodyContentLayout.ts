import type { Group, GroupItem } from "../constant/SummaryGroups";
import { PDF_EXPORT, PDF_RENDER, PDF_SUMMARY_EXPORT } from "../constant/Variable";
import {
  DetailTableCalculator,
  DivisionTableCalculator,
  SummaryTableCalculator,
} from "./TableCalculator";

export type LayoutMode = "export" | "render" | "summaryExport";
export type TableKind = "division" | "summary" | "detail";

export type SummaryColumn = {
  id: number | string;
  division: string;
  report: any;
};

export type BodyBlock =
  | {
      id: string;
      type: "table";
      groupIndex: number;
      group: Group;
      height: number;
    }
  | {
      id: string;
      type: "detail";
      groupIndex: number;
      title: string;
      items: GroupItem[];
      height: number;
      emptyText?: string;
      itemOffset?: number;
    };

export type BodyLayout = {
  mode: LayoutMode;
  blocks: BodyBlock[];
  columns?: BodyBlock[][];
  bodyWidth: number;
  bodyHeight: number;
  tablesPerRow: number;
  tableWidth: number;
  tableKind: TableKind;
  summaryColumns?: SummaryColumn[];
};

export type BuildBodyLayoutInput = {
  mode: LayoutMode;
  tableKind?: TableKind;
  tablesPerRow?: number;
  tableWidthRatio?: number;
  summaryColumns?: SummaryColumn[];
  groups?: Group[];
  detailSections?: Array<{
    groupIndex: number;
    title: string;
    items: GroupItem[];
    emptyText?: string;
  }>;
};

function getModeConfig(mode: LayoutMode) {
  if (mode === "export") return PDF_EXPORT;
  if (mode === "summaryExport") return PDF_SUMMARY_EXPORT;
  return PDF_RENDER;
}

function getGroupTableHeight(
  tableKind: TableKind,
  group: Group,
  config: typeof PDF_EXPORT | typeof PDF_RENDER | typeof PDF_SUMMARY_EXPORT,
  tableWidth: number,
  summaryColumnCount = 0,
): number {
  return tableKind === "summary"
    ? SummaryTableCalculator.getHeight(
        group,
        config,
        tableWidth,
        summaryColumnCount,
      )
    : DivisionTableCalculator.getHeight(group, config, tableWidth);
}

export function buildBodyContentLayout({
  mode,
  tableKind = "division",
  tablesPerRow,
  tableWidthRatio = 1,
  summaryColumns,
  groups = [],
  detailSections = [],
}: BuildBodyLayoutInput): BodyLayout {
  const config = getModeConfig(mode);
  const resolvedTablesPerRow = tablesPerRow ?? config.table.tablesPerRow;
  const tableGapWidth = Math.max(resolvedTablesPerRow - 1, 0) * config.table.gap;
  const baseTableWidth = (config.page.bodyWidth - tableGapWidth) / resolvedTablesPerRow;
  const tableWidth = baseTableWidth * tableWidthRatio;
  const blocks: BodyBlock[] = [];

  groups.forEach((group, index) => {
    blocks.push({
      id: `table-${group.key}-${index}`,
      type: "table",
      groupIndex: index + 1,
      group,
      height: getGroupTableHeight(
        tableKind,
        group,
        config,
        tableWidth,
        summaryColumns?.length ?? 0,
      ),
    });
  });

  detailSections.forEach((section) => {
    blocks.push({
      id: `detail-${section.groupIndex}`,
      type: "detail",
      groupIndex: section.groupIndex,
      title: section.title,
      items: section.items,
      emptyText: section.emptyText,
      height: DetailTableCalculator.getSectionHeight(section, config, tableWidth),
    });
  });

  return {
    mode,
    blocks,
    bodyWidth: config.page.bodyWidth,
    bodyHeight: config.page.bodyHeight,
    tablesPerRow: resolvedTablesPerRow,
    tableWidth,
    tableKind,
    summaryColumns,
  };
}

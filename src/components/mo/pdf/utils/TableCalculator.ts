import type { Group, GroupItem } from "../constant/SummaryGroups";
import type {
  PDF_EXPORT,
  PDF_RENDER,
  PDF_SUMMARY_EXPORT,
} from "../constant/Variable";

type LayoutConfig =
  | typeof PDF_EXPORT
  | typeof PDF_RENDER
  | typeof PDF_SUMMARY_EXPORT;

export type DetailSection = {
  groupIndex: number;
  title: string;
  items: GroupItem[];
  emptyText?: string;
};

export function getTableHeight(itemCount: number, config: LayoutConfig): number {
  const headerRows = 1;
  const bodyRows = Math.max(itemCount, 1);
  return (headerRows + bodyRows) * config.table.rowHeight;
}

export function getTableWidth(
  config: LayoutConfig,
  tablesPerRow: number = config.table.tablesPerRow,
): number {
  const gaps = Math.max(tablesPerRow - 1, 0) * config.table.gap;
  return (config.page.bodyWidth - gaps) / tablesPerRow;
}

export function getGridRowHeight(heights: number[], config: LayoutConfig): number {
  if (heights.length === 0) return 0;
  return Math.max(...heights) + config.table.gap;
}

export function estimateWrappedLineCount(
  value: string | number | undefined,
  maxCharactersPerLine: number,
): number {
  const text = String(value ?? "-");
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 1;
  const longestWord = normalized
    .split(" ")
    .reduce((max, word) => Math.max(max, Array.from(word).length), 0);
  const visibleLength = Array.from(normalized).length;
  const capacity = Math.max(maxCharactersPerLine, 1);
  return Math.max(
    1,
    Math.ceil(visibleLength / capacity),
    Math.ceil(longestWord / capacity),
  );
}

function characterWidth(config: LayoutConfig): number {
  return config.page.width > 400 ? 4.2 : 1.35;
}

function maxCharactersForWidth(width: number, config: LayoutConfig): number {
  return Math.max(1, Math.floor(width / characterWidth(config)));
}

function rowHeightForText(
  value: string | number | undefined,
  width: number,
  config: LayoutConfig,
): number {
  const lines = estimateWrappedLineCount(value, maxCharactersForWidth(width, config));
  return config.table.rowHeight * lines;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export const SummaryTableCalculator = {
  getHeight(
    group: Group,
    config: LayoutConfig,
    tableWidth = getTableWidth(config),
    columnCount = 0,
  ): number {
    const indexWidth = config.page.width > 400 ? 19 : 7;
    const valueWidth = config.page.width > 400 ? 26 : 10;
    const totalWidth = config.page.width > 400 ? 26 : 10;
    const unitWidth = config.page.width > 400 ? 36 : 12.5;
    const labelWidth =
      tableWidth -
      indexWidth -
      Math.max(columnCount, 0) * valueWidth -
      totalWidth -
      unitWidth;
    const hasItems = group.items.length > 0;
    const headerHeight = config.table.rowHeight * (hasItems ? 2 : 1);
    const rows =
      hasItems
        ? group.items.map((item) =>
            Math.max(
              config.table.rowHeight,
              rowHeightForText(item.label, labelWidth, config),
              rowHeightForText(item.unit, unitWidth, config),
            ),
          )
        : [config.table.rowHeight];

    return headerHeight + sum(rows);
  },

  getTablesPerRow(columnCount: number): number {
    return columnCount >= 5 ? 1 : 2;
  },

  getWidth(config: LayoutConfig, columnCount = 3): number {
    return getTableWidth(config, this.getTablesPerRow(columnCount));
  },

  getGridRowHeight(groups: Group[], config: LayoutConfig): number {
    return getGridRowHeight(
      groups.map((group) => this.getHeight(group, config)),
      config,
    );
  },
};

export const DivisionTableCalculator = {
  getHeight(
    group: Group,
    config: LayoutConfig,
    tableWidth = getTableWidth(config),
  ): number {
    const indexWidth = config.page.width > 400 ? 19 : 7;
    const valueWidth = config.page.width > 400 ? 28 : Math.min(12, tableWidth * 0.18);
    const unitWidth = config.page.width > 400 ? 36 : Math.min(13, tableWidth * 0.22);
    const labelWidth = tableWidth - indexWidth - valueWidth - unitWidth;
    const headerHeight = config.table.rowHeight;
    const rows =
      group.items.length > 0
        ? group.items.map((item) =>
            Math.max(
              config.table.rowHeight,
              rowHeightForText(item.label, labelWidth, config),
              rowHeightForText(item.unit, unitWidth, config),
              rowHeightForText(item.value, valueWidth, config),
            ),
          )
        : [config.table.rowHeight];

    return headerHeight + sum(rows);
  },

  getWidth(config: LayoutConfig): number {
    return getTableWidth(config, config.table.tablesPerRow);
  },

  getGridRowHeight(groups: Group[], config: LayoutConfig): number {
    return getGridRowHeight(
      groups.map((group) => this.getHeight(group, config)),
      config,
    );
  },
};

export const DetailTableCalculator = {
  buildSection(
    groupIndex: number,
    title: string,
    items: GroupItem[] = [],
    emptyText = "<ไม่มีข้อมูล>",
  ): DetailSection {
    return {
      groupIndex,
      title,
      items,
      emptyText,
    };
  },

  getSectionHeight(
    section: DetailSection,
    config: LayoutConfig,
    tableWidth = getTableWidth(config, 1),
  ): number {
    const labelWidth = config.page.width > 400 ? 52 : Math.min(18, tableWidth * 0.18);
    const valueWidth = Math.max(tableWidth - labelWidth, 1);
    const headerHeight = config.table.rowHeight;
    if (section.items.length === 0) {
      return headerHeight + rowHeightForText(section.emptyText, tableWidth, config);
    }
    const itemGap = config.page.width > 400 ? 4 : config.table.gap;

    return (
      headerHeight +
      sum(
        section.items.flatMap((item) => [
          rowHeightForText(item.label, valueWidth, config),
          rowHeightForText(item.detail, valueWidth, config),
          rowHeightForText(item.status, valueWidth, config),
          rowHeightForText(item.note, valueWidth, config),
        ]),
      ) +
      Math.max(section.items.length - 1, 0) * itemGap
    );
  },

  canFitSection(
    section: DetailSection,
    config: LayoutConfig,
    usedHeight: number,
  ): boolean {
    return usedHeight + this.getSectionHeight(section, config) <= config.page.bodyHeight;
  },
};

import { PDF_EXPORT, PDF_RENDER, PDF_SUMMARY_EXPORT } from "../constant/Variable";
import type { BodyBlock, LayoutMode, TableKind } from "./BodyContentLayout";
import {
  DetailTableCalculator,
  DivisionTableCalculator,
  SummaryTableCalculator,
} from "./TableCalculator";

export type PagePlan = {
  pageNumber: number;
  blocks: BodyBlock[];
  columns: BodyBlock[][];
  usedHeight: number;
};

export type PaginateBodyBlocksOptions = {
  columnsPerPage?: number;
  tableKind?: TableKind;
  tableWidth?: number;
  summaryColumnCount?: number;
};

function getModeConfig(mode: LayoutMode) {
  if (mode === "export") return PDF_EXPORT;
  if (mode === "summaryExport") return PDF_SUMMARY_EXPORT;
  return PDF_RENDER;
}

function getTableHeaderRowCount(tableKind: TableKind): number {
  return tableKind === "summary" ? 2 : 1;
}

function getTableBlockHeight(
  block: Extract<BodyBlock, { type: "table" }>,
  tableKind: TableKind,
  config: typeof PDF_EXPORT | typeof PDF_RENDER | typeof PDF_SUMMARY_EXPORT,
  tableWidth: number,
  summaryColumnCount = 0,
): number {
  return tableKind === "summary"
    ? SummaryTableCalculator.getHeight(
        block.group,
        config,
        tableWidth,
        summaryColumnCount,
      )
    : DivisionTableCalculator.getHeight(block.group, config, tableWidth);
}

function withTableItems(
  block: Extract<BodyBlock, { type: "table" }>,
  itemStart: number,
  itemEnd: number,
  tableKind: TableKind,
  config: typeof PDF_EXPORT | typeof PDF_RENDER | typeof PDF_SUMMARY_EXPORT,
  tableWidth: number,
  summaryColumnCount = 0,
): BodyBlock {
  const group = {
    ...block.group,
    items: block.group.items.slice(itemStart, itemEnd),
    _itemOffset: (block.group._itemOffset ?? 0) + itemStart,
  };
  const nextBlock = {
    ...block,
    id: `${block.id}-${itemStart}-${itemEnd}`,
    group,
  };
  return {
    ...nextBlock,
    height: getTableBlockHeight(
      nextBlock,
      tableKind,
      config,
      tableWidth,
      summaryColumnCount,
    ),
  };
}

function withDetailItems(
  block: Extract<BodyBlock, { type: "detail" }>,
  itemStart: number,
  itemEnd: number,
  config: typeof PDF_EXPORT | typeof PDF_RENDER | typeof PDF_SUMMARY_EXPORT,
  tableWidth: number,
): BodyBlock {
  const nextBlock = {
    ...block,
    id: `${block.id}-${itemStart}-${itemEnd}`,
    items: block.items.slice(itemStart, itemEnd),
    itemOffset: (block.itemOffset ?? 0) + itemStart,
  };
  return {
    ...nextBlock,
    height: DetailTableCalculator.getSectionHeight(nextBlock, config, tableWidth),
  };
}

export function paginateBodyBlocks(
  blocks: BodyBlock[],
  mode: LayoutMode,
  options: PaginateBodyBlocksOptions = {},
): PagePlan[] {
  const config = getModeConfig(mode);
  const columnsPerPage = options.columnsPerPage ?? config.table.tablesPerRow;
  const tableKind = options.tableKind ?? "division";
  const tableWidth =
    options.tableWidth ??
    (config.page.bodyWidth -
      Math.max(columnsPerPage - 1, 0) * config.table.gap) /
      columnsPerPage;
  const summaryColumnCount = options.summaryColumnCount ?? 0;
  const pages: PagePlan[] = [];
  let columns: BodyBlock[][] = Array.from({ length: columnsPerPage }, () => []);
  let columnHeights = Array.from({ length: columnsPerPage }, () => 0);
  let columnIndex = 0;

  const flush = () => {
    const pageBlocks = columns.flat();
    if (pageBlocks.length === 0) return;
    pages.push({
      pageNumber: pages.length + 1,
      blocks: pageBlocks,
      columns,
      usedHeight: Math.max(...columnHeights),
    });
    columns = Array.from({ length: columnsPerPage }, () => []);
    columnHeights = Array.from({ length: columnsPerPage }, () => 0);
    columnIndex = 0;
  };

  const moveToNextColumn = () => {
    if (columnIndex < columnsPerPage - 1) {
      columnIndex += 1;
      return;
    }
    flush();
  };

  const pushBlock = (block: BodyBlock) => {
    const gap = columns[columnIndex].length > 0 ? config.table.gap : 0;
    columns[columnIndex].push(block);
    columnHeights[columnIndex] += gap + block.height;
  };

  const placeSimpleBlock = (block: BodyBlock) => {
    const gap = columns[columnIndex].length > 0 ? config.table.gap : 0;
    if (columnHeights[columnIndex] + gap + block.height > config.page.bodyHeight) {
      moveToNextColumn();
    }
    pushBlock(block);
  };

  const placeTableBlock = (block: Extract<BodyBlock, { type: "table" }>) => {
    if (block.group.items.length === 0) {
      placeSimpleBlock(block);
      return;
    }

    if (block.height <= config.page.bodyHeight) {
      placeSimpleBlock(block);
      return;
    }

    let itemStart = 0;
    while (itemStart < block.group.items.length) {
      const gap = columns[columnIndex].length > 0 ? config.table.gap : 0;
      let availableHeight = config.page.bodyHeight - columnHeights[columnIndex] - gap;

      if (availableHeight <= config.table.rowHeight * getTableHeaderRowCount(tableKind)) {
        moveToNextColumn();
        availableHeight = config.page.bodyHeight - columnHeights[columnIndex];
      }

      let itemEnd = itemStart + 1;
      while (itemEnd <= block.group.items.length) {
        const candidate = withTableItems(
          block,
          itemStart,
          itemEnd,
          tableKind,
          config,
          tableWidth,
          summaryColumnCount,
        );
        if (candidate.height > availableHeight && itemEnd > itemStart + 1) {
          itemEnd -= 1;
          break;
        }
        if (candidate.height > availableHeight) break;
        itemEnd += 1;
      }

      const safeItemEnd = Math.min(itemEnd, block.group.items.length);
      pushBlock(
        withTableItems(
          block,
          itemStart,
          safeItemEnd,
          tableKind,
          config,
          tableWidth,
          summaryColumnCount,
        ),
      );
      itemStart = safeItemEnd;

      if (itemStart < block.group.items.length) {
        moveToNextColumn();
      }
    }
  };

  const placeDetailBlock = (block: Extract<BodyBlock, { type: "detail" }>) => {
    if (block.items.length === 0 || block.height <= config.page.bodyHeight) {
      placeSimpleBlock(block);
      return;
    }

    let itemStart = 0;
    while (itemStart < block.items.length) {
      const gap = columns[columnIndex].length > 0 ? config.table.gap : 0;
      let availableHeight = config.page.bodyHeight - columnHeights[columnIndex] - gap;

      if (availableHeight <= config.table.rowHeight) {
        moveToNextColumn();
        availableHeight = config.page.bodyHeight - columnHeights[columnIndex];
      }

      let itemEnd = itemStart + 1;
      while (itemEnd <= block.items.length) {
        const candidate = withDetailItems(
          block,
          itemStart,
          itemEnd,
          config,
          tableWidth,
        );
        if (candidate.height > availableHeight && itemEnd > itemStart + 1) {
          itemEnd -= 1;
          break;
        }
        if (candidate.height > availableHeight) break;
        itemEnd += 1;
      }

      const safeItemEnd = Math.min(itemEnd, block.items.length);
      pushBlock(withDetailItems(block, itemStart, safeItemEnd, config, tableWidth));
      itemStart = safeItemEnd;

      if (itemStart < block.items.length) {
        moveToNextColumn();
      }
    }
  };

  for (const block of blocks) {
    if (block.type === "table") {
      placeTableBlock(block);
    } else {
      placeDetailBlock(block);
    }

    if (columns.flat().length === 0 && pages.length > 0) {
      flush();
    }
  }

  flush();
  return pages;
}

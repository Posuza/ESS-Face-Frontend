import type { jsPDF } from "jspdf";
import { PDF_EXPORT } from "../constant/Variable";
import type { BodyLayout } from "./BodyContentLayout";
import { drawExportDetailTable } from "./ExportDetailTable";
import { drawExportTable } from "./ExportTable";
import { drawExportSummaryTable } from "./ExportSummaryTable";

export type ExportBodyOptions = {
  startX?: number;
  startY?: number;
};

export function drawExportBodyContent(
  doc: jsPDF,
  layout: BodyLayout,
  options: ExportBodyOptions = {},
): number {
  const startX = options.startX ?? PDF_EXPORT.page.paddingLeftRight;
  const startY = options.startY ?? PDF_EXPORT.page.headerHeight;
  const columns =
    layout.columns ??
    Array.from({ length: layout.tablesPerRow }, (_, columnIndex) =>
      layout.blocks.filter((_, blockIndex) => blockIndex % layout.tablesPerRow === columnIndex),
    );
  const usedColumns = columns.filter((column) => column.length > 0);
  const gap = PDF_EXPORT.table.gap;
  const usedWidth =
    usedColumns.length > 0
      ? usedColumns.length * layout.tableWidth +
        Math.max(usedColumns.length - 1, 0) * gap
      : 0;
  const centeredStartX = startX + Math.max(layout.bodyWidth - usedWidth, 0) / 2;
  let maxY = startY;

  usedColumns.forEach((column, columnIndex) => {
    const x = centeredStartX + columnIndex * (layout.tableWidth + gap);
    let y = startY;

    for (const block of column) {
      const finalY =
        block.type === "table"
          ? layout.tableKind === "summary"
            ? drawExportSummaryTable(doc, {
                group: block.group,
                groupIndex: block.groupIndex,
                columns: layout.summaryColumns ?? [],
                x,
                y,
                width: layout.tableWidth,
              })
            : drawExportTable(doc, block.group, block.groupIndex, {
                x,
                y,
                width: layout.tableWidth,
              })
          : drawExportDetailTable(doc, {
              groupIndex: block.groupIndex,
              title: block.title,
              items: block.items,
              emptyText: block.emptyText,
              itemOffset: block.itemOffset,
              x,
              y,
              width: layout.tableWidth,
            });
      y = finalY + gap;
      maxY = Math.max(maxY, finalY);
    }
  });

  return maxY;
}

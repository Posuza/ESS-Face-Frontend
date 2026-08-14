import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Group } from "../constant/SummaryGroups";
import { PDF_EXPORT } from "../constant/Variable";

export type ExportTablePosition = {
  x: number;
  y: number;
  width?: number;
};

function rgb(color: readonly [number, number, number]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

function displayValue(value: string | number | undefined): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? "-");
  if (numericValue === 0) return "-";
  return numericValue.toLocaleString("en-US");
}

function aggregateGuardMovements(items: Group["items"]): Group["items"] {
  const statuses: string[] = [];
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const status = item.status || "-";
    if (!counts.has(status)) statuses.push(status);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });
  return statuses.map((status) => ({
    key: status,
    label: status,
    value: counts.get(status) ?? 0,
    unit: "หน่วยงาน",
  }));
}

export function drawExportTable(
  doc: jsPDF,
  group: Group,
  groupIndex: number,
  position: ExportTablePosition,
): number {
  const tableWidth = position.width ?? PDF_EXPORT.table.width;
  const indexWidth = 7;
  const valueWidth = Math.min(12, tableWidth * 0.18);
  const unitWidth = Math.min(13, tableWidth * 0.22);
  const itemOffset = group._itemOffset ?? 0;
  const displayItems =
    group.key === "guard_movements"
      ? aggregateGuardMovements(group.items)
      : group.items;
  const body =
    displayItems.length > 0
      ? displayItems.map((item, index) => {
          const hasStatusCell = group.key === "meeting" && Boolean(item.status);
          const row: unknown[] = [
            `${groupIndex}.${itemOffset + index + 1}`,
            item.label,
          ];
          if (hasStatusCell) {
            row.push({
              content: PDF_EXPORT.statusLabels[item.status || ""] ?? item.status ?? "-",
              colSpan: 2,
              styles: {
                halign: "center" as const,
                textColor: rgb(
                  PDF_EXPORT.colors.status[
                    item.status as keyof typeof PDF_EXPORT.colors.status
                  ] ?? PDF_EXPORT.colors.text,
                ),
              },
            });
            return row;
          }
          row.push(displayValue(item.value), item.unit ?? "");
          return row;
        })
      : [[{
          content: "<ไม่มีข้อมูล>",
          colSpan: 4,
          styles: { halign: "center" as const, valign: "middle" as const },
        }]];

  autoTable(doc, {
    startY: position.y,
    margin: { left: position.x, right: PDF_EXPORT.page.paddingLeftRight },
    tableWidth,
    head: [[
      {
        content: String(groupIndex),
        styles: { halign: "center" as const, valign: "middle" as const },
      },
      { content: group.title, colSpan: 3 },
    ]],
    body,
    styles: {
      font: PDF_EXPORT.font.family,
      fontSize: PDF_EXPORT.font.size.tableCell,
      minCellHeight: PDF_EXPORT.table.rowHeight,
      cellPadding: {
        top: PDF_EXPORT.table.rowPaddingY,
        right: PDF_EXPORT.table.rowPaddingX,
        bottom: PDF_EXPORT.table.rowPaddingY,
        left: PDF_EXPORT.table.rowPaddingX,
      },
      lineWidth: PDF_EXPORT.table.rowBorderStroke,
      lineColor: rgb(PDF_EXPORT.colors.gridLine),
      textColor: rgb(PDF_EXPORT.colors.text),
    },
    headStyles: {
      fillColor: rgb(PDF_EXPORT.colors.primaryLight),
      textColor: rgb(PDF_EXPORT.colors.text),
      fontStyle: "bold",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: indexWidth, halign: "center" },
      2: { cellWidth: valueWidth, halign: "center" },
      3: { cellWidth: unitWidth, halign: "center" },
    },
  });

  const previous = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  return previous.lastAutoTable?.finalY ?? position.y;
}

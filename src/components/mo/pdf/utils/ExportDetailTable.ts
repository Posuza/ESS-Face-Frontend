import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { GroupItem } from "../constant/SummaryGroups";
import { PDF_EXPORT } from "../constant/Variable";
import { statusLabel, statusRgbColor } from "./SummaryValue";

type ExportDetailTableInput = {
  groupIndex: number;
  title: string;
  items: GroupItem[];
  emptyText?: string;
  x: number;
  y: number;
  width: number;
  itemOffset?: number;
};

function rgb(color: readonly [number, number, number]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

export function drawExportDetailTable(
  doc: jsPDF,
  input: ExportDetailTableInput,
): number {
  const itemRows = input.items.flatMap((item, index) => {
    const rows: unknown[][] = [
      [`${input.groupIndex}.${(input.itemOffset ?? 0) + index + 1}`, { content: item.label, colSpan: 5 }],
      ["รายละเอียด", { content: item.detail || "-", colSpan: 5 }],
      [
        "สถานะ",
        {
          content: statusLabel(item.status),
          colSpan: 5,
          styles: { textColor: statusRgbColor(item.status) },
        },
      ],
      ["หมายเหตุ", { content: item.note || "-", colSpan: 5 }],
    ];

    if (index < input.items.length - 1) {
      rows.push([
        {
          content: "",
          colSpan: 6,
          styles: {
            minCellHeight: PDF_EXPORT.table.gap,
            cellPadding: 0,
            lineWidth: 0,
          },
        },
      ]);
    }

    return rows;
  });
  const body =
    input.items.length === 0
      ? [[{
          content: input.emptyText ?? "<ไม่มีข้อมูล>",
          colSpan: 6,
          styles: { halign: "center" as const, valign: "middle" as const },
        }]]
      : itemRows;

  autoTable(doc, {
    startY: input.y,
    margin: { left: input.x, right: PDF_EXPORT.page.paddingLeftRight },
    tableWidth: input.width,
    head: [[
      {
        content: String(input.groupIndex),
        styles: { halign: "center" as const, valign: "middle" as const },
      },
      { content: input.title, colSpan: 5 },
    ]],
    body,
    styles: {
      font: PDF_EXPORT.font.family,
      fontSize: PDF_EXPORT.font.size.detail,
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
      0: { cellWidth: Math.min(18, input.width * 0.18), halign: "center" },
    },
  });

  const previous = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  return previous.lastAutoTable?.finalY ?? input.y;
}

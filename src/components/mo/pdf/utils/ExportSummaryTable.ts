import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Group } from "../constant/SummaryGroups";
import { PDF_EXPORT } from "../constant/Variable";
import type { SummaryColumn } from "./BodyContentLayout";
import {
  displayTableValue,
  divisionHeaderLabel,
  guardMovementStatusCount,
  itemValue,
  projectStatusCount,
  statusRgbColor,
} from "./SummaryValue";

type ExportSummaryTableInput = {
  group: Group;
  groupIndex: number;
  columns: SummaryColumn[];
  x: number;
  y: number;
  width: number;
};

function rgb(color: readonly [number, number, number]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

export function drawExportSummaryTable(
  doc: jsPDF,
  input: ExportSummaryTableInput,
): number {
  const whiteHeaderStyles = {
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: rgb(PDF_EXPORT.colors.text),
    fontStyle: "bold" as const,
    halign: "center" as const,
    valign: "middle" as const,
  };
  const rows = input.group.items.map((item, index) => {
    const perDivision = input.columns.map((column) => {
      if (input.group.key === "guard_movements") {
        return guardMovementStatusCount(column.report, item.status || item.key);
      }
      if (input.group.key === "meeting" && item.status) {
        return projectStatusCount(column.report, item.status || item.key);
      }
      return itemValue(column.report, input.group.key, item.key);
    });
    const total = perDivision.reduce((sum, value) => sum + (Number(value) || 0), 0);
    return { item, index, perDivision, total };
  });
  const displayRows =
    input.group.key === "meeting"
      ? rows.filter((row) => !row.item.status || row.total > 0)
      : input.group.key === "guard_movements"
        ? rows.filter((row) => row.total > 0)
        : rows;
  const showNoData =
    displayRows.length === 0 ||
    (input.group.key === "discipline" && rows.every((row) => row.total <= 0));
  const itemOffset = input.group._itemOffset ?? 0;
  const NO_W = 7;
  const LOC_W = 10;
  const TOTAL_W = 10;
  const UNIT_W = 12.5;
  const columnStyles: Record<number, Record<string, unknown>> = {
    0: { cellWidth: NO_W, halign: "center" },
  };
  input.columns.forEach((_, index) => {
    columnStyles[index + 2] = { cellWidth: LOC_W, halign: "center" };
  });
  columnStyles[input.columns.length + 2] = {
    cellWidth: TOTAL_W,
    halign: "center",
  };
  columnStyles[input.columns.length + 3] = {
    cellWidth: UNIT_W,
    halign: "center",
  };
  const body = showNoData
    ? [[{ content: "<ไม่มีข้อมูล>", colSpan: input.columns.length + 4, styles: { halign: "center" as const } }]]
    : displayRows.map(({ item, index, perDivision, total }) => [
        `${input.groupIndex}.${itemOffset + index + 1}`,
        {
          content: item.label,
          styles: { textColor: statusRgbColor(item.status) },
        },
        ...perDivision.map(displayTableValue),
        displayTableValue(total),
        item.unit ?? "",
      ]);
  const head = [
    [
      {
        content: String(input.groupIndex),
        styles: { halign: "center" as const, valign: "middle" as const },
      },
      { content: input.group.title, colSpan: input.columns.length + 3 },
    ],
    ...(
      showNoData
        ? []
        : [[
            { content: "หัวข้อ", colSpan: 2, styles: whiteHeaderStyles },
            ...input.columns.map((column) => ({
              content: divisionHeaderLabel(column.division),
              styles: whiteHeaderStyles,
            })),
            { content: "รวม", styles: whiteHeaderStyles },
            { content: "", styles: whiteHeaderStyles },
          ]]
    ),
  ];

  autoTable(doc, {
    startY: input.y,
    margin: { left: input.x, right: PDF_EXPORT.page.paddingLeftRight },
    tableWidth: input.width,
    head,
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
      ...columnStyles,
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.row.index === 1) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.halign = "center";
        data.cell.styles.valign = "middle";
      }
    },
  });

  const previous = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  return previous.lastAutoTable?.finalY ?? input.y;
}

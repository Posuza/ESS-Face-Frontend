import type { GroupItem } from "../constant/SummaryGroups";
import { PDF_RENDER } from "../constant/Variable";
import { Fragment } from "react";
import { statusLabel, statusTextColor } from "./SummaryValue";

type RenderDetailTableProps = {
  groupIndex: number;
  title: string;
  items: GroupItem[];
  emptyText?: string;
  itemOffset?: number;
};

export function RenderDetailTable({
  groupIndex,
  title,
  items,
  emptyText = "<ไม่มีข้อมูล>",
  itemOffset = 0,
}: RenderDetailTableProps) {
  const cellStyle: React.CSSProperties = {
    border: "1px solid #d0d0d0",
    height: PDF_RENDER.table.rowHeight,
    padding: `${PDF_RENDER.table.rowPaddingY}px ${PDF_RENDER.table.rowPaddingX}px`,
    fontSize: PDF_RENDER.font.size.detail,
    lineHeight: "12px",
    letterSpacing: 0,
    verticalAlign: "middle",
  };
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    background: "#d9d9d9",
    fontWeight: 700,
    fontSize: PDF_RENDER.font.size.tableHeader,
  };
  const multilineCellStyle: React.CSSProperties = {
    ...cellStyle,
    whiteSpace: "pre-wrap",
  };

  return (
    <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
      <colgroup>
        <col style={{ width: 52 }} />
        <col />
        <col />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...headerCellStyle, textAlign: "center" }}>
            {groupIndex}
          </th>
          <th
            colSpan={5}
            style={{
              ...headerCellStyle,
              textAlign: "left",
            }}
          >
            {title}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              style={{
                ...cellStyle,
                textAlign: "center",
                verticalAlign: "middle",
              }}
            >
              {emptyText}
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <Fragment key={item.key}>
              <tr>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  {groupIndex}.{itemOffset + index + 1}
                </td>
                <td
                  colSpan={5}
                  style={multilineCellStyle}
                >
                  {item.label}
                </td>
              </tr>
              <tr>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  รายละเอียด
                </td>
                <td
                  colSpan={5}
                  style={multilineCellStyle}
                >
                  {item.detail || "-"}
                </td>
              </tr>
              <tr>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  สถานะ
                </td>
                <td
                  colSpan={5}
                  style={{
                    ...cellStyle,
                    color: statusTextColor(item.status),
                  }}
                >
                  {statusLabel(item.status)}
                </td>
              </tr>
              <tr>
                <td style={{ ...cellStyle, textAlign: "center" }}>
                  หมายเหตุ
                </td>
                <td
                  colSpan={5}
                  style={multilineCellStyle}
                >
                  {item.note || "-"}
                </td>
              </tr>
              {index < items.length - 1 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      height: 4,
                      padding: 0,
                      border: "none",
                    }}
                  />
                </tr>
              )}
            </Fragment>
          ))
        )}
      </tbody>
    </table>
  );
}

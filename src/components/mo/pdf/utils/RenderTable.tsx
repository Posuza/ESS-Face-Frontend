import type { Group } from "../constant/SummaryGroups";
import { PDF_RENDER } from "../constant/Variable";

type RenderTableProps = {
  group: Group;
  groupIndex: number;
};

function statusColor(status?: string): string {
  return status === "danger" ? "#b71c1c" : status === "warning" ? "#ff9800" : "#000";
}

function statusLabel(status?: string): string {
  if (!status) return "-";
  return PDF_RENDER.statusLabels[status] ?? status;
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

export function RenderDivisionTable({ group, groupIndex }: RenderTableProps) {
  const itemOffset = group._itemOffset ?? 0;
  const displayItems =
    group.key === "guard_movements"
      ? aggregateGuardMovements(group.items)
      : group.items;
  const cellStyle: React.CSSProperties = {
    border: "1px solid #d0d0d0",
    height: PDF_RENDER.table.rowHeight,
    padding: `${PDF_RENDER.table.rowPaddingY}px ${PDF_RENDER.table.rowPaddingX}px`,
    fontSize: PDF_RENDER.font.size.tableCell,
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

  return (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        tableLayout: "fixed",
        fontSize: PDF_RENDER.font.size.tableCell,
      }}
    >
      <colgroup>
        <col style={{ width: 19 }} />
        <col />
        <col style={{ width: 28 }} />
        <col style={{ width: 36 }} />
      </colgroup>
      <thead>
        <tr>
          <th
            style={{
              ...headerCellStyle,
              textAlign: "center",
            }}
          >
            {groupIndex}
          </th>
          <th
            colSpan={3}
            style={{
              ...headerCellStyle,
              textAlign: "left",
            }}
          >
            {group.title}
          </th>
        </tr>
      </thead>
      <tbody>
        {displayItems.length === 0 ? (
          <tr>
            <td
              colSpan={4}
              style={{
                ...cellStyle,
                textAlign: "center",
              }}
            >
              {"<ไม่มีข้อมูล>"}
            </td>
          </tr>
        ) : (
          displayItems.map((item, index) => {
            const hasStatusCell = group.key === "meeting" && Boolean(item.status);
            return (
            <tr key={item.key}>
              <td style={{ ...cellStyle, textAlign: "center" }}>
                {groupIndex}.{itemOffset + index + 1}
              </td>
              <td style={cellStyle}>
                {item.label}
              </td>
              {hasStatusCell ? (
                <td
                  colSpan={2}
                  style={{
                    ...cellStyle,
                    color: statusColor(item.status),
                    textAlign: "center",
                  }}
                >
                  {statusLabel(item.status)}
                </td>
              ) : (
                <>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {displayValue(item.value)}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {item.unit ?? ""}
                  </td>
                </>
              )}
            </tr>
          );
          })
        )}
      </tbody>
    </table>
  );
}

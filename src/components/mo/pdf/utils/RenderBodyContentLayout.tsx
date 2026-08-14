import { PDF_RENDER } from "../constant/Variable";
import type { BodyLayout } from "./BodyContentLayout";
import { RenderDetailTable } from "./RenderDetailTable";
import { RenderDivisionTable } from "./RenderTable";
import { RenderSummaryTable } from "./RenderSummaryTable";

type RenderBodyContentLayoutProps = {
  layout: BodyLayout;
};

export function RenderBodyContentLayout({ layout }: RenderBodyContentLayoutProps) {
  const columns =
    layout.columns ??
    Array.from({ length: layout.tablesPerRow }, (_, columnIndex) =>
      layout.blocks.filter((_, blockIndex) => blockIndex % layout.tablesPerRow === columnIndex),
    );
  const usedColumns = columns.filter((column) => column.length > 0);
  const columnGap = PDF_RENDER.table.gap;
  const usedWidth =
    usedColumns.length > 0
      ? usedColumns.length * layout.tableWidth +
        Math.max(usedColumns.length - 1, 0) * columnGap
      : 0;

  const renderBlock = (block: BodyLayout["blocks"][number]) => {
    if (block.type === "table") {
      if (layout.tableKind === "summary") {
        return (
          <RenderSummaryTable
            key={block.id}
            group={block.group}
            groupIndex={block.groupIndex}
            columns={layout.summaryColumns ?? []}
          />
        );
      }
      return (
        <RenderDivisionTable
          key={block.id}
          group={block.group}
          groupIndex={block.groupIndex}
        />
      );
    }

    return (
      <RenderDetailTable
        key={block.id}
        groupIndex={block.groupIndex}
        title={block.title}
        items={block.items}
        emptyText={block.emptyText}
        itemOffset={block.itemOffset}
      />
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${usedColumns.length}, ${layout.tableWidth}px)`,
        gap: columnGap,
        width: usedWidth,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {usedColumns.map((column, index) => (
        <div
          key={`column-${index}`}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: PDF_RENDER.table.gap,
          }}
        >
          {column.map(renderBlock)}
        </div>
      ))}
    </div>
  );
}

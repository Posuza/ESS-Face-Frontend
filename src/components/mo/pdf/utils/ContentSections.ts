import {
  buildGroup2Disciplines,
  buildGroup3Projects,
  buildGroup4GuardMovements,
  groupDefs,
} from "../constant/DivisionGroups";
import {
  buildGroup2ForSummary,
  buildGroup4ForSummary,
  group1,
  group3Static,
  type Group,
  type GroupItem,
} from "../constant/SummaryGroups";
import { buildBodyContentLayout, type BodyLayout, type LayoutMode } from "./BodyContentLayout";
import { paginateBodyBlocks, type PagePlan } from "./PaginationLayout";
import { SummaryTableCalculator } from "./TableCalculator";

export type ContentSection = {
  key: string;
  title: string;
  divisionName?: string;
  layout: BodyLayout;
  pages: PagePlan[];
};

function paginate(layout: BodyLayout): PagePlan[] {
  return paginateBodyBlocks(layout.blocks, layout.mode, {
    columnsPerPage: layout.tablesPerRow,
    tableKind: layout.tableKind,
    tableWidth: layout.tableWidth,
    summaryColumnCount: layout.summaryColumns?.length ?? 0,
  });
}

function getReportDate(report: any): string {
  return report?.report_date
    ? String(report.report_date)
    : report?.created_at
      ? String(report.created_at).slice(0, 10)
      : "";
}

function getApprovedSummaryReports(item: any, reports: any[] = []): any[] {
  const selectedSector = item?.department_id ?? 1;
  const selectedReportDate = getReportDate(item);

  return (reports || []).filter((report: any) => {
    const deptMatch = Number(report?.department_id) === Number(selectedSector);
    const dateMatch =
      !selectedReportDate || getReportDate(report) === selectedReportDate;
    const statusMatch = report?.approved_status === "APPROVED";
    return deptMatch && dateMatch && statusMatch;
  });
}

function getSummaryColumnReports(item: any, reports: any[] = []): any[] {
  const approvedReports = getApprovedSummaryReports(item, reports);
  return approvedReports.length > 0 ? approvedReports : [item];
}

function withDivisionValues(group: Group, report: any): Group {
  return {
    ...group,
    items: group.items.map((item) =>
      item.status || item.value !== undefined
        ? item
        : {
            ...item,
            value: report?.[item.key] ?? 0,
          },
    ),
  };
}

export function buildDivisionTableContentSection(
  mode: LayoutMode,
  item: any,
): ContentSection {
  const groups = [
    ...groupDefs,
    ...buildGroup2Disciplines(item),
    ...buildGroup3Projects(item),
    ...buildGroup4GuardMovements(item),
  ].map((group) => withDivisionValues(group, item));
  const layout = buildBodyContentLayout({
    mode,
    tableKind: "division",
    tablesPerRow: 2,
    groups,
  });

  return {
    key: "division-table",
    title: "division table content section",
    layout,
    pages: paginate(layout),
  };
}

function toProjectItems(report: any): GroupItem[] {
  return ((report as any).projects || []).map((project: any) => ({
    key: project.id ?? project.key ?? String(Math.random()),
    label: project.project_name ?? project.name ?? "-",
    detail: project.detail ?? "",
    status: project.status ?? "warning",
    note: project.note ?? "",
  }));
}

function toGuardMovementItems(report: any): GroupItem[] {
  return buildGroup4GuardMovements(report)[0]?.items ?? [];
}

export function buildDetailContentSection(
  mode: LayoutMode,
  item: any,
  divisionName?: string,
): ContentSection {
  const detailSections = [
    {
      groupIndex: 6,
      title: "รายละเอียด เพิ่มเติม : เข้าพบผู้ว่าจ้าง",
      items: toProjectItems(item),
      emptyText: "<ไม่มีข้อมูล>",
    },
    {
      groupIndex: 7,
      title: "รายละเอียด เพิ่มเติม : การเปลี่ยนแปลงจุดรักษาการณ์",
      items: toGuardMovementItems(item),
      emptyText: "<ไม่มีข้อมูล>",
    },
  ].filter((section) => section.items.length > 0);
  const layout = buildBodyContentLayout({
    mode,
    tableKind: "detail",
    tablesPerRow: 1,
    tableWidthRatio: 0.6,
    detailSections,
  });

  return {
    key: `detail-${divisionName ?? "main"}`,
    title: "detail content section",
    divisionName,
    layout,
    pages: paginate(layout),
  };
}

export function buildSummaryTableContentSection(
  mode: LayoutMode,
  item: any,
  reports: any[] = [],
): ContentSection {
  const approvedReports = getApprovedSummaryReports(item, reports);
  const columnReports = approvedReports.length > 0 ? approvedReports : [item];
  const summaryColumns = columnReports.map((report: any) => ({
    id: report.id || report.mo_daily_transaction_id || report.division_name || "summary",
    division: String(report.division_name ?? "").trim() || "-",
    report,
  }));
  const divisionCount = Math.max(summaryColumns.length, 1);
  const tablesPerRow = SummaryTableCalculator.getTablesPerRow(divisionCount);
  const groups = [
    ...group1,
    ...buildGroup2ForSummary(approvedReports),
    ...group3Static,
    buildGroup4ForSummary(approvedReports),
  ];
  const layout = buildBodyContentLayout({
    mode,
    tableKind: "summary",
    tablesPerRow,
    summaryColumns,
    groups,
  });

  return {
    key: `summary-table-${item?.id ?? "main"}`,
    title: "summary table content section",
    layout,
    pages: paginate(layout),
  };
}

export function buildSummaryDivisionContentSections(
  mode: LayoutMode,
  item: any,
  reports: any[] = [],
): ContentSection[] {
  return getSummaryColumnReports(item, reports).flatMap((report) => {
    const divisionName = String(report?.division_name ?? "").trim() || undefined;
    const tableSection = buildDivisionTableContentSection(mode, report);
    const detailSection = buildDetailContentSection(mode, report, divisionName);
    return [
      {
        ...tableSection,
        key: `division-table-${report?.id ?? report?.mo_daily_transaction_id ?? divisionName}`,
        divisionName,
      },
      detailSection,
    ];
  });
}

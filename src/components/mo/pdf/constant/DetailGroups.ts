// ─────────────────────────────────────────────────────────────
// PDF Detail Section Groups
//
// WHAT BELONGS HERE:
//   - Data shaping helpers for project detail and guard movement detail sections
//   - No rendering, no jsPDF, no autoTable
// ─────────────────────────────────────────────────────────────

export type DetailItem = {
  key: string;
  label: string;
  unit?: string;
  status?: string;
  detail?: string;
  note?: string;
  value?: string | number;
};

export function buildProjectDetailItems(report: any): DetailItem[] {
  const projects = Array.isArray(report?.projects) ? report.projects : [];

  return projects.map((project: any) => ({
    key: project.id ?? project.key ?? String(Math.random()),
    label: project.project_name ?? project.name ?? "-",
    detail: project.detail ?? "",
    status: project.status ?? "warning",
    note: project.note ?? "",
  }));
}

export function buildGuardPostMovementDetailItems(report: any): DetailItem[] {
  const movements = Array.isArray(report?.guard_post_movements)
    ? report.guard_post_movements
    : [];

  return movements.map((movement: any) => ({
    key: movement.name ?? String(Math.random()),
    label: movement.name ?? "-",
    detail: movement.detail ?? "",
    status: movement.status,
    note: movement.note ?? "",
    unit: "หน่วยงาน",
  }));
}

// ─────────────────────────────────────────────────────────────
// Summaries PDF — Group Definitions
//
// WHAT BELONGS HERE:
//   - Static group/item arrays (group1, group2, group3)
//   - No JSX, no rendering, no helpers
//
// WHAT DOES NOT BELONG HERE:
//   - Value calculation helpers → see summaryHelpers.ts
//   - Table rendering JSX → see SummaryTableContent.tsx
//   - Pagination logic
// ─────────────────────────────────────────────────────────────

// ─── Shared types ─────────────────────────────────────────────
export type GroupItem = {
  key: string;
  label: string;
  unit?: string;
  status?: string;
  detail?: string;
  note?: string;
  value?: string | number;
};

export type Group = {
  key: string;
  title: string;
  items: GroupItem[];
  _itemOffset?: number;
};

// ─── Group 1 — Department / Leave / Shift / Training ─────────
// Cross-location summary: values per sub-location shown as columns.
export const group1: Group[] = [
  {
    key: "dept",
    title: "หน่วยงานที่รับผิดชอบ",
    items: [
      {
        key: "dept_guard_post_count",
        label: "จุดรักษาการณ์",
        unit: "หน่วยงาน",
      },
      {
        key: "dept_current_personnel_count",
        label: "กำลังพลปัจจุบัน",
        unit: "คน",
      },
      {
        key: "dept_missing_regular_count",
        label: "ขาดตัวประจำ",
        unit: "หน่วยงาน",
      },
      { key: "dept_missing_personnel_count", label: "ขาดกำลังพล", unit: "คน" },
      {
        key: "dept_recruitment_count",
        label: "รับ รปภ. ใหม่",
        unit: "คน",
      },
      {
        key: "dept_supplement_count",
        label: "จัดกำลังพลเสริมพิเศษ",
        unit: "คน",
      },
      {
        key: "dept_reserve_units_count",
        label: "จำนวนหน่วยงานสำรองเวร",
        unit: "หน่วย",
      },
      {
        key: "dept_reserve_personnel_count",
        label: "จำนวนกำลังพลสำรองเวร",
        unit: "คน",
      },
    ],
  },
  {
    key: "leave",
    title: "การลา",
    items: [
      { key: "leave_personal_count", label: "ลากิจ", unit: "คน" },
      { key: "leave_sick_count", label: "ลาป่วย", unit: "คน" },
      { key: "leave_absent_count", label: "ขาดงาน", unit: "คน" },
      { key: "leave_deserted_count", label: "หนีหาย", unit: "คน" },
      { key: "leave_resigned_count", label: "ลาออก", unit: "คน" },
      { key: "leave_terminated_count", label: "ส่ง รปภ. คืนฝ่ายบริหารงานบุคคล", unit: "คน" },
    ],
  },
  {
    key: "shift",
    title: "การบริหารการควงเวร",
    items: [
      { key: "shift_18_count", label: "18 ชั่วโมง", unit: "คน" },
      { key: "shift_24_count", label: "24 ชั่วโมง", unit: "คน" },
      { key: "shift_36_count", label: "36 ชั่วโมง", unit: "คน" },
    ],
  },
  {
    key: "training",
    title: "อบรมและควบคุมหน้างาน",
    items: [
      {
        key: "training_shift_change_count",
        label: "อบรมเปลี่ยนผลัด",
        unit: "หน่วยงาน",
      },
      {
        key: "training_planned_count",
        label: "อบรมตามแผนงานที่กำหนด",
        unit: "หน่วยงาน",
      },
      {
        key: "training_supervise_onsite_count",
        label: "ควบคุมหน้างาน",
        unit: "หน่วยงาน",
      },
      {
        key: "training_supervise_virtual_simulation_count",
        label: "จำลองสถานการณ์เสมือนจริง",
        unit: "หน่วยงาน",
      },
    ],
  },
];

// ─── Group 2 — Discipline (dynamic from report.disciplines) ─
export function buildGroup2ForSummary(reports: any[]): Group[] {
  const itemsByKey = new Map<string, { key: string; label: string; unit: string }>();

  for (const report of reports || []) {
    const raw = report?.disciplines;
    if (!Array.isArray(raw)) continue;

    for (const d of raw) {
      const label = d.label ?? d.name ?? "-";
      const key = String(d.key ?? label);
      if (!itemsByKey.has(key)) {
        itemsByKey.set(key, { key, label, unit: "คน" });
      }
    }
  }

  return [
    {
      key: "discipline",
      title: "วินัยและการลงโทษ",
      items: Array.from(itemsByKey.values()),
    },
  ];
}

// ─── Group 3 — Project status summary (static structure) ─────
// Uses `status` field instead of a data key; values come from
// counting projects by status via projectStatusCount() helper.
export const group3Static: Group[] = [
  {
    key: "meeting",
    title: "เข้าพบผู้ว่าจ้าง",
    items: [
      {
        key: "employer_number_count",
        label: "เข้าพบผู้ว่าจ้าง",
        unit: "หน่วยงาน",
      },
      {
        key: "employer_problem_count",
        label: "พบปัญหา",
        unit: "หน่วยงาน",
      },
      // { key: "normal", label: "ปกติ", status: "normal", unit: "หน่วยงาน" }, // temporarily disabled
      { key: "warning", label: "ผิดปกติ", status: "warning", unit: "หน่วยงาน" },
      { key: "danger", label: "ฉุกเฉิน", status: "danger", unit: "หน่วยงาน" },
    ],
  },
];

// ─── Group 4 — Guard movement summary (dynamic statuses) ────
// Builds items from unique statuses discovered across all reports.
export function buildGroup4ForSummary(reports: any[]): Group {
  const statusSet = new Set<string>();
  for (const report of reports) {
    const movements = report.guard_post_movements ?? [];
    if (Array.isArray(movements)) {
      for (const m of movements) {
        statusSet.add(m.status);
      }
    }
  }
  const statuses = Array.from(statusSet);
  return {
    key: "guard_movements",
    title: "การเปลี่ยนแปลงจุดรักษาการณ์",
    items: statuses.map((s) => ({
      key: s,
      label: s,
      status: s,
      unit: "หน่วยงาน",
    })),
  };
}

// ─── Group 4 builder for detailed pages ─────────────────────
// Builds a dynamic group from a report's guard_post_movements,
// matching the structure in sectorGroups.ts for SectorTableContent.
// Items carry all fields (detail, note) so they work for both
// the grid table and the paginated detail blocks.
export function buildGroup4GuardMovements(report: any): Group {
  const movements = (report.guard_post_movements ?? []).map((m: any) => ({
    key: m.name ?? String(Math.random()),
    label: m.name ?? "-",
    detail: m.detail ?? "",
    status: m.status,
    note: m.note ?? "",
    unit: "หน่วยงาน",
  }));
  return {
    key: "guard_movements",
    title: "การเปลี่ยนแปลงจุดรักษาการณ์",
    items: movements,
  };
}

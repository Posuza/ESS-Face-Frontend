export interface LabelEntry {
  label: string;
  unit?: string;
}

/** Flat key → { label, unit? } */
export const LABELS: Record<string, LabelEntry> = {
  // ── Group titles ──
  group_dept: { label: "หน่วยงานที่รับผิดชอบ" },
  group_leave: { label: "การลา" },
  group_shift: { label: "การบริหารการควงเวร" },
  group_training: { label: "อบรมและควบคุมหน้างาน" },
  group_discipline: { label: "วินัยและการลงโทษ" },

  // ── Department / Personnel ──
  dept_guard_post_count: { label: "จุดรักษาการณ์", unit: "หน่วยงาน" },
  dept_current_personnel_count: { label: "กำลังพลปัจจุบัน", unit: "คน" },
  dept_missing_regular_count: { label: "ขาดตัวประจำ", unit: "หน่วยงาน" },
  dept_missing_personnel_count: { label: "ขาดกำลังพล", unit: "คน" },
  dept_recruitment_count: { label: "รับ รปภ. ใหม่", unit: "คน" },
  dept_supplement_count: { label: "จัดกำลังพลเสริมพิเศษ", unit: "คน" },
  dept_reserve_units_count: { label: "จำนวนหน่วยงานสำรองเวร", unit: "หน่วย" },
  dept_reserve_personnel_count: { label: "จำนวนกำลังพลสำรองเวร", unit: "คน" },

  // ── Leave ──
  leave_personal_count: { label: "ลากิจ", unit: "คน" },
  leave_sick_count: { label: "ลาป่วย", unit: "คน" },
  leave_absent_count: { label: "ขาดงาน", unit: "คน" },
  leave_deserted_count: { label: "หนีหาย", unit: "คน" },
  leave_resigned_count: { label: "ลาออก", unit: "คน" },
  leave_terminated_count: { label: "ส่ง รปภ. คืนฝ่ายบริหารงานบุคคล", unit: "คน" },

  // ── Shift ──
  shift_18_count: { label: "18 ชั่วโมง", unit: "คน" },
  shift_24_count: { label: "24 ชั่วโมง", unit: "คน" },
  shift_36_count: { label: "36 ชั่วโมง", unit: "คน" },

  // ── Training ──
  training_shift_change_count: { label: "อบรมเปลี่ยนผลัด", unit: "หน่วยงาน" },
  training_planned_count: { label: "อบรมตามแผนงานที่กำหนด", unit: "หน่วยงาน" },
  training_supervise_onsite_count: { label: "ควบคุมหน้างาน", unit: "หน่วยงาน" },
  training_supervise_virtual_simulation_count: { label: "จำลองสถานการณ์เสมือนจริง", unit: "หน่วยงาน" },

  // ── Discipline (Group2 — also used for dynamic items) ──
  discipline_sleeping_on_duty_count: { label: "หลับเวร", unit: "คน" },
  discipline_abandoning_post_count: { label: "ทิ้งจุด", unit: "คน" },
  discipline_absent_work_count: { label: "ขาดงาน", unit: "คน" },
  discipline_early_leaved_duty_count: { label: "ออกเวรก่อนเวลา", unit: "คน" },
  discipline_using_phone_on_duty_count: { label: "เล่นโทรศัพท์", unit: "คน" },
  discipline_client_complained_count: { label: "ผู้ว่าจ้างตำหนิ", unit: "คน" },
  discipline_improper_attire_count: { label: "แต่งการไม่เรียบร้อย", unit: "คน" },
  discipline_failed_write_report_count: { label: "ไม่เขียนรายงาน", unit: "คน" },
  discipline_early_write_report_count: { label: "เขียนรายงานล่วงหน้า", unit: "คน" },
  discipline_using_drugs_on_duty_count: { label: "ดื่ม/มีกลิ่นสุรา ขณะทำงาน", unit: "คน" },
};

/* ── Helpers ── */

/** Get label with trailing colon (for display in forms). */
export function labelColon(key: string): string {
  const e = LABELS[key];
  return e ? `${e.label} :` : key;
}

/** Lookup a key — returns fallback if not found (for dynamic Group3 items). */
export function lookup(key: string): LabelEntry {
  return LABELS[key] ?? { label: key, unit: "" };
}

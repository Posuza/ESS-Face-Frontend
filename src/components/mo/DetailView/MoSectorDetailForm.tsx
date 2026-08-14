import React, { useEffect, useMemo } from "react";
import styles from "./MoSummariesForm.module.css";
import { useStore } from "../../../store/store";

type Props = {
  onCancel?: () => void;
  selectedTransactionId?: number | null;
};

interface GroupItem {
  key: string;
  label: string;
  unit?: string;
}

interface Group {
  key: string;
  title: string;
  items: GroupItem[];
}

const fieldLabel = (label: string) => `${label} :`;

export default function MoSectorDetailForm(props: Props) {
  const { fetchReportById, currentReport, reports } = useStore();

  useEffect(() => {
    if (props.selectedTransactionId) {
      fetchReportById(props.selectedTransactionId);
    }
  }, [props.selectedTransactionId, fetchReportById]);

  const reportData =
    currentReport?.id === props.selectedTransactionId
      ? currentReport
      : ((reports ?? []).find((r) => r.id === props.selectedTransactionId) ??
        null);

  const rd = reportData as unknown as Record<string, unknown> | null;

  // ── Static group definitions (same keys as MoSummariesForm) ─────────────
  const group1: Group[] = [
    {
      key: "1",
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
        {
          key: "dept_missing_personnel_count",
          label: "ขาดกำลังพล",
          unit: "คน",
        },
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
      key: "2",
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
      key: "3",
      title: "การบริหารการควงเวร",
      items: [
        { key: "shift_18_count", label: "18 ชั่วโมง", unit: "คน" },
        { key: "shift_24_count", label: "24 ชั่วโมง", unit: "คน" },
        { key: "shift_36_count", label: "36 ชั่วโมง", unit: "คน" },
      ],
    },
    {
      key: "4",
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

  // ── Dynamic group2: disciplines ──────────────────────────────────────────
  const group2: Group[] = useMemo(() => {
    if (!reportData) return [];
    const disciplines = (reportData as any).disciplines || [];
    const items: GroupItem[] = disciplines.map((d: any) => ({
      key: d.key,
      label: d.label,
      unit: "คน",
    }));
    return [{ key: "5", title: "วินัยและการลงโทษ", items }];
  }, [reportData]);

  // ── Check if any discipline value is non-zero ──────────────────────────
  const hasDisciplineValues = useMemo(() => {
    const disciplines = (reportData as any)?.disciplines || [];
    if (disciplines.length === 0) return false;
    return disciplines.some((d: any) => Number(d.value) > 0);
  }, [reportData]);

  // ── Dynamic group3: projects ─────────────────────────────────────────────
  const group3: Group[] = useMemo(() => {
    if (!reportData) return [];
    const projects = (reportData as any).projects || [];
    const items: GroupItem[] = projects.map((p: any) => ({
      key: `proj_${p.id}`,
      label: p.project_name ?? p.name ?? "-",
      unit: "หน่วยงาน",
    }));
    return [{ key: "6", title: "เข้าพบผู้ว่าจ้าง", items }];
  }, [reportData]);

  // ── Dynamic group4: guard post movements ──────────────────────────────────
  const movementsList = useMemo(() => {
    if (!reportData) return [];
    return ((reportData as any).guard_post_movements || []).map((m: any) => ({
      name: m.name ?? m.project_name ?? "-",
      detail: m.detail ?? "",
      status: m.status ?? "",
      note: m.note ?? "",
    }));
  }, [reportData]);

  // ── Value resolver ───────────────────────────────────────────────────────
  const getVal = (fieldKey: string): string => {
    if (!rd) return "0";
    if (fieldKey.startsWith("discipline_")) {
      const disc = ((rd.disciplines as any[]) || []).find(
        (d) => d.key === fieldKey,
      );
      return String(disc ? Number(disc.value) || 0 : 0);
    }
    if (fieldKey.startsWith("proj_")) {
      const projId = fieldKey.replace("proj_", "");
      const proj = ((rd.projects as any[]) || []).find((p) => p.id === projId);
      return proj ? "1" : "0";
    }
    return String(Number(rd[fieldKey]) || 0);
  };

  // ── Render one group table ───────────────────────────────────────────────
  const renderGroupTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => (
    <div className={styles["mo-table-wrapper"]} key={g.key}>
      <table className={styles["mo-table"]}>
        <thead>
          <tr>
            <th
              colSpan={1}
              className={`${styles["first-column-cell"]} ${styles["no-border"]} ${headerClass}`}
            >
              {groupIdx + 1}.
            </th>
            <th
              colSpan={3}
              className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
            >
              <div className={styles["mo-header"]}>
                <p>{g.title}</p>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {g.items.map((item, itemIdx) => (
            <tr key={item.key}>
              <td className={styles["first-column-cell"]}>
                {groupIdx + 1}.{itemIdx + 1}
              </td>
              <td className={styles["second-column-cell"]}>
                {fieldLabel(item.label)}
              </td>
              <td className={styles["third-column-cell"]}>
                <div className={styles["third-column-text"]}>
                  {getVal(item.key)}
                </div>
              </td>
              <td className={`${styles["fourth-column-cell"]} ${cellClass}`}>
                {item.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Project group: show status label instead of count ───────────────────
  const renderProjectTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
  ) => {
    if (!rd) return null;
    const projects = (rd.projects as any[]) || [];
    const employerRows = [
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
    ];

    const statusLabel = (s: string) => {
      if (s === "warning") return "ผิดปกติ";
      if (s === "danger") return "ฉุกเฉิน";
      return "ผิดปกติ";
    };

    return (
      <div className={styles["mo-table-wrapper"]} key={g.key}>
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={1}
                className={`${styles["first-column-cell"]} ${styles["no-border"]} ${headerClass}`}
              >
                {groupIdx + 1}.
              </th>
              <th
                colSpan={3}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>{g.title}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {employerRows.map((item, idx) => (
              <tr key={item.key}>
                <td className={styles["first-column-cell"]}>
                  {groupIdx + 1}.{idx + 1}
                </td>
                <td className={styles["second-column-cell"]}>
                  {fieldLabel(item.label)}
                </td>
                <td className={styles["third-column-cell"]}>
                  <div className={styles["third-column-text"]}>
                    {getVal(item.key)}
                  </div>
                </td>
                <td
                  className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-success"]}`}
                >
                  {item.unit}
                </td>
              </tr>
            ))}
            {projects.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={styles["empty-table-cell"]}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                    border: "0.8px solid #ccc",
                  }}
                >
                  ไม่มีข้อมูลโครงการ
                </td>
              </tr>
            ) : (
              projects.map((p: any, idx: number) => (
                <tr key={p.id}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{idx + employerRows.length + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>
                    {p.project_name ?? p.name ?? "-"}
                  </td>
                  <td
                    className={styles["group3-third-column-cell"]}
                  >
                    {(() => {
                      const key =
                        p.status === "normal" ? "warning" : p.status || "warning";
                      return (
                        <span
                          className={`${styles["status-badge"]} ${styles[`status-${key}`]}`}
                        >
                          {statusLabel(key)}
                        </span>
                      );
                    })()}
                  </td>
                  <td
                    className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-success"]}`}
                  >
                    หน่วยงาน
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Guard post movement table renderer ──────────────────────────────────
  const renderGuardPostTable = (groupIdx: number, headerClass: string) => {
    const movements = movementsList;

    return (
      <div className={styles["mo-table-wrapper"]} key="guard_post_movement">
        <table className={styles["mo-table"]}>
          <thead>
            <tr>
              <th
                colSpan={1}
                className={`${styles["first-column-cell"]} ${styles["no-border"]} ${headerClass}`}
              >
                {groupIdx + 1}.
              </th>
              <th
                colSpan={3}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>การเปลี่ยนแปลงจุดรักษาการณ์</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={styles["empty-table-cell"]}
                  style={{
                    textAlign: "center",
                    verticalAlign: "middle",
                    border: "0.8px solid #ccc",
                  }}
                >
                  ไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์
                </td>
              </tr>
            ) : (
              movements.map((m: any, idx: number) => (
                <tr key={idx}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{idx + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>{m.name}</td>
                  <td className={styles["group3-third-column-cell"]}>
                    {m.status || "-"}
                  </td>
                  <td
                    className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-success"]}`}
                  >
                    หน่วยงาน
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ── Loading / no data ────────────────────────────────────────────────────
  if (!reportData) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  // ── Meta info row (division + date + status) ─────────────────────────────
  const sub = (() => {
    const val = String(rd?.division_name ?? "");
    const m = val.match(/เขต\s+[\d.]+/);
    return m ? m[0] : val || "-";
  })();
  const reportDate =
    (rd?.report_date as string) ||
    ((rd?.created_at as string)?.slice(0, 10) ?? "-");
  const status = (rd?.approved_status as string) || "PENDING";

  const statusBg: Record<string, string> = {
    approved: "#0277bd",
    pending: "#ff9800",
    rejected: "#b71c1c",
    reject: "#b71c1c",
  };
  const statusTh: Record<string, string> = {
    approved: "ดำเนินการแล้ว",
    pending: "รอการดำเนินการ",
    rejected: "รอการดำเนินการแก้ไข",
    reject: "รอการดำเนินการแก้ไข",
  };
  const statusKey = status.toLowerCase();

  return (
    <div className={styles["guts-Mo-layout"]}>
      <div className={styles["mo-tables-wrapper"]}>
        {/* ── Data groups ── */}
        {group1.map((g, idx) => renderGroupTable(g, idx, "", ""))}

        {hasDisciplineValues
          ? group2.map((g, idx) =>
              renderGroupTable(
                g,
                group1.length + idx,
                styles["mo-table-header-red"],
                styles["fourth-column-cell-danger"],
              ),
            )
          : (
              <div className={styles["mo-table-wrapper"]} key="no-discipline">
                <table className={styles["mo-table"]}>
                  <thead>
                    <tr>
                      <th
                        colSpan={1}
                        className={`${styles["first-column-cell"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                      >
                        5.
                      </th>
                      <th
                        colSpan={3}
                        className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                      >
                        <div className={styles["mo-header"]}>
                          <p>วินัยและการลงโทษ</p>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={4}
                        className={styles["empty-table-cell"]}
                        style={{
                          textAlign: "center",
                          border: "0.8px solid #ccc",
                        }}
                      >
                        ไม่มีข้อมูลวินัยและการลงโทษ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

        {group3.map((g, idx) =>
          renderProjectTable(
            g,
            group1.length + group2.length + idx,
            styles["mo-table-header-green"],
          ),
        )}

        {/* Group 4 — การเปลี่ยนแปลงจุดรักษาการณ์ */}
        {movementsList.length > 0 &&
          renderGuardPostTable(
            group1.length + group2.length + group3.length,
            styles["mo-table-header-green"],
          )}
      </div>
    </div>
  );
}

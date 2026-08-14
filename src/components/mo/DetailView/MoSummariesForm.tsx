import React, { useEffect, useMemo } from "react";
import styles from "./MoSummariesForm.module.css";
import { useStore } from "../../../store/store";

export type EmployeeDepartment = {
  id: number;
  department: string;
  divisions: string[];
};

type Props = {
  onCancel?: () => void;
  selectedDivision?: string;
  empCode?: string;
  departments?: EmployeeDepartment[];
  departmentId?: number | null;
  selectedDate?: string;
};

interface GroupItem {
  key: string;
  label: string;
  unit?: string;
  status?: string;
}

interface Group {
  key: string;
  title: string;
  items: GroupItem[];
}

interface StatusOption {
  label: string;
  key: string;
}

const fieldLabel = (label: string) => `${label} :`;
const shouldFormatFieldLabel = (groupKey: string) =>
  ["dept", "leave", "shift", "training", "discipline"].includes(groupKey);
const splitVisibleChars = (value: string) => {
  const chars: string[] = [];
  for (const ch of Array.from(value)) {
    if (/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(ch) && chars.length > 0) {
      chars[chars.length - 1] += ch;
    } else {
      chars.push(ch);
    }
  }
  return chars;
};
const divisionHeaderLabel = (division: string | undefined) => {
  const name = String(division ?? "").trim();
  const m = name.match(/เขต\s+[\d.]+/);
  if (m) return m[0];

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => splitVisibleChars(w)[0] ?? "")
      .join("");
  }

  const chars = splitVisibleChars(name);
  return chars.length > 6
    ? `${chars.slice(0, 2).join("")}..${chars.slice(-2).join("")}`
    : name;
};

export default function MoSummariesForm(props: Props) {
  const { authEmployee, fetchReports, reports, isLoading } = useStore();

  // ── Fetch reports on mount / when filters change ─────────────────────────
  useEffect(() => {
    const filters: {
      department_id?: number;
      start_date?: string;
      end_date?: string;
    } = {};

    if (props.departmentId != null) {
      filters.department_id = props.departmentId;
    } else if (authEmployee?.department_id) {
      filters.department_id = authEmployee.department_id;
    }

    if (props.selectedDate) {
      filters.start_date = props.selectedDate;
      filters.end_date = props.selectedDate;
    }

    fetchReports(filters);
  }, [props.departmentId, props.selectedDate, authEmployee?.department_id]);

  // ── Derive departments from fetched reports ────────────────────────────────
  const derivedDepartments: EmployeeDepartment[] = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    (reports || []).forEach((r) => {
      const id = Number(r.department_id) || 0;
      const sub = (r.division_name || "").trim();
      if (!map[id]) map[id] = new Set();
      if (sub) map[id].add(sub);
    });
    return Object.keys(map).map((k) => ({
      id: Number(k),
      department: `Department ${k}`,
      divisions: Array.from(map[k]),
    }));
  }, [reports]);

  const departments =
    props.departments && props.departments.length > 0
      ? props.departments
      : derivedDepartments;

  const selectedSector = useMemo(() => {
    return (
      props.departmentId ??
      authEmployee?.department_id ??
      departments[0]?.id ??
      1
    );
  }, [props.departmentId, authEmployee?.department_id, departments]);

  // ── Static group definitions ─────────────────────────────────────────────
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

  // ── Filter reports matching selected sector + date ───────────────────────
  // Each report = one division_name's submission for that day
  const sectorReports = useMemo(() => {
    return (reports || [])
      .filter((r) => {
        const deptMatch = Number(r.department_id) === Number(selectedSector);
        const dateMatch = props.selectedDate
          ? r.report_date === props.selectedDate ||
            (r.created_at &&
              new Date(r.created_at).toISOString().slice(0, 10) ===
                props.selectedDate)
          : true;
        const approvalMatch = r.approved_status === "APPROVED";
        return deptMatch && dateMatch && approvalMatch;
      })
      .map((r) => ({
        ...r,
        division_name: String(r.division_name ?? "").trim(),
      }));
  }, [reports, selectedSector, props.selectedDate]);

  // ── Column list: one column per division_name report ─────────────────────
  const cols = useMemo(() => {
    // deduplicate by division_name, keeping first occurrence
    const seen = new Set<string>();
    return sectorReports.filter((r) => {
      const divisionName = String(r.division_name ?? "").trim();
      if (seen.has(divisionName)) return false;
      seen.add(divisionName);
      return true;
    });
  }, [sectorReports]);

  // ── Helper: get numeric value for a field key from a specific report ─────
  const getVal = (
    report: (typeof sectorReports)[0],
    fieldKey: string,
  ): number => {
    // group5 disciplines (dynamic array)
    if (fieldKey.startsWith("discipline_")) {
      const disc = report.disciplines?.find((d) => d.key === fieldKey);
      return disc ? Number(disc.value) || 0 : 0;
    }
    return Number((report as any)[fieldKey]) || 0;
  };

  // ── Derive dynamic group2 (วินัยและการลงโทษ) from disciplines in reports ─
  const group2: Group[] = useMemo(() => {
    const disciplineMap = new Map<string, { key: string; label: string }>();
    sectorReports.forEach((r) => {
      (r.disciplines || []).forEach((d) => {
        console.log("📌 DISCIPLINE found:", d.key, d.label, d.value);
        if (!disciplineMap.has(d.key)) {
          disciplineMap.set(d.key, { key: d.key, label: d.label });
        }
      });
    });
    console.log(
      "📊 group2 disciplineMap size:",
      disciplineMap.size,
      "items:",
      Array.from(disciplineMap.keys()),
    );

    const items: GroupItem[] = Array.from(disciplineMap.values()).map((d) => ({
      key: d.key,
      label: d.label,
      unit: "คน",
    }));

    return [{ key: "5", title: "วินัยและการลงโทษ", items }];
  }, [sectorReports]);

  // ── Derive dynamic group3 (เข้าพบผู้ว่าจ้าง) from projects in reports ────
  const group3: Group[] = useMemo(() => {
    const projectMap = new Map<
      string,
      { id: string; label: string; status: string }
    >();
    sectorReports.forEach((r) => {
      (r.projects || []).forEach((p) => {
        console.log("📌 PROJECT found:", p.id, p.name, p.status, p.detail);
        if (!projectMap.has(p.id)) {
          projectMap.set(p.id, {
            id: p.id,
            label: p.project_name ?? p.name ?? "-",
            status: p.status === "normal" ? "warning" : p.status || "warning",
          });
        }
      });
    });
    console.log(
      "📊 group3 projectMap size:",
      projectMap.size,
      "items:",
      Array.from(projectMap.keys()),
    );

    const items: GroupItem[] = Array.from(projectMap.values()).map((p) => ({
      key: `proj_${p.id}`,
      label: p.label,
      unit: "หน่วยงาน",
      status: p.status,
    }));

    return [{ key: "6", title: "เข้าพบผู้ว่าจ้าง", items }];
  }, [sectorReports]);

  // ── Helper: get project value for a column report ────────────────────────
  const getProjectVal = (
    report: (typeof sectorReports)[0],
    projId: string,
  ): { value: number; status: string } => {
    const proj = report.projects?.find((p) => p.id === projId);
    return {
      value: proj ? 1 : 0,
      status: proj?.status === "normal" ? "warning" : proj?.status ?? "warning",
    };
  };

  // ── Render a single summary table section ────────────────────────────────
  const renderGroupTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => {
    const headerColSpan = cols.length + 4;
    const shouldShowNoData =
      g.key === "5" &&
      !g.items.some((item) =>
        cols.some((c) => {
          const report = sectorReports.find(
            (r) => r.division_name === c.division_name,
          );
          return report ? getVal(report, item.key) > 0 : false;
        }),
      );

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
                colSpan={headerColSpan}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>{g.title}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Column headers */}
            <tr>
              <td colSpan={2} className={styles["second-column-header-cell"]}>
                หัวข้อ
              </td>
              {cols.map((c) => (
                <td
                  key={c.division_name}
                  className={styles["third-column-header1-cell"]}
                >
                  {divisionHeaderLabel(c.division_name)}
                </td>
              ))}
              <td className={styles["third-column-header2-cell"]}>รวม</td>
              <td className={styles["fourth-column-header-cell"]} />
            </tr>

            {/* Data rows */}
            {shouldShowNoData ? (
              <tr>
                <td
                  colSpan={headerColSpan}
                  className={styles["empty-table-cell"]}
                  style={{
                    textAlign: "center",
                    border: "0.8px solid #ccc",
                  }}
                >
                  ไม่มีข้อมูลวินัยและการลงโทษ
                </td>
              </tr>
            ) : (
              g.items.map((item, itemIdx) => {
              const isProject = item.key.startsWith("proj_");
              const projId = isProject ? item.key.replace("proj_", "") : "";

              const perLocVals = cols.map((c) => {
                const report = sectorReports.find(
                  (r) => r.division_name === c.division_name,
                );
                if (!report) return 0;
                if (isProject) return getProjectVal(report, projId).value;
                return getVal(report, item.key);
              });

              const total = perLocVals.reduce((a, v) => a + v, 0);

              return (
                <tr key={item.key}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{itemIdx + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>
                    {shouldFormatFieldLabel(g.key)
                      ? fieldLabel(item.label)
                      : item.label}
                  </td>

                  {perLocVals.map((val, i) => (
                    <td
                      key={i}
                      className={`${styles["third-column-cell"]} ${
                        String(val).length > 4
                          ? styles["third-column-wrap-cell"]
                          : ""
                      }`}
                    >
                      <div className={styles["third-column-text"]}>
                        {String(val)}
                      </div>
                    </td>
                  ))}

                  <td className={styles["third-column-cell"]}>
                    <div className={styles["third-column-text"]}>
                      {String(total)}
                    </div>
                  </td>

                  <td
                    className={`${styles["fourth-column-cell"]} ${cellClass}`}
                  >
                    {item.unit}
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPrjectTable = (
    g: Group,
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => {
    const headerColSpan = cols.length + 4;
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

    // ── Status helpers ─────────────────────────────────────────────────
    const statusLabel = (s: string): string => {
      if (s === "warning") return "ผิดปกติ";
      if (s === "danger") return "ฉุกเฉิน";
      return "ผิดปกติ";
    };

    // Collect all unique status types from all projects across all reports
    const allStatuses = new Set<string>();
    sectorReports.forEach((r) => {
      (r.projects || []).forEach((p) => {
        allStatuses.add(p.status === "normal" ? "warning" : p.status || "warning");
      });
    });
    const statusTypes = Array.from(allStatuses);

    // For each division_name, count projects by status
    const perLocCounts: Record<string, number>[] = cols.map((c) => {
      const report = sectorReports.find(
        (r) => r.division_name === c.division_name,
      );
      const counts: Record<string, number> = {};
      statusTypes.forEach((s) => (counts[s] = 0));
      if (report) {
        (report.projects || []).forEach((p) => {
          const s = p.status === "normal" ? "warning" : p.status || "warning";
          counts[s] = (counts[s] || 0) + 1;
        });
      }
      return counts;
    });

    // Total counts across all division_names
    const totalCounts = perLocCounts.reduce<Record<string, number>>(
      (acc, loc) => {
        Object.entries(loc).forEach(([s, c]) => {
          acc[s] = (acc[s] || 0) + c;
        });
        return acc;
      },
      {},
    );

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
                colSpan={headerColSpan}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>{g.title}</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Column headers */}
            <tr>
              <td colSpan={2} className={styles["second-column-header-cell"]}>
                <strong>หัวข้อ</strong>
              </td>
              {cols.map((c) => (
                <td
                  key={c.division_name}
                  className={styles["third-column-header1-cell"]}
                >
                  <strong>{divisionHeaderLabel(c.division_name)}</strong>
                </td>
              ))}
              <td className={styles["third-column-header2-cell"]}>รวม</td>
              <td className={styles["fourth-column-header-cell"]} />
            </tr>

            {employerRows.map((item, idx) => {
              const perLocVals = cols.map((c) => {
                const report = sectorReports.find(
                  (r) => r.division_name === c.division_name,
                );
                return Number((report as any)?.[item.key]) || 0;
              });
              const total = perLocVals.reduce((acc, val) => acc + val, 0);

              return (
                <tr key={item.key}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{idx + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>
                    {fieldLabel(item.label)}
                  </td>
                  {perLocVals.map((val, i) => (
                    <td key={i} className={styles["group3-third-column-cell"]}>
                      <span>{val}</span>
                    </td>
                  ))}
                  <td className={styles["third-column-cell"]}>
                    <div className={styles["third-column-text"]}>{total}</div>
                  </td>
                  <td className={`${styles["fourth-column-cell"]} ${cellClass}`}>
                    {item.unit}
                  </td>
                </tr>
              );
            })}

            {/* Data rows — one row per status type */}
            {statusTypes.length === 0 ? (
              <tr>
                <td
                  colSpan={headerColSpan}
                  className={styles["empty-table-cell"]}
                  style={{
                    textAlign: "center",
                    border: "0.8px solid #ccc",
                  }}
                >
                  ไม่มีข้อมูลโครงการ
                </td>
              </tr>
            ) : (
              statusTypes.map((status, idx) => (
                <tr key={status}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{idx + employerRows.length + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>
                    <span
                      className={`${styles["status-badge"]} ${styles[`status-${status}`]}`}
                    >
                      {statusLabel(status)}
                    </span>
                  </td>

                  {perLocCounts.map((counts, i) => (
                    <td key={i} className={styles["group3-third-column-cell"]}>
                      <span>{counts[status]}</span>
                    </td>
                  ))}

                  <td className={styles["third-column-cell"]}>
                    <div className={styles["third-column-text"]}>
                      {totalCounts[status] || 0}
                    </div>
                  </td>

                  <td className={`${styles["fourth-column-cell"]} ${cellClass}`}>
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

  // ── Guard post movement table renderer (summary view, status-grouped) ──
  const renderGuardPostTable = (
    groupIdx: number,
    headerClass: string,
    cellClass: string,
  ) => {
    const headerColSpan = cols.length + 4;

    const statusLabel = (s: string): string => {
      if (s === "normal") return "ปกติ";
      if (s === "warning") return "ผิดปกติ";
      if (s === "danger") return "ฉุกเฉิน";
      return s;
    };

    // Collect all unique status types from guard_post_movements across all reports
    const allStatuses = new Set<string>();
    sectorReports.forEach((r) => {
      ((r as any).guard_post_movements || []).forEach((m: any) => {
        allStatuses.add(m.status || "normal");
      });
    });
    const statusTypes = Array.from(allStatuses);

    // For each division_name, count guard post movements by status
    const perLocCounts: Record<string, number>[] = cols.map((c) => {
      const report = sectorReports.find(
        (r) => r.division_name === c.division_name,
      );
      const counts: Record<string, number> = {};
      statusTypes.forEach((s) => (counts[s] = 0));
      if (report) {
        ((report as any).guard_post_movements || []).forEach((m: any) => {
          const s = m.status || "normal";
          counts[s] = (counts[s] || 0) + 1;
        });
      }
      return counts;
    });

    // Total counts across all division_names
    const totalCounts = perLocCounts.reduce<Record<string, number>>(
      (acc, loc) => {
        Object.entries(loc).forEach(([s, c]) => {
          acc[s] = (acc[s] || 0) + c;
        });
        return acc;
      },
      {},
    );

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
                colSpan={headerColSpan}
                className={`${styles["mo-table-header"]} ${headerClass} ${styles["no-border"]}`}
              >
                <div className={styles["mo-header"]}>
                  <p>การเปลี่ยนแปลงจุดรักษาการณ์</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Column headers */}
            <tr>
              <td colSpan={2} className={styles["second-column-header-cell"]}>
                <strong>หัวข้อ</strong>
              </td>
              {cols.map((c) => (
                <td
                  key={c.division_name}
                  className={styles["third-column-header1-cell"]}
                >
                  <strong>{divisionHeaderLabel(c.division_name)}</strong>
                </td>
              ))}
              <td className={styles["third-column-header2-cell"]}>รวม</td>
              <td className={styles["fourth-column-header-cell"]} />
            </tr>

            {/* Data rows — one row per status type */}
            {statusTypes.length === 0 ? (
              <tr>
                <td
                  colSpan={headerColSpan}
                  className={styles["empty-table-cell"]}
                  style={{
                    textAlign: "center",
                    border: "0.8px solid #ccc",
                  }}
                >
                  ไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์
                </td>
              </tr>
            ) : (
              statusTypes.map((status, idx) => (
                <tr key={status}>
                  <td className={styles["first-column-cell"]}>
                    {groupIdx + 1}.{idx + 1}
                  </td>
                  <td className={styles["second-column-cell"]}>
                    {statusLabel(status)}
                  </td>

                  {perLocCounts.map((counts, i) => (
                    <td key={i} className={styles["group3-third-column-cell"]}>
                      <span className={styles["guard-post-count"]}>
                        {counts[status]}
                      </span>
                    </td>
                  ))}

                  <td className={styles["third-column-cell"]}>
                    <div className={styles["third-column-text"]}>
                      {totalCounts[status] || 0}
                    </div>
                  </td>

                  <td className={`${styles["fourth-column-cell"]} ${cellClass}`}>
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

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={styles["guts-Mo-layout"]}>
        <p style={{ padding: "1rem" }}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles["guts-Mo-layout"]}>
      <div className={styles["mo-tables-wrapper"]}>
        {/* Group 1 — หน่วยงานที่รับผิดชอบ / การลา / ควงเวร / อบรม */}
        {group1.map((g, idx) => renderGroupTable(g, idx, "", ""))}

        {/* Group 2 — วินัยและการลงโทษ (red) */}
        {group2.map((g, idx) =>
          renderGroupTable(
            g,
            group1.length + idx,
            styles["mo-table-header-red"],
            styles["fourth-column-cell-danger"],
          ),
        )}

        {/* Group 3 — เข้าพบผู้ว่าจ้าง (status) */}
        {group3.map((g, idx) =>
          renderPrjectTable(
            g,
            group1.length + group2.length + idx,
            styles["mo-table-header-green"],
            styles["fourth-column-cell-success"],
          ),
        )}

        {/* Group 4 — การเปลี่ยนแปลงจุดรักษาการณ์ */}
        {renderGuardPostTable(
          group1.length + group2.length + group3.length,
          styles["mo-table-header-green"],
          styles["fourth-column-cell-success"],
        )}

        {/* Notes — read-only from last matching report */}
        {(() => {
          const lastReport = sectorReports[sectorReports.length - 1];
          return lastReport ? null : null; // extend here if notes are added to SectorReport type
        })()}
      </div>
    </div>
  );
}

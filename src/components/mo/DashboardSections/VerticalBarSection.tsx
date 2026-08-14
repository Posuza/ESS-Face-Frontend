import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./VerticalBarSection.css";
import caseData from "@/temp_data/case.json";

const WEAR_SERIES = [
  { key: "hat", label: "หมวก", color: "#f27a18" } /* Strongest Orange */,
  { key: "shirt", label: "เสื้อ", color: "#f49a42" } /* Lighter */,
  { key: "pants", label: "กางเกง", color: "#f6b56b" } /* Even Lighter */,
  { key: "shoes", label: "รองเท้า", color: "#f8cc95" } /* Lightest */,
];

const ISSUES_SERIES = [
  {
    key: "sleep",
    label: "นอนหลับ",
    color: "#e11d48",
  } /* Strongest Rose/Pink */,
  { key: "phone", label: "โทรศัพท์", color: "#f43f5e" } /* Lighter */,
  { key: "no_card", label: "ไม่มีบัตร", color: "#fb7185" } /* Even Lighter */,
  { key: "warning", label: "คำเตือน", color: "#fda4af" } /* Lightest */,
];
const report_SERIES = [
  { key: "approve", label: "อนุมัติ", color: "#e11d48" },
  { key: "pending", label: "รออนุมัติ", color: "#f43f5e" },
  { key: "reject", label: "ไม่อนุมัติ", color: "#fb7185" },
];

const leave_SERIES = [
  {
    key: "sick",
    label: "ป่วย",
    color: "#0f766e",
  } /* Teal gradient for leaves */,
  { key: "business", label: "ลากิจ", color: "#0d9488" },
  { key: "other", label: "ลาอื่นๆ", color: "#14b8a6" },
  { key: "absent", label: "ขาด", color: "#2dd4bf" },
];

const shift_SERIES = [
  { key: "shift18", label: "ผลัด 18", color: "#5b21b6" }, /* Violet gradient for shifts */
  { key: "shift24", label: "ผลัด 24", color: "#7c3aed" },
  { key: "shift36", label: "ผลัด 36", color: "#a78bfa" },
];

const tabLabels = ["สถานะ", "การลา", "เครื่องแต่งกาย", "ผิดข้อปฏิบัติ", "ผลัด"];

const monthOptions = [
  { value: "รายเดือน", label: "รายเดือน" },
  ...Array.from({ length: 12 }).map((_, i) => ({
    value: i,
    label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(
      new Date(2020, i, 1),
    ),
  })),
];

export default function VerticalBar() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number | null>(
    now.getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<number>(1);

  const availableYears = useMemo(() => {
    const years = new Set(
      (caseData as any[])
        .map((e: any) =>
          new Date(e.updated_at || e.created_at || "").getFullYear(),
        )
        .filter((y) => !isNaN(y)),
    );
    return Array.from(years).sort((a: any, b: any) => b - a) as number[];
  }, []);

  const availableSectors = useMemo(() => {
    const sectors = new Set(
      (caseData as any[]).map((r: any) => r.department_id).filter(Boolean),
    );
    return Array.from(sectors).sort() as string[];
  }, []);

  const data = useMemo(() => {
    const filtered = (caseData as any[]).filter((r: any) => {
      const d = new Date(r.updated_at || r.created_at || "");
      if (isNaN(d.getTime())) return true;
      if (selectedYear !== null && d.getFullYear() !== selectedYear)
        return false;
      if (selectedMonth !== null && d.getMonth() !== selectedMonth)
        return false;
      if (selectedDay !== null && d.getDate() !== selectedDay) return false;
      if (selectedSector !== "all" && r.department_id !== selectedSector)
        return false;
      return true;
    });

    const totals = { hat: 0, shirt: 0, pants: 0, shoes: 0 };
    const issueTotals = { sleep: 0, phone: 0, no_card: 0, warning: 0 };
    const reportTotals = { approve: 0, pending: 0, reject: 0 };
    const leaveTotals = { sick: 0, business: 0, other: 0, absent: 0 };
    const shiftTotals = { shift18: 0, shift24: 0, shift36: 0 };

    filtered.forEach((r: any) => {
      totals.hat += r.wear_hat_count || 0;
      totals.shirt += r.wear_shirt_count || 0;
      totals.pants += r.wear_pant_count || 0;
      totals.shoes += r.wear_shoe_count || 0;

      issueTotals.sleep += r.rule_sleep_count || 0;
      issueTotals.phone += r.rule_use_phone_count || 0;
      issueTotals.no_card += r.rule_no_card_count || 0;
      issueTotals.warning +=
        r.warning && String(r.warning).trim() !== "" ? 1 : 0;

      leaveTotals.sick += r.leave_sick_count || 0;
      leaveTotals.business += r.leave_business_count || 0;
      leaveTotals.other += r.leave_other_count || 0;
      leaveTotals.absent += r.absent_count || 0;

      shiftTotals.shift18 += r.shift_18_count || 0;
      shiftTotals.shift24 += r.shift_24_count || 0;
      shiftTotals.shift36 += r.shift_36_count || 0;

      const status = r.approved_status?.toLowerCase();
      if (status === "approved" || status === "approve")
        reportTotals.approve += 1;
      else if (status === "rejected" || status === "reject")
        reportTotals.reject += 1;
      else reportTotals.pending += 1;
    });

    const activeLabel = tabLabels[activeTab - 1];

    if (activeLabel === "สถานะ") {
      return report_SERIES.map((s) => ({
        group: s.label,
        value: reportTotals[s.key as keyof typeof reportTotals],
        color: s.color,
      }));
    } else if (activeLabel === "ผิดข้อปฏิบัติ") {
      return ISSUES_SERIES.map((s) => ({
        group: s.label,
        value: issueTotals[s.key as keyof typeof issueTotals],
        color: s.color,
      }));
    } else if (activeLabel === "การลา") {
      return leave_SERIES.map((s) => ({
        group: s.label,
        value: leaveTotals[s.key as keyof typeof leaveTotals],
        color: s.color,
      }));
    } else if (activeLabel === "ผลัด") {
      return shift_SERIES.map((s) => ({
        group: s.label,
        value: shiftTotals[s.key as keyof typeof shiftTotals],
        color: s.color,
      }));
    } else {
      return WEAR_SERIES.map((s) => ({
        group: s.label,
        value: totals[s.key as keyof typeof totals],
        color: s.color,
      }));
    }
  }, [selectedYear, selectedMonth, selectedDay, selectedSector, activeTab]);

  return (
    <div className="mo-verticalbar">
      <div className=" verticalbar-controls">
        {/* Sector selector */}
        <select
          className="chart-pill-select location-select"
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
        >
          <option value="all">ทุกภาค</option>
          {availableSectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="time-select">
          {/* Year selector */}
          <select
            className="chart-pill-select time-select-first"
            value={selectedYear ?? "รายปี"}
            onChange={(e) => {
              if (e.target.value === "รายปี") {
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDay(null);
              } else setSelectedYear(Number(e.target.value));
            }}
          >
            <option value="รายปี">รายปี</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y + 543}
              </option>
            ))}
          </select>
          {/* Month selector */}
          <select
            className="chart-pill-select time-select-mid"
            value={selectedMonth ?? "รายเดือน"}
            onChange={(e) => {
              if (e.target.value === "รายเดือน") {
                setSelectedMonth(null);
                setSelectedDay(null);
              } else setSelectedMonth(Number(e.target.value));
            }}
            disabled={selectedYear === null}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* day selector */}
          <select
            className="chart-pill-select time-select-last"
            value={selectedDay ?? "รายวัน"}
            onChange={(e) => {
              if (e.target.value === "รายวัน") setSelectedDay(null);
              else setSelectedDay(Number(e.target.value));
            }}
            disabled={selectedMonth === null}
          >
            <option value="รายวัน">รายวัน</option>
            {selectedYear !== null && selectedMonth !== null
              ? Array.from(
                  {
                    length: new Date(
                      selectedYear,
                      selectedMonth + 1,
                      0,
                    ).getDate(),
                  },
                  (_, i) => i + 1,
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))
              : null}
          </select>
        </div>
      </div>
      <div className="verticalbar-card">
        <div className="verticalbar-header">
          <div className="tab-labels" role="tablist" aria-label="Totals tabs">
            {tabLabels.map((label, i) => (
              <button
                key={label}
                className={`tab-button ${activeTab === i + 1 ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === i + 1}
                onClick={() => setActiveTab(i + 1)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="tab-panel">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 10, left: -20, bottom: 8 }}
              barCategoryGap="35%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="group"
                tick={{ fontSize: 12, fill: "#8884d8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8884d8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(v: any) => [v, "จำนวน"]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

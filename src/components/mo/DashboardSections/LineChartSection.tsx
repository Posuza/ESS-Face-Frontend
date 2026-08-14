import React, { useMemo, useState } from "react";
import "./LineChartSection.css";
import LineChart from "./charts/LineChart";
import caseData from "@/temp_data/case.json";

export default function LineChartSection() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number | null>(
    now.getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [timeRange, setTimeRange] = useState<string>("last_12h");

  // derive groupBy automatically from selections
  const groupBy =
    selectedYear === null ? "year" : selectedMonth === null ? "month" : "day";
  const year = selectedYear ?? now.getFullYear();
  const month = selectedMonth ?? now.getMonth();

  const monthOptions = [
    { value: "all", label: "ทุกเดือน" },
    ...Array.from({ length: 12 }).map((_, i) => ({
      value: i,
      label: new Intl.DateTimeFormat("th-TH", { month: "short" }).format(
        new Date(2020, i, 1),
      ),
    })),
  ];

  const availableYears = useMemo(() => {
    const years = new Set(
      (caseData as any[]).map((e: any) =>
        new Date(e.updated_at || e.created_at).getFullYear(),
      ),
    );
    return Array.from(years).sort((a: any, b: any) => b - a);
  }, []);

  // Color registries per tab to keep Totals cards and chart in sync
  const PALETTES: Record<number, string[]> = {
    // กิจกรรม: use blue, teal
    1: ["#1e6fb3", "#2b9aa3"],
    // ข้อมูลอื่นๆ: use blue, red, teal (order controls series color assignment)
    2: ["#2b9aa3", "#3fb374", "#f59e2e", "#e76b6b"],
  };

  const colorPalette = PALETTES[activeTab] || [
    "#1e6fb3",
    "#2b9aa3",
    "#3fb374",
    "#f59e2e",
    "#e76b6b",
  ];

  const chartResult = useMemo(() => {
    const now = new Date();
    // Group definitions: aggregate multiple fields into high-level series
    const groups = [
      { key: "leave", test: (k: string) => /^leave_/.test(k) },
      { key: "shift", test: (k: string) => /^shift_/.test(k) },
      { key: "rule", test: (k: string) => /^rule_/.test(k) },
      { key: "wear", test: (k: string) => /^wear_/.test(k) },
    ];

    const map = new Map();

    // derive a date filter from `timeRange` if set
    let rangeStart: Date | null = null;
    if (timeRange === "last_24h") {
      rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === "last_12h") {
      rangeStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    } else if (timeRange === "today") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === "this_week") {
      const day = now.getDay();
      const diff = (day + 6) % 7; // Monday as start
      rangeStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diff,
      );
    } else if (timeRange === "this_month") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === "this_year") {
      rangeStart = new Date(now.getFullYear(), 0, 1);
    }

    caseData.forEach((entry) => {
      const d = new Date(entry.updated_at || entry.created_at);
      // timeRange filter takes precedence when set
      if (rangeStart && d < rangeStart) return;
      if (rangeStart && d > now) return; // also exclude future entries
      if (!rangeStart) {
        // original filtering based on year/month/day selectors
        if (groupBy === "month" || groupBy === "day") {
          if (d.getFullYear() !== Number(year)) return;
        }
        if (groupBy === "day") {
          if (d.getMonth() !== Number(month)) return;
        }
      }

      let key = "";
      // override groupBy based on timeRange
      const effectiveGroupBy =
        timeRange === "last_24h" ||
        timeRange === "last_12h" ||
        timeRange === "today"
          ? "hour"
          : timeRange === "this_week" || timeRange === "this_month"
            ? "day"
            : timeRange === "this_year"
              ? "month"
              : groupBy;
      if (effectiveGroupBy === "year") key = String(d.getFullYear());
      else if (effectiveGroupBy === "month")
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      else if (effectiveGroupBy === "hour") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}`;
      } else {
        // day
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }

      const prev: any = map.get(key) || {};

      // compute grouped values for this entry
      const grouped: Record<string, number> = {};
      groups.forEach((g) => (grouped[g.key] = 0));
      // ensure locations counter is initialized so it gets included in totals
      grouped.locations = 0;

      // aggregate fields into groups
      Object.keys(entry).forEach((field) => {
        const val = Number((entry as any)[field]) || 0;
        groups.forEach((g) => {
          if (g.test(field) && typeof val === "number") grouped[g.key] += val;
        });
      });

      // warning: count non-empty warning strings
      if (entry.warning && String(entry.warning).trim() !== "")
        grouped.warning = (grouped.warning || 0) + 1;
      else grouped.warning = grouped.warning || 0;

      // removed aggregation for other_counts, other_job, other_training, absent

      // combine rule + warning into a single 'issues' series
      grouped.issues = (grouped.rule || 0) + (grouped.warning || 0);
      // track unique locations per group using a Set on the running totals
      if (!prev._locationsSet) prev._locationsSet = new Set();
      if (entry.department_id)
        prev._locationsSet.add(String(entry.department_id));

      // ensure prev has numeric keys and add grouped values into totals (skip 'locations' placeholder)
      Object.keys(grouped).forEach((gk) => {
        if (gk === "locations") return;
        if (prev[gk] == null) prev[gk] = 0;
        prev[gk] += grouped[gk];
      });

      map.set(key, prev);
    });

    // Fill missing periods so chart shows complete sequence
    const ensureAllPeriods = () => {
      const fullKeys: string[] = [];
      // Determine effective grouping for filling periods
      const effectiveGroupBy =
        timeRange === "last_24h" ||
        timeRange === "last_12h" ||
        timeRange === "today"
          ? "hour"
          : timeRange === "this_week" || timeRange === "this_month"
            ? "day"
            : timeRange === "this_year"
              ? "month"
              : groupBy;

      if (effectiveGroupBy === "year") {
        // Show all available years
        availableYears.forEach((y) => fullKeys.push(String(y)));
      } else if (effectiveGroupBy === "month") {
        // Show all 12 months for selected year
        for (let m = 0; m < 12; m++) {
          const key = `${year}-${String(m + 1).padStart(2, "0")}`;
          fullKeys.push(key);
        }
      } else if (effectiveGroupBy === "hour") {
        // For hour grouping, show last 24 hours or today's hours
        if (timeRange === "last_24h") {
          for (let i = 23; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 60 * 60 * 1000);
            const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}-${String(t.getHours()).padStart(2, "0")}`;
            fullKeys.push(key);
          }
        } else if (timeRange === "last_12h") {
          for (let i = 11; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 60 * 60 * 1000);
            const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}-${String(t.getHours()).padStart(2, "0")}`;
            fullKeys.push(key);
          }
        } else if (timeRange === "today") {
          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const hours = now.getHours();
          for (let h = 0; h <= hours; h++) {
            const key = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, "0")}-${String(todayStart.getDate()).padStart(2, "0")}-${String(h).padStart(2, "0")}`;
            fullKeys.push(key);
          }
        }
      } else {
        // day grouping: either full month days, or last 7 days for this_week
        if (timeRange === "this_week") {
          // last 7 days starting from Monday
          const start = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          const day = start.getDay();
          const diff = (day + 6) % 7;
          const monday = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate() - diff,
          );
          for (let i = 0; i < 7; i++) {
            const t = new Date(
              monday.getFullYear(),
              monday.getMonth(),
              monday.getDate() + i,
            );
            const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
            fullKeys.push(key);
          }
        } else if (timeRange === "this_month") {
          const lastDay = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
          ).getDate();
          for (let d = 1; d <= lastDay; d++) {
            const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            fullKeys.push(key);
          }
        } else {
          // existing behavior: all days in selected month
          const lastDay = new Date(
            Number(year),
            Number(month) + 1,
            0,
          ).getDate();
          for (let d = 1; d <= lastDay; d++) {
            const dayKey = `${year}-${String(Number(month) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            fullKeys.push(dayKey);
          }
        }
      }

      // Add missing keys with zero values
      fullKeys.forEach((k) => {
        if (!map.has(k)) {
          map.set(k, {
            leave: 0,
            shift: 0,
            rule: 0,
            wear: 0,
            issues: 0,
            warning: 0,
            locations: 0,
            _locationsSet: new Set(),
          });
        }
      });
    };

    ensureAllPeriods();

    const data = Array.from(map.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by original key FIRST
      .map(([k, v]: any) => {
        // convert _locationsSet to a numeric 'locations' count
        const locationsCount = v._locationsSet
          ? v._locationsSet.size
          : v.locations || 0;
        // format group label based on effective grouping
        let label = k;
        const effectiveGroupBy =
          timeRange === "last_24h" ||
          timeRange === "last_12h" ||
          timeRange === "today"
            ? "hour"
            : timeRange === "this_week" || timeRange === "this_month"
              ? "day"
              : timeRange === "this_year"
                ? "month"
                : groupBy;
        if (effectiveGroupBy === "month") {
          // "2026-02" → "Feb"
          const [y, m] = k.split("-");
          label = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
            new Date(Number(y), Number(m) - 1, 1),
          );
        } else if (effectiveGroupBy === "day" && timeRange === "this_week") {
          // Format as weekday name for week view
          const [y, m, d_val] = k.split("-");
          label = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
            new Date(Number(y), Number(m) - 1, Number(d_val)),
          );
        } else if (effectiveGroupBy === "day") {
          // "2026-02-01" → "1"
          const [, , day] = k.split("-");
          label = String(Number(day)); // Remove leading zero (01 → 1)
        } else if (effectiveGroupBy === "hour") {
          const parts = k.split("-");
          const hour = parts[3] ?? "00";
          // show hour label as HH:00 for clarity
          label = `${String(Number(hour)).padStart(2, "0")}:00`;
        }
        const copy = { group: label, ...v, locations: locationsCount };
        // remove internal set before returning
        delete copy._locationsSet;
        return copy;
      });
    // categories available: leave, shift, rule, wear, warning, issues, locations
    // Map tabs -> categories:
    // - activeTab 1 (กิจกรรม): show `locations` and `issues` (ภาค, ลรายงาน)
    // - activeTab 2 (ข้อมูลอื่นๆ): show detailed series
    const categories =
      activeTab === 1
        ? ["locations", "issues"]
        : ["leave", "shift", "issues", "wear"];

    return { data, categories };
  }, [groupBy, year, month, availableYears, activeTab, timeRange]);

  // derive effective grouping for rendering (hour/day/month/year)
  const effectiveGroupBy =
    timeRange === "last_24h" ||
    timeRange === "last_12h" ||
    timeRange === "today"
      ? "hour"
      : timeRange === "this_week" || timeRange === "this_month"
        ? "day"
        : timeRange === "this_year"
          ? "month"
          : groupBy;
  const isDayView =
    (effectiveGroupBy === "day" && timeRange !== "this_week") ||
    effectiveGroupBy === "hour";
  const yearSelectValue =
    timeRange !== "all" ? timeRange : (selectedYear ?? "all");

  return (
    <div className="mo-linechart">
      <div className="tabs" role="tablist" aria-label="Totals tabs">
        <button
          className={`tab-button ${activeTab === 1 ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === 1}
          onClick={() => setActiveTab(1)}
        >
          กิจกรรม
        </button>
        <button
          className={`tab-button ${activeTab === 2 ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === 2}
          onClick={() => setActiveTab(2)}
        >
          ข้อมูลอื่นๆ
        </button>
      </div>

      <div className="tab-panel">
        <div className="linechart-button-container">
          <div className="time-select">
            <select
              className="chart-pill-select time-select-first"
              value={yearSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (
                  v === "last_12h" ||
                  v === "last_24h" ||
                  v === "today" ||
                  v === "this_week" ||
                  v === "this_month"
                ) {
                  setTimeRange(v);
                  setSelectedYear(null);
                  setSelectedMonth(null);
                } else if (v === "all") {
                  setTimeRange("all");
                  setSelectedYear(null);
                  setSelectedMonth(null);
                } else {
                  setTimeRange("all");
                  setSelectedYear(Number(v));
                }
              }}
            >
              <option value="last_12h">12 ชั่วโมงล่าสุด</option>
              <option value="last_24h">24 ชั่วโมงล่าสุด</option>
              <option value="this_week">สัปดาห์นี้</option>
              <option value="this_month">เดือนนี้</option>
              <option value="all">ทุกปี</option>
              {(availableYears as number[]).map((y) => (
                <option key={y} value={y}>
                  {y === now.getFullYear() ? "ปีนี้" : `ปี ${y + 543}`}
                </option>
              ))}
            </select>

            <select
              className="chart-pill-select time-select-last"
              value={selectedMonth ?? "all"}
              onChange={(e) => {
                if (e.target.value === "all") setSelectedMonth(null);
                else setSelectedMonth(Number(e.target.value));
              }}
              disabled={selectedYear === null || timeRange !== "all"}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <LineChart
          chartData={chartResult.data}
          chartCategories={chartResult.categories}
          isDayView={isDayView}
          palette={colorPalette}
        />
      </div>
    </div>
  );
}

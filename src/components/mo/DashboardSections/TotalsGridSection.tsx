import React, { useState } from "react";
import "./TotalsGridSection.css";

import caseData from "../../../temp_data/case.json";

const formatNum = (num: number) => num.toLocaleString();

const agg = caseData.reduce(
  (acc: any, row: any) => {
    acc.reports += 1;
    if (row.department_id) acc.sectors.add(row.department_id);
    if (row.approved_status === "PENDING") acc.pending += 1;
    if (row.approved_status === "APPROVED") acc.approved += 1;
    if (row.approved_status === "REJECTED") acc.rejected += 1;

    const presentCount =
      (row.shift_18_count || 0) +
      (row.shift_24_count || 0) +
      (row.shift_36_count || 0);
    const leaveCount =
      (row.leave_sick_count || 0) +
      (row.leave_business_count || 0) +
      (row.leave_other_count || 0);
    const absentCount = row.absent_count || 0;

    acc.present += presentCount;
    acc.leave += leaveCount;
    // Total manpower is usually present + leave + absent
    acc.manpower += presentCount + leaveCount + absentCount;

    acc.uniform +=
      (row.wear_hat_count || 0) +
      (row.wear_shirt_count || 0) +
      (row.wear_pant_count || 0) +
      (row.wear_shoe_count || 0);
    acc.rules +=
      (row.rule_sleep_count || 0) +
      (row.rule_use_phone_count || 0) +
      (row.rule_no_card_count || 0);
    acc.other +=
      (row.other_job_count || 0) +
      (row.other_training_count || 0) +
      absentCount;

    return acc;
  },
  {
    reports: 0,
    manpower: 0,
    sectors: new Set(),
    pending: 0,
    approved: 0,
    rejected: 0,
    present: 0,
    leave: 0,
    uniform: 0,
    rules: 0,
    other: 0,
  },
);

const cards1 = [
  {
    id: 1,
    count: formatNum(agg.sectors.size),
    unit: "ภาค",
    label: "ภาค",
    cls: "card-blue",
  },
  {
    id: 2,
    count: formatNum(agg.reports),
    unit: "รายงาน",
    label: "รายงานทั้งหมด",
    cls: "card-teal",
  },
];

const card1_feature = [
  {
    id: 1,
    count: formatNum(agg.pending),
    unit: "",
    label: "รอดำเนินการ",
    cls: "card-green",
  },
  {
    id: 2,
    count: formatNum(agg.approved),
    unit: "",
    label: "การอนุมัติ",
    cls: "card-blue",
  },
  {
    id: 3,
    count: formatNum(agg.rejected),
    unit: "",
    label: "ปฏิเสธ",
    cls: "card-red",
  },
];

const cards2 = [
  {
    id: 1,
    count: formatNum(agg.manpower),
    unit: "คน",
    label: "กำลังพล",
    cls: "card-green",
  },
  {
    id: 2,
    count: formatNum(agg.present),
    unit: "คน",
    label: "มาปฏิบัติงาน",
    cls: "card-blue",
  },
  {
    id: 3,
    count: formatNum(agg.leave),
    unit: "คน",
    label: "ลา",
    cls: "card-orange",
  },
];

const card2_feature = [
  {
    id: 1,
    count: formatNum(agg.uniform),
    unit: "คน",
    label: "เครื่องแต่งกาย",
    cls: "card-orange",
  },
  {
    id: 2,
    count: formatNum(agg.rules),
    unit: "คน",
    label: "ผิดข้อปฏิบัติ",
    cls: "card-red",
  },
  {
    id: 3,
    count: formatNum(agg.other),
    unit: "คน",
    label: "other",
    cls: "card-brown",
  },
];

// Unified Tab configuration:
const TABS_DATA = [
  {
    label: "กิจกรรม",
    main: cards1,
    feature: card1_feature,
  },
  {
    label: "ข้อมูลอื่นๆ",
    main: cards2,
    feature: card2_feature,
  },
];

export default function TotalsGrid() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const activeTabData = TABS_DATA[activeTab];

  const cards = activeTabData?.main || [];
  const currentFeatures = activeTabData?.feature || [];
  const columns = 2;
  const paddedCards = (() => {
    const list = [...cards] as any[];
    let padIndex = 0;
    while (list.length > 0 && list.length % columns !== 0) {
      list.push({ id: `empty-${padIndex++}`, empty: true });
    }
    return list;
  })();

  return (
    <div className="mo-totals">
      <div className="tabs" role="tablist" aria-label="Totals tabs">
        {TABS_DATA.map((tab, i) => (
          <button
            key={tab.label}
            className={`tab-button ${activeTab === i ? "active" : ""}`}
            role="tab"
            aria-selected={activeTab === i}
            onClick={() => setActiveTab(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        <div className="totals-grid">
          {paddedCards.map((c) => (
            <div
              key={c.id}
              className={`totals-card ${c.cls ?? ""} ${c.empty ? "empty" : ""}`}
              role="group"
              aria-label={c.label ?? ""}
              aria-hidden={c.empty ? true : undefined}
            >
              <div className="totals-count-row">
                <span className="totals-count">{c.count}</span>
                {c.unit && <span className="totals-unit">{c.unit}</span>}
              </div>
              <div className="totals-label">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
      {/* fearture */}
      {currentFeatures.length > 0 && (
        <div className="feature-grid">
          {currentFeatures.map((f) => {
            const colorClass = f.cls ? f.cls.replace("card-", "") : "gray";
            return (
              <div key={f.id} className={`feature-card feature-${colorClass}`}>
                <span className="feature-label">{f.label}</span>
                <span className="feature-value">{f.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

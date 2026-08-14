// src/pages/Home.tsx
import "./MoDashborad.css";
import { ArrowLeft } from "lucide-react";
import TotalsGrid from "../../components/mo/DashboardSections/TotalsGridSection";
import LineChart from "../../components/mo/DashboardSections/LineChartSection";
import DualCharts from "../../components/mo/DashboardSections/DualChartsSection";
import VerticalBar from "../../components/mo/DashboardSections/VerticalBarSection";
import TableSearch from "../../components/mo/DashboardSections/TableSearchSection";
import GeoChart from "../../components/mo/DashboardSections/GeoChartSection";

type Props = {
  empCode: string;
  displayName?: string;
  onCancel?: () => void;
};

export default function MoDashboard({ onCancel }: Props) {
  return (
    <main className="guts-bg">
      <div className="guts-home">
        <div className="gut-detail-btns-box" aria-hidden>
          <button
            type="button"
            className="gut-back-icon"
            onClick={() => {
              if (onCancel) return onCancel();
              return window.history.back();
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Dashboard sections (componentized) */}
        <div className="guts-dashboard-grid">
          <section className="guts-home-card" aria-label="Mo - Totals">
            <TotalsGrid />
          </section>

          <section className="guts-home-card" aria-label="Mo - LineChart">
            <LineChart />
          </section>

          <section className="guts-home-card" aria-label="Mo - VerticalBar">
            <VerticalBar />
          </section>

          <section className="guts-home-card" aria-label="Mo - DualCharts">
            <DualCharts />
          </section>

          <section className="guts-home-card" aria-label="Mo - TableSearch">
            <TableSearch />
          </section>

          <section className="guts-home-card" aria-label="Mo - GeoChart">
            <GeoChart />
          </section>
        </div>
      </div>
    </main>
  );
}

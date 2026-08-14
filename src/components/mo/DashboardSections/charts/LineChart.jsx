import React, { useState, useMemo } from "react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import "./LineChart.css";

// Default palette (matches TotalsGridSection). Can be overridden via `palette` prop.
const DEFAULT_PALETTE = [
  '#1e6fb3', // blue
  '#2b9aa3', // teal
  '#3fb374', // green
  '#f59e2e', // orange
  '#e76b6b', // red
];

function getColorFromPalette(palette, idx, baseHue = 220) {
  if (Array.isArray(palette) && Number.isInteger(idx) && idx >= 0 && idx < palette.length) {
    return palette[idx];
  }
  const hue = (baseHue + idx * 47) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

const LineChart = ({ chartData, chartCategories, isDayView, palette }) => {
  // using CSS variables in charts.css instead of theme hook

  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  React.useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // responsive sizes: smaller for narrow screens
  const getSizes = () => {
    // small screens get smaller markers; medium and larger share the same (medium) sizes
    if (windowWidth < 640) return { dot: 1, activeDot: 2, strokeWidth: 0.9 };
    return { dot: 2, activeDot: 3, strokeWidth: 1.2 };
  };
  const sizes = getSizes();
  const tickSize = windowWidth < 640 ? 8 : 11;
  const legendFont = windowWidth < 640 ? 10 : 12;
  const tooltipFont = windowWidth < 640 ? '0.55rem' : '0.75rem';

  const categories = useMemo(() => {
    if (chartCategories && chartCategories.length > 0) {
      const labelMap = {
        locations: 'สถานที่',
        leave: 'ลา',
        shift: 'กะ',
        issues: 'ปัญหา',
        wear: 'สวมใส่',
      };
      return chartCategories.map((key, idx) => ({
        key,
        label: labelMap[key] ?? (key.charAt(0).toUpperCase() + key.slice(1)),
        color: getColorFromPalette(palette || DEFAULT_PALETTE, idx),
      }));
    }
    if (!chartData || chartData.length === 0) return [];
    return Object.keys(chartData[0])
      .filter(key => key !== "group" && typeof chartData[0][key] === "number")
      .map((key, idx) => {
        const labelMap = {
          locations: 'สถานที่',
          leave: 'ลา',
          shift: 'กะ',
          issues: 'ปัญหา',
          wear: 'สวมใส่',
        };
        return {
          key,
          label: labelMap[key] ?? (key.charAt(0).toUpperCase() + key.slice(1)),
          color: getColorFromPalette(palette || DEFAULT_PALETTE, idx),
        };
      });
  }, [chartCategories, chartData]);

  const [includedCategories, setIncludedCategories] = useState(categories.map(c => c.key));

  React.useEffect(() => {
    setIncludedCategories(categories.map(c => c.key));
  }, [categories]);

  // Remove keyboard focus from Recharts SVG
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const svgs = document.querySelectorAll('.chart-card svg.recharts-surface');
      svgs.forEach(el => {
        el.setAttribute('focusable', 'false');
        el.removeAttribute('tabindex');
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [chartData]);

  const handleCategoryToggle = (key) => {
    setIncludedCategories((prev) =>
      prev.includes(key)
        ? prev.filter((cat) => cat !== key)
        : [...prev, key]
    );
  };

  return (
    <div className="chart-card no-bg" tabIndex={-1} role="img" aria-label="Line chart">
      {/* Category Options */}
      <div className="chart-category-controls">
        {categories.map((cat) => (
          <label key={cat.key} className="chart-checkbox" style={{ ['--dot-color']: cat.color }}>
            <input
              type="checkbox"
              checked={includedCategories.includes(cat.key)}
              onChange={() => handleCategoryToggle(cat.key)}
              aria-label={cat.label}
            />
            <span style={{ color: 'var(--dot-color)' }}>{cat.label}</span>
          </label>
        ))}
      </div>

      <div
        className="chart-container"
        style={{ overflowX: isDayView ? 'auto' : 'visible', overflowY: 'hidden' }}
      >
        {/* Mobile chart: smaller axis text */}
          <ResponsiveContainer width={isDayView ? Math.max(600, chartData.length * 50) : "100%"} height={350}>
          <RechartsLineChart
            data={chartData}
            margin={{ top: 10, right: 5, left: -35, bottom: 55 }}
          >
            <CartesianGrid strokeDasharray="2 2" />
            <XAxis
              dataKey="group"
              type="category"
              interval={0}
              stroke="#8884d8"
              tick={{ fontSize: tickSize, fill: "#8884d8", angle: 0, textAnchor: 'end' }}
              height={60}
            />
            <YAxis
              stroke="#8884d8"
              tick={{ fontSize: tickSize, fill: "#8884d8" }}
            />
            <Tooltip wrapperStyle={{ fontSize: tooltipFont }} />
            {categories.map(
              (cat) =>
                includedCategories.includes(cat.key) && (
                  <Line
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    stroke={cat.color}
                    strokeWidth={sizes.strokeWidth}
                    dot={{ r: sizes.dot }}
                    activeDot={{ r: sizes.activeDot }}
                    name={cat.label}
                  />
                )
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>


    </div>
  );
};

export default LineChart;
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Cable,
  CircleDot,
  Filter,
  Laptop,
  MapPin,
  Network,
  Search,
  UsersRound,
} from "lucide-react";

import LocationMapModal from "@/components/registeration/LocationMapModal";
import { adminService } from "@/services/admin.service";
import { useAppStore } from "@/store";
import type { PresenceSnapshot } from "@/types/api";

import styles from "./SuperAdminPresenceMonitor.module.css";

const timestampFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : timestampFormatter.format(date);
}

function shortenDeviceId(value: string) {
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function SummaryRing({ className, value, total }: { className: string; value: number; total: number }) {
  const progress = percentage(value, total);
  return (
    <span className={className}>
      <svg className={styles.ringSvg} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.ringTrack} cx="50" cy="50" r="45" pathLength="100" />
        <circle
          className={styles.ringValue}
          cx="50"
          cy="50"
          r="45"
          pathLength="100"
          style={{ strokeDasharray: `${progress} 100` }}
        />
      </svg>
      <span className={styles.ringInner}><strong>{value}</strong><span>{total}</span></span>
    </span>
  );
}

export default function SuperAdminPresenceMonitor() {
  const session = useAppStore((state) => state.adminSession);
  const [snapshot, setSnapshot] = useState<PresenceSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState("all");
  const [connectionAppFilter, setConnectionAppFilter] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    title: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const savingSettingRef = useRef(false);

  useEffect(() => {
    if (!session?.employee_code) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void adminService.getClientPresenceSettings(session.employee_code).then(
        (settings) => {
          if (cancelled) return;
          setMonitoringEnabled(settings.enabled);
          setSettingsLoaded(true);
          if (!settings.enabled) setLoading(false);
        },
        (settingsError) => {
          if (cancelled) return;
          setError(settingsError instanceof Error ? settingsError.message : "ไม่สามารถอ่านสถานะการติดตามได้");
          setSettingsLoaded(true);
          setLoading(false);
        },
      );
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session?.employee_code]);

  useEffect(() => {
    if (!session?.employee_code || !settingsLoaded || !monitoringEnabled) return undefined;
    setLoading(true);
    return adminService.watchClientPresence(
      session.employee_code,
      (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setMonitoringEnabled(nextSnapshot.monitoring_enabled);
        setSelectedApp((current) => {
          if (current !== "all" && nextSnapshot.applications.some((app) => app.public_key === current)) {
            return current;
          }
          return nextSnapshot.applications.find((app) => app.is_active)?.public_key
            ?? nextSnapshot.applications[0]?.public_key
            ?? "all";
        });
        setConnectionAppFilter((current) => current === "all" || nextSnapshot.applications.some(
          (app) => app.public_key === current,
        ) ? current : "all");
        setError("");
        setLoading(false);
      },
      () => setError("การเชื่อมต่อสถานะสดขัดข้อง ระบบกำลังเชื่อมต่อใหม่"),
    );
  }, [monitoringEnabled, session?.employee_code, settingsLoaded]);

  async function toggleMonitoring() {
    if (!session?.employee_code || savingSettingRef.current) return;
    const nextEnabled = !monitoringEnabled;
    savingSettingRef.current = true;
    setSavingSetting(true);
    try {
      const settings = await adminService.updateClientPresenceSettings(
        session.employee_code,
        nextEnabled,
      );
      setMonitoringEnabled(settings.enabled);
      setSettingsLoaded(true);
      if (!settings.enabled) {
        setSnapshot(null);
        setLoading(false);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถเปลี่ยนสถานะการติดตามได้");
    } finally {
      savingSettingRef.current = false;
      setSavingSetting(false);
    }
  }

  const connections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!snapshot) return [];
    return snapshot.connections.filter((connection) => {
      const appMatches = connectionAppFilter === "all" || connection.public_key === connectionAppFilter;
      const queryMatches = !normalized ||
      [
        connection.app_name,
        connection.public_key,
        connection.employee_id,
        connection.employee_name,
        connection.device_id,
        connection.client_ip,
        connection.latitude,
        connection.longitude,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalized));
      return appMatches && queryMatches;
    });
  }, [connectionAppFilter, query, snapshot]);

  const summary = snapshot?.summary ?? {
    applications: 0,
    registered_applications: 0,
    active_applications: 0,
    registered_employees: 0,
    employees: 0,
    devices: 0,
    clients: 0,
    connections: 0,
  };

  const selectedApplication = snapshot?.applications.find(
    (application) => application.public_key === selectedApp,
  ) ?? null;
  const selectedIpCount = new Set(
    snapshot?.connections
      .filter((connection) => connection.public_key === selectedApp && connection.client_ip)
      .map((connection) => connection.client_ip) ?? [],
  ).size;
  const selectedStats = selectedApplication ? [
    { label: "ผู้ใช้งาน", value: selectedApplication.employees, total: summary.registered_employees, description: `จากผู้ใช้ทั้งหมด ${summary.registered_employees}`, icon: <UsersRound aria-hidden="true" /> },
    { label: "เครื่องที่ใช้งาน", value: selectedApplication.devices, total: selectedApplication.employees, description: `จากผู้ใช้งาน ${selectedApplication.employees}`, icon: <Laptop aria-hidden="true" /> },
    { label: "IP", value: selectedIpCount, total: selectedApplication.employees, description: `จากผู้ใช้งาน ${selectedApplication.employees}`, icon: <Network aria-hidden="true" /> },
  ] : [];

  return (
    <section className={styles.page} aria-labelledby="presence-monitor-title">
      <div className={styles.heading}>
        <div>
          <h2 id="presence-monitor-title">ติดตามการเชื่อมต่อไคลเอนต์</h2>
          <p>สถานะการใช้งานปัจจุบันของแอปพลิเคชัน ผู้ใช้ และอุปกรณ์</p>
        </div>
        <label className={styles.monitorToggle}>
          <span><strong>ติดตามการเชื่อมต่อ</strong><small>{monitoringEnabled ? "SDK ส่งสถานะการใช้งาน" : "หยุดส่งสถานะจาก SDK"}</small></span>
          <input type="checkbox" checked={monitoringEnabled} onChange={() => void toggleMonitoring()} disabled={savingSetting} />
          <i aria-hidden="true" />
        </label>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {!monitoringEnabled ? <div className={styles.paused}><CircleDot size={17} aria-hidden="true" /> การติดตามการเชื่อมต่อถูกพักไว้ SDK จะไม่ส่ง heartbeat จนกว่าจะเปิดใช้งานอีกครั้ง</div> : null}

      <div className={styles.summaryGrid} aria-label="สรุปการเชื่อมต่อ">
        {[
          { label: "แอปที่ออนไลน์", value: summary.active_applications, total: summary.registered_applications, icon: <Building2 aria-hidden="true" />, description: "จากแอปที่ลงทะเบียน" },
          { label: "ผู้ใช้งาน", value: summary.employees, total: summary.registered_employees, icon: <UsersRound aria-hidden="true" />, description: "จากพนักงานที่เปิดใช้งาน" },
          { label: "การเชื่อมต่อ", value: summary.connections, total: summary.clients, icon: <Cable aria-hidden="true" />, description: "เทียบกับไคลเอนต์ปัจจุบัน" },
        ].map((item) => {
          return <div className={styles.overviewCard} key={item.label}>
            <SummaryRing className={styles.overviewRing} value={item.value} total={item.total} />
            <div>{item.icon}<strong>{item.label}</strong><small>{item.description}</small></div>
          </div>;
        })}
      </div>

      <section className={styles.panel} aria-labelledby="connections-title">
        <div className={styles.tableToolbar}>
          <div className={styles.detailHeading}>
            <div><h3 id="connections-title">รายละเอียดการเชื่อมต่อ</h3><span>{selectedApplication ? selectedApplication.app_name : "เลือกแอปพลิเคชันเพื่อดูรายละเอียด"}</span></div>
            <label className={styles.selectBox}>
              <Filter size={16} aria-hidden="true" />
              <select value={selectedApp} onChange={(event) => setSelectedApp(event.target.value)} aria-label="เลือกแอปพลิเคชัน">
                {!snapshot?.applications.length ? <option value="all">ยังไม่มีแอปพลิเคชัน</option> : null}
                {snapshot?.applications.map((application) => <option key={application.public_key} value={application.public_key}>{application.app_name} {application.is_active ? "" : "(ปิดใช้งาน)"}</option>)}
              </select>
            </label>
          </div>
          <span>{snapshot?.generated_at ? `อัปเดต ${formatTimestamp(snapshot.generated_at)}` : "กำลังโหลด"}</span>
        </div>
        {selectedApplication ? <div className={styles.detailStats}>
          {selectedStats.map((stat) => {
            return <div className={styles.detailStat} key={stat.label}>
              <SummaryRing className={styles.detailRing} value={stat.value} total={stat.total} />
              <div>{stat.icon}<strong>{stat.label}</strong><small>{stat.description}</small></div>
            </div>;
          })}
        </div> : null}
        {!loading && !selectedApplication ? <p className={styles.empty}>ยังไม่มีแอปพลิเคชันไคลเอนต์ที่ลงทะเบียน</p> : null}
      </section>

      <section className={styles.panel} aria-labelledby="connection-list-title">
        <div className={styles.tableToolbar}>
          <div className={styles.detailHeading}>
            <div><h3 id="connection-list-title">รายการการเชื่อมต่อ</h3><span>ค้นหาและกรองการเชื่อมต่อที่กำลังใช้งาน</span></div>
            <label className={styles.selectBox}>
              <Filter size={16} aria-hidden="true" />
              <select value={connectionAppFilter} onChange={(event) => setConnectionAppFilter(event.target.value)} aria-label="กรองตามแอปพลิเคชัน">
                <option value="all">ทุกแอปพลิเคชัน</option>
                {snapshot?.applications.map((application) => <option key={application.public_key} value={application.public_key}>{application.app_name}</option>)}
              </select>
            </label>
          </div>
          <span>{connections.length} รายการ</span>
        </div>
        <div className={styles.detailFilters}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาผู้ใช้ อุปกรณ์ หรือ IP" />
          </label>
        </div>
        {snapshot ? (
        <div className={styles.tableScroll}>
          <table>
            <thead><tr><th>ลำดับ</th><th>แอป</th><th>ผู้ใช้งาน</th><th>อุปกรณ์</th><th>IP</th><th>ตำแหน่ง (Lat/Long)</th><th>เชื่อมต่อเมื่อ</th><th>พบล่าสุด</th></tr></thead>
            <tbody>
              {connections.map((connection, index) => {
                const hasLocation = Number.isFinite(connection.latitude)
                  && Number.isFinite(connection.longitude);

                return (
                  <tr key={connection.connection_id}>
                    <td className={styles.rowNumber}>{index + 1}</td>
                    <td><strong>{connection.app_name}</strong></td>
                    <td><strong>{connection.employee_name}</strong><small className={styles.employeeCode}>{connection.employee_id}</small></td>
                    <td title={connection.device_id}><code>{shortenDeviceId(connection.device_id)}</code></td>
                    <td>{connection.client_ip}</td>
                    <td>
                      <div className={styles.locationCell}>
                        <code>
                          <span>Lat: {connection.latitude?.toFixed(6) ?? "-"}</span>
                          <span>Long: {connection.longitude?.toFixed(6) ?? "-"}</span>
                        </code>
                        <button
                          className={styles.mapButton}
                          type="button"
                          disabled={!hasLocation}
                          title={hasLocation ? "เปิดตำแหน่งบนแผนที่" : "ไม่มีข้อมูลตำแหน่ง"}
                          aria-label={`เปิดตำแหน่งของ ${connection.employee_name} บนแผนที่`}
                          onClick={() => {
                            if (!hasLocation) return;
                            setSelectedLocation({
                              title: `${connection.employee_name} (${connection.employee_id})`,
                              latitude: connection.latitude as number,
                              longitude: connection.longitude as number,
                            });
                          }}
                        >
                          <MapPin size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td>{formatTimestamp(connection.connected_at)}</td>
                    <td>{formatTimestamp(connection.last_seen_at)}</td>
                  </tr>
                );
              })}
              {!loading && !connections.length ? <tr><td className={styles.tableEmpty} colSpan={8}>ไม่พบการเชื่อมต่อที่ตรงกับการค้นหา</td></tr> : null}
            </tbody>
          </table>
        </div>
        ) : null}
      </section>

      <LocationMapModal
        isOpen={selectedLocation !== null}
        latitude={selectedLocation?.latitude}
        longitude={selectedLocation?.longitude}
        title={selectedLocation?.title ?? "Location"}
        onClose={() => setSelectedLocation(null)}
      />
    </section>
  );
}

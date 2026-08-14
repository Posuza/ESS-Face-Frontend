import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CirclePause,
  CirclePlay,
  Clock3,
  Plus,
  RefreshCw,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";

import { useStore } from "@/store/store";
import { jobAssignerApi, subscribeToJobUpdates } from "./jobAssigner.api";
import type {
  CreateJobInput,
  Job,
  JobAction,
  JobPriority,
  JobStatus,
} from "./jobAssigner.types";
import styles from "./JobAssigner.module.css";

type Props = { onBackHome: () => void };
type Filter = "ALL" | "ACTIVE" | "DONE";

const STATUS_LABELS: Record<JobStatus, string> = {
  NEW: "สร้างใหม่",
  ASSIGNED: "มอบหมายแล้ว",
  ACCEPTED: "รับงานแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  ON_HOLD: "พักงาน",
  COMPLETED: "เสร็จสิ้น",
  CLOSED: "ปิดงาน",
  REJECTED: "ปฏิเสธ",
};

const PRIORITY_LABELS: Record<JobPriority, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปกติ",
  HIGH: "สูง",
  URGENT: "เร่งด่วน",
};

const ACTIONS: Partial<Record<JobStatus, JobAction[]>> = {
  NEW: ["ASSIGN"],
  ASSIGNED: ["ACCEPT", "REJECT", "REASSIGN"],
  ACCEPTED: ["START", "REASSIGN"],
  IN_PROGRESS: ["HOLD", "COMPLETE"],
  ON_HOLD: ["RESUME"],
  COMPLETED: ["CLOSE", "REOPEN"],
  REJECTED: ["ASSIGN"],
  CLOSED: ["REOPEN"],
};

const ACTION_LABELS: Record<JobAction, string> = {
  ASSIGN: "มอบหมาย",
  REASSIGN: "เปลี่ยนผู้รับงาน",
  ACCEPT: "รับงาน",
  REJECT: "ปฏิเสธ",
  START: "เริ่มงาน",
  HOLD: "พักงาน",
  RESUME: "ทำงานต่อ",
  COMPLETE: "ส่งงาน",
  CLOSE: "ปิดงาน",
  REOPEN: "เปิดอีกครั้ง",
};

const MANAGER_ACTIONS = new Set<JobAction>([
  "ASSIGN",
  "REASSIGN",
  "CLOSE",
  "REOPEN",
]);
const MANAGER_POSITIONS = new Set([1, 2, 5, 6, 7]);

function actionIcon(action: JobAction) {
  const props = { size: 15, "aria-hidden": true };
  if (action === "ACCEPT" || action === "COMPLETE" || action === "CLOSE")
    return <Check {...props} />;
  if (action === "REJECT") return <X {...props} />;
  if (action === "START" || action === "RESUME")
    return <CirclePlay {...props} />;
  if (action === "HOLD") return <CirclePause {...props} />;
  if (action === "REOPEN") return <RotateCcw {...props} />;
  return <RefreshCw {...props} />;
}

export default function JobAssigner({ onBackHome }: Props) {
  const employee = useStore((state) => state.authEmployee);
  const employeeCode = employee?.employee_code || "";
  const isManager =
    MANAGER_POSITIONS.has(Number(employee?.position_id)) ||
    ["admin", "manager", "gm"].includes(
      String(employee?.role_name || "").toLowerCase(),
    );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CreateJobInput>({
    title: "",
    description: "",
    assigned_to: "",
    priority: "MEDIUM",
    due_date: "",
  });

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      setJobs(await jobAssignerApi.list());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "โหลดงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  useEffect(() => {
    if (!employeeCode) return;
    return subscribeToJobUpdates(
      employeeCode,
      (event) => {
        if (event.type === "job.removed" && event.job_id) {
          setJobs((current) => current.filter((job) => job.id !== event.job_id));
          return;
        }
        if (!event.job) return;
        setJobs((current) => {
          const exists = current.some((job) => job.id === event.job?.id);
          const next = exists
            ? current.map((job) => (job.id === event.job?.id ? event.job! : job))
            : [event.job!, ...current];
          return next.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        });
      },
      setConnected,
    );
  }, [employeeCode]);

  const filteredJobs = useMemo(() => {
    if (filter === "ACTIVE")
      return jobs.filter((job) => !["COMPLETED", "CLOSED"].includes(job.workflow_status));
    if (filter === "DONE")
      return jobs.filter((job) => ["COMPLETED", "CLOSED"].includes(job.workflow_status));
    return jobs;
  }, [filter, jobs]);

  const activeCount = jobs.filter(
    (job) => !["COMPLETED", "CLOSED", "REJECTED"].includes(job.workflow_status),
  ).length;
  const urgentCount = jobs.filter(
    (job) => job.priority === "URGENT" && job.workflow_status !== "CLOSED",
  ).length;
  const completedCount = jobs.filter((job) =>
    ["COMPLETED", "CLOSED"].includes(job.workflow_status),
  ).length;

  const submitJob = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await jobAssignerApi.create(form);
      setJobs((current) => [created, ...current.filter((job) => job.id !== created.id)]);
      setForm({
        title: "",
        description: "",
        assigned_to: "",
        priority: "MEDIUM",
        due_date: "",
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "สร้างงานไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (job: Job, action: JobAction) => {
    let assignedTo: string | undefined;
    if (action === "ASSIGN" || action === "REASSIGN") {
      assignedTo = window.prompt("รหัสพนักงานผู้รับงาน", job.assigned_to || "")?.trim();
      if (!assignedTo) return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await jobAssignerApi.transition(job.id, action, assignedTo);
      setJobs((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "เปลี่ยนสถานะไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  };

  const visibleActions = (job: Job) =>
    (ACTIONS[job.workflow_status] || []).filter((action) =>
      MANAGER_ACTIONS.has(action) ? isManager : job.assigned_to === employeeCode,
    );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.toolbar}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onBackHome}
            title="กลับหน้าหลัก"
            aria-label="กลับหน้าหลัก"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.heading}>
            <h1>ระบบมอบหมายงาน</h1>
            <p>{isManager ? "จัดสรรและติดตามงาน" : "งานที่ได้รับมอบหมาย"}</p>
          </div>
          <div className={styles.live} title="สถานะการอัปเดตแบบเรียลไทม์">
            <span
              className={`${styles.liveDot} ${connected ? styles.liveDotOnline : ""}`}
            />
            {connected ? "ออนไลน์" : "กำลังเชื่อมต่อ"}
          </div>
        </header>

        <section className={styles.summary} aria-label="สรุปงาน">
          <div className={styles.metric}>
            <span className={styles.metricLabel}>งานทั้งหมด</span>
            <strong className={styles.metricValue}>{jobs.length}</strong>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>กำลังดำเนินการ</span>
            <strong className={styles.metricValue}>{activeCount}</strong>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>เร่งด่วน</span>
            <strong className={styles.metricValue}>{urgentCount}</strong>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>เสร็จแล้ว</span>
            <strong className={styles.metricValue}>{completedCount}</strong>
          </div>
        </section>

        <div className={styles.content}>
          {isManager && (
            <form className={styles.createPanel} onSubmit={submitJob}>
              <h2 className={styles.sectionTitle}>สร้างงานใหม่</h2>
              <label className={styles.field}>
                ชื่องาน
                <input
                  value={form.title}
                  maxLength={200}
                  required
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </label>
              <label className={styles.field}>
                รายละเอียด
                <textarea
                  value={form.description}
                  maxLength={5000}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <label className={styles.field}>
                รหัสพนักงานผู้รับงาน
                <input
                  value={form.assigned_to}
                  maxLength={6}
                  placeholder="เว้นว่างเพื่อสร้างเป็นงานใหม่"
                  onChange={(event) =>
                    setForm({ ...form, assigned_to: event.target.value.trim() })
                  }
                />
              </label>
              <label className={styles.field}>
                ความสำคัญ
                <select
                  value={form.priority}
                  onChange={(event) =>
                    setForm({ ...form, priority: event.target.value as JobPriority })
                  }
                >
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                กำหนดส่ง
                <input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(event) => setForm({ ...form, due_date: event.target.value })}
                />
              </label>
              <button className={styles.primaryButton} disabled={saving} type="submit">
                <Plus size={17} />
                สร้างงาน
              </button>
            </form>
          )}

          <section className={styles.listArea}>
            <div className={styles.listHeader}>
              <h2 className={styles.sectionTitle}>รายการงาน</h2>
              <div className={styles.filters} role="tablist" aria-label="กรองรายการงาน">
                {(["ALL", "ACTIVE", "DONE"] as Filter[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    className={`${styles.filterButton} ${
                      filter === value ? styles.filterButtonActive : ""
                    }`}
                    onClick={() => setFilter(value)}
                  >
                    {value === "ALL" ? "ทั้งหมด" : value === "ACTIVE" ? "งานเปิด" : "งานเสร็จ"}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {loading ? (
              <div className={styles.empty}>กำลังโหลดรายการงาน...</div>
            ) : filteredJobs.length === 0 ? (
              <div className={styles.empty}>ไม่พบงานในรายการนี้</div>
            ) : (
              <div className={styles.jobList}>
                {filteredJobs.map((job) => (
                  <article className={styles.jobCard} key={job.id}>
                    <div className={styles.jobTop}>
                      <div>
                        <h3 className={styles.jobTitle}>{job.title}</h3>
                        {job.description && (
                          <p className={styles.jobDescription}>{job.description}</p>
                        )}
                      </div>
                      <div className={styles.badges}>
                        <span
                          className={`${styles.badge} ${
                            job.priority === "HIGH" ? styles.priorityHigh : ""
                          } ${job.priority === "URGENT" ? styles.priorityUrgent : ""}`}
                        >
                          {PRIORITY_LABELS[job.priority]}
                        </span>
                        <span
                          className={`${styles.badge} ${
                            job.workflow_status === "IN_PROGRESS"
                              ? styles.statusProgress
                              : ""
                          } ${
                            ["COMPLETED", "CLOSED"].includes(job.workflow_status)
                              ? styles.statusDone
                              : ""
                          }`}
                        >
                          {STATUS_LABELS[job.workflow_status]}
                        </span>
                      </div>
                    </div>
                    <div className={styles.meta}>
                      <span><UserRound size={14} />{job.assigned_to || "ยังไม่มอบหมาย"}</span>
                      <span><Clock3 size={14} />#{job.id}</span>
                      {job.due_date && (
                        <span>
                          <CalendarDays size={14} />
                          {new Intl.DateTimeFormat("th-TH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(job.due_date))}
                        </span>
                      )}
                    </div>
                    {visibleActions(job).length > 0 && (
                      <div className={styles.actions}>
                        {visibleActions(job).map((action) => (
                          <button
                            key={action}
                            type="button"
                            className={styles.actionButton}
                            disabled={saving}
                            onClick={() => void runAction(job, action)}
                          >
                            {actionIcon(action)}
                            {ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

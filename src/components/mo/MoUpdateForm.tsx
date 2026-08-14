import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, MapPin, PlusIcon, X } from "lucide-react";
import styles from "./MoUpdateForm.module.css";
import { useStore } from "../../store/store";
import { HttpError } from "../../services/moReporTransaction.Service";
import {
  ConfirmCancelDialog,
  ConfirmSubmitDialog,
  InfoModel,
  MoLoadingPopup,
} from "./popup";
import { getMoWorkflowDisplayStatus } from "../../utils/mo/workflowDisplay";
import { sanitizeMoFreeText } from "../../utils/mo/textSanitizer";

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type EmployeeDepartment = {
  id: number;
  department: string;
  divisions?: string[];
};

type Props = {
  onCancel?: () => void | Promise<void>;
  onSaved?: () => void | Promise<void>;
  selectedDivision?: string;
  departments?: EmployeeDepartment[];
  reportData?: Record<string, unknown>;
  // submitRef signature extended to accept opts (approve / sendBack flags)
  submitRef?: React.MutableRefObject<
    ((opts?: { approve?: boolean; sendBack?: boolean }) => Promise<void>) | null
  >;
  isEditing?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  isDirty?: boolean;
  onRequestSave?: () => void;
  /** Called after a failed save — parent should refetch fresh data from backend */
  onRefreshData?: () => Promise<void> | void;
  onReportNotFound?: (message: string) => void;
  // ── Approval state owned by parent (MoDetailPage) ──
  externalApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  onApprovalStatusChange?: (
    status: "PENDING" | "APPROVED" | "REJECTED",
  ) => void;
};

// ============================================================
// STATIC CONFIGURATION
// ============================================================

/** Status display labels & keys for meeting records (Group 3) */
const statusOptions = [
  // { label: "ปกติ", key: "normal" }, // temporarily disabled
  { label: "ผิดปกติ", key: "warning" },
  { label: "ฉุกเฉิน", key: "danger" },
];

const getWorkflowStatusClass = (tone: string) => {
  if (tone === "approved") return styles["status-approved"];
  if (tone === "rejected") return styles["status-rejected"];
  return styles["status-pending"];
};

/** Minimum time (ms) the submission loading popup must display */
const MIN_UPDATE_MS = 1500;

/** Sections 1-4: numeric count groups (personnel, leave, shift, training) */
const group1: Array<{
  key: string;
  title: string;
  items: { key: string; label: string; unit: string; value: string }[];
}> = [
  {
    key: "dept",
    title: "หน่วยงานที่รับผิดชอบ",
    items: [
      {
        key: "dept_guard_post_count",
        label: "จุดรักษาการณ์",
        unit: "หน่วยงาน",
        value: "0",
      },
      {
        key: "dept_current_personnel_count",
        label: "กำลังพลปัจจุบัน",
        unit: "คน",
        value: "0",
      },
      {
        key: "dept_missing_regular_count",
        label: "ขาดตัวประจำ",
        unit: "หน่วยงาน",
        value: "0",
      },
      {
        key: "dept_missing_personnel_count",
        label: "ขาดกำลังพล",
        unit: "คน",
        value: "0",
      },
      {
        key: "dept_recruitment_count",
        label: "รับ รปภ. ใหม่",
        unit: "คน",
        value: "0",
      },
      {
        key: "dept_supplement_count",
        label: "จัดกำลังพลเสริมพิเศษ",
        unit: "คน",
        value: "0",
      },
      {
        key: "dept_reserve_units_count",
        label: "จำนวนหน่วยงานสำรองเวร",
        unit: "หน่วย",
        value: "0",
      },
      {
        key: "dept_reserve_personnel_count",
        label: "จำนวนกำลังพลสำรองเวร",
        unit: "คน",
        value: "0",
      },
    ],
  },
  {
    key: "leave",
    title: "การลา",
    items: [
      {
        key: "leave_personal_count",
        label: "ลากิจ",
        unit: "คน",
        value: "0",
      },
      { key: "leave_sick_count", label: "ลาป่วย", unit: "คน", value: "0" },
      {
        key: "leave_absent_count",
        label: "ขาดงาน",
        unit: "คน",
        value: "0",
      },
      {
        key: "leave_deserted_count",
        label: "หนีหาย",
        unit: "คน",
        value: "0",
      },
      {
        key: "leave_resigned_count",
        label: "ลาออก",
        unit: "คน",
        value: "0",
      },
      {
        key: "leave_terminated_count",
        label: "ส่ง รปภ. คืนฝ่ายบริหารงานบุคคล",
        unit: "คน",
        value: "0",
      },
    ],
  },
  {
    key: "shift",
    title: "การบริหารการควงเวร",
    items: [
      {
        key: "shift_18_count",
        label: "18 ชั่วโมง",
        unit: "คน",
        value: "0",
      },
      {
        key: "shift_24_count",
        label: "24 ชั่วโมง",
        unit: "คน",
        value: "0",
      },
      {
        key: "shift_36_count",
        label: "36 ชั่วโมง",
        unit: "คน",
        value: "0",
      },
    ],
  },
  {
    key: "training",
    title: "อบรมและควบคุมหน้างาน",
    items: [
      {
        key: "training_shift_change_count",
        label: "อบรมเปลี่ยนผลัด",
        unit: "หน่วยงาน",
        value: "0",
      },
      {
        key: "training_planned_count",
        label: "อบรมตามแผนงานที่กำหนด",
        unit: "หน่วยงาน",
        value: "0",
      },
      {
        key: "training_supervise_onsite_count",
        label: "ควบคุมหน้างาน",
        unit: "หน่วยงาน",
        value: "0",
      },
      {
        key: "training_supervise_virtual_simulation_count",
        label: "จำลองสถานการณ์เสมือนจริง",
        unit: "หน่วยงาน",
        value: "0",
      },
    ],
  },
];

/** Default discipline items for Group 2 (วินัยและการลงโทษ) */
const group2 = [
  {
    key: "discipline",
    title: "วินัยและการลงโทษ",
    items: [
      {
        key: "discipline_sleeping_on_duty_count",
        label: "หลับเวร",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_abandoning_post_count",
        label: "ทิ้งจุด",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_absent_work_count",
        label: "ขาดงาน",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_early_leaved_duty_count",
        label: "ออกเวรก่อนเวลา",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_using_phone_on_duty_count",
        label: "เล่นโทรศัพท์",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_client_complained_count",
        label: "ผู้ว่าจ้างตำหนิ",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_improper_attire_count",
        label: "แต่งการไม่เรียบร้อย",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_failed_write_report_count",
        label: "ไม่เขียนรายงาน",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_early_write_report_count",
        label: "เขียนรายงานล่วงหน้า",
        unit: "คน",
        value: "0",
        isActive: false,
      },
      {
        key: "discipline_using_drugs_on_duty_count",
        label: "ดื่ม/มีกลิ่นสุรา ขณะทำงาน",
        unit: "คน",
        value: "0",
        isActive: false,
      },
    ],
  },
];

const group3A = [
  {
    key: "employer",
    title: "เข้าพบผู้ว่าจ้าง",
    items: [
      {
        key: "employer_number_count",
        label: "เข้าพบผู้ว่าจ้าง",
        unit: "หน่วยงาน",
        value: "0",
      },
      {
        key: "employer_problem_count",
        label: "พบปัญหา",
        unit: "หน่วยงาน",
        value: "0",
      },
    ],
  },
];

const fieldLabel = (label: string) => `${label} :`;

/** Template for Group 3 (meeting records) */
const group3 = [
  {
    key: "meeting",
    title: "เข้าพบผู้ว่าจ้าง",
    items: [] as {
      label: string;
      detail: string;
      status: string;
      note: string;
    }[],
  },
];

/** Template for Group 4 (guard post movement) */
const group4 = [
  {
    key: "guard_post_movement",
    title: "การเปลี่ยนแปลงจุดรักษาการณ์",
    items: [] as {
      label: string;
      detail: string;
      status: string;
      note: string;
    }[],
  },
];

/** Status options for Group 4 (guard post movement) — simple string array */
const group4StatusOptions = [
  "ลงจุดใหม่",
  "ถอนจุด",
  "ยกเลิกสัญญา",
  "ลดกำลัง",
  "เพิ่มกำลัง",
];

// ============================================================
// COMPONENT
// ============================================================

export default function MoUpdateForm(props: Props) {
  // ---- 1. Store & Props ----
  console.log("[MoUpdateForm] RENDERED", { reportData: props.reportData });
  const {
    createReport,
    updateReport,
    authEmployee,
    fetchDistinctDisciplineTypes,
    fetchDistinctGuardPostMovementStatuses,
  } = useStore();

  // ---- 2. Data Fetching ----
  const [distinctDisciplineTypes, setDistinctDisciplineTypes] = useState<
    { key: string; label: string }[]
  >([]);

  // ---- 3. Derived Values (from auth & props) ----
  const departments: EmployeeDepartment[] = authEmployee?.department_name
    ? [
        {
          id: authEmployee.department_id ?? 1,
          department: authEmployee.department_name,
          divisions: [],
        },
      ]
    : [];
  const [selectedSector, setSelectedSector] = useState<number>(
    authEmployee?.department_id ?? departments[0]?.id ?? 1,
  );
  const selectedSectorName =
    departments.find((loc) => loc.id === selectedSector)?.department ?? "";
  const [selectedDivision, setSelectedDivision] = useState<string>("");

  // ---- 4. Form State ----
  const [dynamicGroup2, setDynamicGroup2] = useState(() => {
    const discMap = new Map<string, number>();
    if (props.reportData) {
      const arr = (props.reportData as any).disciplines;
      if (Array.isArray(arr)) {
        arr.forEach((d: any) => discMap.set(d.key, d.value));
      }
    }
    return group2.map((g) => ({
      ...g,
      items: g.items.map((item) => {
        let val = discMap.get(item.key);
        if (val == null && props.reportData) {
          const flat = (props.reportData as any)[item.key];
          val = flat != null ? Number(flat) : undefined;
        }
        return { ...item, isActive: val != null && val > 0 };
      }),
    }));
  });

  const [dynamicGroup3, setDynamicGroup3] = useState(() => [] as any[]);
  const [dynamicGroup4, setDynamicGroup4] = useState(() => [] as any[]);

  const [counts, setCounts] = useState<Record<string, string>>(() => {
    const acc: Record<string, string> = {};
    group1.forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData?.[it.key];
        acc[it.key] = rdVal !== undefined ? String(rdVal) : (it.value ?? "0");
      }),
    );
    [...group3A, ...group2].forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData?.[it.key];
        acc[it.key] = rdVal !== undefined ? String(rdVal) : (it.value ?? "0");
      }),
    );
    return acc;
  });

  const initialSnapshotRef = useRef<{
    counts: Record<string, string>;
    projectsJson: string;
    guardPostMovementsJson: string;
  } | null>(null);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    [...group1, ...group2, ...group3A, ...group3, ...group4].reduce(
      (acc, g, i) => {
        acc[g.key] = i === 0;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  const [rowStatus, setRowStatus] = useState<Record<string, number>>({});

  // ---- 5. Editing State & Refs ----
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRaw, setEditingRaw] = useState<string>("0");

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const labelInputRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [warnings, setWarnings] = useState<Record<string, boolean>>({});
  const warningTimersRef = useRef<Record<string, number | null>>({});
  const isFirstRender = useRef(true);

  // ---- 6. Approval State ----
  // Use external (from parent) if provided, else own it locally.
  // This allows MoDetailPage to own approval for its approve/send-back buttons,
  // while standalone uses of MoUpdateForm still work without a parent.
  const [localApprovalStatus, setLocalApprovalStatus] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >(
    (props.reportData?.approved_status as
      | "PENDING"
      | "APPROVED"
      | "REJECTED") || "PENDING",
  );

  const approvalStatus = props.externalApprovalStatus ?? localApprovalStatus;
  const workflowDisplayStatus = getMoWorkflowDisplayStatus(
    {
      approved_status: approvalStatus,
      workflow_status: props.reportData?.workflow_status as string | null,
    },
    {
      position_id: authEmployee?.position_id,
    },
  );

  const [approvalRemark, setApprovalRemark] = useState<string>(
    sanitizeMoFreeText(props.reportData?.approved_remark),
  );

  // ---- 7. Dialog / Submission State ----
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 8. Group 2 Modal State (Discipline) ----
  const [showAddGroup2, setShowAddGroup2] = useState(false);
  const [newGroup2Label, setNewGroup2Label] = useState("");
  const [newGroup2Unit, setNewGroup2Unit] = useState("คน");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isOtherMode, setIsOtherMode] = useState(false);

  // ---- 9. Group 3 Modal State (Meeting) ----
  const [showAddGroup3, setShowAddGroup3] = useState(false);
  const [newGroup3Label, setNewGroup3Label] = useState("");
  const [newGroup3Detail, setNewGroup3Detail] = useState("");
  const [newGroup3Status, setNewGroup3Status] = useState("warning");
  const [newGroup3Note, setNewGroup3Note] = useState("");
  const [editingGroup3Index, setEditingGroup3Index] = useState<number | null>(
    null,
  );

  // ---- 10. Group 4 Modal State (guard_post_movement) ----
  const [showAddGroup4, setShowAddGroup4] = useState(false);
  const [newGroup4Label, setNewGroup4Label] = useState("");
  const [newGroup4Detail, setNewGroup4Detail] = useState("");
  const [newGroup4Status, setNewGroup4Status] = useState("");
  const [newGroup4Note, setNewGroup4Note] = useState("");
  const [editingGroup4Index, setEditingGroup4Index] = useState<number | null>(
    null,
  );
  const [isGroup4OtherMode, setIsGroup4OtherMode] = useState(false);
  // ============================================================
  // EFFECTS
  // ============================================================

  // -- Cleanup update timer on unmount --
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    };
  }, []);

  // -- Fetch distinct discipline types --
  useEffect(() => {
    fetchDistinctDisciplineTypes().then((types) =>
      setDistinctDisciplineTypes(types),
    );
  }, [fetchDistinctDisciplineTypes]);

  // -- Fetch distinct guard post movement statuses --
  const [guardPostStatusesOptions, setGuardPostStatusesOptions] =
    useState<string[]>(group4StatusOptions);
  useEffect(() => {
    fetchDistinctGuardPostMovementStatuses().then((statuses) => {
      if (statuses.length > 0) {
        const merged = Array.from(
          new Set([...group4StatusOptions, ...statuses]),
        );
        setGuardPostStatusesOptions(merged);
      }
    });
  }, [fetchDistinctGuardPostMovementStatuses]);

  // -- Reset division when sector / reportData changes --
  useEffect(() => {
    const nextDivision =
      props.selectedDivision ||
      String(props.reportData?.division_name ?? "") ||
      `เขต ${selectedSector}.1`;
    setSelectedDivision(nextDivision);
  }, [props.reportData, props.selectedDivision, selectedSector]);

  // -- Init rowStatus from dynamicGroup3 --
  useEffect(() => {
    const init: Record<string, number> = {};
    dynamicGroup3.forEach((g) => {
      g.items.forEach((it: any, i: number) => {
        const idx = statusOptions.findIndex((s) => s.key === it.status);
        init[String(i)] = idx >= 0 ? idx : 0;
      });
    });
    setRowStatus(init);
  }, [dynamicGroup3]);

  // -- Sync approval data from reportData --
  useEffect(() => {
    const incoming =
      (props.reportData?.approved_status as
        | "PENDING"
        | "APPROVED"
        | "REJECTED") || "PENDING";
    setLocalApprovalStatus(incoming);
    // only notify parent if it hasn't already driven this value
    if (!props.externalApprovalStatus) {
      props.onApprovalStatusChange?.(incoming);
    }
    setApprovalRemark(sanitizeMoFreeText(props.reportData?.approved_remark));
  }, [props.reportData]);

  // -- Ensure counts contains entries for all dynamic count keys --
  useEffect(() => {
    setCounts((prev) => {
      const next = { ...prev };
      [...group3A, ...dynamicGroup2].forEach((g) => {
        g.items.forEach((it: any) => {
          if (!(it.key in next)) next[it.key] = "0";
        });
      });
      return next;
    });
  }, [dynamicGroup2, dynamicGroup3]);

  // -- Sync dynamicGroup2 and counts from reportData --
  useEffect(() => {
    if (!props.reportData) {
      console.log("[MoUpdateForm] no reportData");
      return;
    }
    console.log("[MoUpdateForm] syncing from reportData", props.reportData);
    const discMap = new Map<string, number>();
    const arr = (props.reportData as any).disciplines;
    if (Array.isArray(arr)) {
      arr.forEach((d: any) => discMap.set(d.key, d.value));
    }
    setDynamicGroup2((prev) =>
      prev.map((g) => {
        if (g.key !== "discipline") return g;
        let items = g.items.map((item: any) => {
          let val = discMap.get(item.key);
          if (val == null) {
            const flat = (props.reportData as any)[item.key];
            val = flat != null ? Number(flat) : undefined;
          }
          return { ...item, isActive: val != null && val > 0 };
        });
        if (Array.isArray(arr)) {
          arr.forEach((d: any) => {
            if (!items.find((it: any) => it.key === d.key)) {
              items.push({
                key: d.key,
                label: sanitizeMoFreeText(d.label),
                unit: "คน",
                value: String(d.value),
                isActive: d.value > 0,
              });
            }
          });
        }
        return { ...g, items };
      }),
    );
    setCounts((prev) => {
      const next = { ...prev };
      group1.forEach((g) =>
        g.items.forEach((it) => {
          const rdVal = props.reportData![it.key];
          if (rdVal !== undefined && rdVal !== null)
            next[it.key] = String(rdVal);
        }),
      );
      group3A.forEach((g) =>
        g.items.forEach((it) => {
          const rdVal = props.reportData![it.key];
          if (rdVal !== undefined && rdVal !== null)
            next[it.key] = String(rdVal);
        }),
      );
      if (Array.isArray(arr)) {
        arr.forEach((d: any) => {
          next[d.key] = String(d.value);
        });
      }
      group2.forEach((g) =>
        g.items.forEach((it) => {
          if (!(it.key in next)) {
            const rdVal = props.reportData![it.key];
            if (rdVal !== undefined && rdVal !== null)
              next[it.key] = String(rdVal);
          }
        }),
      );
      return next;
    });
  }, [props.reportData]);

  // -- Init dynamicGroup3 from reportData projects --
  useEffect(() => {
    const projects = Array.isArray(props.reportData?.projects)
      ? (props.reportData!.projects as any[]).map((p) => ({
          label: sanitizeMoFreeText(p.project_name ?? p.name),
          detail: sanitizeMoFreeText(p.detail),
          status: p.status ?? "warning",
          note: sanitizeMoFreeText(p.note),
        }))
      : [];
    setDynamicGroup3([
      { key: "meeting", title: "เข้าพบผู้ว่าจ้าง", items: projects },
    ]);
  }, [props.reportData]);

  // -- Init dynamicGroup4 from reportData guard_post_movements --
  useEffect(() => {
    const movements = Array.isArray(
      (props.reportData as any)?.guard_post_movements,
    )
      ? (props.reportData as any).guard_post_movements.map((m: any) => ({
          label: sanitizeMoFreeText(m.name),
          detail: sanitizeMoFreeText(m.detail),
          status: sanitizeMoFreeText(m.status),
          note: sanitizeMoFreeText(m.note),
        }))
      : [];
    setDynamicGroup4([
      {
        key: "guard_post_movement",
        title: "การเปลี่ยนแปลงจุดรักษาการณ์",
        items: movements,
      },
    ]);
  }, [props.reportData]);

  // -- Init initialSnapshotRef for dirty detection --
  useEffect(() => {
    if (!props.reportData) return;
    const snapCounts: Record<string, string> = {};
    group1.forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData![it.key];
        snapCounts[it.key] =
          rdVal !== undefined
            ? toDigitString(String(rdVal))
            : (it.value ?? "0");
      }),
    );
    [...group3A, ...group2].forEach((g) =>
      g.items.forEach((it) => {
        const rdVal = props.reportData![it.key];
        snapCounts[it.key] =
          rdVal !== undefined
            ? toDigitString(String(rdVal))
            : (it.value ?? "0");
      }),
    );
    const discArr = (props.reportData as any).disciplines;
    if (Array.isArray(discArr)) {
      discArr.forEach((d: any) => {
        snapCounts[d.key] = toDigitString(String(d.value));
      });
    }
    const guardPostMovements = Array.isArray(
      (props.reportData as any)?.guard_post_movements,
    )
      ? (props.reportData as any).guard_post_movements
      : [];
    initialSnapshotRef.current = {
      counts: snapCounts,
      projectsJson: JSON.stringify(
        Array.isArray(props.reportData?.projects)
          ? (props.reportData!.projects as any[]).map((p: any) => ({
              name: p.name,
              detail: p.detail,
              status: p.status,
              note: p.note,
            }))
          : [],
      ),
      guardPostMovementsJson: JSON.stringify(
        guardPostMovements.map((m: any) => ({
          name: m.name,
          detail: m.detail,
          status: m.status,
          note: m.note,
        })),
      ),
    };
  }, [props.reportData]);

  // -- Sanitize pre-existing counts on mount --
  useEffect(() => {
    setCounts((prev) => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = toDigitString(prev[k]);
      });
      return next;
    });
  }, []);

  const hasAnyData = () => {
    const hasCounts = Object.values(counts).some((v) => Number(v) > 0);
    const hasGroup3Items = dynamicGroup3.some((g: any) => g.items.length > 0);
    const hasGroup4Items = dynamicGroup4.some((g: any) => g.items.length > 0);
    return hasCounts || hasGroup3Items || hasGroup4Items;
  };

  const isDirty = (() => {
    const snap = initialSnapshotRef.current;
    if (!snap) return false;
    for (const key of Object.keys(snap.counts)) {
      if ((counts[key] ?? "0") !== snap.counts[key]) return true;
    }
    for (const key of Object.keys(counts)) {
      if (!(key in snap.counts) && counts[key] !== "0") return true;
    }
    // Also detect changes while cursor is in the field (not yet committed to counts)
    if (editingKey && editingRaw !== toDigitString(counts[editingKey] ?? "0")) {
      return true;
    }
    const currentProjects =
      dynamicGroup3.find((g: any) => g.key === "meeting")?.items ?? [];
    const currentJson = JSON.stringify(
      currentProjects.map((p: any) => ({
        name: p.name,
        detail: p.detail,
        status: p.status,
        note: p.note,
      })),
    );
    if (currentJson !== snap.projectsJson) return true;

    // Check guard_post_movements changes
    const currentMovements =
      dynamicGroup4.find((g: any) => g.key === "guard_post_movement")?.items ??
      [];
    const currentMovementsJson = JSON.stringify(
      currentMovements.map((m: any) => ({
        name: m.label,
        detail: m.detail,
        status: m.status,
        note: m.note,
      })),
    );
    if (currentMovementsJson !== snap.guardPostMovementsJson) return true;

    return false;
  })();

  // -- Notify parent of dirty changes --
  useEffect(() => {
    if (props.onDirtyChange) props.onDirtyChange(isDirty);
  }, [isDirty]);

  // -- Adjust textarea heights after render --
  useEffect(() => {
    const selector = `.${styles["mo-table-wrapper"]} textarea`;
    const nodes = Array.from(
      document.querySelectorAll(selector),
    ) as HTMLTextAreaElement[];
    if (nodes.length === 0) return;
    let rafId = 0;
    rafId = requestAnimationFrame(() =>
      nodes.forEach((ta) => adjustTextareaHeight(ta)),
    );
    return () => cancelAnimationFrame(rafId);
  }, [counts, editingKey, openGroups]);

  // -- Adjust modal textarea on modal open --
  useEffect(() => {
    if (!showAddGroup2 && !showAddGroup3 && !showAddGroup4) return;
    const id = requestAnimationFrame(() => {
      try {
        adjustTextareaHeight(labelInputRef.current);
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [showAddGroup2, showAddGroup3, showAddGroup4]);

  // -- isFirstRender dirty notification --
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    props.onDirtyChange?.(true);
  }, [counts, dynamicGroup2, dynamicGroup3, dynamicGroup4]);

  // -- Expose save to parent via ref --
  useEffect(() => {
    if (!props.submitRef) return;
    props.submitRef.current = async (opts?: {
      approve?: boolean;
      sendBack?: boolean;
    }) => {
      await doSave(opts);
    };
    return () => {
      if (props.submitRef) props.submitRef.current = null;
    };
  }, [
    counts,
    dynamicGroup2,
    dynamicGroup3,
    dynamicGroup4,
    selectedSector,
    selectedDivision,
    approvalStatus,
    approvalRemark,
  ]);

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  const cycleStatus = (idx: number) => {
    setRowStatus((prev) => ({
      ...prev,
      [String(idx)]: ((prev[String(idx)] ?? 0) + 1) % statusOptions.length,
    }));
  };

  function toDigitString(v: string) {
    const digits = String(v || "").replace(/\D/g, "");
    if (digits === "") return "0";
    const n = digits.replace(/^0+/, "");
    // Limit to 15 digits to stay within JavaScript safe integer range
    return n === "" ? "0" : n.slice(0, 15);
  }

  const getDisplayValue = (key: string) => toDigitString(counts[key] ?? "0");

  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };

  const handleFreeTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const el = e.target;
    const sanitized = sanitizeMoFreeText(el.value);
    setter(sanitized);
    if (el.value !== sanitized) el.value = sanitized;
    adjustTextareaHeight(el);
  };

  const triggerWarning = (key: string) => {
    const existing = warningTimersRef.current[key];
    if (existing) window.clearTimeout(existing);
    setWarnings((s) => ({ ...s, [key]: true }));
    const t = window.setTimeout(() => {
      setWarnings((s) => ({ ...s, [key]: false }));
      warningTimersRef.current[key] = null;
    }, 1200);
    warningTimersRef.current[key] = t as unknown as number;
  };

  // ============================================================
  // TEXTAREA EDITING HANDLERS
  // ============================================================

  const handleTextareaChange = (
    key: string,
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const el = e.target;
    const raw = el.value;
    const sanitized = raw.replace(/\s/g, "");
    if (sanitized === "" || sanitized === "-") {
      setEditingRaw(sanitized);
      adjustTextareaHeight(el);
      return;
    }
    if (!/\d/.test(sanitized)) {
      triggerWarning(key);
      adjustTextareaHeight(el);
      return;
    }
    const clean = toDigitString(sanitized);
    setEditingRaw(clean);
    adjustTextareaHeight(el);
  };

  const handleTextareaPaste = (
    key: string,
    e: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const paste =
      (e.clipboardData || (window as any).clipboardData).getData("text") || "";
    const digitsOnly = paste.replace(/\D/g, "");
    if (digitsOnly === "") {
      e.preventDefault();
      triggerWarning(key);
      return;
    }
    const normalized = toDigitString(digitsOnly);
    e.preventDefault();
    const el = e.target as HTMLTextAreaElement;
    el.value = normalized;
    setEditingRaw(normalized);
    adjustTextareaHeight(el);
  };

  const handleTextareaFocus = (
    key: string,
    e: React.FocusEvent<HTMLTextAreaElement>,
  ) => {
    setEditingKey(key);
    const clean = toDigitString(counts[key] ?? "0");
    setEditingRaw(clean);
    adjustTextareaHeight(e.target as HTMLTextAreaElement);
  };

  const handleTextareaKeyDown = (
    key: string,
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
      return;
    }
    if (e.key === "Escape") {
      setEditingKey(null);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const valStr = editingRaw || "0";
      let newVal: string;
      try {
        newVal = String(BigInt(valStr) + 1n);
      } catch {
        newVal = String(Number(valStr) + 1);
      }
      const clean = toDigitString(newVal);
      setEditingRaw(clean);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const valStr = editingRaw || "0";
      let newVal: string;
      try {
        const base = BigInt(valStr);
        newVal = base > 0n ? String(base - 1n) : "0";
      } catch {
        newVal = String(Math.max(0, Number(valStr) - 1));
      }
      const clean = toDigitString(newVal);
      setEditingRaw(clean);
    }
  };

  const handleTextareaBlur = (key: string) => {
    const final = toDigitString(editingRaw);
    setCounts((s) => ({ ...s, [key]: final }));
    setEditingRaw(final);
    setEditingKey(null);
  };

  // ============================================================
  // GROUP 2 (DISCIPLINE) HANDLERS
  // ============================================================

  const openAddGroup2 = () => {
    setNewGroup2Label("");
    setNewGroup2Unit("คน");
    setCheckedItems(new Set());
    setIsOtherMode(false);
    setEditingKey(null);
    setEditingRaw("");
    setShowAddGroup2(true);
  };

  const addItemToGroup2 = (initialValue?: string) => {
    const g = dynamicGroup2.find((x) => x.key === "discipline");
    const autoGenCount = g
      ? g.items.filter((it) => String(it.key).startsWith("auto_gen")).length
      : 0;
    const newKey = `auto_gen_${autoGenCount + 1}`;
    const newItem = {
      key: newKey,
      label: sanitizeMoFreeText(newGroup2Label) || "รายการใหม่",
      unit: sanitizeMoFreeText(newGroup2Unit) || "คน",
      value: initialValue || "0",
      isActive: true,
    };
    setDynamicGroup2((prev) =>
      prev.map((pg) =>
        pg.key === "discipline" ? { ...pg, items: [...pg.items, newItem] } : pg,
      ),
    );
    setCounts((prev) => ({
      ...prev,
      [newKey]: initialValue || editingRaw || "0",
    }));
    setShowAddGroup2(false);
  };

  const handleDeactivate = (key: string) => {
    setDynamicGroup2((prev) =>
      prev.map((pg) => ({
        ...pg,
        items: pg.items.map((item) =>
          item.key === key ? { ...item, isActive: false } : item,
        ),
      })),
    );
    setCounts((prev) => ({ ...prev, [key]: "0" }));
  };

  const handleSaveModal = () => {
    if (checkedItems.size === 0) {
      // Capture the value BEFORE any state updates (React 18 batching)
      const capturedRaw = editingRaw;
      setEditingKey(null);
      if (newGroup2Label.trim() !== "") {
        const otherCount = capturedRaw || counts["__other__"] || "0";
        addItemToGroup2(otherCount);
      } else {
        setShowAddGroup2(false);
      }
      // Always reset modal form fields
      setNewGroup2Label("");
      setCheckedItems(new Set());
      setIsOtherMode(false);
      setEditingRaw("");
      setCounts((prev) => {
        const next = { ...prev };
        delete next["__other__"];
        return next;
      });
      return;
    }

    const selectedKey = Array.from(checkedItems)[0];

    // Capture the value NOW (before React batches state updates)
    const rawValue =
      editingKey === selectedKey ? editingRaw : (counts[selectedKey] ?? "0");
    const finalValue = toDigitString(rawValue);

    // Persist to counts immediately so UI reflects it
    setCounts((prev) => ({ ...prev, [selectedKey]: finalValue }));

    setDynamicGroup2((prev) => {
      const discGroup = prev.find((g) => g.key === "discipline");
      if (!discGroup) return prev;
      const exists = discGroup.items.some((it) => it.key === selectedKey);
      return prev.map((pg) => {
        if (pg.key !== "discipline") return pg;
        let items = pg.items;
        if (!exists) {
          const disc = distinctDisciplineTypes.find(
            (d) => d.key === selectedKey,
          );
          items = [
            ...items,
            {
              key: selectedKey,
              label: disc?.label ?? "รายการใหม่",
              unit: "คน",
              value: "0",
              isActive: false,
            },
          ];
        }
        items = items.map((item) => {
          if (item.key !== selectedKey) return item;
          return Number(finalValue) > 0 ? { ...item, isActive: true } : item;
        });
        return { ...pg, items };
      });
    });

    // Reset all modal form fields
    setEditingKey(null);
    setEditingRaw("");
    setNewGroup2Label("");
    setCheckedItems(new Set());
    setIsOtherMode(false);
    setShowAddGroup2(false);
  };

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ============================================================
  // GROUP 3 (MEETING) HANDLERS
  // ============================================================

  const closeGroup3Modal = () => {
    setShowAddGroup3(false);
    setEditingGroup3Index(null);
    setNewGroup3Label("");
    setNewGroup3Detail("");
    setNewGroup3Status("warning");
    setNewGroup3Note("");
  };

  const openAddGroup3 = () => {
    setEditingGroup3Index(null);
    setNewGroup3Label("");
    setNewGroup3Detail("");
    setNewGroup3Status("warning");
    setNewGroup3Note("");
    setShowAddGroup3(true);
  };

  const handleRemoveGroup3Item = (groupKey: string, itemIdx: number) => {
    setDynamicGroup3((prev) =>
      prev.map((pg) =>
        pg.key === groupKey
          ? {
              ...pg,
              items: pg.items.filter((_: any, i: number) => i !== itemIdx),
            }
          : pg,
      ),
    );
  };

  const handleOpenRow = (idx: number) => {
    const meetingGroup = dynamicGroup3.find(
      (group: any) => group.key === "meeting",
    );
    const item = meetingGroup?.items[idx];
    if (!item) return;
    setEditingGroup3Index(idx);
    setNewGroup3Label(sanitizeMoFreeText(item.label));
    setNewGroup3Detail(sanitizeMoFreeText(item.detail));
    setNewGroup3Status(item.status ?? "warning");
    setNewGroup3Note(sanitizeMoFreeText(item.note));
    setShowAddGroup3(true);
  };

  const saveGroup3Modal = () => {
    const nextItem = {
      label: sanitizeMoFreeText(newGroup3Label) || "รายการใหม่",
      detail: sanitizeMoFreeText(newGroup3Detail),
      status: newGroup3Status,
      note: sanitizeMoFreeText(newGroup3Note),
    };
    setDynamicGroup3((prev: any[]) =>
      prev.map((pg) =>
        pg.key === "meeting"
          ? {
              ...pg,
              items:
                editingGroup3Index === null
                  ? [...pg.items, nextItem]
                  : pg.items.map((item: any, index: number) =>
                      index === editingGroup3Index ? nextItem : item,
                    ),
            }
          : pg,
      ),
    );
    closeGroup3Modal();
  };

  const handleGroup3DetailChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleFreeTextChange(e, setNewGroup3Detail);
  };

  const handleGroup3NoteChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleFreeTextChange(e, setNewGroup3Note);
  };

  const handleGroup3StatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGroup3Status(e.target.value);
  };

  const handleLabelChangeGroup3 = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleFreeTextChange(e, setNewGroup3Label);
  };

  const handleLabelFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    adjustTextareaHeight(e.target as HTMLTextAreaElement);
    labelInputRef.current = e.target as HTMLTextAreaElement;
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLTextAreaElement).blur();
    }
  };

  // ============================================================
  // GROUP 4 (GUARD POST MOVEMENT) HANDLERS
  // ============================================================

  const closeGroup4Modal = () => {
    setShowAddGroup4(false);
    setEditingGroup4Index(null);
    setNewGroup4Label("");
    setNewGroup4Detail("");
    setNewGroup4Status("");
    setNewGroup4Note("");
    setIsGroup4OtherMode(false);
  };

  const openAddGroup4 = () => {
    setEditingGroup4Index(null);
    setNewGroup4Label("");
    setNewGroup4Detail("");
    setNewGroup4Status("");
    setNewGroup4Note("");
    setIsGroup4OtherMode(false);
    setShowAddGroup4(true);
  };

  const handleRemoveGroup4Item = (groupKey: string, itemIdx: number) => {
    setDynamicGroup4((prev) =>
      prev.map((pg) =>
        pg.key === groupKey
          ? { ...pg, items: pg.items.filter((_, i) => i !== itemIdx) }
          : pg,
      ),
    );
  };

  const handleOpenRowGroup4 = (idx: number) => {
    const movementGroup = dynamicGroup4.find(
      (g) => g.key === "guard_post_movement",
    );
    const item = movementGroup?.items[idx];
    if (!item) return;

    const savedStatus = item.status ?? "ปกติ";
    const isKnown = guardPostStatusesOptions.includes(savedStatus);

    setEditingGroup4Index(idx);
    setNewGroup4Label(sanitizeMoFreeText(item.label));
    setNewGroup4Detail(sanitizeMoFreeText(item.detail));
    setNewGroup4Status(sanitizeMoFreeText(savedStatus));
    setNewGroup4Note(sanitizeMoFreeText(item.note));
    setIsGroup4OtherMode(!isKnown);
    setShowAddGroup4(true);
  };

  const saveGroup4Modal = () => {
    const nextItem = {
      label: sanitizeMoFreeText(newGroup4Label) || "รายการใหม่",
      detail: sanitizeMoFreeText(newGroup4Detail),
      status: sanitizeMoFreeText(newGroup4Status),
      note: sanitizeMoFreeText(newGroup4Note),
    };

    setDynamicGroup4((prev) =>
      prev.map((pg) =>
        pg.key === "guard_post_movement"
          ? {
              ...pg,
              items:
                editingGroup4Index === null
                  ? [...pg.items, nextItem]
                  : pg.items.map((item, index) =>
                      index === editingGroup4Index ? nextItem : item,
                    ),
            }
          : pg,
      ),
    );

    closeGroup4Modal();
  };

  const handleGroup4DetailChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleFreeTextChange(e, setNewGroup4Detail);
  };

  const handleGroup4NoteChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleFreeTextChange(e, setNewGroup4Note);
  };

  const handleGroup4StatusChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    if (val === "__other__") {
      setIsGroup4OtherMode(true);
      setNewGroup4Status("");
    } else {
      setIsGroup4OtherMode(false);
      setNewGroup4Status(val);
    }
  };

  const handleLabelChangeGroup4 = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    handleFreeTextChange(e, setNewGroup4Label);
  };

  // ============================================================
  // SUBMIT / SAVE / RESET HANDLERS
  // ============================================================

  const handleReset = () => {
    const snap = initialSnapshotRef.current;
    if (!snap) {
      if (props.onCancel) props.onCancel();
      else window.history.back();
      return;
    }
    setCounts({ ...snap.counts });
    setDynamicGroup2((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((item: any) => {
          const val = snap.counts[item.key];
          return { ...item, isActive: val != null && val !== "0" };
        }),
      })),
    );
    try {
      const originalProjects = JSON.parse(snap.projectsJson) as Array<{
        name: string;
        project_name?: string;
        detail: string;
        status: string;
        note: string;
      }>;
      setDynamicGroup3([
        {
          key: "meeting",
          title: "เข้าพบผู้ว่าจ้าง",
          items: originalProjects.map((p) => ({
            label: p.project_name ?? p.name ?? "",
            detail: p.detail ?? "",
            status: p.status ?? "warning",
            note: p.note ?? "",
          })),
        },
      ]);
      setRowStatus({});
    } catch {
      setDynamicGroup3([
        { key: "meeting", title: "เข้าพบผู้ว่าจ้าง", items: [] },
      ]);
      setRowStatus({});
    }
    // Reset guard_post_movements from snapshot
    try {
      const originalMovements = JSON.parse(
        snap.guardPostMovementsJson,
      ) as Array<{
        name: string;
        detail: string;
        status: string;
        note: string;
      }>;
      setDynamicGroup4([
        {
          key: "guard_post_movement",
          title: "การเปลี่ยนแปลงจุดรักษาการณ์",
          items: originalMovements.map((m) => ({
            label: m.name ?? "",
            detail: m.detail ?? "",
            status: m.status ?? "",
            note: m.note ?? "",
          })),
        },
      ]);
    } catch {
      setDynamicGroup4([
        {
          key: "guard_post_movement",
          title: "การเปลี่ยนแปลงจุดรักษาการณ์",
          items: [],
        },
      ]);
    }
    if (props.reportData) {
      const origDivision = String(props.reportData.division_name ?? "");
      if (origDivision) setSelectedDivision(origDivision);
    }
    setEditingKey(null);
    setEditingRaw("0");
    if (props.onCancel) void props.onCancel();
  };

  const doSave = async (opts?: { approve?: boolean; sendBack?: boolean }) => {
    const payload: Record<string, any> = {
      department_id: Number(selectedSector),
      division_name: selectedDivision,
    };
    for (const g of group1) {
      for (const item of g.items) {
        payload[item.key] = Number(counts[item.key]) || 0;
      }
    }
    for (const g of group3A) {
      for (const item of g.items) {
        payload[item.key] = Number(counts[item.key]) || 0;
      }
    }
    const disciplines: Array<{ key: string; label: string; value: number }> =
      [];
    for (const g of dynamicGroup2) {
      for (const item of g.items) {
        if (item.isActive) {
          const val = Number(counts[item.key] ?? item.value ?? 0);
          if (val > 0) {
            disciplines.push({
              key: item.key,
              label: sanitizeMoFreeText(item.label),
              value: val,
            });
          }
        }
      }
    }
    payload.disciplines = disciplines;

    const projects: Array<{
      key: string;
      name: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup3) {
      g.items.forEach((it: any, i: number) => {
        projects.push({
          key: String(i + 1),
          name: sanitizeMoFreeText(it.label),
          detail: sanitizeMoFreeText(it.detail),
          status: it.status ?? "warning",
          note: sanitizeMoFreeText(it.note),
        });
      });
    }
    payload.projects = projects;

    // Guard post movements (group4)
    const guardPostMovements: Array<{
      name: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup4) {
      g.items.forEach((it: any) => {
        guardPostMovements.push({
          name: sanitizeMoFreeText(it.label),
          detail: sanitizeMoFreeText(it.detail),
          status: sanitizeMoFreeText(it.status),
          note: sanitizeMoFreeText(it.note),
        });
      });
    }
    if (guardPostMovements.length > 0)
      payload.guard_post_movements = guardPostMovements;

    if (opts?.approve) {
      payload.approved_status = "APPROVED";
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
      // Notify parent so its approvalStatus state stays in sync
      props.onApprovalStatusChange?.("APPROVED");
    } else if (opts?.sendBack) {
      payload.approved_status = "REJECTED";
      payload.approved_remark = sanitizeMoFreeText(approvalRemark);
      payload.approved_by = authEmployee?.employee_code || "ADMIN";
      payload.approved_at = new Date().toISOString();
      props.onApprovalStatusChange?.("REJECTED");
    } else {
      const isRejectedEditResubmit =
        props.isEditing && props.reportData?.approved_status === "REJECTED";
      payload.approved_status = isRejectedEditResubmit
        ? "PENDING"
        : approvalStatus;
      payload.approved_remark = sanitizeMoFreeText(approvalRemark);
      if (payload.approved_status === "APPROVED") {
        payload.approved_by = authEmployee?.employee_code || "ADMIN";
        payload.approved_at = new Date().toISOString();
      } else {
        // When reverting to PENDING, clear approval fields so the report is editable/deletable
        payload.approved_by = null;
        payload.approved_at = null;
      }
    }

    try {
      setIsUpdating(true);
      const startTime = Date.now();

      const reportId = props.reportData?.id as number | undefined;
      if (reportId) {
        await updateReport(reportId, payload as any);
      } else {
        await createReport(payload as any);
      }

      // Ensure minimum 1.5-second display time
      const elapsed = Date.now() - startTime;
      const remaining = MIN_UPDATE_MS - elapsed;
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          updateTimerRef.current = setTimeout(resolve, remaining);
        });
      }

      setIsUpdating(false);
      if (!opts?.sendBack) {
        setShowSuccess(true);
      }
    } catch (err: unknown) {
      setIsUpdating(false);
      const msg = err instanceof Error ? err.message : String(err);
      // If the report was deleted by someone else (404), tell the parent to navigate back
      if (err instanceof HttpError && err.status === 404) {
        props.onReportNotFound?.(msg);
        return;
      }
      setFailMessage(msg);
      setShowFail(true);
    }
  };

  const onSubmit = async (
    e?: React.FormEvent,
    opts?: { approve?: boolean; sendBack?: boolean },
  ) => {
    e?.preventDefault();
    if (!hasAnyData() && !opts?.approve) return;
    if (e && !opts?.approve) {
      setShowConfirmSubmit(true);
      return;
    }
    await doSave(opts);
  };

  const onSubmitWithApproval = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const hasFormDataChanges = hasAnyData();
    const originalApprovalStatus =
      (props.reportData?.approved_status as
        | "PENDING"
        | "APPROVED"
        | "REJECTED") || "PENDING";
    const originalApprovalRemark =
      (props.reportData?.approved_remark as string) || "";
    const hasApprovalChanges =
      approvalStatus !== originalApprovalStatus ||
      approvalRemark !== originalApprovalRemark;
    if (!hasFormDataChanges && !hasApprovalChanges) return;
    if (hasFormDataChanges) {
      setShowConfirmSubmit(true);
    } else {
      await doSave();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <form
        className={styles["guts-Mo-layout"]}
        onSubmit={(e) => onSubmitWithApproval(e)}
      >
        {/* หน่วยงาน / Sector row */}
        <div className={styles["sector-table-wrapper"]}>
          <table className={styles["mo-table"]}>
            <thead>
              <tr>
                <th
                  colSpan={4}
                  className={`${styles["location-table-header"]} ${styles["no-border"]}`}
                >
                  <div className={styles["sector-header-fullwidth"]}>
                    {selectedSectorName}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={1} className={`${styles["first-column-cell"]} `}>
                  <MapPin className={styles["pin-icon"]} />
                </td>
                <td
                  colSpan={3}
                  className={styles["sector-cell-bodytext"]}
                  style={{ gap: 8 }}
                >
                  <div className={styles["sector-cell-bodytext-inner"]}>
                    <span style={{ color: "var(--brandDark, #2d6a4f)" }}>
                      {selectedDivision}
                    </span>
                    {props.reportData?.approved_status && (
                      <span
                        className={`${styles["status-pill"]} ${getWorkflowStatusClass(workflowDisplayStatus.tone)}`}
                      >
                        {workflowDisplayStatus.label}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* group1 */}
        {group1.map((g, idx) => (
          <div
            key={g.key}
            ref={wrapperRef}
            className={styles["mo-table-wrapper"]}
          >
            <table className={styles["mo-table"]}>
              <thead>
                <tr>
                  <th
                    colSpan={1}
                    className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                  >
                    {idx + 1}
                  </th>
                  <th
                    colSpan={3}
                    className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                  >
                    <div
                      className={`${styles["mo-header"]}`}
                      onClick={() =>
                        setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <p>{g.title}</p>
                      <div>
                        {openGroups[g.key] ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              {openGroups[g.key] && (
                <tbody>
                  {g.items.map((r, itemIdx) => (
                    <tr key={r.key}>
                      <td className={styles["first-column-cell"]}>
                        {idx + 1}.{itemIdx + 1}
                      </td>
                          <td className={`${styles["second-column-cell"]}`}>
                            {fieldLabel(r.label)}
                          </td>
                      <td
                        className={`${styles["third-column-cell"]} ${counts[r.key]?.toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                      >
                        <textarea
                          ref={inputRef as any}
                          className={`${styles["third-column-textarea"]}`}
                          value={
                            editingKey === r.key
                              ? editingRaw
                              : getDisplayValue(r.key)
                          }
                          rows={1}
                          disabled={!props.isEditing}
                          style={{
                            fontStyle:
                              (editingKey === r.key
                                ? editingRaw
                                : getDisplayValue(r.key)) === "0"
                                ? "italic"
                                : "normal",
                          }}
                          onChange={(e) => handleTextareaChange(r.key, e)}
                          onPaste={(e) => handleTextareaPaste(r.key, e)}
                          onFocus={(e) => handleTextareaFocus(r.key, e)}
                          onKeyDown={(e) => handleTextareaKeyDown(r.key, e)}
                          onBlur={() => handleTextareaBlur(r.key)}
                        />
                      </td>
                      <td className={`${styles["fourth-column-cell"]}`}>
                        {r.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        ))}

        {/* Add group2 modal */}
        {showAddGroup2 && (
          <div
            className={styles["modal-overlay"]}
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowAddGroup2(false);
            }}
          >
            <div
              className={styles["modal"]}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles["modal-header"]}>
                <h3>เพิ่มข้อมูลวินัยและการลงโทษ</h3>
              </div>
              <div className={styles["modal-body"]}>
                <div className={styles["mo-table-wrapper"]}>
                  <table className={styles["mo-table"]}>
                    <thead>
                      <tr>
                        <th
                          colSpan={1}
                          className={`${styles["first-column-cell"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                        >
                          5
                        </th>
                        <th
                          colSpan={4}
                          className={`${styles["mo-table-header"]} ${styles["no-border"]} ${styles["mo-table-header-red"]}`}
                        >
                          <div
                            className={`${styles["mo-header"]}`}
                            style={{
                              padding: "6px 8px",
                              justifyContent: "flex-start",
                            }}
                          >
                            <p className={styles["mo-header-red-text"]}>
                              วินัยและการลงโทษ
                            </p>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const activeKeys = new Set(
                          dynamicGroup2
                            .filter((g) => g.key === "discipline")
                            .flatMap((g) =>
                              g.items
                                .filter((r: any) => r.isActive === true)
                                .map((r: any) => r.key),
                            ),
                        );
                        const availableOptionsRaw = [
                          // Distinct types from API that aren't already active
                          ...(distinctDisciplineTypes.length > 0
                            ? distinctDisciplineTypes.filter(
                                (d) => !activeKeys.has(d.key),
                              )
                            : []),
                          // Inactive discipline items (previously deactivated)
                          ...dynamicGroup2
                            .filter((g) => g.key === "discipline")
                            .flatMap((g) =>
                              g.items.filter(
                                (r: any) =>
                                  r.isActive === false &&
                                  String(r.key).startsWith("discipline_"),
                              ),
                            )
                            .map((r: any) => ({
                              key: r.key,
                              label: r.label,
                            })),
                        ];
                        const availableOptions = Array.from(
                          new Map(
                            availableOptionsRaw.map((o) => [o.key, o]),
                          ).values(),
                        );
                        const selected =
                          availableOptions.length > 0
                            ? (availableOptions.find((r) =>
                                checkedItems.has(r.key),
                              ) ?? null)
                            : null;
                        const activeCount = dynamicGroup2
                          .filter((g) => g.key === "discipline")
                          .flatMap((g) =>
                            g.items.filter((r: any) => r.isActive === true),
                          ).length;
                        return (
                          <tr>
                            <td className={styles["first-column-cell"]}>
                              5.{activeCount + 1}
                            </td>
                            <td
                              className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                              colSpan={2}
                              style={{ position: "relative" }}
                            >
                              {isOtherMode ? (
                                <>
                                  <textarea
                                    className={`${styles["third-column-textarea"]} ${styles["third-column-textarea-danger"]}`}
                                    value={newGroup2Label}
                                    placeholder="ระบุรายการอื่น..."
                                    rows={1}
                                    onChange={(e) => {
                                      handleFreeTextChange(
                                        e,
                                        setNewGroup2Label,
                                      );
                                    }}
                                    onKeyDown={handleLabelKeyDown}
                                    style={{
                                      paddingRight: 28,
                                      textAlign: "left",
                                      fontSize: 13,
                                      fontWeight: 400,
                                    }}
                                  />
                                  <X
                                    size={18}
                                    style={{
                                      position: "absolute",
                                      top: 5,
                                      right: 8,
                                      cursor: "pointer",
                                      color: "#fff",
                                      background: "rgba(183, 28, 28, 0.7)",
                                      borderRadius: "50%",
                                      padding: 1,
                                    }}
                                    onClick={() => {
                                      setIsOtherMode(false);
                                      setNewGroup2Label("");
                                      setCheckedItems(new Set());
                                    }}
                                  />
                                </>
                              ) : (
                                <select
                                  className={styles["sector-cell-select"]}
                                  style={{
                                    width: "100%",
                                    maxWidth: "100%",
                                    background: "transparent",
                                    color: "inherit",
                                    border: "1px solid #ccc",
                                    padding: "4px 8px",
                                    fontSize: 14,
                                  }}
                                  value={selected?.key ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "__other__") {
                                      setIsOtherMode(true);
                                      setCheckedItems(new Set());
                                    } else {
                                      setIsOtherMode(false);
                                      setCheckedItems(
                                        val ? new Set([val]) : new Set(),
                                      );
                                    }
                                  }}
                                >
                                  <option value="">-- เลือกรายการ --</option>
                                  {availableOptions.map((r) => (
                                    <option key={r.key} value={r.key}>
                                      {r.label}
                                    </option>
                                  ))}
                                  <option value="__other__">-- อื่นๆ --</option>
                                </select>
                              )}
                            </td>
                            <td className={styles["third-column-cell"]}>
                              {(selected ||
                                (isOtherMode &&
                                  newGroup2Label.trim() !== "")) && (
                                <textarea
                                  className={`${styles["third-column-textarea"]} ${styles["third-column-textarea-danger"]}`}
                                  value={
                                    selected
                                      ? editingKey === selected.key
                                        ? editingRaw
                                        : getDisplayValue(selected.key) === "0"
                                          ? ""
                                          : getDisplayValue(selected.key)
                                      : editingKey === "__other__"
                                        ? editingRaw
                                        : getDisplayValue("__other__") === "0"
                                          ? ""
                                          : getDisplayValue("__other__")
                                  }
                                  placeholder="0"
                                  rows={1}
                                  onChange={(e) =>
                                    selected
                                      ? handleTextareaChange(selected.key, e)
                                      : handleTextareaChange("__other__", e)
                                  }
                                  onFocus={(e) =>
                                    selected
                                      ? handleTextareaFocus(selected.key, e)
                                      : handleTextareaFocus("__other__", e)
                                  }
                                  onKeyDown={(e) =>
                                    selected
                                      ? handleTextareaKeyDown(selected.key, e)
                                      : handleTextareaKeyDown("__other__", e)
                                  }
                                  onBlur={() =>
                                    selected
                                      ? handleTextareaBlur(selected.key)
                                      : handleTextareaBlur("__other__")
                                  }
                                />
                              )}
                            </td>
                            <td className={styles["fourth-column-cell"]}>
                              {"คน"}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles["modal-footer"]}>
                <button
                  type="button"
                  className={styles["btn-secondary"]}
                  onClick={() => {
                    setShowAddGroup2(false);
                    setNewGroup2Label("");
                    setCheckedItems(new Set());
                    setIsOtherMode(false);
                    setEditingKey(null);
                    setEditingRaw("");
                    setCounts((prev) => {
                      const next = { ...prev };
                      delete next["__other__"];
                      return next;
                    });
                  }}
                >
                  ปิดหน้าจอ
                </button>
                <button
                  type="button"
                  className={styles["btn-primary"]}
                  onClick={handleSaveModal}
                  disabled={
                    (checkedItems.size === 0 && newGroup2Label.trim() === "") ||
                    Number(
                      isOtherMode
                        ? editingKey === "__other__"
                          ? editingRaw
                          : (counts["__other__"] ?? "0")
                        : checkedItems.size > 0
                          ? editingKey === [...checkedItems][0]
                            ? editingRaw
                            : (counts[[...checkedItems][0]] ?? "0")
                          : "0",
                    ) < 1
                  }
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* group2 */}
        {dynamicGroup2.map((g, idx) => (
          <div
            key={g.key}
            ref={wrapperRef}
            className={styles["mo-table-wrapper"]}
          >
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
                    colSpan={props.isEditing ? 4 : 3}
                    className={`${styles["mo-table-header"]} ${styles["mo-table-header-red"]} ${styles["no-border"]}`}
                  >
                    <div
                      className={`${styles["mo-header"]}`}
                      onClick={() =>
                        setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <p
                        className={
                          g.key === "discipline"
                            ? styles["mo-header-red-text"]
                            : ""
                        }
                      >
                        {g.title}
                      </p>
                      <div>
                        {openGroups[g.key] ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              {openGroups[g.key] && (
                <tbody>
                  {(() => {
                    const activeItems = g.items.filter(
                      (r: any) => r.isActive === true,
                    );
                    if (activeItems.length === 0 && !props.isEditing) {
                      return (
                        <tr>
                          <td
                            colSpan={props.isEditing ? 5 : 4}
                            style={{
                              textAlign: "center",
                              verticalAlign: "middle",
                              color: "#9ca3af",
                              fontStyle: "italic",
                              padding: "10px",
                              border: "0.8px solid #ccc",
                            }}
                          >
                            ไม่มีข้อมูลวินัยและการลงโทษ
                          </td>
                        </tr>
                      );
                    }

                    return activeItems.map((r: any, itemIdx: number) => (
                      <tr key={r.key}>
                        <td className={styles["first-column-cell"]}>
                          5.{itemIdx + 1}
                        </td>
                        <td className={styles["group3-second-column-cell"]}>
                          {fieldLabel(r.label)}
                        </td>
                        <td
                          className={`${styles["third-column-cell"]} ${counts[r.key]?.toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                        >
                          <textarea
                            ref={inputRef as any}
                            className={`${styles["third-column-textarea"]} ${styles["third-column-textarea-danger"]}`}
                            value={
                              editingKey === r.key
                                ? editingRaw
                                : getDisplayValue(r.key)
                            }
                            rows={1}
                            disabled={!props.isEditing}
                            style={{
                              fontStyle:
                                (editingKey === r.key
                                  ? editingRaw
                                  : getDisplayValue(r.key)) === "0"
                                  ? "italic"
                                  : "normal",
                            }}
                            onChange={(e) => handleTextareaChange(r.key, e)}
                            onPaste={(e) => handleTextareaPaste(r.key, e)}
                            onFocus={(e) => handleTextareaFocus(r.key, e)}
                            onKeyDown={(e) => handleTextareaKeyDown(r.key, e)}
                            onBlur={() => handleTextareaBlur(r.key)}
                          />
                        </td>
                        <td
                          className={`${styles["fourth-column-cell"]} ${styles["fourth-column-cell-danger"]}`}
                        >
                          {r.unit}
                        </td>
                        {props.isEditing && (
                          <td
                            className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                            onClick={() => handleDeactivate(r.key)}
                          >
                            ลบ
                          </td>
                        )}
                      </tr>
                    ));
                  })()}
                  {props.isEditing && (
                    <tr style={{ cursor: "pointer" }} onClick={openAddGroup2}>
                      <td className={styles["first-column-cell"]}>
                        5.
                        {g.items.filter((r: any) => r.isActive === true)
                          .length + 1}
                      </td>
                      <td colSpan={4} className={styles["add-row-cell"]}>
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลวินัยและการลงโทษ
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              )}
            </table>
          </div>
        ))}

        {/* Add group3 modal */}
        {showAddGroup3 && (
          <div
            className={styles["modal-overlay"]}
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeGroup3Modal();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeGroup3Modal();
            }}
          >
            <div
              className={styles["modal"]}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles["modal-header"]}>
                <h3>
                  {editingGroup3Index === null
                    ? "เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง"
                    : "รายละเอียดการเข้าพบผู้ว่าจ้าง"}
                </h3>
              </div>
              <div className={styles["modal-body"]}>
                <div className={styles["mo-table-wrapper"]}>
                  <table className={styles["mo-table"]}>
                    <thead>
                      <tr>
                        <th
                          colSpan={1}
                          className={`${styles["first-column-cell"]} ${styles["no-border"]} `}
                        >
                          6.
                        </th>
                        <th
                          colSpan={4}
                          className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                        >
                          <div
                            className={`${styles["mo-header"]}`}
                            style={{
                              padding: "6px 8px",
                              justifyContent: "flex-start",
                            }}
                          >
                            <p className={styles["mo-header-red-text"]}>
                              เข้าพบผู้ว่าจ้าง
                            </p>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles["first-column-cell"]}>
                          {(() => {
                            if (editingGroup3Index !== null)
                              return `6.${editingGroup3Index + 1}`;
                            const grp = dynamicGroup3.find(
                              (x: any) => x.key === "meeting",
                            );
                            return `6.${grp ? grp.items.length + 1 : 1}`;
                          })()}
                        </td>
                        <td
                          colSpan={3}
                          className={`${styles["group3-second-column-cell"]} ${styles["second-column-cell-left"]}`}
                        >
                          <textarea
                            ref={labelInputRef as any}
                            className={`${styles["third-column-textarea"]} ${styles["textarea-left"]}`}
                            value={newGroup3Label}
                            rows={1}
                            onChange={handleLabelChangeGroup3}
                            onKeyDown={handleLabelKeyDown}
                            onPaste={() => {}}
                            onFocus={handleLabelFocus}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น โครงการ XXXXX"
                            readOnly={!props.isEditing}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className={styles["first-column-cell"]}>
                          รายละเอียด
                        </td>
                        <td
                          className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                          colSpan={2}
                        >
                          <textarea
                            ref={labelInputRef as any}
                            className={`${styles["group3-popup-third-column-textarea1"]} ${styles["textarea-left"]}`}
                            value={newGroup3Detail}
                            rows={1}
                            onChange={handleGroup3DetailChange}
                            onPaste={() => {}}
                            onFocus={handleLabelFocus}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น รายละเอียดการเข้าพบ"
                            readOnly={!props.isEditing}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className={styles["first-column-cell"]}>สถานะ</td>
                        <td className={`${styles["second-column-cell"]} `}>
                          <div className={styles["radio-group"]}>
                            {["warning", "danger"].map((val, i) => (
                              <label key={val} className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value={val}
                                  checked={newGroup3Status === val}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                  disabled={!props.isEditing}
                                />
                                <span>{["ผิดปกติ", "ฉุกเฉิน"][i]}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className={styles["first-column-cell"]}>
                          หมายเหตุ
                        </td>
                        <td
                          className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                          colSpan={2}
                        >
                          <textarea
                            ref={labelInputRef as any}
                            className={`${styles["group3-popup-third-column-textarea2"]} ${styles["textarea-left"]}`}
                            value={newGroup3Note}
                            rows={1}
                            onChange={handleGroup3NoteChange}
                            onPaste={() => {}}
                            onFocus={handleLabelFocus}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น หมายเหตุเพิ่มเติม"
                            readOnly={!props.isEditing}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles["modal-footer"]}>
                <button
                  type="button"
                  className={styles["btn-secondary"]}
                  onClick={closeGroup3Modal}
                >
                  {props.isEditing ? "ปิดหน้าจอ" : "ปิด"}
                </button>
                {props.isEditing && (
                  <button
                    type="button"
                    className={styles["btn-primary"]}
                    onClick={saveGroup3Modal}
                    disabled={newGroup3Label.trim() === ""}
                  >
                    บันทึก
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* group3 */}
        {dynamicGroup3.map((g: any) => {
          const group3AGroup = group3A[0];
          const group3AOffset = group3AGroup.items.length;

          return (
            <div
              key={g.key}
              ref={wrapperRef}
              className={styles["mo-table-wrapper"]}
            >
              <table className={styles["mo-table"]}>
                <thead>
                  <tr>
                    <th
                      colSpan={1}
                      className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                    >
                      6.
                    </th>
                    <th
                      colSpan={props.isEditing ? 5 : 4}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div
                        className={`${styles["mo-header"]}`}
                        onClick={() =>
                          setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <p className={styles["mo-header-red-text"]}>{g.title}</p>
                        <div>
                          {openGroups[g.key] ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                {openGroups[g.key] && (
                  <tbody>
                    {group3AGroup.items.map((r, itemIdx) => (
                      <tr key={r.key}>
                        <td className={styles["first-column-cell"]}>
                          6.{itemIdx + 1}
                        </td>
                        <td className={styles["group3-second-column-cell"]}>
                          {fieldLabel(r.label)}
                        </td>
                        <td
                          className={`${styles["third-column-cell"]} ${counts[r.key]?.toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                        >
                          <textarea
                            ref={inputRef as any}
                            className={`${styles["third-column-textarea"]}`}
                            value={
                              editingKey === r.key
                                ? editingRaw
                                : getDisplayValue(r.key)
                            }
                            rows={1}
                            disabled={!props.isEditing}
                            style={{
                              fontStyle:
                                (editingKey === r.key
                                  ? editingRaw
                                  : getDisplayValue(r.key)) === "0"
                                  ? "italic"
                                  : "normal",
                            }}
                            onChange={(e) => handleTextareaChange(r.key, e)}
                            onPaste={(e) => handleTextareaPaste(r.key, e)}
                            onFocus={(e) => handleTextareaFocus(r.key, e)}
                            onKeyDown={(e) => handleTextareaKeyDown(r.key, e)}
                            onBlur={() => handleTextareaBlur(r.key)}
                          />
                        </td>
                        <td
                          colSpan={props.isEditing ? 2 : 1}
                          className={`${styles["fourth-column-cell"]}`}
                        >
                          {r.unit}
                        </td>
                      </tr>
                    ))}
                    {g.items.length === 0 && !props.isEditing ? (
                      <tr>
                        <td
                          colSpan={props.isEditing ? 5 : 4}
                          style={{
                            textAlign: "center",
                            verticalAlign: "middle",
                            color: "#9ca3af",
                            fontStyle: "italic",
                            padding: "10px",
                            border: "0.8px solid #ccc",
                          }}
                        >
                          ไม่มีข้อมูลโครงการ
                        </td>
                      </tr>
                    ) : (
                      g.items.map((r: any, itemIdx: number) => (
                        <tr key={itemIdx}>
                          <td className={styles["first-column-cell"]}>
                            6.{itemIdx + group3AOffset + 1}
                          </td>
                          <td className={styles["group3-second-column-cell"]}>
                            <div
                              onClick={() =>
                                props.isEditing
                                  ? handleOpenRow(itemIdx)
                                  : undefined
                              }
                              style={{
                                cursor: props.isEditing ? "pointer" : "default",
                              }}
                            >
                              {r.label}
                            </div>
                          </td>
                          <td
                            className={styles["group3-third-column-cell"]}
                            onClick={() => {
                              if (props.isEditing) {
                                handleOpenRow(itemIdx);
                              } else {
                                cycleStatus(itemIdx);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (props.isEditing) {
                                  handleOpenRow(itemIdx);
                                } else {
                                  cycleStatus(itemIdx);
                                }
                              }
                            }}
                          >
                            {(() => {
                              const key =
                                r.status ??
                                statusOptions[rowStatus[String(itemIdx)] ?? 0]
                                  .key;
                              const opt =
                                statusOptions.find((s) => s.key === key) ??
                                statusOptions[0];
                              return (
                                <span
                                  className={`${styles["status-badge"]} ${styles[`status-${key}`]}`}
                                >
                                  {opt.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td
                            className={`${styles["group3-fourth-column-cell"]} `}
                          >
                            <button
                              type="button"
                              className={styles["action-link"]}
                              onClick={() => handleOpenRow(itemIdx)}
                            >
                              คลิกดู
                            </button>
                          </td>
                          {props.isEditing && (
                            <td
                              className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                              onClick={() =>
                                handleRemoveGroup3Item(g.key, itemIdx)
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleRemoveGroup3Item(g.key, itemIdx);
                                }
                              }}
                            >
                              ลบ
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  {props.isEditing && (
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={openAddGroup3}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openAddGroup3();
                        }
                      }}
                    >
                      <td className={styles["first-column-cell"]}>
                        6.{g.items.length + group3AOffset + 1}
                      </td>
                      <td
                        colSpan={props.isEditing ? 4 : 3}
                        className={styles["add-row-cell"]}
                      >
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง
                        </div>
                      </td>
                    </tr>
                  )}
                  </tbody>
                )}
              </table>
            </div>
          );
        })}

        {/* ---- Group 4 Add/Edit Modal (guard post Movement) ---- */}
        {showAddGroup4 && (
          <div
            className={styles["modal-overlay"]}
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeGroup4Modal();
            }}
          >
            <div
              className={styles["modal"]}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles["modal-header"]}>
                <h3>
                  {editingGroup4Index === null
                    ? "เพิ่มข้อมูลเปลี่ยนแปลงจุดรักษาการณ์"
                    : "รายละเอียดการเปลี่ยนแปลงจุดรักษาการณ์"}
                </h3>
              </div>
              <div className={styles["modal-body"]}>
                <div className={styles["mo-table-wrapper"]}>
                  <table className={styles["mo-table"]}>
                    <thead>
                      <tr>
                        <th
                          colSpan={1}
                          className={`${styles["first-column-cell"]} ${styles["no-border"]} `}
                        >
                          7.
                        </th>
                        <th
                          colSpan={4}
                          className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                        >
                          <div
                            className={`${styles["mo-header"]}`}
                            style={{
                              padding: "6px 8px",
                              justifyContent: "flex-start",
                            }}
                          >
                            <p className={styles["mo-header-red-text"]}>
                              การเปลี่ยนแปลงจุดรักษาการณ์
                            </p>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles["first-column-cell"]}>
                          {(() => {
                            if (editingGroup4Index !== null) {
                              return `7.${editingGroup4Index + 1}`;
                            }
                            const grp = dynamicGroup4.find(
                              (x) => x.key === "guard_post_movement",
                            );
                            return `7.${grp ? grp.items.length + 1 : 1}`;
                          })()}
                        </td>
                        <td
                          colSpan={3}
                          className={`${styles["group4-second-column-cell"]} ${styles["second-column-cell-left"]}`}
                        >
                          <textarea
                            ref={labelInputRef as any}
                            className={`${styles["third-column-textarea"]} ${styles["textarea-left"]}`}
                            value={newGroup4Label}
                            rows={1}
                            onChange={handleLabelChangeGroup4}
                            onKeyDown={handleLabelKeyDown}
                            onPaste={() => {
                              /* allow any text paste */
                            }}
                            onFocus={handleLabelFocus}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น การเปลี่ยนแปลงจุดรักษาการณ์"
                            readOnly={!props.isEditing}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className={styles["first-column-cell"]}>สถานะ</td>
                        <td
                          className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                          colSpan={2}
                          style={{ position: "relative" }}
                        >
                          {isGroup4OtherMode ? (
                            <div style={{ paddingLeft: 8 }}>
                              <textarea
                                className={`${styles["third-column-textarea"]} ${styles["third-column-textarea-danger"]}`}
                                value={newGroup4Status}
                                placeholder="ระบุสถานะอื่น..."
                                rows={1}
                                onChange={(e) => {
                                  handleFreeTextChange(
                                    e,
                                    setNewGroup4Status,
                                  );
                                }}
                                onFocus={handleLabelFocus}
                                onKeyDown={handleLabelKeyDown}
                                onBlur={(e) =>
                                  adjustTextareaHeight(
                                    e.target as HTMLTextAreaElement,
                                  )
                                }
                                style={{
                                  paddingRight: 28,
                                  textAlign: "left",
                                  fontSize: 12,
                                  fontWeight: 400,
                                }}
                                readOnly={!props.isEditing}
                              />
                              <X
                                size={18}
                                style={{
                                  position: "absolute",
                                  top: 5,
                                  right: 8,
                                  cursor: "pointer",
                                  background: "rgba(183, 28, 28, 0.7)",
                                  borderRadius: "50%",
                                  padding: 1,
                                  color: "#fff",
                                }}
                                onClick={() => {
                                  setIsGroup4OtherMode(false);
                                  setNewGroup4Status("");
                                }}
                              />
                            </div>
                          ) : (
                            <select
                              className={styles["sector-cell-select"]}
                              style={{
                                width: "100%",
                                maxWidth: "100%",
                                background: "transparent",
                                color: "inherit",
                                border: "1px solid #ccc",
                                padding: "4px 8px",
                                fontSize: 12,
                              }}
                              value={newGroup4Status}
                              onChange={handleGroup4StatusChange}
                              disabled={!props.isEditing}
                            >
                              <option value="">-- เลือกสถานะ --</option>
                              {guardPostStatusesOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                              <option value="__other__">-- อื่นๆ --</option>
                            </select>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className={styles["first-column-cell"]}>
                          รายละเอียด
                        </td>
                        <td
                          className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                          colSpan={2}
                        >
                          <textarea
                            ref={labelInputRef as any}
                            className={`${styles["group4-popup-third-column-textarea1"]} ${styles["textarea-left"]}`}
                            value={newGroup4Detail}
                            rows={1}
                            onChange={handleGroup4DetailChange}
                            onPaste={() => {
                              /* allow any text paste */
                            }}
                            onFocus={handleLabelFocus}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น รายละเอียดการเปลี่ยนแปลง"
                            readOnly={!props.isEditing}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className={styles["first-column-cell"]}>
                          หมายเหตุ
                        </td>
                        <td
                          className={`${styles["second-column-cell"]} ${styles["textarea-cell"]}`}
                          colSpan={2}
                        >
                          <textarea
                            ref={labelInputRef as any}
                            className={`${styles["group4-popup-third-column-textarea2"]} ${styles["textarea-left"]}`}
                            value={newGroup4Note}
                            rows={1}
                            onChange={handleGroup4NoteChange}
                            onPaste={() => {
                              /* allow any text paste */
                            }}
                            onFocus={handleLabelFocus}
                            onBlur={(e) =>
                              adjustTextareaHeight(
                                e.target as HTMLTextAreaElement,
                              )
                            }
                            placeholder="เช่น หมายเหตุเพิ่มเติม"
                            readOnly={!props.isEditing}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles["modal-footer"]}>
                <button
                  type="button"
                  className={styles["btn-secondary"]}
                  onClick={closeGroup4Modal}
                >
                  {props.isEditing ? "ปิดหน้าจอ" : "ปิด"}
                </button>
                {props.isEditing && (
                  <button
                    type="button"
                    className={styles["btn-primary"]}
                    onClick={saveGroup4Modal}
                    disabled={
                      newGroup4Label.trim() === "" ||
                      newGroup4Status.trim() === ""
                    }
                  >
                    บันทึก
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Section 7: การเปลี่ยนแปลงจุดรักษาการณ์ (Dynamic Group 4) ---- */}
        {dynamicGroup4.map((g) => (
          <div
            key={g.key}
            ref={wrapperRef}
            className={styles["mo-table-wrapper"]}
          >
            <table className={styles["mo-table"]}>
              <thead>
                <tr>
                  <th
                    colSpan={1}
                    className={`${styles["first-column-cell"]} ${styles["no-border"]}`}
                  >
                    7.
                  </th>
                  <th
                    colSpan={props.isEditing ? 5 : 4}
                    className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                  >
                    <div
                      className={`${styles["mo-header"]}`}
                      onClick={() =>
                        setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <p className={styles["mo-header-red-text"]}>{g.title}</p>
                      <div>
                        {openGroups[g.key] ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              {openGroups[g.key] && (
                <tbody>
                  {g.items.length === 0 && !props.isEditing ? (
                    <tr>
                      <td
                        colSpan={props.isEditing ? 5 : 4}
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          color: "#9ca3af",
                          fontStyle: "italic",
                          padding: "10px",
                          border: "0.8px solid #ccc",
                        }}
                      >
                        ไม่มีข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์
                      </td>
                    </tr>
                  ) : (
                    g.items.map((r: any, itemIdx: number) => (
                      <tr key={itemIdx}>
                        <td className={styles["first-column-cell"]}>
                          7.{itemIdx + 1}
                        </td>
                        <td className={styles["group3-second-column-cell"]}>
                          {r.label}
                        </td>
                        <td className={`${styles["group4-third-column-cell"]}`}>
                          {r.status}
                        </td>
                        <td
                          className={`${styles["group3-fourth-column-cell"]} `}
                        >
                          <button
                            type="button"
                            className={styles["action-link"]}
                            onClick={() => handleOpenRowGroup4(itemIdx)}
                          >
                            คลิกดู
                          </button>
                        </td>
                        {props.isEditing && (
                          <td
                            className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                            onClick={() =>
                              handleRemoveGroup4Item(g.key, itemIdx)
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleRemoveGroup4Item(g.key, itemIdx);
                              }
                            }}
                          >
                            ลบ
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                  {props.isEditing && (
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={openAddGroup4}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openAddGroup4();
                        }
                      }}
                    >
                      <td className={styles["first-column-cell"]}>
                        7.{g.items.length + 1}
                      </td>
                      <td
                        colSpan={props.isEditing ? 4 : 3}
                        className={styles["add-row-cell"]}
                      >
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              )}
            </table>
          </div>
        ))}
      </form>

      {/* Signature section commented out
      <div className={styles["signature-section"]}>
        <div className={styles["signature-slot-left"]}>
          <div className={styles["signature-title"]}>ผู้ บันทึก:</div>
          <div className={styles["signature-line"]}>
            {reportItem?.created_by || "ADMIN"}
          </div>
        </div>
        <div className={styles["signature-slot-right"]}>
          <div className={styles["signature-title"]}>ผู้ อำนวยงาน:</div>
          <div className={styles["signature-line"]}>
            {reportItem?.approved_by || "--------"}
          </div>
        </div>
      </div>
      */}

      {/* Save / cancel buttons — only when editing */}
      <div className={`${styles["guts-Mo-actions"]} `}>
        {props.isEditing && (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              gap: "10px",
            }}
          >
            <button
              type="button"
              className={`${styles["guts-save-report-btn"]} `}
              disabled={!isDirty || isUpdating}
              style={
                !isDirty || isUpdating
                  ? { opacity: 0.35, cursor: "not-allowed" }
                  : {}
              }
              onClick={() => {
                if (isDirty) setShowConfirmSubmit(true);
              }}
            >
              บันทึกรายงาน
            </button>
            <button
              type="button"
              className={styles["guts-cancel-btn"]}
              onClick={() => {
                if (isDirty) {
                  setShowConfirmCancel(true);
                } else if (props.onCancel) {
                  props.onCancel();
                }
              }}
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>

      <MoLoadingPopup open={isUpdating} message="กำลังบันทึกข้อมูล..." />

      <ConfirmCancelDialog
        open={showConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false);
          handleReset();
        }}
      />
      <ConfirmSubmitDialog
        open={showConfirmSubmit}
        title="ยืนยันบันทึกการแก้ไข?"
        description="ระบบจะบันทึกข้อมูลที่แก้ไขทั้งหมด"
        onCancel={() => setShowConfirmSubmit(false)}
        onConfirm={async () => {
          setShowConfirmSubmit(false);
          await doSave();
        }}
      />
      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (props.onSaved) props.onSaved();
          else if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="success"
        title="บันทึกรายงานสำเร็จ!"
        description="ระบบได้ทำการบันทึกข้อมูลของคุณเรียบร้อยแล้ว"
      />
      <InfoModel
        open={showFail}
        onClose={async () => {
          setShowFail(false);
          await props.onRefreshData?.();
          handleReset();
        }}
        variant="error"
        title="เกิดข้อผิดพลาดในการบันทึก"
        description={failMessage}
      />
    </>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, MapPin, PlusIcon, X } from "lucide-react";
import styles from "./MoNewForm.module.css";
import { useStore } from "../../store/store";
import { ConfirmCancelDialog, InfoModel, MoLoadingPopup } from "./popup";
import { sanitizeMoFreeText } from "../../utils/mo/textSanitizer";

// ============================================================
// TYPES & INTERFACES
// ============================================================

export type EmployeeDepartment = {
  id: number;
  department: string;
};

type DivisionOption = {
  id: number;
  name: string;
  shortName: string;
};

export type DepartmentOption = {
  department: EmployeeDepartment;
  divisions: DivisionOption[];
};

type Props = {
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  selectedDivision?: string;
  departmentOptions?: DepartmentOption[];
  usedDivisions?: string[];
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

/** Minimum time (ms) the submission loading popup must display */
const MIN_SUBMIT_MS = 2000;

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
      { key: "leave_personal_count", label: "ลากิจ", unit: "คน", value: "0" },
      { key: "leave_sick_count", label: "ลาป่วย", unit: "คน", value: "0" },
      { key: "leave_absent_count", label: "ขาดงาน", unit: "คน", value: "0" },
      {
        key: "leave_deserted_count",
        label: "หนีหาย",
        unit: "คน",
        value: "0",
      },
      { key: "leave_resigned_count", label: "ลาออก", unit: "คน", value: "0" },
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
      { key: "shift_18_count", label: "18 ชั่วโมง", unit: "คน", value: "0" },
      { key: "shift_24_count", label: "24 ชั่วโมง", unit: "คน", value: "0" },
      { key: "shift_36_count", label: "36 ชั่วโมง", unit: "คน", value: "0" },
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
const group2DefaultItems = [
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
        isActive: false,
      },
      {
        key: "employer_problem_count",
        label: "พบปัญหา",
        unit: "หน่วยงาน",
        value: "0",
        isActive: false,
      },
    ]
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

export default function MoNewForm(props: Props) {
  // ---- 1. Store & Props ----
  const {
    createReport,
    authEmployee,
    fetchDistinctDisciplineTypes,
    fetchDistinctGuardPostMovementStatuses,
  } = useStore();
  const { departmentOptions = [], usedDivisions = [] } = props;

  // ---- 2. Data Fetching ----
  const [distinctDisciplineTypes, setDistinctDisciplineTypes] = useState<
    { key: string; label: string }[]
  >([]);
  useEffect(() => {
    fetchDistinctDisciplineTypes().then((types) => {
      console.log(
        "[MoNewForm] Distinct discipline types (key + label):",
        types,
      );
      setDistinctDisciplineTypes(types);
    });
  }, [fetchDistinctDisciplineTypes]);

  /** Guard post movement statuses: predefined + custom from other reports */
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

  // ---- 3. Derived Values (from props) ----
  const departments = departmentOptions.map((o) => o.department);

  // ---- 4. Form State ----
  const [selectedDepartment, setSelectedDepartment] = useState<number>(() => {
    return authEmployee?.department_id ?? departments[0]?.id ?? 1;
  });

  const currentDepartmentOption = departmentOptions.find(
    (o) => o.department.id === selectedDepartment,
  );
  const divisionOptions = currentDepartmentOption?.divisions ?? [];
  const availableDivisionOptions = divisionOptions.filter(
    (d) => !usedDivisions.includes(d.shortName),
  );

  const [selectedDivision, setSelectedDivision] = useState<string>("");

  const [dynamicGroup2, setDynamicGroup2] = useState(() => {
    return [
      {
        key: "discipline",
        title: "วินัยและการลงโทษ",
        items: group2DefaultItems,
      },
    ];
  });

  const [dynamicGroup3, setDynamicGroup3] = useState(() => {
    return group3;
  });

  const [rowStatus, setRowStatus] = useState<Record<string, number>>({});

  const [counts, setCounts] = useState<Record<string, string>>(() => {
    const initialCounts: Record<string, string> = {};
    [...group1, ...group3A, ...dynamicGroup2].forEach((g) =>
      g.items.forEach((it) => {
        initialCounts[it.key] = (it as any).value ?? "0";
      }),
    );
    return initialCounts;
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    [...group1, ...dynamicGroup2, ...group3A, ...group3, ...group4].reduce(
      (acc, g, i) => {
        acc[g.key] = i === 0;
        return acc;
      },
      {} as Record<string, boolean>,
    ),
  );

  // ---- 6. Editing State & Refs ----
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingRaw, setEditingRaw] = useState<string>("");

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const labelInputRef = useRef<HTMLTextAreaElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // ---- 7. Dialog / Submission State ----
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFail, setShowFail] = useState(false);
  const [failMessage, setFailMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitStartRef = useRef(0);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [dynamicGroup4, setDynamicGroup4] = useState(() => {
    return group4;
  });
  const [showAddGroup4, setShowAddGroup4] = useState(false);
  const [newGroup4Label, setNewGroup4Label] = useState("");
  const [newGroup4Detail, setNewGroup4Detail] = useState("");
  const [newGroup4Status, setNewGroup4Status] = useState("");
  const [newGroup4Note, setNewGroup4Note] = useState("");
  const [editingGroup4Index, setEditingGroup4Index] = useState<number | null>(
    null,
  );
  const [isGroup4OtherMode, setIsGroup4OtherMode] = useState(false);

  // ==========================================================
  // EFFECTS
  // ==========================================================

  // -- Cleanup submit timer on unmount --
  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  // -- Validate selectedDivision against available options --
  useEffect(() => {
    if (availableDivisionOptions.length === 0) {
      if (selectedDivision) setSelectedDivision("");
      return;
    }

    const selectedStillAvailable = availableDivisionOptions.some(
      (option) => option.shortName === selectedDivision,
    );
    if (!selectedStillAvailable) {
      setSelectedDivision(availableDivisionOptions[0].shortName);
    }
  }, [availableDivisionOptions, selectedDivision]);

  // -- Initialize rowStatus from dynamicGroup3 status values --
  useEffect(() => {
    setRowStatus((prev) => {
      const next = { ...prev };
      // Remove old group3 keys
      Object.keys(prev).forEach((k) => {
        if (!k.startsWith("g4_")) delete next[k];
      });
      dynamicGroup3.forEach((g) => {
        g.items.forEach((it, i) => {
          const idx = statusOptions.findIndex(
            (s) => s.key === (it as any).status,
          );
          next[String(i)] = idx >= 0 ? idx : 0;
        });
      });
      return next;
    });
  }, [dynamicGroup3]);

  // -- Hydrate dynamicGroup3 from static template on mount --
  useEffect(() => {
    setDynamicGroup3(group3);
  }, []);

  // -- Hydrate dynamicGroup4 from static template on mount --
  useEffect(() => {
    setDynamicGroup4(group4);
  }, []);

  // -- Ensure counts contains entries for all dynamic count group keys --
  useEffect(() => {
    setCounts((prev) => {
      const next = { ...prev };
      [...group3A, ...dynamicGroup2].forEach((g) => {
        g.items.forEach((it) => {
          if (!(it.key in next)) next[it.key] = "0";
        });
      });
      return next;
    });
  }, [dynamicGroup2, dynamicGroup3]);

  // -- Sanitize any pre-existing counts on mount --
  useEffect(() => {
    setCounts((prev) => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = toDigitString(prev[k]);
      });
      return next;
    });
  }, []);

  // -- Adjust textarea heights after render (for auto-resize) --
  useEffect(() => {
    const selector = `.${styles["mo-table-wrapper"]} textarea`;
    const nodes = Array.from(
      document.querySelectorAll(selector),
    ) as HTMLTextAreaElement[];
    if (nodes.length === 0) return;

    let rafId = 0;
    const adjustAll = () => {
      nodes.forEach((ta) => adjustTextareaHeight(ta));
    };
    rafId = requestAnimationFrame(adjustAll);
    return () => cancelAnimationFrame(rafId);
  }, [counts, editingKey, openGroups]);

  // -- Adjust modal textarea on modal open --
  useEffect(() => {
    if (!showAddGroup2 && !showAddGroup3) return;
    const id = requestAnimationFrame(() => {
      try {
        adjustTextareaHeight(labelInputRef.current);
      } catch {
        // best-effort
      }
    });
    return () => cancelAnimationFrame(id);
  }, [showAddGroup2, showAddGroup3]);

  // ==========================================================
  // UTILITY FUNCTIONS
  // ==========================================================

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

  const toDigitString = (v: string) => {
    const digits = String(v || "").replace(/\D/g, "");
    if (digits === "") return "0";
    const n = digits.replace(/^0+/, "");
    return n === "" ? "0" : n.slice(0, 15);
  };

  const getDisplayValue = (key: string) => {
    return toDigitString(counts[key] ?? "0");
  };

  const hasAnyData = () => {
    const hasCounts = Object.values(counts).some((v) => Number(v) > 0);
    const hasGroup3Items = dynamicGroup3.some((g) => g.items.length > 0);
    const hasGroup4Items = dynamicGroup4.some((g) => g.items.length > 0);
    const hasEditingValue = editingKey ? Number(editingRaw) > 0 : false;
    return hasCounts || hasGroup3Items || hasGroup4Items || hasEditingValue;
  };

  useEffect(() => {
    props.onDirtyChange?.(hasAnyData());
  }, [counts, dynamicGroup2, dynamicGroup3, dynamicGroup4, editingKey, editingRaw]);

  // ==========================================================
  // TEXTAREA EDITING HANDLERS
  // ==========================================================

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
      adjustTextareaHeight(el);
      return;
    }

    const clean = toDigitString(sanitized);
    setEditingRaw(clean);
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
      try {
        setEditingRaw(String(BigInt(valStr) + 1n));
      } catch {
        setEditingRaw(String(Number(valStr) + 1));
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const valStr = editingRaw || "0";
      try {
        const base = BigInt(valStr);
        setEditingRaw(base > 0n ? String(base - 1n) : "0");
      } catch {
        setEditingRaw(String(Math.max(0, Number(valStr) - 1)));
      }
    }
  };

  const handleTextareaBlur = (key: string) => {
    const final = toDigitString(editingRaw);
    setCounts((s) => ({ ...s, [key]: final }));
    setEditingRaw(final);
    setEditingKey(null);
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
      return;
    }
    const normalized = toDigitString(digitsOnly);
    e.preventDefault();
    const el = e.target as HTMLTextAreaElement;
    el.value = normalized;
    setEditingRaw(normalized);
    adjustTextareaHeight(el);
  };

  // ==========================================================
  // GROUP 2 (DISCIPLINE) HANDLERS
  // ==========================================================

  const openAddGroup2 = () => {
    setNewGroup2Label("");
    setNewGroup2Unit("คน");
    setCheckedItems(new Set());
    setIsOtherMode(false);
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
      setEditingKey(null);
      if (newGroup2Label.trim() !== "") {
        const otherCount =
          editingKey === "__other__"
            ? editingRaw
            : (counts["__other__"] ?? "0");
        addItemToGroup2(otherCount);
        setEditingRaw("");
        setCounts((prev) => {
          const next = { ...prev };
          delete next["__other__"];
          return next;
        });
      } else {
        setShowAddGroup2(false);
      }
      return;
    }

    const selectedKey = checkedItems.values().next().value as string;

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
          const val =
            editingKey === item.key ? editingRaw : (counts[item.key] ?? "0");
          return Number(val) > 0 ? { ...item, isActive: true } : item;
        });

        return { ...pg, items };
      });
    });

    setEditingKey(null);
    setShowAddGroup2(false);
  };

  // ==========================================================
  // GROUP 3 (MEETING) HANDLERS
  // ==========================================================

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
          ? { ...pg, items: pg.items.filter((_, i) => i !== itemIdx) }
          : pg,
      ),
    );
  };

  const handleOpenRow = (idx: number) => {
    const meetingGroup = dynamicGroup3.find((g) => g.key === "meeting");
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

    setDynamicGroup3((prev) =>
      prev.map((pg) =>
        pg.key === "meeting"
          ? {
              ...pg,
              items:
                editingGroup3Index === null
                  ? [...pg.items, nextItem]
                  : pg.items.map((item, index) =>
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
      return;
    }
  };

  // ==========================================================
  // GROUP 4 HANDLERS
  // ==========================================================

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

  // ==========================================================
  // SUBMIT HANDLER
  // ==========================================================

  const onSubmit = async (
    e?: React.FormEvent,
    opts?: { approve?: boolean },
  ) => {
    e?.preventDefault();
    if (!hasAnyData() && !opts?.approve) return;

    const payload: Record<string, unknown> = {
      department_id: selectedDepartment,
      division_name:
        selectedDivision || availableDivisionOptions[0]?.shortName || "",
      division_id:
        availableDivisionOptions.find((d) => d.shortName === selectedDivision)
          ?.id ||
        availableDivisionOptions[0]?.id ||
        0,
      department_name: authEmployee?.department_name || "",
      created_by: authEmployee?.employee_code || "ADMIN",
    };

    for (const [key, value] of Object.entries(counts)) {
      const num = Number(value);
      if (num > 0 || value !== "0") payload[key] = value;
    }

    const disciplines: Array<{
      key: string;
      label: string;
      value: number;
    }> = [];
    for (const g of dynamicGroup2) {
      if (g.key !== "discipline") continue;
      for (const item of g.items) {
        if (!item.isActive) continue;
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
    if (disciplines.length > 0) payload.disciplines = disciplines;

    const projects: Array<{
      key: string;
      name: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup3) {
      g.items.forEach((it, i) => {
        projects.push({
          key: String(i + 1),
          name: sanitizeMoFreeText(it.label),
          detail: sanitizeMoFreeText(it.detail),
          status: it.status ?? "warning",
          note: sanitizeMoFreeText(it.note),
        });
      });
    }
    if (projects.length > 0) payload.projects = projects;

    // Guard post movements (group4)
    const guardPostMovements: Array<{
      name: string;
      detail: string;
      status: string;
      note: string;
    }> = [];
    for (const g of dynamicGroup4) {
      g.items.forEach((it) => {
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
    }

    try {
      submitStartRef.current = Date.now();
      setIsSubmitting(true);

      await createReport(payload as any);

      const elapsed = Date.now() - submitStartRef.current;
      const remaining = MIN_SUBMIT_MS - elapsed;
      if (remaining > 0) {
        await new Promise<void>((resolve) => {
          submitTimerRef.current = setTimeout(resolve, remaining);
        });
      }

      setIsSubmitting(false);
      setShowSuccess(true);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : String(err);
      setFailMessage(msg);
      setShowFail(true);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <form className={styles["guts-mo-form"]} onSubmit={(e) => onSubmit(e)}>
        <div className={styles["guts-Mo-layout"]}>
          {/* ---- Sector Selector (Department / Sub-location) ---- */}
          <div className={styles["sector-table-wrapper"]}>
            <table className={styles["mo-table"]}>
              <thead>
                <tr>
                  <th
                    colSpan={4}
                    className={`${styles["location-table-header"]} ${styles["no-border"]}`}
                  >
                    <div className={styles["sector-header-fullwidth"]}>
                      {departments.length > 1 ? (
                        <select
                          className={`${styles["sector-cell-select"]} ${styles["sector-cell-select-full"]}`}
                          value={selectedDepartment}
                          onChange={(e) =>
                            setSelectedDepartment(Number(e.target.value))
                          }
                        >
                          {departments.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.department}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={styles["sector-cell-single-value"]}
                          style={{ color: "#fff" }}
                        >
                          {departments[0]?.department}
                        </span>
                      )}
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
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {availableDivisionOptions.length > 1 ? (
                      <select
                        className={`${styles["sector-cell-select"]} ${styles["sector-cell-select-green"]} ${styles["sector-cell-select-full"]}`}
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                      >
                        {availableDivisionOptions.map((opt) => (
                          <option key={opt.id} value={opt.shortName}>
                            {opt.shortName}
                          </option>
                        ))}
                      </select>
                    ) : availableDivisionOptions.length >= 1 ? (
                      <span className={styles["sector-cell-single-value"]}>
                        {availableDivisionOptions[0].shortName}
                      </span>
                    ) : (
                      <span className={styles["sector-cell-single-value"]}>
                        เขต ไม่พร้อมใช้งาน
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ---- Sections 1-4: Numeric Count Groups ---- */}
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
                      {idx + 1}.
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
                        <td className={styles["second-column-cell"]}>
                          {fieldLabel(r.label)}
                        </td>
                        <td
                          className={`${styles["third-column-cell"]} ${counts[r.key].toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
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

          {/* ---- Group 2 Add Modal (Discipline) ---- */}
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
                                  .filter((r) => r.isActive === true)
                                  .map((r) => r.key),
                              ),
                          );

                          const availableOptionsRaw =
                            distinctDisciplineTypes.length > 0
                              ? distinctDisciplineTypes.filter(
                                  (d) => !activeKeys.has(d.key),
                                )
                              : dynamicGroup2
                                  .filter((g) => g.key === "discipline")
                                  .flatMap((g) =>
                                    g.items.filter(
                                      (r) =>
                                        r.isActive === false &&
                                        String(r.key).startsWith("discipline_"),
                                    ),
                                  )
                                  .map((r) => ({
                                    key: r.key,
                                    label: r.label,
                                  }));
                          const availableOptions = Array.from(
                            new Map(
                              availableOptionsRaw.map((o) => [o.key, o]),
                            ).values(),
                          );

                          if (availableOptions.length === 0) return null;
                          const selected =
                            availableOptions.find((r) =>
                              checkedItems.has(r.key),
                            ) ?? null;
                          const activeCount = dynamicGroup2
                            .filter((g) => g.key === "discipline")
                            .flatMap((g) =>
                              g.items.filter((r) => r.isActive === true),
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
                                        background: "rgba(183, 28, 28, 0.7)",
                                        borderRadius: "50%",
                                        padding: 1,
                                        color: "#fff",
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
                                    <option value="__other__">
                                      -- อื่นๆ --
                                    </option>
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
                                          : getDisplayValue(selected.key) ===
                                              "0"
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
                      (checkedItems.size === 0 &&
                        newGroup2Label.trim() === "") ||
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

          {/* ---- Section 5: Discipline (Dynamic Group 2) ---- */}
          {dynamicGroup2.map((g) => (
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
                      colSpan={4}
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
                    {g.items
                      .filter((r) => r.isActive === true)
                      .map((r, itemIdx) => (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            5.{itemIdx + 1}
                          </td>
                          <td className={styles["group3-second-column-cell"]}>
                            {fieldLabel(r.label)}
                          </td>
                          <td
                            className={`${styles["third-column-cell"]} ${counts[r.key].toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                          >
                            <textarea
                              ref={inputRef as any}
                              className={`${styles["third-column-textarea"]} ${g.key === "discipline" ? styles["third-column-textarea-danger"] : ""}`}
                              value={
                                editingKey === r.key
                                  ? editingRaw
                                  : getDisplayValue(r.key)
                              }
                              rows={1}
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
                          <td
                            className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                            onClick={() => handleDeactivate(r.key)}
                          >
                            ลบ
                          </td>
                        </tr>
                      ))}
                    {/* Add discipline row */}
                    {g.key === "discipline" &&
                      (() => {
                        const items = dynamicGroup2
                          .filter((g2) => g2.key === "discipline")
                          .flatMap((g2) => g2.items);
                        const allActive = items.every((it) => it.isActive);
                        if (allActive) return null;
                        const nextNum =
                          items.filter((it) => it.isActive).length + 1;
                        return (
                          <tr
                            style={{ cursor: "pointer" }}
                            onClick={openAddGroup2}
                          >
                            <td className={styles["first-column-cell"]}>
                              5.{nextNum}
                            </td>
                            <td
                              colSpan={4}
                              className={` ${styles["add-row-cell"]}`}
                            >
                              <div className={styles["add-row-centered"]}>
                                <PlusIcon className={styles["pin-icon"]} />
                                เพิ่มข้อมูลวินัยและการลงโทษ
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                  </tbody>
                )}
              </table>
            </div>
          ))}

          {/* ---- Group 3 Add/Edit Modal (Meeting) ---- */}
          {showAddGroup3 && (
            <div
              className={styles["modal-overlay"]}
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeGroup3Modal();
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
                              if (editingGroup3Index !== null) {
                                return `6.${editingGroup3Index + 1}`;
                              }
                              const grp = dynamicGroup3.find(
                                (x) => x.key === "meeting",
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
                              onPaste={() => {
                                /* allow any text paste */
                              }}
                              onFocus={handleLabelFocus}
                              onBlur={(e) =>
                                adjustTextareaHeight(
                                  e.target as HTMLTextAreaElement,
                                )
                              }
                              placeholder="เช่น โครงการ XXXXX"
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
                              onPaste={() => {
                                /* allow any text paste */
                              }}
                              onFocus={handleLabelFocus}
                              onBlur={(e) =>
                                adjustTextareaHeight(
                                  e.target as HTMLTextAreaElement,
                                )
                              }
                              placeholder="เช่น รายละเอียดการเข้าพบ"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td className={styles["first-column-cell"]}>สถานะ</td>
                          <td className={`${styles["second-column-cell"]} `}>
                            <div className={styles["radio-group"]}>
                              {/* temporarily disabled
                              <label className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value="normal"
                                  checked={newGroup3Status === "normal"}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                />
                                <span className={styles["option-normal"]}>
                                  ปกติ
                                </span>
                              </label>
                              */}
                              <label className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value="warning"
                                  checked={newGroup3Status === "warning"}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                />
                                <span className={styles["option-warning"]}>
                                  ผิดปกติ
                                </span>
                              </label>
                              <label className={styles["radio-item"]}>
                                <input
                                  type="radio"
                                  name="newGroup3Status"
                                  value="danger"
                                  checked={newGroup3Status === "danger"}
                                  onChange={handleGroup3StatusChange}
                                  className={styles["radio-input"]}
                                />
                                <span className={styles["option-danger"]}>
                                  ฉุกเฉิน
                                </span>
                              </label>
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
                    ปิดหน้าจอ
                  </button>
                  <button
                    type="button"
                    className={styles["btn-primary"]}
                    onClick={saveGroup3Modal}
                    disabled={newGroup3Label.trim() === ""}
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---- Section 6: Meeting Records (Dynamic Group 3) ---- */}
          {dynamicGroup3.map((g) => {
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
                        colSpan={5}
                        className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                      >
                        <div
                          className={`${styles["mo-header"]}`}
                          onClick={() =>
                            setOpenGroups((s) => ({
                              ...s,
                              [g.key]: !s[g.key],
                            }))
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <p className={styles["mo-header-red-text"]}>
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
                      {group3AGroup.items.map((r, itemIdx) => (
                        <tr key={r.key}>
                          <td className={styles["first-column-cell"]}>
                            6.{itemIdx + 1}
                          </td>
                          <td
                            className={`${styles["second-column-cell"]}`}
                          >
                            {fieldLabel(r.label)}
                          </td>
                          <td
                            className={`${styles["third-column-cell"]} ${counts[r.key].toString().length > 4 ? styles["third-column-wrap-cell"] : ""}`}
                          >
                            <textarea
                              ref={(el) => {
                                inputRef.current = el;
                              }}
                              className={`${styles["third-column-textarea"]}`}
                              value={
                                editingKey === r.key
                                  ? editingRaw
                                  : getDisplayValue(r.key)
                              }
                              rows={1}
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
                              onKeyDown={(e) =>
                                handleTextareaKeyDown(r.key, e)
                              }
                              onBlur={() => handleTextareaBlur(r.key)}
                            />
                          </td>
                          <td
                            colSpan={2}
                            className={`${styles["fourth-column-cell"]}`}>
                            {r.unit}
                          </td>
                        </tr>
                      ))}
                      {g.items.map((r, itemIdx) => (
                        <tr key={itemIdx}>
                          <td className={styles["first-column-cell"]}>
                            6.{itemIdx + group3AOffset + 1}
                          </td>
                          <td className={styles["group3-second-column-cell"]}>
                            {r.label}
                          </td>
                          <td className={styles["group3-third-column-cell"]}>
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
                        </tr>
                      ))}
                      {/* Add meeting row */}
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
                        <td colSpan={4} className={styles["add-row-cell"]}>
                          <div className={styles["add-row-centered"]}>
                            <PlusIcon className={styles["pin-icon"]} />
                            เพิ่มข้อมูลเข้าพบผู้ว่าจ้าง
                          </div>
                        </td>
                      </tr>
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
                    ปิดหน้าจอ
                  </button>
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
                      colSpan={5}
                      className={`${styles["mo-table-header"]} ${styles["no-border"]}`}
                    >
                      <div
                        className={`${styles["mo-header"]}`}
                        onClick={() =>
                          setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <p className={styles["mo-header-red-text"]}>
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
                    {g.items.map((r, itemIdx) => (
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
                        <td
                          className={`${styles["five-column-cell"]} ${styles["five-column-cell-danger"]} ${styles["cursor-pointer"]}`}
                          onClick={() => handleRemoveGroup4Item(g.key, itemIdx)}
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
                      </tr>
                    ))}
                    {/* Add guard post movement row */}
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
                      <td colSpan={4} className={styles["add-row-cell"]}>
                        <div className={styles["add-row-centered"]}>
                          <PlusIcon className={styles["pin-icon"]} />
                          เพิ่มข้อมูลการเปลี่ยนแปลงจุดรักษาการณ์
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          ))}
        </div>

        {/* ---- Submit Button ---- */}
        <div className={styles["guts-Mo-actions"]}>
          <button
            type="submit"
            className={[styles["guts-btn"], styles["guts-submit-btn"]].join(
              " ",
            )}
            disabled={
              !hasAnyData() ||
              isSubmitting ||
              availableDivisionOptions.length === 0
            }
          >
            บันทึกรายงาน
          </button>
        </div>
      </form>

      <MoLoadingPopup open={isSubmitting} message="กำลังบันทึกข้อมูล..." />

      <ConfirmCancelDialog
        open={showConfirmCancel}
        onCancel={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          setShowConfirmCancel(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
      />

      <InfoModel
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="success"
        title="บันทึกรายงานสำเร็จ!"
        description="ระบบได้ทำการบันทึกข้อมูลของคุณเรียบร้อยแล้ว"
      />

      <InfoModel
        open={showFail}
        onClose={() => {
          setShowFail(false);
          if (props.onCancel) props.onCancel();
          else window.history.back();
        }}
        variant="error"
        title="บันทึกรายงานไม่สำเร็จ"
        description={failMessage}
      />
    </>
  );
}

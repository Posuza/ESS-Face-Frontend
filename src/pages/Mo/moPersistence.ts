export type MoDetailSource = "main" | "list" | "report";
export type MoReportViewMode = "table" | "pdf";

export type SavedMoDetailState = {
  itemId: number;
  source: MoDetailSource;
};

export type SavedMoDetailEditState = {
  itemId: number;
  isEditing: boolean;
};

export type SavedMoReportState = {
  selectedTransactionId: number | null;
  isEditing: boolean;
  viewMode: MoReportViewMode;
  selectedDate?: string;
};

export type SavedMoFieldListState = {
  selectedDepartment: string;
  selectedDivision: string;
  selectedDate: string;
  lastSearchedDepartment: string;
  lastSearchedDivision: string;
  lastSearchedDate: string;
};

const MO_DETAIL_STATE_KEY = "mo_detail_state";
const MO_DETAIL_EDIT_STATE_KEY = "mo_detail_edit_state";
const MO_REPORT_STATE_KEY = "mo_report_state";
const MO_FIELD_LIST_STATE_KEY = "mo_field_list_state";

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode, quota issues, etc.)
  }
}

export function readSavedMoDetailState(): SavedMoDetailState | null {
  const saved = readJson<SavedMoDetailState>(MO_DETAIL_STATE_KEY);
  if (
    !saved ||
    typeof saved.itemId !== "number" ||
    saved.itemId <= 0 ||
    (saved.source !== "main" &&
      saved.source !== "list" &&
      saved.source !== "report")
  ) {
    return null;
  }

  return saved;
}

export function persistMoDetailState(itemId: number, source: MoDetailSource) {
  writeJson(MO_DETAIL_STATE_KEY, {
    itemId,
    source,
  } satisfies SavedMoDetailState);
}

export function clearMoDetailState() {
  try {
    sessionStorage.removeItem(MO_DETAIL_STATE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readSavedMoDetailEditState(): SavedMoDetailEditState | null {
  const saved = readJson<SavedMoDetailEditState>(MO_DETAIL_EDIT_STATE_KEY);
  if (
    !saved ||
    typeof saved.itemId !== "number" ||
    saved.itemId <= 0 ||
    typeof saved.isEditing !== "boolean"
  ) {
    return null;
  }

  return saved;
}

export function persistMoDetailEditState(itemId: number, isEditing: boolean) {
  writeJson(MO_DETAIL_EDIT_STATE_KEY, {
    itemId,
    isEditing,
  } satisfies SavedMoDetailEditState);
}

export function clearMoDetailEditState() {
  try {
    sessionStorage.removeItem(MO_DETAIL_EDIT_STATE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readSavedMoReportState(): SavedMoReportState | null {
  const saved = readJson<SavedMoReportState>(MO_REPORT_STATE_KEY);
  if (
    !saved ||
    (saved.selectedTransactionId != null &&
      (typeof saved.selectedTransactionId !== "number" ||
        saved.selectedTransactionId <= 0)) ||
    typeof saved.isEditing !== "boolean" ||
    (saved.viewMode !== "table" && saved.viewMode !== "pdf") ||
    (saved.selectedDate != null && typeof saved.selectedDate !== "string")
  ) {
    return null;
  }

  return saved;
}

export function persistMoReportState(state: SavedMoReportState) {
  writeJson(MO_REPORT_STATE_KEY, state);
}

export function clearMoReportState() {
  try {
    sessionStorage.removeItem(MO_REPORT_STATE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function readSavedMoFieldListState(): SavedMoFieldListState | null {
  const saved = readJson<SavedMoFieldListState>(MO_FIELD_LIST_STATE_KEY);
  if (
    !saved ||
    typeof saved.selectedDepartment !== "string" ||
    typeof saved.selectedDivision !== "string" ||
    typeof saved.selectedDate !== "string" ||
    typeof saved.lastSearchedDepartment !== "string" ||
    typeof saved.lastSearchedDivision !== "string" ||
    typeof saved.lastSearchedDate !== "string"
  ) {
    return null;
  }
  return saved;
}

export function persistMoFieldListState(state: SavedMoFieldListState) {
  writeJson(MO_FIELD_LIST_STATE_KEY, state);
}

export function clearMoFieldListState() {
  try {
    sessionStorage.removeItem(MO_FIELD_LIST_STATE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Keys used by MoHome.tsx for subview and report-params persistence.
 *  sessionStorage so they survive F5 refresh but auto-clear on tab close. */
const MO_SUBVIEW_KEY = "mo_subview";
const MO_REPORT_PARAMS_KEY = "mo_report_params";

function ssRemoveItem(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Clears all Mo-related persisted state.
 * Call this when leaving Mo so the next entry starts at the main view.
 */
export function clearAllMoPersistedState() {
  ssRemoveItem(MO_SUBVIEW_KEY);
  ssRemoveItem(MO_REPORT_PARAMS_KEY);
  clearMoDetailState();
  clearMoDetailEditState();
  clearMoReportState();
  clearMoFieldListState();
}

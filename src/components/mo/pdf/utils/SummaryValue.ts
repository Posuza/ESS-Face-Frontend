export function displayTableValue(value: string | number | undefined): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? "-");
  if (numericValue === 0) return "-";
  return numericValue.toLocaleString("en-US");
}

export function statusLabel(status?: string): string {
  if (status === "warning") return "ผิดปกติ";
  if (status === "danger") return "ฉุกเฉิน";
  return status || "-";
}

export function statusTextColor(status?: string): string {
  if (status === "danger") return "#b71c1c";
  if (status === "warning") return "#ff9800";
  return "#000";
}

export function statusRgbColor(status?: string): [number, number, number] {
  if (status === "danger") return [183, 28, 28];
  if (status === "warning") return [255, 152, 0];
  return [0, 0, 0];
}

export function disciplineValue(report: any, key: string): number {
  const fromArray = report?.disciplines?.find((item: any) => item.key === key);
  if (fromArray) return Number(fromArray.value) || 0;
  return Number(report?.[key]) || 0;
}

export function projectStatusCount(report: any, status: string): number {
  return (report?.projects || []).filter(
    (project: any) => (project.status || "-") === status,
  ).length;
}

export function guardMovementStatusCount(report: any, status: string): number {
  return (report?.guard_post_movements || []).filter(
    (movement: any) => (movement.status || "-") === status,
  ).length;
}

export function itemValue(report: any, groupKey: string, key: string): number {
  if (groupKey === "discipline") return disciplineValue(report, key);
  return Number(report?.[key]) || 0;
}

function splitVisibleChars(value: string): string[] {
  const chars: string[] = [];
  for (const ch of Array.from(value)) {
    if (/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(ch) && chars.length > 0) {
      chars[chars.length - 1] += ch;
    } else {
      chars.push(ch);
    }
  }
  return chars;
}

export function divisionHeaderLabel(division: string | undefined): string {
  const name = String(division ?? "").trim();
  const match = name.match(/เขต\s+[\d.]+/);
  if (match) return match[0];

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => splitVisibleChars(word)[0] ?? "")
      .join("");
  }

  const chars = splitVisibleChars(name);
  return chars.length > 6
    ? `${chars.slice(0, 2).join("")}..${chars.slice(-2).join("")}`
    : name;
}

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const THAI_DAY_NAMES = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

function parseReportDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(): string {
  const now = new Date();
  const dateText = `${now.getDate()} ${THAI_SHORT_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
  const timeText = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")} น.`;
  return `เวลาที่ดึงข้อมูล: ${dateText} ${timeText}`;
}

export function formatPdfRoundDateTitle(item: any): string {
  const rawDate = item?.report_date || item?.created_at || "";
  if (!rawDate) return "";

  const date = parseReportDate(String(rawDate));
  if (!date) return "";

  const roundDate = new Date(date);
  roundDate.setDate(roundDate.getDate() - 1);

  const dayName = THAI_DAY_NAMES[roundDate.getDay()];
  const day = roundDate.getDate();
  const month = THAI_SHORT_MONTHS[roundDate.getMonth()];
  const year = roundDate.getFullYear() + 543;

  return `รายงาน รอบวัน ${dayName} ที่ ${day} ${month} ${year}`;
}

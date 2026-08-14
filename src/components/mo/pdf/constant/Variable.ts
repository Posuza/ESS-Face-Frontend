export type PageDirection = "portrait" | "landscape";
export type RgbColor = readonly [number, number, number];

const FONT_FAMILY = "Sarabun";
const FONT_REGULAR_FILE = "Sarabun-Regular.ttf";
const FONT_SEMIBOLD_FILE = "Sarabun-SemiBold.ttf";

const COLORS = {
  primaryLight: [217, 217, 217] as RgbColor,
  text: [0, 0, 0] as RgbColor,
  gridLine: [208, 208, 208] as RgbColor,
  status: {
    warning: [255, 152, 0] as RgbColor,
    danger: [183, 28, 28] as RgbColor,
  },
} as const;

export const STATUS_LABELS: Record<string, string> = {
  warning: "ผิดปกติ",
  danger: "ฉุกเฉิน",
};

export const PDF_EXPORT_FONT = {
  family: FONT_FAMILY,
  regularFile: FONT_REGULAR_FILE,
  semiboldFile: FONT_SEMIBOLD_FILE,
  size: {
    title: 9.5,
    meta: 9,
    pageNumber: 7,
    tableHeader: 7.7,
    tableCell: 7.7,
    detail: 7.7,
    empty: 7.7,
    gap: 3,
  },
} as const;

export const PDF_EXPORT_PAGE = {
  size: "A4",
  direction: "portrait" as PageDirection,
  width: 210,
  height: 297,
  paddingLeftRight: 7,
  paddingTopBottom: 4,
  headerHeight: 22.5,
  footerHeight: 10,
  bodyWidth: 196,
  bodyHeight: 256.5,
} as const;

export const PDF_SUMMARY_EXPORT_PAGE = {
  size: "A4",
  direction: "portrait" as PageDirection,
  width: 210,
  height: 297,
  paddingLeftRight: 7,
  paddingTopBottom: 4,
  headerHeight: 22.5,
  footerHeight: 10,
  bodyWidth: 196,
  bodyHeight: 256.5,
} as const;

export const PDF_EXPORT_TABLE = {
  tablesPerRow: 3,
  gap: 2,
  width: 64,
  rowHeight: 6.2,
  rowPaddingX: 0.5,
  rowPaddingY: 1.4,
  rowBorderStroke: 0.1,
} as const;

export const PDF_RENDER_FONT = {
  family: FONT_FAMILY,
  size: {
    title: 9.5,
    meta: 9,
    pageNumber: 7,
    tableHeader: 7.4,
    tableCell: 7.4,
    detail: 7.4,
    empty: 7.4,
    gap: 3,
  },
} as const;

export const PDF_RENDER_PAGE = {
  size: "A4",
  direction: "portrait" as PageDirection,
  width: 566,
  height: 842,
  paddingLeftRight: 20,
  paddingTopBottom: 14,
  headerHeight: 66,
  footerHeight: 28,
  bodyWidth: 526,
  bodyHeight: 720,
} as const;

export const PDF_RENDER_TABLE = {
  tablesPerRow: 2,
  gap: 6,
  rowHeight: 16.5,
  rowPaddingX: 1,
  rowPaddingY: 2,
  rowBorderStroke: 1,
} as const;

export const PDF_EXPORT = {
  page: PDF_EXPORT_PAGE,
  table: PDF_EXPORT_TABLE,
  font: PDF_EXPORT_FONT,
  colors: COLORS,
  statusLabels: STATUS_LABELS,
} as const;

export const PDF_SUMMARY_EXPORT = {
  page: PDF_SUMMARY_EXPORT_PAGE,
  table: PDF_EXPORT_TABLE,
  font: PDF_EXPORT_FONT,
  colors: COLORS,
  statusLabels: STATUS_LABELS,
} as const;

export const PDF_RENDER = {
  page: PDF_RENDER_PAGE,
  table: PDF_RENDER_TABLE,
  font: PDF_RENDER_FONT,
  colors: COLORS,
  statusLabels: STATUS_LABELS,
} as const;

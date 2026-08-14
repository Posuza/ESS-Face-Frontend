import { PDF_RENDER, PDF_SUMMARY_EXPORT } from "../constant/Variable";
import {
  buildDetailContentSection,
  buildDivisionTableContentSection,
  buildSummaryDivisionContentSections,
  buildSummaryTableContentSection,
  type ContentSection,
} from "../utils/ContentSections";
import { formatPdfRoundDateTitle } from "../utils/FormatDate";
import type { BodyLayout } from "../utils/BodyContentLayout";

export type PdfDocumentData = {
  title: string;
  sectorName: string;
  firstPageTitleSuffix?: string;
  sections: ContentSection[];
  totalPages: number;
};

export const SUMMARY_PDF_TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ";
export const DIVISION_PDF_TITLE = "รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)";

export function buildSummariesPdfDocumentData(
  item: any,
  sectorName: string,
  reports: any[] = [],
): PdfDocumentData {
  const sections = [
    buildSummaryTableContentSection("summaryExport", item, reports),
    ...buildSummaryDivisionContentSections("summaryExport", item, reports),
  ];

  return {
    title: SUMMARY_PDF_TITLE,
    sectorName,
    firstPageTitleSuffix: formatPdfRoundDateTitle(item),
    sections,
    totalPages: sections.reduce((sum, section) => sum + section.pages.length, 0),
  };
}

export function buildDivisionPdfDocumentData(
  item: any,
  sectorName: string,
): PdfDocumentData {
  const sections = [
    buildDivisionTableContentSection("summaryExport", item),
    buildDetailContentSection("summaryExport", item),
  ];

  return {
    title: DIVISION_PDF_TITLE,
    sectorName,
    firstPageTitleSuffix: formatPdfRoundDateTitle(item),
    sections,
    totalPages: sections.reduce((sum, section) => sum + section.pages.length, 0),
  };
}

export function scaleExportLayoutForRender(layout: BodyLayout): BodyLayout {
  const widthScale = PDF_RENDER.page.bodyWidth / PDF_SUMMARY_EXPORT.page.bodyWidth;

  return {
    ...layout,
    mode: "render",
    bodyWidth: PDF_RENDER.page.bodyWidth,
    bodyHeight: PDF_RENDER.page.bodyHeight,
    tableWidth: layout.tableWidth * widthScale,
  };
}

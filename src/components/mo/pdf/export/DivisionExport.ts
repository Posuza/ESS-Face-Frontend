import { jsPDF } from "jspdf";
import { PDF_SUMMARY_EXPORT } from "../constant/Variable";
import { buildDivisionPdfDocumentData } from "../context/PdfDocumentData";
import { drawExportBodyContent } from "../utils/ExportBodyContentLayout";
import { registerExportFonts } from "../utils/ExportFont";
import {
  drawExportPageFooter,
  drawExportPageHeader,
} from "../utils/ExportPageLayout";
import { buildSummaryExportPageLayoutPlans } from "../utils/PageLayout";

export async function buildDivisionExport(item: any, sectorName: string): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: PDF_SUMMARY_EXPORT.page.direction,
    unit: "mm",
    format: PDF_SUMMARY_EXPORT.page.size.toLowerCase(),
    compress: true,
  });
  await registerExportFonts(doc);

  const documentData = buildDivisionPdfDocumentData(item, sectorName);
  let pageNumber = 1;

  for (const section of documentData.sections) {
    const pages = buildSummaryExportPageLayoutPlans(section.pages);
    for (const page of pages) {
      if (pageNumber > 1) doc.addPage();
      const exportPage = { ...page, pageNumber, totalPages: documentData.totalPages };
      await drawExportPageHeader(doc, {
        title: documentData.title,
        sectorName: documentData.sectorName,
        divisionName: section.divisionName,
        firstPageTitleSuffix: documentData.firstPageTitleSuffix,
        pageNumber,
      });
      drawExportBodyContent(doc, {
        ...section.layout,
        blocks: page.plan.blocks,
        columns: page.plan.columns,
      });
      drawExportPageFooter(doc, exportPage);
      pageNumber += 1;
    }
  }

  return doc;
}

export function exportDivisionPdf(
  item: any,
  sectorName: string,
  fileName = `division-${item?.id ?? "report"}.pdf`,
): Promise<void> {
  return buildDivisionExport(item, sectorName).then((doc) => {
    doc.save(fileName);
  });
}

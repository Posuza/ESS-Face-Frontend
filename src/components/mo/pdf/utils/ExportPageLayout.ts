import type { jsPDF } from "jspdf";
import logoUrl from "../../../../assets/logo/logo_guts.png";
import { PDF_EXPORT } from "../constant/Variable";
import { formatDate } from "./FormatDate";
import type { PageLayoutPlan } from "./PageLayout";

export type ExportPageHeaderInput = {
  title: string;
  sectorName: string;
  divisionName?: string;
  firstPageTitleSuffix?: string;
  pageNumber?: number;
};

let logoDataUrlPromise: Promise<string> | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = (async () => {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    })();
  }
  return logoDataUrlPromise;
}

export async function drawExportPageHeader(
  doc: jsPDF,
  header: ExportPageHeaderInput,
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoY = PDF_EXPORT.page.paddingTopBottom;
  const logoHeight = 12;
  const logoWidth = (logoHeight * 2340) / 1190;
  const logoX = (pageWidth - logoWidth) / 2;
  const logoData = await getLogoDataUrl().catch(() => null);

  doc.setFont(PDF_EXPORT.font.family, "normal");
  doc.setFontSize(PDF_EXPORT.font.size.pageNumber);
  doc.setTextColor(...PDF_EXPORT.colors.text);
  doc.text(
    formatDate(),
    pageWidth - PDF_EXPORT.page.paddingLeftRight,
    logoY + 3.5,
    { align: "right" },
  );

  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", logoX, logoY, logoWidth, logoHeight);
    } catch {
      // Ignore logo rendering failures; text header still renders.
    }
  }

  const formattedSectorName = header.sectorName.replace(
    /([ก-๙0-9]+)\s+([A-Za-z]+)/,
    "$1 | $2",
  );
  const titleText = [
    header.title,
    formattedSectorName,
    header.divisionName,
    header.pageNumber === 1 ? header.firstPageTitleSuffix : "",
  ]
    .filter(Boolean)
    .join(" | ");

  doc.setFont(PDF_EXPORT.font.family, "bold");
  doc.setFontSize(PDF_EXPORT.font.size.title);
  doc.text(
    titleText,
    pageWidth / 2,
    19.2,
    { align: "center" },
  );
}

export function drawExportPageFooter(
  doc: jsPDF,
  page: Pick<PageLayoutPlan, "pageNumber" | "totalPages">,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont(PDF_EXPORT.font.family, "normal");
  doc.setFontSize(PDF_EXPORT.font.size.pageNumber);
  doc.text(
    `${page.pageNumber} / ${page.totalPages}`,
    pageWidth - PDF_EXPORT.page.paddingLeftRight,
    pageHeight - 5,
    { align: "right" },
  );
}

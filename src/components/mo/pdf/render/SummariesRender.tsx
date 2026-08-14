import {
  buildSummariesPdfDocumentData,
  scaleExportLayoutForRender,
} from "../context/PdfDocumentData";
import { buildPreviewPageLayoutPlans } from "../utils/PageLayout";
import { RenderBodyContentLayout } from "../utils/RenderBodyContentLayout";
import { RenderPageLayout } from "../utils/RenderPageLayout";

type SummariesRenderProps = {
  item: any;
  sectorName: string;
  reports?: any[];
};

export function SummariesRender({
  item,
  sectorName,
  reports = [],
}: SummariesRenderProps) {
  const documentData = buildSummariesPdfDocumentData(item, sectorName, reports);
  let pageOffset = 0;

  return (
    <>
      {documentData.sections.flatMap((section) => {
        const renderLayout = scaleExportLayoutForRender(section.layout);
        const sectionPages = buildPreviewPageLayoutPlans(section.pages).map((page) => ({
          ...page,
          pageNumber: page.pageNumber + pageOffset,
          totalPages: documentData.totalPages,
        }));
        pageOffset += section.pages.length;
        return sectionPages.map((page) => (
          <RenderPageLayout
            key={`${section.key}-${page.pageNumber}`}
            page={page}
            title={documentData.title}
            sectorName={documentData.sectorName}
            divisionName={section.divisionName}
            firstPageTitleSuffix={documentData.firstPageTitleSuffix}
          >
            <RenderBodyContentLayout
              layout={{
                ...renderLayout,
                blocks: page.plan.blocks,
                columns: page.plan.columns,
              }}
            />
          </RenderPageLayout>
        ));
      })}
    </>
  );
}

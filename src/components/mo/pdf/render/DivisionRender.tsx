import {
  buildDivisionPdfDocumentData,
  scaleExportLayoutForRender,
} from "../context/PdfDocumentData";
import { buildPreviewPageLayoutPlans } from "../utils/PageLayout";
import { RenderBodyContentLayout } from "../utils/RenderBodyContentLayout";
import { RenderPageLayout } from "../utils/RenderPageLayout";

type DivisionRenderProps = {
  item: any;
  sectorName: string;
};

export function DivisionRender({ item, sectorName }: DivisionRenderProps) {
  const documentData = buildDivisionPdfDocumentData(item, sectorName);
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

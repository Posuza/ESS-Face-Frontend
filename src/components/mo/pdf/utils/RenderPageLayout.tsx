import type { ReactNode } from "react";
import logoGuts from "../../../../assets/logo/logo_guts.png";
import { PDF_RENDER } from "../constant/Variable";
import { formatDate } from "./FormatDate";
import type { PageLayoutPlan } from "./PageLayout";

type RenderPageLayoutProps = {
  page: PageLayoutPlan;
  title: string;
  sectorName: string;
  divisionName?: string;
  firstPageTitleSuffix?: string;
  children: ReactNode;
};

export function RenderPageLayout({
  page,
  title,
  sectorName,
  divisionName,
  firstPageTitleSuffix,
  children,
}: RenderPageLayoutProps) {
  const titleText = [
    title,
    sectorName,
    divisionName,
    page.pageNumber === 1 ? firstPageTitleSuffix : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <div
      style={{
        width: PDF_RENDER.page.width,
        minHeight: PDF_RENDER.page.height,
        boxSizing: "border-box",
        padding: `${PDF_RENDER.page.paddingTopBottom}px ${PDF_RENDER.page.paddingLeftRight}px`,
        background: "#fff",
        color: "#000",
        fontFamily: PDF_RENDER.font.family,
      }}
    >
      <header
        style={{
          position: "relative",
          height: PDF_RENDER.page.headerHeight,
        }}
      >
        <img
          src={logoGuts}
          alt="GUTS ESS"
          style={{
            position: "absolute",
            top: 11,
            left: "50%",
            height: 34,
            transform: "translateX(-50%)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 11,
            right: 0,
            fontSize: PDF_RENDER.font.size.pageNumber,
            fontWeight: 400,
            lineHeight: 1.1,
          }}
        >
          {formatDate()}
        </span>
        <div
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: PDF_RENDER.font.size.title,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {titleText}
        </div>
      </header>
      <main style={{ minHeight: PDF_RENDER.page.bodyHeight }}>{children}</main>
      <footer
        style={{
          height: PDF_RENDER.page.footerHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          fontSize: PDF_RENDER.font.size.pageNumber,
        }}
      >
        {page.pageNumber} / {page.totalPages}
      </footer>
    </div>
  );
}

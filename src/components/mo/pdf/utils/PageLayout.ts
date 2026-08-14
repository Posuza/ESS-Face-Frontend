import { PDF_EXPORT, PDF_RENDER, PDF_SUMMARY_EXPORT } from "../constant/Variable";
import type { LayoutMode } from "./BodyContentLayout";
import type { PagePlan } from "./PaginationLayout";

export type PageLayoutPlan = {
  mode: LayoutMode;
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
  headerHeight: number;
  footerHeight: number;
  bodyWidth: number;
  bodyHeight: number;
  plan: PagePlan;
};

function getModeConfig(mode: LayoutMode) {
  if (mode === "export") return PDF_EXPORT;
  if (mode === "summaryExport") return PDF_SUMMARY_EXPORT;
  return PDF_RENDER;
}

export function buildPageLayoutPlans(
  mode: LayoutMode,
  plans: PagePlan[],
): PageLayoutPlan[] {
  const config = getModeConfig(mode);
  return plans.map((plan) => ({
    mode,
    pageNumber: plan.pageNumber,
    totalPages: plans.length,
    width: config.page.width,
    height: config.page.height,
    headerHeight: config.page.headerHeight,
    footerHeight: config.page.footerHeight,
    bodyWidth: config.page.bodyWidth,
    bodyHeight: config.page.bodyHeight,
    plan,
  }));
}

export function buildPreviewPageLayoutPlans(plans: PagePlan[]): PageLayoutPlan[] {
  return buildPageLayoutPlans("render", plans);
}

export function buildExportPageLayoutPlans(plans: PagePlan[]): PageLayoutPlan[] {
  return buildPageLayoutPlans("export", plans);
}

export function buildSummaryExportPageLayoutPlans(
  plans: PagePlan[],
): PageLayoutPlan[] {
  return buildPageLayoutPlans("summaryExport", plans);
}

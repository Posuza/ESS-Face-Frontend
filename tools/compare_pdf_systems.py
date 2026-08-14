#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════
  compare_pdf_systems.py
  ─────────────────────
  Compare pagination logic between:
    System A: exportPdfNew  (jsPDF autoTable — native PDF)
    System B: PdfRender     (HTML React — CSS-based rendering)

  Compares:
    1. Page dimensions & layout constants
    2. Height estimation formulas
    3. Pagination flow (section splitting, page breaks)
    4. Text content line-count logic
    5. Actual PDF output (if files provided)
═══════════════════════════════════════════════════════════════════
"""

import json
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

# ════════════════════════════════════════════════════════════════
# 1. DATA MODELS
# ════════════════════════════════════════════════════════════════

@dataclass
class LayoutConstants:
    """Page layout constants from one system."""
    system_name: str
    # Page dimensions
    page_width: float = 0.0
    page_height: float = 0.0
    page_unit: str = ""
    page_orientation: str = ""
    # Margins
    margin_left: float = 0.0
    margin_right: float = 0.0
    margin_top: float = 0.0
    margin_bottom: float = 0.0
    # Header
    header_height: float = 0.0
    # Footer
    footer_height: float = 0.0
    # Gaps
    gap: float = 0.0
    # Available content height (computed)
    available_height: float = 0.0
    # Font
    font_name: str = ""
    font_size_title: float = 0.0
    font_size_meta: float = 0.0
    font_size_table_header: float = 0.0
    font_size_table_cell: float = 0.0
    font_size_detail: float = 0.0
    font_size_page_num: float = 0.0
    # Row
    row_height: float = 0.0
    tables_per_row: int = 0


@dataclass
class HeightEstimator:
    """One height estimation formula."""
    name: str
    description: str
    formula_a: str  # exportPdfNew formula
    formula_b: str  # PdfRender formula
    # Sample computation with N items
    sample_input: int = 5
    result_a: float = 0.0
    result_b: float = 0.0
    diff: float = 0.0
    diff_pct: float = 0.0


@dataclass
class PaginationStep:
    """One step in the pagination flow."""
    step: int
    description: str
    system_a_behavior: str
    system_b_behavior: str
    match: bool = True
    note: str = ""


@dataclass
class TextLineComparison:
    """Comparison of text line counting logic."""
    field_name: str
    chars_per_line_a: int = 0
    chars_per_line_b: int = 0
    line_height_a: float = 0.0
    line_height_b: float = 0.0
    method_a: str = ""
    method_b: str = ""
    match: bool = True
    note: str = ""


@dataclass
class PdfFileComparison:
    """Comparison of two actual PDF files."""
    file_a: str = ""
    file_b: str = ""
    pages_a: int = 0
    pages_b: int = 0
    page_width_a: float = 0.0
    page_width_b: float = 0.0
    page_height_a: float = 0.0
    page_height_b: float = 0.0
    text_blocks_a: list = field(default_factory=list)
    text_blocks_b: list = field(default_factory=list)
    per_page: list = field(default_factory=list)


@dataclass
class ComparisonReport:
    """Full comparison report."""
    layout: dict = field(default_factory=dict)
    height_estimators: list = field(default_factory=list)
    pagination_flow: list = field(default_factory=list)
    text_line: list = field(default_factory=list)
    pdf_files: Optional[PdfFileComparison] = None
    summary: dict = field(default_factory=dict)


# ════════════════════════════════════════════════════════════════
# 2. EXTRACT CONSTANTS FROM SOURCE
# ════════════════════════════════════════════════════════════════

def extract_export_pdf_new_constants(base_dir: Path) -> LayoutConstants:
    """Parse pdfStyles.ts from exportPdfNew to extract constants."""
    styles_file = base_dir / "src" / "components" / "mo" / "exportPdfNew" / "pdfStyles.ts"
    text = styles_file.read_text(encoding="utf-8")

    def get_val(name: str, default=0.0):
        m = re.search(rf"const\s+{name}\s*=\s*([^;]+);", text)
        if m:
            try:
                return float(m.group(1).strip())
            except ValueError:
                return default
        return default

    def get_int(name: str, default=0):
        m = re.search(rf"const\s+{name}\s*=\s*(\d+)", text)
        return int(m.group(1)) if m else default

    def get_str(name: str, default=""):
        m = re.search(rf'const\s+{name}\s*=\s*["\']([^"\']+)["\']', text)
        return m.group(1) if m else default

    page_w = 297.0  # A4 landscape width mm
    page_h = 210.0  # A4 landscape height mm
    margin = get_val("MARGIN_MM", 10)
    header_h = get_val("HEADER_HEIGHT_MM", 33)
    gap = get_val("GAP_MM", 2)
    row_h = get_val("ROW_H_MM", 6.8)
    tables_per_row = get_int("TABLES_PER_ROW", 3)

    # Footer height: estimated from FONT_SIZE_PAGE_NUM = 7pt
    # Footer text at y = pageH - 5, so roughly 8mm from bottom
    footer_h = 8.0

    available_h = page_h - margin - header_h - footer_h

    return LayoutConstants(
        system_name="exportPdfNew (jsPDF)",
        page_width=page_w,
        page_height=page_h,
        page_unit="mm",
        page_orientation="landscape",
        margin_left=margin,
        margin_right=margin,
        margin_top=margin,
        margin_bottom=margin,
        header_height=header_h,
        footer_height=footer_h,
        gap=gap,
        available_height=available_h,
        font_name=get_str("FONT_NAME", "Sarabun"),
        font_size_title=get_val("FONT_SIZE_TITLE", 13),
        font_size_meta=get_val("FONT_SIZE_META", 9),
        font_size_table_header=get_val("FONT_SIZE_TABLE_HEADER", 7),
        font_size_table_cell=get_val("FONT_SIZE_TABLE_CELL", 7),
        font_size_detail=get_val("FONT_SIZE_DETAIL", 7),
        font_size_page_num=get_val("FONT_SIZE_PAGE_NUM", 7),
        row_height=row_h,
        tables_per_row=tables_per_row,
    )


def extract_pdf_render_constants(base_dir: Path) -> LayoutConstants:
    """Parse PaginationSystem.ts from PdfRender to extract constants."""
    ps_file = base_dir / "src" / "components" / "mo" / "PdfRender" / "shared" / "PaginationSystem.ts"
    text = ps_file.read_text(encoding="utf-8")

    def get_val(name: str, default=0.0):
        m = re.search(rf"{name}\s*:\s*(\d+\.?\d*)", text)
        return float(m.group(1)) if m else default

    def get_int(name: str, default=0):
        m = re.search(rf"{name}\s*:\s*(\d+)", text)
        return int(m.group(1)) if m else default

    page_w = get_val("PAGE_WIDTH", 842)
    page_h = get_val("PAGE_HEIGHT", 596)
    css_v_pad = get_val("CSS_V_PADDING", 30)
    header_h = get_val("PAGE_HEADER_H", 100)
    footer_h = get_val("FOOTER_H", 18)
    gap = get_val("GAP", 6)
    row_h = get_val("ROW_HEIGHT", 14)
    table_header_h = get_val("TABLE_HEADER_H", 16)

    # AVAILABLE_H = PAGE_HEIGHT - CSS_V_PADDING - PAGE_HEADER_H - FOOTER_H
    available_h = page_h - css_v_pad - header_h - footer_h

    return LayoutConstants(
        system_name="PdfRender (HTML/CSS)",
        page_width=page_w,
        page_height=page_h,
        page_unit="px (CSS points)",
        page_orientation="landscape",
        margin_left=0,
        margin_right=0,
        margin_top=0,
        margin_bottom=0,
        header_height=header_h,
        footer_height=footer_h,
        gap=gap,
        available_height=available_h,
        font_name="Sarabun",
        font_size_title=13,
        font_size_meta=9,
        font_size_table_header=7,
        font_size_table_cell=7,
        font_size_detail=7,
        font_size_page_num=7,
        row_height=row_h,
        tables_per_row=3,
    )


# ════════════════════════════════════════════════════════════════
# 3. HEIGHT ESTIMATION COMPARISON
# ════════════════════════════════════════════════════════════════

def compare_height_estimators(a: LayoutConstants, b: LayoutConstants) -> list[HeightEstimator]:
    """Compare height estimation formulas between the two systems."""
    estimators = []

    # --- Table height (group table) ---
    # A: tableHeightMm(itemCount) = (itemCount + 1) * ROW_H_MM
    # B: tableHeight(itemCount) = (itemCount + 1) * ROW_HEIGHT
    for n in [3, 5, 8, 12]:
        h_a = (n + 1) * a.row_height
        h_b = (n + 1) * b.row_height
        estimators.append(HeightEstimator(
            name=f"Group Table ({n} items)",
            description=f"1 header + {n} body rows",
            formula_a=f"({n}+1) × {a.row_height}mm = {h_a:.1f}mm",
            formula_b=f"({n}+1) × {b.row_height}px = {h_b:.1f}px",
            sample_input=n,
            result_a=h_a,
            result_b=h_b,
            diff=abs(h_a - h_b),
            diff_pct=abs(h_a - h_b) / max(h_a, h_b) * 100 if max(h_a, h_b) > 0 else 0,
        ))

    # --- Summary table height ---
    # A: summaryTableHeightMm(itemCount) = 12.4 + itemCount * 7.4
    # B: summaryTableHeight(itemCount) = (itemCount + 2) * ROW_HEIGHT
    for n in [3, 6, 10]:
        h_a = 12.4 + n * 7.4 if n > 0 else 12.4
        h_b = (n + 2) * b.row_height if n > 0 else b.row_height * 2
        estimators.append(HeightEstimator(
            name=f"Summary Table ({n} items)",
            description=f"2 headers + {n} body rows",
            formula_a=f"12.4 + {n} × 7.4 = {h_a:.1f}mm",
            formula_b=f"({n}+2) × {b.row_height}px = {h_b:.1f}px",
            sample_input=n,
            result_a=h_a,
            result_b=h_b,
            diff=abs(h_a - h_b),
            diff_pct=abs(h_a - h_b) / max(h_a, h_b) * 100 if max(h_a, h_b) > 0 else 0,
        ))

    # --- Detail item block height ---
    # A: 4 rows × (lineCount × lineHeightMm + _ROW_BASE)
    #    where _ROW_BASE = 3.1mm, lineHeightMm = 7 * 0.352778 * 1.2 ≈ 2.96mm
    # B: projectBlockHeight: 4 rows × ROW_H (14px) + OVERHEAD (4px)
    pt_to_mm = 0.352778
    detail_font = a.font_size_detail
    line_h_a = detail_font * pt_to_mm * 1.2
    row_base_a = 3.1  # padT + padB + borderWidth
    for n_items in [1, 3, 5]:
        # A: each item has 4 rows (label, detail, status, note)
        # For short text: each row = 1 line
        h_a_item = 4 * (1 * line_h_a + row_base_a)
        h_a_total = n_items * h_a_item + (n_items - 1) * a.gap

        # B: projectBlockHeight: OVERHEAD(4) + 4 * ROW_H(14) = 60px per item
        h_b_item = 4 + 4 * 14  # OVERHEAD + 4 rows
        h_b_total = n_items * h_b_item + (n_items - 1) * b.gap

        estimators.append(HeightEstimator(
            name=f"Detail Block ({n_items} items, short text)",
            description=f"{n_items} project items with 4 rows each (single line)",
            formula_a=f"{n_items} × 4×({line_h_a:.2f}+{row_base_a}) + gaps = {h_a_total:.1f}mm",
            formula_b=f"{n_items} × (4+4×14) + gaps = {h_b_total:.1f}px",
            sample_input=n_items,
            result_a=h_a_total,
            result_b=h_b_total,
            diff=abs(h_a_total - h_b_total),
            diff_pct=abs(h_a_total - h_b_total) / max(h_a_total, h_b_total) * 100 if max(h_a_total, h_b_total) > 0 else 0,
        ))

    # --- Section header height ---
    # A: headH = lineHeightMm + _ROW_BASE = 2.96 + 3.1 ≈ 6.06mm
    # B: DETAIL_SECTION_HEADER_H = 16px
    head_h_a = line_h_a + row_base_a
    head_h_b = 16.0
    estimators.append(HeightEstimator(
        name="Section Header Row",
        description="Height of section title row (group index + title)",
        formula_a=f"lineHeight({line_h_a:.2f}) + ROW_BASE({row_base_a}) = {head_h_a:.2f}mm",
        formula_b=f"DETAIL_SECTION_HEADER_H = {head_h_b:.0f}px",
        sample_input=1,
        result_a=head_h_a,
        result_b=head_h_b,
        diff=abs(head_h_a - head_h_b),
        diff_pct=abs(head_h_a - head_h_b) / max(head_h_a, head_h_b) * 100,
    ))

    # --- Empty section height ---
    # A: headH + (_ROW_BASE + lineHeightMm) = 6.06 + (3.1 + 2.96) ≈ 12.12mm
    # B: DETAIL_SECTION_HEADER_H + DETAIL_EMPTY_ROW_H = 16 + 20 = 36px
    empty_a = head_h_a + (row_base_a + line_h_a)
    empty_b = head_h_b + 20.0
    estimators.append(HeightEstimator(
        name="Empty Section (header + 'no data' row)",
        description="Section with 0 items — header + empty message",
        formula_a=f"headH({head_h_a:.2f}) + row({row_base_a + line_h_a:.2f}) = {empty_a:.2f}mm",
        formula_b=f"HEADER({head_h_b:.0f}) + EMPTY({20}) = {empty_b:.0f}px",
        sample_input=0,
        result_a=empty_a,
        result_b=empty_b,
        diff=abs(empty_a - empty_b),
        diff_pct=abs(empty_a - empty_b) / max(empty_a, empty_b) * 100,
    ))

    return estimators


# ════════════════════════════════════════════════════════════════
# 4. PAGINATION FLOW COMPARISON
# ════════════════════════════════════════════════════════════════

def compare_pagination_flow(a: LayoutConstants, b: LayoutConstants) -> list[PaginationStep]:
    """Compare the pagination algorithm step-by-step."""
    steps = []

    steps.append(PaginationStep(
        step=1,
        description="Page break check: does row/group fit?",
        system_a_behavior=(
            "Row-level: estimates row height as max(tableHeightMm) + GAP_MM. "
            "If y + estH > pageH - MARGIN_MM: doc.addPage(), draw header, y = HEADER_HEIGHT_MM."
        ),
        system_b_behavior=(
            "Row-level: estimates as max(groupGridHeight) + GAP. "
            "If usedH + gridRowH > AVAILABLE_H: flushPage(), start fresh."
        ),
        match=True,
        note="Same logic, different units (mm vs px)."
    ))

    steps.append(PaginationStep(
        step=2,
        description="Per-table page break: does single table fit?",
        system_a_behavior=(
            "Pre-calc via preCalcGroupTableHeight() with splitTextToSize. "
            "If tableEst > availH: addPage + drawPageHeader, startY = HEADER_HEIGHT_MM."
        ),
        system_b_behavior=(
            "Uses computeRowCapacity() to split group into chunks that fit. "
            "splitGroupItems() splits at row boundary."
        ),
        match=False,
        note=(
            "DIFFERENCE: A uses jsPDF autoTable's internal page splitting (content may split mid-table). "
            "B uses pre-computed row capacity to NEVER split a table — it splits at the group level. "
            "This can cause different page distributions."
        )
    ))

    steps.append(PaginationStep(
        step=3,
        description="Detail section: projects + guard movements (combined flow)",
        system_a_behavior=(
            "_renderCombinedSections: iterates sections sequentially. "
            "Tracks activeSectionIdx. When item doesn't fit: startNewPage() → drawHead(). "
            "When section changes: drawHead() inline. "
            "FIXED: resets activeSectionIdx=-1 when autoTable creates continuation pages."
        ),
        system_b_behavior=(
            "paginateDetailSections(): same sequential iteration. "
            "Tracks activeSectionIdx identically. "
            "flushPage() when item doesn't fit. Re-draws section head on new page."
        ),
        match=True,
        note="Core algorithm now matches after the activeSectionIdx reset fix."
    ))

    steps.append(PaginationStep(
        step=4,
        description="Section head on continuation pages",
        system_a_behavior=(
            "drawHeadersIfNewPages() draws PAGE header (logo+title) on new pages. "
            "Section head is NOT re-drawn by drawHeadersIfNewPages. "
            "activeSectionIdx reset ensures NEXT item re-draws the section head."
        ),
        system_b_behavior=(
            "Each page chunk tracks renderProjects/renderMovements booleans. "
            "DivisionDetailContent renders section headers based on these flags. "
            "Section headers ARE drawn on every page that contains items from that section."
        ),
        match=False,
        note=(
            "SUBTLE DIFFERENCE: In A, if an item autoTable splits across pages, "
            "the section head is missing on the continuation page (only page header). "
            "In B, section headers are always present on every page. "
            "The activeSectionIdx reset fix mitigates this for the NEXT item, "
            "but the currently-split item's continuation page still lacks the section head."
        )
    ))

    steps.append(PaginationStep(
        step=5,
        description="Empty section handling",
        system_a_behavior=(
            "Renders head + empty body in ONE autoTable call with _commonProps (margin.top=5). "
            "Missing division param in drawHeadersIfNewPages → FIXED."
        ),
        system_b_behavior=(
            "Renders header + 'no data' row as a single table. "
            "Section always renders (no conditional)."
        ),
        match=True,
        note="After fix, both render empty sections identically."
    ))

    steps.append(PaginationStep(
        step=6,
        description="Detail section page start",
        system_a_behavior=(
            "exportDivisionPdf: startNewPage() → fresh page, y = HEADER_HEIGHT_MM + 2. "
            "Does NOT pass division (division-specific PDF)."
        ),
        system_b_behavior=(
            "DivisionPdf: renderPaginatedDetails starts after table pages. "
            "Each detail page gets PdfPageHeader with sectorName + title."
        ),
        match=True,
        note="Both start detail on fresh page. A omits division param intentionally."
    ))

    return steps


# ════════════════════════════════════════════════════════════════
# 5. TEXT LINE COUNT COMPARISON
# ════════════════════════════════════════════════════════════════

def compare_text_lines(a: LayoutConstants, b: LayoutConstants) -> list[TextLineComparison]:
    """Compare text wrapping / line count logic."""
    comparisons = []

    # --- Detail item block text wrapping ---
    # A: doc.splitTextToSize(text, contentTextWidth)
    #    contentTextWidth = availW - LABEL_CELL_W - padL - padR
    #    availW = pageW - MARGIN_MM*2 = 297-20 = 277mm
    #    LABEL_CELL_W = 18mm, pad = 1.5mm each side
    #    contentTextWidth = 277 - 18 - 1.5 - 1.5 = 256mm
    avail_w_a = a.page_width - a.margin_left * 2
    label_cell_w = 18.0
    content_text_w_a = avail_w_a - label_cell_w - 1.5 - 1.5
    content_text_w_b_px = 842 - 2 * 0 - 20  # approx content width in CSS px

    comparisons.append(TextLineComparison(
        field_name="Detail Item — content text width",
        chars_per_line_a=0,  # computed by jsPDF font metrics
        chars_per_line_b=180,  # CHARS_PER_LINE constant
        line_height_a=round(a.font_size_detail * 0.352778 * 1.2, 2),
        line_height_b=14.0,  # ROW_H in projectBlockHeight
        method_a=f"doc.splitTextToSize(text, {content_text_w_a:.0f}mm) — font-metrics based",
        method_b=f"Math.ceil(len / CHARS_PER_LINE={180}) — char-count based",
        match=False,
        note=(
            f"A uses jsPDF font metrics for exact wrapping (contentTextWidth={content_text_w_a:.0f}mm). "
            f"B uses a fixed CHARS_PER_LINE=180 approximation. "
            "Thai text may wrap differently between the two methods."
        )
    ))

    # --- Group table text wrapping ---
    # A: preCalcTableHeight uses doc.splitTextToSize per column
    # B: tableHeight just uses (itemCount+1) * ROW_HEIGHT — no text wrapping
    comparisons.append(TextLineComparison(
        field_name="Group Table — row height estimation",
        chars_per_line_a=0,
        chars_per_line_b=0,
        line_height_a=round(a.row_height, 1),
        line_height_b=b.row_height,
        method_a="per-column splitTextToSize → max row height (accurate)",
        method_b=f"(itemCount+1) × {b.row_height}px — fixed row height (no wrapping check)",
        match=False,
        note=(
            "A calculates exact row height accounting for text wrapping per cell. "
            "B assumes all rows are exactly ROW_HEIGHT pixels tall. "
            "Long text in B will overflow without detection."
        )
    ))

    # --- Font size mapping ---
    comparisons.append(TextLineComparison(
        field_name="Font sizes (table cell, header, detail)",
        chars_per_line_a=0,
        chars_per_line_b=0,
        line_height_a=0,
        line_height_b=0,
        method_a=f"fontSize={a.font_size_table_cell}pt for cell/header/detail",
        method_b=f"fontSize={b.font_size_table_cell}px (CSS) for cell/header/detail",
        match=True,
        note="Font sizes match (7pt/7px ≈ equivalent at 96dpi)."
    ))

    return comparisons


# ════════════════════════════════════════════════════════════════
# 6. ACTUAL PDF FILE COMPARISON (optional)
# ════════════════════════════════════════════════════════════════

def compare_pdf_files(file_a: str, file_b: str) -> PdfFileComparison:
    """
    Compare two actual PDF files side-by-side.
    Uses PyPDF2 / pypdf if available, otherwise falls back to
    basic binary inspection.
    """
    result = PdfFileComparison(file_a=file_a, file_b=file_b)

    try:
        from pypdf import PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            print("  ⚠  pypdf/PyPDF2 not installed. Install with: pip install pypdf")
            print("     Skipping PDF file comparison.\n")
            result.pages_a = -1
            result.pages_b = -1
            return result

    for label, filepath, target in [("A", file_a, result), ("B", file_b, result)]:
        if not os.path.isfile(filepath):
            print(f"  ⚠  File not found: {filepath}")
            continue

        reader = PdfReader(filepath)
        target.pages_a = len(reader.pages) if label == "A" else len(reader.pages)
        target.pages_b = len(reader.pages) if label == "B" else target.pages_b

        page = reader.pages[0]
        box = page.mediabox
        w = float(box.width)
        h = float(box.height)

        if label == "A":
            target.page_width_a = w
            target.page_height_a = h
        else:
            target.page_width_b = w
            target.page_height_b = h

        # Extract text from all pages
        all_text = []
        per_page_text = []
        for pg in reader.pages:
            txt = pg.extract_text() or ""
            all_text.append(txt)
            per_page_text.append({
                "text": txt,
                "lines": len(txt.splitlines()),
                "chars": len(txt),
            })

        if label == "A":
            target.text_blocks_a = all_text
        else:
            target.text_blocks_b = all_text

        # Per-page comparison
        if label == "B" and len(target.per_page) > 0:
            max_pages = max(len(target.per_page), len(per_page_text))
            for i in range(max_pages):
                a_info = target.per_page[i] if i < len(target.per_page) else {"lines": 0, "chars": 0}
                b_info = per_page_text[i] if i < len(per_page_text) else {"lines": 0, "chars": 0}
                target.per_page[i] = {
                    "page": i + 1,
                    "lines_a": a_info.get("lines", 0),
                    "lines_b": b_info.get("lines", 0),
                    "chars_a": a_info.get("chars", 0),
                    "chars_b": b_info.get("chars", 0),
                }
        else:
            target.per_page = per_page_text

    return result


# ════════════════════════════════════════════════════════════════
# 7. REPORT GENERATOR
# ════════════════════════════════════════════════════════════════

def generate_report(report: ComparisonReport, output_path: Optional[str] = None):
    """Print a formatted comparison report to stdout (and optionally to file)."""
    lines = []
    W = 80

    def header(title):
        lines.append("")
        lines.append("═" * W)
        lines.append(f"  {title}")
        lines.append("═" * W)

    def subheader(title):
        lines.append("")
        lines.append(f"─── {title} " + "─" * (W - len(title) - 5))

    # ── Title ──
    lines.append("╔" + "═" * (W - 2) + "╗")
    lines.append("║" + " PDF PAGINATION COMPARISON REPORT".center(W - 2) + "║")
    lines.append("║" + " exportPdfNew vs PdfRender".center(W - 2) + "║")
    lines.append("╚" + "═" * (W - 2) + "╝")

    # ── Layout Constants ──
    header("1. PAGE LAYOUT CONSTANTS")
    a = report.layout.get("a")
    b = report.layout.get("b")
    if a and b:
        rows = [
            ("Page Size",       f"{a.page_width} × {a.page_height} {a.page_unit}",
                                f"{b.page_width} × {b.page_height} {b.page_unit}"),
            ("Orientation",     a.page_orientation, b.page_orientation),
            ("Header Height",   f"{a.header_height}mm", f"{b.header_height}px"),
            ("Footer Height",   f"{a.footer_height}mm", f"{b.footer_height}px"),
            ("Margin (all)",    f"{a.margin_left}mm", f"{b.margin_left}px"),
            ("Gap",             f"{a.gap}mm", f"{b.gap}px"),
            ("Available H",     f"{a.available_height}mm", f"{b.available_height}px"),
            ("Row Height",      f"{a.row_height}mm", f"{b.row_height}px"),
            ("Tables/Row",      str(a.tables_per_row), str(b.tables_per_row)),
            ("Font",            a.font_name, b.font_name),
            ("Font: table cell", f"{a.font_size_table_cell}pt", f"{b.font_size_table_cell}px"),
            ("Font: detail",    f"{a.font_size_detail}pt", f"{b.font_size_detail}px"),
        ]
        lines.append(f"  {'Metric':<22} {'exportPdfNew (A)':<28} {'PdfRender (B)':<28}")
        lines.append(f"  {'─'*22} {'─'*28} {'─'*28}")
        for name, va, vb in rows:
            lines.append(f"  {name:<22} {va:<28} {vb:<28}")

    # ── Height Estimators ──
    header("2. HEIGHT ESTIMATION FORMULAS")
    for h in report.height_estimators:
        subheader(h.name)
        lines.append(f"  Description : {h.description}")
        lines.append(f"  exportPdfNew: {h.formula_a}")
        lines.append(f"  PdfRender   : {h.formula_b}")
        lines.append(f"  Result A    : {h.result_a:.2f}")
        lines.append(f"  Result B    : {h.result_b:.2f}")
        lines.append(f"  Difference  : {h.diff:.2f} ({h.diff_pct:.1f}%)")

    # ── Pagination Flow ──
    header("3. PAGINATION FLOW COMPARISON")
    for s in report.pagination_flow:
        status = "✅ MATCH" if s.match else "⚠️  DIFFERS"
        subheader(f"Step {s.step}: {s.description} — {status}")
        lines.append(f"  exportPdfNew: {s.system_a_behavior}")
        lines.append(f"  PdfRender   : {s.system_b_behavior}")
        if s.note:
            lines.append(f"  ℹ️  Note: {s.note}")

    # ── Text Line Count ──
    header("4. TEXT LINE COUNT / WRAPPING")
    for t in report.text_line:
        status = "✅ MATCH" if t.match else "⚠️  DIFFERS"
        subheader(f"{t.field_name} — {status}")
        if t.method_a:
            lines.append(f"  Method A: {t.method_a}")
        if t.method_b:
            lines.append(f"  Method B: {t.method_b}")
        if t.line_height_a:
            lines.append(f"  Line H A: {t.line_height_a}")
        if t.line_height_b:
            lines.append(f"  Line H B: {t.line_height_b}")
        if t.note:
            lines.append(f"  ℹ️  Note: {t.note}")

    # ── PDF File Comparison ──
    if report.pdf_files and report.pdf_files.pages_a >= 0:
        header("5. ACTUAL PDF FILE COMPARISON")
        pf = report.pdf_files
        lines.append(f"  File A: {pf.file_a}")
        lines.append(f"  File B: {pf.file_b}")
        lines.append(f"  Pages A: {pf.pages_a}   Pages B: {pf.pages_b}")
        lines.append(f"  Size A: {pf.page_width_a:.1f} × {pf.page_height_a:.1f} pts")
        lines.append(f"  Size B: {pf.page_width_b:.1f} × {pf.page_height_b:.1f} pts")

        if pf.pages_a == pf.pages_b:
            lines.append(f"  ✅ Page count matches: {pf.pages_a}")
        else:
            lines.append(f"  ⚠️  Page count DIFFERS: A={pf.pages_a}, B={pf.pages_b}")

        if abs(pf.page_width_a - pf.page_width_b) < 1 and abs(pf.page_height_a - pf.page_height_b) < 1:
            lines.append(f"  ✅ Page dimensions match")
        else:
            lines.append(f"  ⚠️  Page dimensions differ")

    # ── Summary ──
    header("6. SUMMARY")
    matches = sum(1 for s in report.pagination_flow if s.match)
    total = len(report.pagination_flow)
    text_matches = sum(1 for t in report.text_line if t.match)
    text_total = len(report.text_line)
    big_diffs = [h for h in report.height_estimators if h.diff_pct > 20]

    lines.append(f"  Pagination flow: {matches}/{total} steps match")
    lines.append(f"  Text wrapping:   {text_matches}/{text_total} match")
    if big_diffs:
        lines.append(f"  Height estimators with >20% difference:")
        for h in big_diffs:
            lines.append(f"    • {h.name}: {h.diff_pct:.1f}% ({h.result_a:.1f} vs {h.result_b:.1f})")
    else:
        lines.append(f"  ✅ All height estimators within 20% tolerance")

    lines.append("")
    lines.append("  KEY FINDINGS:")
    lines.append("  ─────────────")
    if not report.pagination_flow or not all(s.match for s in report.pagination_flow):
        lines.append("  1. Pagination algorithms differ in how they handle table overflow.")
        lines.append("     A (jsPDF) lets autoTable split tables mid-content.")
        lines.append("     B (CSS) pre-computes row capacity and splits at group boundaries.")
        lines.append("")
        lines.append("  2. Section headers on continuation pages differ.")
        lines.append("     A: only page header (logo+title) on autoTable-created pages.")
        lines.append("     B: section headers explicitly rendered on every page via flags.")
        lines.append("")
    lines.append("  3. Text wrapping methods differ fundamentally.")
    lines.append("     A: jsPDF font-metrics-based splitting (accurate).")
    lines.append("     B: fixed char-count approximation (less accurate for Thai).")
    lines.append("")
    lines.append("  4. Height estimation uses different formulas.")
    lines.append("     Both are internally consistent, but produce different page counts.")
    lines.append("")

    output = "\n".join(lines)

    # Print to stdout
    print(output)

    # Write to file
    if output_path:
        Path(output_path).write_text(output, encoding="utf-8")
        print(f"\n📄 Report saved to: {output_path}")

    return output


# ════════════════════════════════════════════════════════════════
# 8. JSON DUMP (machine-readable)
# ════════════════════════════════════════════════════════════════

def dump_json(report: ComparisonReport, output_path: str):
    """Save report as JSON for programmatic consumption."""
    data = {
        "layout": {
            "a": asdict(report.layout["a"]) if report.layout.get("a") else None,
            "b": asdict(report.layout["b"]) if report.layout.get("b") else None,
        },
        "height_estimators": [asdict(h) for h in report.height_estimators],
        "pagination_flow": [asdict(s) for s in report.pagination_flow],
        "text_line": [asdict(t) for t in report.text_line],
        "summary": report.summary,
    }
    Path(output_path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"📊 JSON saved to: {output_path}")


# ════════════════════════════════════════════════════════════════
# 9. MAIN
# ════════════════════════════════════════════════════════════════

def main():
    # Determine project root
    script_dir = Path(__file__).resolve().parent
    base_dir = script_dir.parent  # fronend_02/

    print("🔍 Reading source files...")
    print(f"   Base: {base_dir}")

    # Extract constants
    a_consts = extract_export_pdf_new_constants(base_dir)
    b_consts = extract_pdf_render_constants(base_dir)
    print(f"   ✅ exportPdfNew constants extracted")
    print(f"   ✅ PdfRender constants extracted")

    # Build report
    report = ComparisonReport(
        layout={"a": a_consts, "b": b_consts},
        height_estimators=compare_height_estimators(a_consts, b_consts),
        pagination_flow=compare_pagination_flow(a_consts, b_consts),
        text_line=compare_text_lines(a_consts, b_consts),
    )

    # Optional: compare actual PDF files
    if len(sys.argv) >= 3:
        file_a = sys.argv[1]
        file_b = sys.argv[2]
        print(f"\n📄 Comparing PDF files:")
        print(f"   A: {file_a}")
        print(f"   B: {file_b}")
        report.pdf_files = compare_pdf_files(file_a, file_b)

    # Generate output
    output_dir = script_dir
    report_path = output_dir / "comparison_report.txt"
    json_path = output_dir / "comparison_report.json"

    generate_report(report, str(report_path))
    dump_json(report, str(json_path))


if __name__ == "__main__":
    main()

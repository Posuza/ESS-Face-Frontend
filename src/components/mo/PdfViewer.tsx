// ─────────────────────────────────────────────────────────────
// PdfViewer.tsx
//
// HTML-to-PDF preview + jsPDF download.
// - Preview shows the actual HTML table content (WYSIWYG)
// - Download / Share / Print use jsPDF for the real PDF file
// ─────────────────────────────────────────────────────────────

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useStore } from "../../store/store";
import {
  buildDivisionExport,
  exportDivisionPdf,
} from "./pdf/export/DivisionExport";
import {
  buildSummariesExport,
  exportSummariesPdf,
} from "./pdf/export/SummariesExport";
import { DivisionRender } from "./pdf/render/DivisionRender";
import { SummariesRender } from "./pdf/render/SummariesRender";
import { PDF_RENDER } from "./pdf/constant/Variable";
import { ZoomIn, ZoomOut } from "lucide-react";
import MoLoadingPopup from "./popup/MoLoadingPopup";
import "./PdfViewer.css";

type Props = {
  item: any;
  sectorName: string;
  onCancel?: () => void;
  isSector?: boolean;
  loading?: boolean;
};

export type PdfViewerHandle = {
  downloadPdf: () => Promise<void>;
  sharePdf: () => Promise<void>;
  printPdf: () => void;
};

const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer(
  { item, sectorName, isSector, loading }: Props,
  ref,
) {
  const reports = useStore((state) => (state as any).reports);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // ─── Zoom / scale state ────────────────────────────────
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(0.3);

  // ─── Fit to screen — responsive ─────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const fit = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) {
        const pageW = Math.min(PDF_RENDER.page.width, w);
        const f = pageW / PDF_RENDER.page.width;
        // Auto-fit page width — also locks min zoom so page never smaller than container
        setScale(f);
        setMinScale(f);
      }
    };

    fit();

    const observer = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(fit);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Wheel zoom ─────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Only zoom when Ctrl/Meta is held — otherwise let the container scroll naturally
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale((s) => Math.min(3, Math.max(minScale, s - e.deltaY * 0.002)));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [minScale]);

  // ─── Touch pinch-to-zoom ────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastDist > 0)
        setScale((s) => Math.min(3, Math.max(minScale, s * (dist / lastDist))));
      lastDist = dist;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [minScale]);

  // ─── Download ────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    // Build date string: ddmmyy from report_date or created_at
    const rawDate = item?.report_date || item?.created_at || "";
    let dateStr = "";
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        dateStr = `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
      }
    }

    if (isSector) {
      const cleanedSectorName = sectorName.replace(/\s+/g, "_");
      const fileName = `รายงานประจำวันฝ่ายปฏิบัติการ_${cleanedSectorName}_${dateStr}.pdf`;
      // Old: await exportSectorPdfOld(item, sectorName, fileName);
      await exportDivisionPdf(item, sectorName, fileName);
    } else {
      const cleanedSectorName = sectorName.replace(/\s+/g, "_");
      const fileName = `รายงานประจำวันฝ่ายปฏิบัติการ_${cleanedSectorName}_${dateStr}.pdf`;
      await exportSummariesPdf(item, sectorName, reports, fileName);
    }
  };

  // ─── Share (open in new tab) ────────────────────────────
  const handleSharePdf = async () => {
    const doc = isSector
      ? await buildDivisionExport(item, sectorName)
      : await buildSummariesExport(item, sectorName, reports);
    const dataUri = doc.output("datauristring");
    window.open(dataUri, "_blank");
  };

  // ─── Print ──────────────────────────────────────────────
  const handlePrintPdf = async () => {
    const doc = isSector
      ? await buildDivisionExport(item, sectorName)
      : await buildSummariesExport(item, sectorName, reports);
    try {
      (doc as any).autoPrint();
    } catch {
      // autoPrint plugin not available
    }
    const dataUri = doc.output("datauristring");
    window.open(dataUri, "_blank");
  };

  // ─── Expose imperative handle ───────────────────────────
  useImperativeHandle(ref, () => ({
    downloadPdf: handleDownloadPdf,
    sharePdf: handleSharePdf,
    printPdf: handlePrintPdf,
  }));

  // ─── Lightweight HTML preview ───────────────────────────
  // Export/share/print still use jsPDF. Preview stays React-based for speed.
  const previewContent = useMemo(() => {
    if (isSector) {
      return <DivisionRender item={item} sectorName={sectorName} />;
    }
    return (
      <SummariesRender item={item} sectorName={sectorName} reports={reports} />
    );
  }, [isSector, item, sectorName, reports]);

  return (
    <>
      <MoLoadingPopup open={!!loading} message="กำลังสร้าง PDF..." />
      <div className="pdf-viewer-wrapper">
        {/* ─── Floating zoom indicator (top-right) ─────────── */}
        <div className="pdf-zoom-controls">
          <button
            className="pdf-zoom-btn"
            onClick={() => setScale((s) => Math.max(minScale, s - 0.1))}
            title="ซูมออก"
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="pdf-zoom-btn"
            onClick={() => setScale((s) => Math.min(3, s + 0.1))}
            title="ซูมเข้า"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div className="pdf-container" ref={containerRef}>
          <div
            style={{
              zoom: scale,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
              padding: "10px 0",
            }}
          >
            {previewContent}
          </div>
        </div>
      </div>
    </>
  );
});

export default PdfViewer;

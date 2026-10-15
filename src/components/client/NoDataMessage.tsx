import { ClipboardList, Search, Info } from "lucide-react";

/**
 * Empty state: blue clipboard icon with search/close badges + title + subtitle.
 */
export default function NoDataMessage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        margin: 10,
        padding: "26px 18px 24px",
        border: "2px solid #d7e6f7",
        borderRadius: 18,
        background:
          "radial-gradient(circle at 50% 18%, rgba(207, 229, 255, 0.65) 0 56px, transparent 57px), linear-gradient(180deg, #fbfdff 0%, #f7fbff 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 22px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* Icon container */}
      <div
        style={{
          width: 126,
          height: 112,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-hidden="true"
      >
        {/* Blue gradient circle */}
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: "50%",
            background: "linear-gradient(180deg, #eaf4ff 0%, #dcecff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Clipboard icon */}
          <ClipboardList
            size={62}
            strokeWidth={1.8}
            color="#4d8bca"
            style={{
              filter: "drop-shadow(0 6px 8px rgba(25, 68, 125, 0.14))",
            }}
          />

          {/* Search badge */}
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "linear-gradient(180deg, #194d8f 0%, #123b74 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              right: 7,
              bottom: 4,
              boxShadow: "0 8px 14px rgba(23, 63, 122, 0.22)",
            }}
          >
            <Search size={28} strokeWidth={2.6} color="#ffffff" />
          </span>

          {/* Close badge (×) */}
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#5f96ce",
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              left: 16,
              bottom: 10,
              boxShadow: "0 5px 10px rgba(23, 63, 122, 0.16)",
            }}
          >
            ×
          </span>
        </div>
      </div>

      {/* Title — matches Checkpoint .emptyTitle */}
      <p
        style={{
          margin: 0,
          color: "#173f7a",
          fontSize: "clamp(16px, 4.5vw, 20px)",
          fontWeight: 900,
          lineHeight: 1.28,
          letterSpacing: "0.1px",
          textAlign: "center",
        }}
      >
        ไม่พบข้อมูลรายงาน
      </p>

      {/* Dashed divider */}
      <div
        style={{
          width: "88%",
          maxWidth: 280,
          height: 1,
          margin: "8px auto",
          borderTop: "2px dashed #cfe0f2",
        }}
      />

      {/* Subtitle hint — matches Checkpoint .emptyHint */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          color: "#5b8ccc",
          fontSize: 15,
          fontWeight: 800,
          lineHeight: 1.35,
        }}
      ></div>
    </div>
  );
}

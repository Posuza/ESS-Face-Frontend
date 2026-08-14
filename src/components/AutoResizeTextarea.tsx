import { useEffect, useRef, useLayoutEffect, forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface AutoResizeTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string | number | readonly string[];
}

const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(({ value, onChange, style, ...props }, forwardedRef) => {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  // Combine refs if forwardedRef is provided
  const setRef = (el: HTMLTextAreaElement | null) => {
    internalRef.current = el;
    if (typeof forwardedRef === "function") {
      forwardedRef(el);
    } else if (forwardedRef) {
      forwardedRef.current = el;
    }
  };

  const resize = () => {
    const textarea = internalRef.current;
    if (!textarea) return;

    // Reset height to auto to get proper scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight + 2px buffer to avoid clipping
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  };

  // Resize synchronously after DOM updates so height is correct before paint
  useLayoutEffect(() => {
    resize();
  }, [value]);

  // Recalculate on window resize in case container width or font metrics change
  useEffect(() => {
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    resize();
    if (onChange) {
      onChange(e);
    }
  };

  const baseInlineStyle: React.CSSProperties = {
    overflow: "hidden",
    resize: "none",
    fontSize: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };

  const className = typeof props.className === "string" ? props.className : "";
  const isApprovalClass = className.includes("approval-textarea");

  const approvalInlineStyle: React.CSSProperties = isApprovalClass
    ? {
        /* Only provide compact padding/font fallback; leave color/border to CSS
           so inactive/focused states can be controlled in stylesheet. */
        padding: "8px 10px",
        fontSize: 13,
        lineHeight: 1.4,
        boxSizing: "border-box",
      }
    : {};

  const combinedStyle: React.CSSProperties = {
    ...baseInlineStyle,
    ...(style || {}),
    ...approvalInlineStyle,
  };

  return (
    <textarea
      ref={setRef}
      value={value}
      onChange={handleChange}
      style={combinedStyle}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;

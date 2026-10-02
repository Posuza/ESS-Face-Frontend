import type { AppSliceCreator } from "../types";

const RETURN_SITE_SESSION_KEY = "guts-face.return-site.v1";

export type ReturnSite = {
  url: string;
  origin: string;
  section: string | null;
  capturedAt: string;
};

function parseWebUrl(value: string | null): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function loadReturnSite(): ReturnSite | null {
  try {
    const stored = sessionStorage.getItem(RETURN_SITE_SESSION_KEY);
    if (!stored) return null;

    const value = JSON.parse(stored) as Partial<ReturnSite>;
    const url = parseWebUrl(typeof value.url === "string" ? value.url : null);
    if (!url || url.origin === window.location.origin) {
      sessionStorage.removeItem(RETURN_SITE_SESSION_KEY);
      return null;
    }

    return {
      url: url.href,
      origin: url.origin,
      section: typeof value.section === "string" ? value.section : null,
      capturedAt:
        typeof value.capturedAt === "string"
          ? value.capturedAt
          : new Date().toISOString(),
    };
  } catch {
    sessionStorage.removeItem(RETURN_SITE_SESSION_KEY);
    return null;
  }
}

function persistReturnSite(returnSite: ReturnSite | null) {
  if (returnSite) {
    sessionStorage.setItem(RETURN_SITE_SESSION_KEY, JSON.stringify(returnSite));
  } else {
    sessionStorage.removeItem(RETURN_SITE_SESSION_KEY);
  }
}

export type ReturnSiteSlice = {
  returnSite: ReturnSite | null;
  captureReturnSite: () => void;
  clearReturnSite: () => void;
  returnToSource: () => void;
};

export const createReturnSiteSlice: AppSliceCreator<ReturnSiteSlice> = (set, get) => ({
  returnSite: loadReturnSite(),

  captureReturnSite() {
    const params = new URLSearchParams(window.location.search);
    const hasRequestedReturn = params.has("return_to");
    const requested = parseWebUrl(params.get("return_to"));
    const referrer = parseWebUrl(document.referrer);
    const section = params.get("return_section")?.trim() || null;

    // When both are available, the requested destination must belong to the
    // site that actually sent the browser here. Otherwise, return to the
    // referrer itself. This supports any source site without a fixed list.
    const target =
      requested && (!referrer || requested.origin === referrer.origin)
        ? requested
        : referrer;

    if (!target || target.origin === window.location.origin) {
      if (hasRequestedReturn) {
        persistReturnSite(null);
        set({ returnSite: null });
      }
      return;
    }

    const returnSite: ReturnSite = {
      url: target.href,
      origin: target.origin,
      section,
      capturedAt: new Date().toISOString(),
    };

    persistReturnSite(returnSite);
    set({ returnSite });
  },

  clearReturnSite() {
    persistReturnSite(null);
    set({ returnSite: null });
  },

  returnToSource() {
    const returnSite = get().returnSite;
    if (!returnSite) return;

    persistReturnSite(null);
    set({ returnSite: null });
    window.location.assign(returnSite.url);
  },
});

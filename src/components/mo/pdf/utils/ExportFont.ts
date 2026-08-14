import type { jsPDF } from "jspdf";
import { PDF_EXPORT } from "../constant/Variable";

const fontCache = new Map<string, Promise<string>>();

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let result = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    for (let index = 0; index < chunk.length; index++) {
      result += String.fromCharCode(chunk[index]);
    }
  }

  return result;
}

async function loadFontBinary(fontFileName: string): Promise<string> {
  const cached = fontCache.get(fontFileName);
  if (cached) return cached;

  const promise = (async () => {
    const fontUrl = `${import.meta.env.BASE_URL}fonts/${fontFileName}`;
    const response = await fetch(fontUrl);
    if (!response.ok) {
      throw new Error(`Font not found: ${fontFileName}`);
    }
    return arrayBufferToBinaryString(await response.arrayBuffer());
  })();

  fontCache.set(fontFileName, promise);
  try {
    return await promise;
  } catch (error) {
    fontCache.delete(fontFileName);
    throw error;
  }
}

export async function registerExportFonts(doc: jsPDF): Promise<void> {
  const [regular, semibold] = await Promise.all([
    loadFontBinary(PDF_EXPORT.font.regularFile),
    loadFontBinary(PDF_EXPORT.font.semiboldFile),
  ]);

  doc.addFileToVFS(PDF_EXPORT.font.regularFile, regular);
  doc.addFont(PDF_EXPORT.font.regularFile, PDF_EXPORT.font.family, "normal");
  doc.addFileToVFS(PDF_EXPORT.font.semiboldFile, semibold);
  doc.addFont(PDF_EXPORT.font.semiboldFile, PDF_EXPORT.font.family, "bold");
  doc.setFont(PDF_EXPORT.font.family, "normal");
}

const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}]/gu;

function isUnsupportedCodePoint(codePoint: number): boolean {
  const isControl =
    (codePoint >= 0x00 && codePoint <= 0x08) ||
    codePoint === 0x0b ||
    codePoint === 0x0c ||
    (codePoint >= 0x0e && codePoint <= 0x1f) ||
    (codePoint >= 0x7f && codePoint <= 0x9f);
  const isInvisibleFormatting =
    (codePoint >= 0x200b && codePoint <= 0x200f) ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2060 && codePoint <= 0x206f);
  const isEmojiFormatting =
    codePoint === 0x20e3 ||
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0020 && codePoint <= 0xe007f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
  const isUnsupportedMarker =
    codePoint === 0xfeff || codePoint === 0xfffc || codePoint === 0xfffd;

  return (
    isControl ||
    isInvisibleFormatting ||
    isEmojiFormatting ||
    isUnsupportedMarker
  );
}

/** Keep MO report text consistent between the browser and generated PDF. */
export function sanitizeMoFreeText(value: unknown): string {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(EMOJI_PATTERN, "");

  return Array.from(normalized)
    .filter((character) => !isUnsupportedCodePoint(character.codePointAt(0)!))
    .join("");
}

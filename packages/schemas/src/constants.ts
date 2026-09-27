export const DEFAULT_OPACITY = 1;
// Matches isHexValid in @pdfme/common: 3/4/6/8-digit hex, where 4/8-digit carry alpha.
export const HEX_COLOR_PATTERN = '^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$';
// Barcode bar/text colors are handed to bwip-js, which has no alpha support (it reads
// 8-digit hex as CMYK and throws on 4-digit hex), so those fields stay 6-digit only.
export const OPAQUE_HEX_COLOR_PATTERN = '^#(?:[A-Fa-f0-9]{6})$';

import { PAGE_SIZE_PRESETS } from '@pdfme/common';

export const a4BasePdf = (padding: [number, number, number, number] = [20, 20, 20, 20]) => ({
  ...PAGE_SIZE_PRESETS.A4,
  padding,
});

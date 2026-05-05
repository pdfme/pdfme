import { PAGE_SIZE_PRESETS } from '@pdfme/common';

export const pdf2size = async () => [PAGE_SIZE_PRESETS.A4];

export const pdf2img = async () => [new Uint8Array([137, 80, 78, 71]).buffer];

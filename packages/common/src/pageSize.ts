export type PageOrientation = 'portrait' | 'landscape';

export const PAGE_SIZE_PRESETS = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 },
  B4: { width: 250, height: 353 },
  B5: { width: 176, height: 250 },
  B6: { width: 125, height: 176 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
  Tabloid: { width: 279.4, height: 431.8 },
} as const satisfies Record<string, { width: number; height: number }>;

export type PageSizePreset = keyof typeof PAGE_SIZE_PRESETS;
export type PageSize = PageSizePreset | { width: number; height: number };

export const resolvePageSize = (
  size: PageSize = 'A4',
  orientation: PageOrientation = 'portrait',
): { width: number; height: number } => {
  const resolved =
    typeof size === 'string' ? PAGE_SIZE_PRESETS[size] : { width: size.width, height: size.height };

  if (!resolved) {
    throw new Error(`@pdfme/common: unknown page size preset "${String(size)}"`);
  }

  if (orientation === 'landscape') {
    return { width: resolved.height, height: resolved.width };
  }
  return { width: resolved.width, height: resolved.height };
};

export const detectPaperSize = (
  width: number,
  height: number,
  tolerance = 2,
): `${PageSizePreset} ${PageOrientation}` | null => {
  const entries = Object.entries(PAGE_SIZE_PRESETS) as [
    PageSizePreset,
    { width: number; height: number },
  ][];

  for (const [name, size] of entries) {
    if (
      (Math.abs(width - size.width) <= tolerance && Math.abs(height - size.height) <= tolerance) ||
      (Math.abs(width - size.height) <= tolerance && Math.abs(height - size.width) <= tolerance)
    ) {
      const orientation = width < height ? 'portrait' : 'landscape';
      return `${name} ${orientation}`;
    }
  }
  return null;
};

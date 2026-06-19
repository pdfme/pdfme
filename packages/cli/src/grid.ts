interface Schema {
  name: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  [key: string]: unknown;
}

const schemaColorCache = new Map<string, string>();

function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const h = hue / 60;
  const x = c * (1 - Math.abs((h % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 1) {
    r = c;
    g = x;
  } else if (h < 2) {
    r = x;
    g = c;
  } else if (h < 3) {
    g = c;
    b = x;
  } else if (h < 4) {
    g = x;
    b = c;
  } else if (h < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const m = l - c / 2;
  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getSchemaColor(type: string): string {
  const normalizedType = type.trim().toLowerCase();
  const cached = schemaColorCache.get(normalizedType);
  if (cached) {
    return cached;
  }

  // Keep colors stable per schema type without maintaining a manual lookup table.
  const hash = hashString(normalizedType);
  const color = hslToHex(hash % 360, 65 + (hash % 12), 42 + ((hash >> 8) % 10));
  schemaColorCache.set(normalizedType, color);
  return color;
}

interface CanvasContext {
  drawImage(img: unknown, x: number, y: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  setLineDash(segments: number[]): void;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  font: string;
  globalAlpha: number;
}

function drawGridLines(
  ctx: CanvasContext,
  pxPerMm: number,
  pageWidthMm: number,
  pageHeightMm: number,
  imgWidth: number,
  imgHeight: number,
  gridSizeMm: number,
  withLabels: boolean,
): void {
  ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= pageWidthMm; x += gridSizeMm) {
    const px = x * pxPerMm;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, imgHeight);
    ctx.stroke();

    if (withLabels && x % (gridSizeMm * 2) === 0 && x > 0) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
      ctx.font = `${Math.max(9, pxPerMm * 2.5)}px sans-serif`;
      ctx.fillText(`${x}`, px + 2, 12);
    }
  }

  // Horizontal lines
  for (let y = 0; y <= pageHeightMm; y += gridSizeMm) {
    const px = y * pxPerMm;
    ctx.beginPath();
    ctx.moveTo(0, px);
    ctx.lineTo(imgWidth, px);
    ctx.stroke();

    if (withLabels && y % (gridSizeMm * 2) === 0 && y > 0) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
      ctx.font = `${Math.max(9, pxPerMm * 2.5)}px sans-serif`;
      ctx.fillText(`${y}`, 2, px - 2);
    }
  }
}

function drawSchemaOverlays(ctx: CanvasContext, schemas: Schema[], pxPerMm: number): void {
  for (const schema of schemas) {
    const color = getSchemaColor(schema.type);
    const x = schema.position.x * pxPerMm;
    const y = schema.position.y * pxPerMm;
    const w = schema.width * pxPerMm;
    const h = schema.height * pxPerMm;

    // Dashed rectangle border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Label background
    const label = `${schema.name} (${schema.type})`;
    const fontSize = Math.max(10, Math.min(14, pxPerMm * 3));
    ctx.font = `${fontSize}px sans-serif`;
    const metrics = ctx.measureText(label);
    const labelHeight = fontSize + 4;
    const labelWidth = metrics.width + 6;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
    ctx.globalAlpha = 1;

    // Label text (white on colored background)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, x + 3, y - 3);
  }
}

async function loadAndPrepareCanvas(imageBuffer: ArrayBuffer): Promise<{
  canvas: { toBuffer(mime: string): Buffer };
  ctx: CanvasContext;
  img: { width: number; height: number };
}> {
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const img = await loadImage(Buffer.from(imageBuffer));
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d') as unknown as CanvasContext;
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, img };
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

/**
 * Draw grid lines and schema boundary overlays on a generated PDF page image.
 * Used by `pdfme generate --grid`.
 */
export async function drawGridOnImage(
  imageBuffer: ArrayBuffer,
  schemas: Schema[],
  gridSizeMm: number,
  pageWidthMm: number,
  pageHeightMm: number,
): Promise<ArrayBuffer> {
  const { canvas, ctx, img } = await loadAndPrepareCanvas(imageBuffer);
  const pxPerMm = img.width / pageWidthMm;

  drawGridLines(ctx, pxPerMm, pageWidthMm, pageHeightMm, img.width, img.height, gridSizeMm, false);
  drawSchemaOverlays(ctx, schemas, pxPerMm);

  return bufferToArrayBuffer(canvas.toBuffer('image/png'));
}

/**
 * Draw grid lines with mm coordinate labels on a plain PDF image.
 * Used by `pdfme pdf2img --grid`.
 */
export async function drawGridOnPdfImage(
  imageBuffer: ArrayBuffer,
  gridSizeMm: number,
  pageWidthMm: number,
  pageHeightMm: number,
): Promise<ArrayBuffer> {
  const { canvas, ctx, img } = await loadAndPrepareCanvas(imageBuffer);
  const pxPerMm = img.width / pageWidthMm;

  drawGridLines(ctx, pxPerMm, pageWidthMm, pageHeightMm, img.width, img.height, gridSizeMm, true);

  return bufferToArrayBuffer(canvas.toBuffer('image/png'));
}

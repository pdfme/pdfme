interface Schema {
  name: string;
  type: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  [key: string]: unknown;
}

type ImageFormat = 'png' | 'jpeg';

// Schema type -> color mapping for visual distinction
const TYPE_COLORS: Record<string, string> = {
  text: '#2196F3',
  multiVariableText: '#1565C0',
  image: '#4CAF50',
  svg: '#66BB6A',
  table: '#FF9800',
  qrcode: '#9C27B0',
  code128: '#9C27B0',
  ean13: '#9C27B0',
  line: '#795548',
  rectangle: '#607D8B',
  ellipse: '#00BCD4',
  date: '#E91E63',
  dateTime: '#E91E63',
  time: '#E91E63',
  select: '#FF5722',
  radioGroup: '#8BC34A',
  checkbox: '#CDDC39',
};

function getSchemaColor(type: string): string {
  return TYPE_COLORS[type] ?? '#F44336';
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

function drawSchemaOverlays(
  ctx: CanvasContext,
  schemas: Schema[],
  pxPerMm: number,
): void {
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

async function loadAndPrepareCanvas(
  imageBuffer: ArrayBuffer,
): Promise<{
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
  imageType: ImageFormat,
): Promise<ArrayBuffer> {
  const { canvas, ctx, img } = await loadAndPrepareCanvas(imageBuffer);
  const pxPerMm = img.width / pageWidthMm;

  drawGridLines(ctx, pxPerMm, pageWidthMm, pageHeightMm, img.width, img.height, gridSizeMm, false);
  drawSchemaOverlays(ctx, schemas, pxPerMm);

  const mimeType = imageType === 'jpeg' ? 'image/jpeg' : 'image/png';
  return bufferToArrayBuffer(canvas.toBuffer(mimeType));
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
  imageType: ImageFormat,
): Promise<ArrayBuffer> {
  const { canvas, ctx, img } = await loadAndPrepareCanvas(imageBuffer);
  const pxPerMm = img.width / pageWidthMm;

  drawGridLines(ctx, pxPerMm, pageWidthMm, pageHeightMm, img.width, img.height, gridSizeMm, true);

  const mimeType = imageType === 'jpeg' ? 'image/jpeg' : 'image/png';
  return bufferToArrayBuffer(canvas.toBuffer(mimeType));
}

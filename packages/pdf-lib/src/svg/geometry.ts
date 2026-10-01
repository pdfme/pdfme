/**
 * Geometry: matrices, transforms and the path model used throughout the
 * converter.
 */

import { StringParser, type WarningCallback } from './xml.js';

export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export type BBox = [number, number, number, number];

export function multiplyMatrix(...matrices: Matrix[]): Matrix {
  let result: Matrix = matrices[0];
  for (let i = 1; i < matrices.length; i++) {
    const b = matrices[i];
    const a = result;
    result = [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5],
    ];
  }
  return result;
}

export function transformPoint(point: [number, number], m: Matrix): [number, number] {
  return [m[0] * point[0] + m[2] * point[1] + m[4], m[1] * point[0] + m[3] * point[1] + m[5]];
}

export function inverseMatrix(m: Matrix): Matrix {
  const dt = m[0] * m[3] - m[1] * m[2];
  return [
    m[3] / dt,
    -m[1] / dt,
    -m[2] / dt,
    m[0] / dt,
    (m[2] * m[5] - m[3] * m[4]) / dt,
    (m[1] * m[4] - m[0] * m[5]) / dt,
  ];
}

export function isEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-10;
}

export function isNotEqual(a: number, b: number): boolean {
  return Math.abs(a - b) >= 1e-10;
}

/** Round to six decimals and clamp to PDF's numeric range. */
export function validateNumber(n: number): number {
  return n > -1e21 && n < 1e21 ? Math.round(n * 1e6) / 1e6 : 0;
}

export function validateMatrix(m: Matrix): Matrix | undefined {
  const m0 = validateNumber(m[0]);
  const m1 = validateNumber(m[1]);
  const m2 = validateNumber(m[2]);
  const m3 = validateNumber(m[3]);
  const m4 = validateNumber(m[4]);
  const m5 = validateNumber(m[5]);
  if (isNotEqual(m0 * m3 - m1 * m2, 0)) return [m0, m1, m2, m3, m4, m5];
  return undefined;
}

function solveEquation(curve: number[]): number[] {
  const a = curve[2] || 0;
  const b = curve[1] || 0;
  const c = curve[0] || 0;
  if (isEqual(a, 0) && isEqual(b, 0)) return [];
  if (isEqual(a, 0)) return [-c / b];
  const d = b * b - 4 * a * c;
  if (isNotEqual(d, 0) && d > 0) {
    return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
  }
  if (isEqual(d, 0)) return [-b / (2 * a)];
  return [];
}

function getCurveValue(t: number, curve: number[]): number {
  return (
    (curve[0] || 0) + (curve[1] || 0) * t + (curve[2] || 0) * t * t + (curve[3] || 0) * t * t * t
  );
}

export function parseTransform(v: string | null | undefined): Matrix | undefined {
  const parser = new StringParser((v || '').trim());
  let result: Matrix = IDENTITY.slice() as Matrix;
  let temp: RegExpMatchArray | string | undefined;
  while ((temp = parser.match(/^([A-Za-z]+)\s*[(]([^(]+)[)]/, true))) {
    const match = temp as RegExpMatchArray;
    const func = match[1];
    const nums: number[] = [];
    const parser2 = new StringParser(match[2].trim().replace(/px/g, ''));
    let temp2: string | undefined;
    while ((temp2 = parser2.matchNumber())) {
      nums.push(Number(temp2));
      parser2.matchSeparator();
    }
    if (func === 'matrix' && nums.length === 6) {
      result = multiplyMatrix(result, nums as unknown as Matrix);
    } else if (func === 'translate' && nums.length === 2) {
      result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], nums[1]]);
    } else if (func === 'translate3d' && nums.length === 3) {
      // Only a 2D translate when the Z component is 0.
      result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], nums[1]]);
    } else if (func === 'translate' && nums.length === 1) {
      result = multiplyMatrix(result, [1, 0, 0, 1, nums[0], 0]);
    } else if (func === 'scale' && nums.length === 2) {
      result = multiplyMatrix(result, [nums[0], 0, 0, nums[1], 0, 0]);
    } else if (func === 'scale' && nums.length === 1) {
      result = multiplyMatrix(result, [nums[0], 0, 0, nums[0], 0, 0]);
    } else if (func === 'rotate' && nums.length === 3) {
      const a = (nums[0] * Math.PI) / 180;
      result = multiplyMatrix(
        result,
        [1, 0, 0, 1, nums[1], nums[2]],
        [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0],
        [1, 0, 0, 1, -nums[1], -nums[2]],
      );
    } else if (func === 'rotate' && nums.length === 1) {
      const a = (nums[0] * Math.PI) / 180;
      result = multiplyMatrix(result, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]);
    } else if (func === 'skewX' && nums.length === 1) {
      const a = (nums[0] * Math.PI) / 180;
      result = multiplyMatrix(result, [1, 0, Math.tan(a), 1, 0, 0]);
    } else if (func === 'skewY' && nums.length === 1) {
      const a = (nums[0] * Math.PI) / 180;
      result = multiplyMatrix(result, [1, Math.tan(a), 0, 1, 0, 0]);
    } else {
      return undefined;
    }
    parser.matchSeparator();
  }
  if (parser.matchAll()) return undefined;
  return result;
}

/** A `transform-origin` value, resolved against the element's size. */
export type TransformOriginFn = (width: number, height: number) => [number, number];

export function parseTransformOrigin(v: string | null | undefined): TransformOriginFn {
  const parseValue = (token: string, base: number): number => {
    token = (token || '').trim().toLowerCase();
    const pct = token.match(/^([+-]?[0-9]*\.?[0-9]+)%$/);
    if (pct) return base * (parseFloat(pct[1]) / 100);
    const num = parseFloat(token.replace(/px$/, ''));
    return isNaN(num) ? 0 : num;
  };
  const keywordX = (k: string): ((w: number) => number) | null =>
    k === 'left' ? () => 0 : k === 'right' ? (w) => w : k === 'center' ? (w) => w / 2 : null;
  const keywordY = (k: string): ((h: number) => number) | null =>
    k === 'top' ? () => 0 : k === 'bottom' ? (h) => h : k === 'center' ? (h) => h / 2 : null;

  const twoOrThree = (v || '')
    .trim()
    .match(
      /^([+-]?(?:[0-9]*\.)?[0-9]+(?:%|px)?)\s+([+-]?(?:[0-9]*\.)?[0-9]+(?:%|px)?)(?:\s+([+-]?(?:[0-9]*\.)?[0-9]+(?:%|px)?))?$/,
    );
  if (twoOrThree) {
    const vx = twoOrThree[1];
    const vy = twoOrThree[2];
    return (width, height) => [parseValue(vx, width), parseValue(vy, height)];
  }

  const parts = (v || '').trim().toLowerCase().split(/\s+/).slice(0, 2);
  let kx: ((w: number) => number) | null = null;
  let ky: ((h: number) => number) | null = null;
  const values: string[] = [];
  for (const part of parts) {
    const fx = keywordX(part);
    if (fx !== null) {
      kx = fx;
      continue;
    }
    const fy = keywordY(part);
    if (fy !== null) {
      ky = fy;
      continue;
    }
    values.push(part);
  }
  if (kx !== null || ky !== null || values.length) {
    return (width, height) => [
      kx ? kx(width) : values[0] !== undefined ? parseValue(values[0], width) : width / 2,
      ky
        ? ky(height)
        : values[1] !== undefined
          ? parseValue(values[1], height)
          : values[0] !== undefined
            ? 0
            : height / 2,
    ];
  }
  return () => [0, 0];
}

/** Compute the `preserveAspectRatio` fitting matrix. */
export function parseAspectRatio(
  aspectRatio: string | null | undefined,
  availWidth: number,
  availHeight: number,
  elemWidth: number,
  elemHeight: number,
  initAlign: number,
): Matrix {
  const temp: RegExpMatchArray | null =
    (aspectRatio || '')
      .trim()
      .match(/^(none)$|^x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+(meet|slice))?$/) ?? null;
  const ratioType = temp?.[1] || temp?.[4] || 'meet';
  const alignX: Record<string, number> = { Min: 0, Mid: 0.5, Max: 1 };
  const alignY: Record<string, number> = { Min: 0, Mid: 0.5, Max: 1 };
  let scaleX = availWidth / elemWidth;
  let scaleY = availHeight / elemHeight;
  const dx = alignX[temp?.[2] || 'Mid'] - initAlign;
  const dy = alignY[temp?.[3] || 'Mid'] - initAlign;
  if (ratioType === 'slice') {
    scaleY = scaleX = Math.max(scaleX, scaleY);
  } else if (ratioType === 'meet') {
    scaleY = scaleX = Math.min(scaleX, scaleY);
  }
  return [
    scaleX,
    0,
    0,
    scaleY,
    dx * (availWidth - elemWidth * scaleX),
    dy * (availHeight - elemHeight * scaleY),
  ];
}

interface Segment {
  totalLength: number;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  hasStart: boolean;
  hasEnd: boolean;
  getBoundingBox(): BBox;
  getPointAtLength(l: number): [number, number, number] | undefined;
}

class BezierSegment implements Segment {
  hasStart = false;
  hasEnd = false;
  totalLength: number;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  private divisions: number;
  private equationX: number[];
  private equationY: number[];
  private derivativeX: number[];
  private derivativeY: number[];
  private lengthMap: number[];

  constructor(
    p1x: number,
    p1y: number,
    c1x: number,
    c1y: number,
    c2x: number,
    c2y: number,
    p2x: number,
    p2y: number,
    precision: number,
  ) {
    this.divisions = 6 * precision;
    this.equationX = [
      p1x,
      -3 * p1x + 3 * c1x,
      3 * p1x - 6 * c1x + 3 * c2x,
      -p1x + 3 * c1x - 3 * c2x + p2x,
    ];
    this.equationY = [
      p1y,
      -3 * p1y + 3 * c1y,
      3 * p1y - 6 * c1y + 3 * c2y,
      -p1y + 3 * c1y - 3 * c2y + p2y,
    ];
    this.derivativeX = [
      -3 * p1x + 3 * c1x,
      6 * p1x - 12 * c1x + 6 * c2x,
      -3 * p1x + 9 * c1x - 9 * c2x + 3 * p2x,
    ];
    this.derivativeY = [
      -3 * p1y + 3 * c1y,
      6 * p1y - 12 * c1y + 6 * c2y,
      -3 * p1y + 9 * c1y - 9 * c2y + 3 * p2y,
    ];
    this.lengthMap = [0];
    for (let i = 1; i <= this.divisions; i++) {
      const t = (i - 0.5) / this.divisions;
      const dx = getCurveValue(t, this.derivativeX) / this.divisions;
      const dy = getCurveValue(t, this.derivativeY) / this.divisions;
      this.lengthMap[i] = this.lengthMap[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }
    this.totalLength = this.lengthMap[this.divisions];
    this.startPoint = [
      p1x,
      p1y,
      isEqual(p1x, c1x) && isEqual(p1y, c1y)
        ? Math.atan2(c2y - c1y, c2x - c1x)
        : Math.atan2(c1y - p1y, c1x - p1x),
    ];
    this.endPoint = [
      p2x,
      p2y,
      isEqual(c2x, p2x) && isEqual(c2y, p2y)
        ? Math.atan2(c2y - c1y, c2x - c1x)
        : Math.atan2(p2y - c2y, p2x - c2x),
    ];
  }

  getBoundingBox(): BBox {
    let minX = getCurveValue(0, this.equationX);
    let minY = getCurveValue(0, this.equationY);
    let maxX = getCurveValue(1, this.equationX);
    let maxY = getCurveValue(1, this.equationY);
    if (minX > maxX) [minX, maxX] = [maxX, minX];
    if (minY > maxY) [minY, maxY] = [maxY, minY];
    for (const root of solveEquation(this.derivativeX)) {
      if (root >= 0 && root <= 1) {
        const x = getCurveValue(root, this.equationX);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    for (const root of solveEquation(this.derivativeY)) {
      if (root >= 0 && root <= 1) {
        const y = getCurveValue(root, this.equationY);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return [minX, minY, maxX, maxY];
  }

  getPointAtLength(l: number): [number, number, number] | undefined {
    if (isEqual(l, 0)) return this.startPoint;
    if (isEqual(l, this.totalLength)) return this.endPoint;
    if (l < 0 || l > this.totalLength) return undefined;
    for (let i = 1; i <= this.divisions; i++) {
      const l1 = this.lengthMap[i - 1];
      const l2 = this.lengthMap[i];
      if (l1 <= l && l <= l2) {
        const t = (i - (l2 - l) / (l2 - l1)) / this.divisions;
        return [
          getCurveValue(t, this.equationX),
          getCurveValue(t, this.equationY),
          Math.atan2(getCurveValue(t, this.derivativeY), getCurveValue(t, this.derivativeX)),
        ];
      }
    }
    return undefined;
  }
}

class LineSegment implements Segment {
  hasStart = false;
  hasEnd = false;
  totalLength: number;
  startPoint: [number, number, number];
  endPoint: [number, number, number];

  constructor(p1x: number, p1y: number, p2x: number, p2y: number) {
    this.totalLength = Math.sqrt((p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y));
    const angle = Math.atan2(p2y - p1y, p2x - p1x);
    this.startPoint = [p1x, p1y, angle];
    this.endPoint = [p2x, p2y, angle];
  }

  getBoundingBox(): BBox {
    return [
      Math.min(this.startPoint[0], this.endPoint[0]),
      Math.min(this.startPoint[1], this.endPoint[1]),
      Math.max(this.startPoint[0], this.endPoint[0]),
      Math.max(this.startPoint[1], this.endPoint[1]),
    ];
  }

  getPointAtLength(l: number): [number, number, number] | undefined {
    if (l >= 0 && l <= this.totalLength) {
      const r = l / this.totalLength || 0;
      return [
        this.startPoint[0] + r * (this.endPoint[0] - this.startPoint[0]),
        this.startPoint[1] + r * (this.endPoint[1] - this.startPoint[1]),
        this.startPoint[2],
      ];
    }
    return undefined;
  }
}

export type PathCommandKind = 'move' | 'line' | 'curve' | 'close';

/** One path command: its kind, sub-path markers and coordinates. */
export interface PathCommand {
  kind: PathCommandKind;
  hasStart: boolean;
  hasEnd: boolean;
  /** 2 numbers per point; empty for `close`. */
  coords: number[];
}

const PATH_ARGUMENTS: Record<string, number> = {
  A: 7,
  a: 7,
  C: 6,
  c: 6,
  H: 1,
  h: 1,
  L: 2,
  l: 2,
  M: 2,
  m: 2,
  Q: 4,
  q: 4,
  S: 4,
  s: 4,
  T: 2,
  t: 2,
  V: 1,
  v: 1,
  Z: 0,
  z: 0,
};

const PATH_FLAGS: Record<string, boolean> = { A3: true, A4: true, a3: true, a4: true };

type SegmentBuilder = (shape: SvgShape, coords: number[]) => Segment | null;

/** Maps a command kind to the segment it produces (if any). */
const SEGMENT_BUILDERS: Record<PathCommandKind, SegmentBuilder | undefined> = {
  move: (shape, [x, y]) => shape.buildMove(x, y),
  line: (shape, [x, y]) => shape.buildLine(x, y),
  curve: (shape, [c1x, c1y, c2x, c2y, x, y]) => shape.buildCurve(c1x, c1y, c2x, c2y, x, y),
  close: (shape) => shape.buildClose(),
};

/** Receives the path operators a {@link SvgShape} produces. */
export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  closePath(): void;
}

/**
 * An SVG path: a list of commands plus the derived segments used for
 * bounding boxes, marker placement and text-on-path.
 */
export class SvgShape {
  pathCommands: PathCommand[] = [];
  pathSegments: Segment[] = [];
  startPoint: [number, number, number] | null = null;
  endPoint: [number, number, number] | null = null;
  totalLength = 0;

  private startX = 0;
  private startY = 0;
  private currX = 0;
  private currY = 0;
  private lastCom = '';
  private lastCtrlX = 0;
  private lastCtrlY = 0;
  private precision: number;

  constructor(precision = 3) {
    this.precision = precision;
  }

  buildMove(x: number, y: number): null {
    this.startX = this.currX = x;
    this.startY = this.currY = y;
    return null;
  }

  buildLine(x: number, y: number): Segment {
    const segment = new LineSegment(this.currX, this.currY, x, y);
    this.currX = x;
    this.currY = y;
    return segment;
  }

  buildCurve(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): Segment {
    const segment = new BezierSegment(
      this.currX,
      this.currY,
      c1x,
      c1y,
      c2x,
      c2y,
      x,
      y,
      this.precision,
    );
    this.currX = x;
    this.currY = y;
    return segment;
  }

  buildClose(): Segment {
    const segment = new LineSegment(this.currX, this.currY, this.startX, this.startY);
    this.currX = this.startX;
    this.currY = this.startY;
    return segment;
  }

  /** Record a command and derive the segment it contributes. */
  addCommand(data: PathCommand): void {
    this.pathCommands.push(data);
    const build = SEGMENT_BUILDERS[data.kind];
    const segment = build ? build(this, data.coords) : null;
    if (segment) {
      segment.hasStart = data.hasStart;
      segment.hasEnd = data.hasEnd;
      this.startPoint = this.startPoint || segment.startPoint;
      this.endPoint = segment.endPoint;
      this.pathSegments.push(segment);
      this.totalLength += segment.totalLength;
    }
  }

  M(x: number, y: number): this {
    this.addCommand({ kind: 'move', hasStart: true, hasEnd: true, coords: [x, y] });
    this.lastCom = 'M';
    return this;
  }

  m(x: number, y: number): this {
    return this.M(this.currX + x, this.currY + y);
  }

  Z(): this {
    this.addCommand({ kind: 'close', hasStart: true, hasEnd: true, coords: [] });
    this.lastCom = 'Z';
    return this;
  }

  z(): this {
    return this.Z();
  }

  L(x: number, y: number): this {
    this.addCommand({ kind: 'line', hasStart: true, hasEnd: true, coords: [x, y] });
    this.lastCom = 'L';
    return this;
  }

  l(x: number, y: number): this {
    return this.L(this.currX + x, this.currY + y);
  }

  H(x: number): this {
    return this.L(x, this.currY);
  }

  h(x: number): this {
    return this.L(this.currX + x, this.currY);
  }

  V(y: number): this {
    return this.L(this.currX, y);
  }

  v(y: number): this {
    return this.L(this.currX, this.currY + y);
  }

  C(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    this.addCommand({
      kind: 'curve',
      hasStart: true,
      hasEnd: true,
      coords: [c1x, c1y, c2x, c2y, x, y],
    });
    this.lastCom = 'C';
    this.lastCtrlX = c2x;
    this.lastCtrlY = c2y;
    return this;
  }

  c(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    return this.C(
      this.currX + c1x,
      this.currY + c1y,
      this.currX + c2x,
      this.currY + c2y,
      this.currX + x,
      this.currY + y,
    );
  }

  S(c1x: number, c1y: number, x: number, y: number): this {
    return this.C(
      this.currX + (this.lastCom === 'C' ? this.currX - this.lastCtrlX : 0),
      this.currY + (this.lastCom === 'C' ? this.currY - this.lastCtrlY : 0),
      c1x,
      c1y,
      x,
      y,
    );
  }

  s(c1x: number, c1y: number, x: number, y: number): this {
    return this.C(
      this.currX + (this.lastCom === 'C' ? this.currX - this.lastCtrlX : 0),
      this.currY + (this.lastCom === 'C' ? this.currY - this.lastCtrlY : 0),
      this.currX + c1x,
      this.currY + c1y,
      this.currX + x,
      this.currY + y,
    );
  }

  Q(cx: number, cy: number, x: number, y: number): this {
    const c1x = this.currX + (2 / 3) * (cx - this.currX);
    const c1y = this.currY + (2 / 3) * (cy - this.currY);
    const c2x = x + (2 / 3) * (cx - x);
    const c2y = y + (2 / 3) * (cy - y);
    this.addCommand({
      kind: 'curve',
      hasStart: true,
      hasEnd: true,
      coords: [c1x, c1y, c2x, c2y, x, y],
    });
    this.lastCom = 'Q';
    this.lastCtrlX = cx;
    this.lastCtrlY = cy;
    return this;
  }

  q(c1x: number, c1y: number, x: number, y: number): this {
    return this.Q(this.currX + c1x, this.currY + c1y, this.currX + x, this.currY + y);
  }

  T(x: number, y: number): this {
    return this.Q(
      this.currX + (this.lastCom === 'Q' ? this.currX - this.lastCtrlX : 0),
      this.currY + (this.lastCom === 'Q' ? this.currY - this.lastCtrlY : 0),
      x,
      y,
    );
  }

  t(x: number, y: number): this {
    return this.Q(
      this.currX + (this.lastCom === 'Q' ? this.currX - this.lastCtrlX : 0),
      this.currY + (this.lastCom === 'Q' ? this.currY - this.lastCtrlY : 0),
      this.currX + x,
      this.currY + y,
    );
  }

  A(rx: number, ry: number, fi: number, fa: number, fs: number, x: number, y: number): this {
    if (isEqual(rx, 0) || isEqual(ry, 0)) {
      this.addCommand({ kind: 'line', hasStart: true, hasEnd: true, coords: [x, y] });
    } else {
      const angle = fi * (Math.PI / 180);
      rx = Math.abs(rx);
      ry = Math.abs(ry);
      const largeArc = fa ? 1 : 0;
      const sweep = fs ? 1 : 0;
      const x1 =
        (Math.cos(angle) * (this.currX - x)) / 2 + (Math.sin(angle) * (this.currY - y)) / 2;
      const y1 =
        (Math.cos(angle) * (this.currY - y)) / 2 - (Math.sin(angle) * (this.currX - x)) / 2;
      let radiusX = rx;
      let radiusY = ry;
      const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
      if (lambda > 1) {
        radiusX *= Math.sqrt(lambda);
        radiusY *= Math.sqrt(lambda);
      }
      const r = Math.sqrt(
        Math.max(
          0,
          (radiusX * radiusX * radiusY * radiusY -
            radiusX * radiusX * y1 * y1 -
            radiusY * radiusY * x1 * x1) /
            (radiusX * radiusX * y1 * y1 + radiusY * radiusY * x1 * x1),
        ),
      );
      const x2 = (largeArc === sweep ? -1 : 1) * ((r * radiusX * y1) / radiusY);
      const y2 = (largeArc === sweep ? 1 : -1) * ((r * radiusY * x1) / radiusX);
      const cx = Math.cos(angle) * x2 - Math.sin(angle) * y2 + (this.currX + x) / 2;
      const cy = Math.sin(angle) * x2 + Math.cos(angle) * y2 + (this.currY + y) / 2;
      let th1 = Math.atan2((y1 - y2) / radiusY, (x1 - x2) / radiusX);
      let th2 = Math.atan2((-y1 - y2) / radiusY, (-x1 - x2) / radiusX);
      if (sweep === 0 && th2 - th1 > 0) th2 -= 2 * Math.PI;
      else if (sweep === 1 && th2 - th1 < 0) th2 += 2 * Math.PI;

      const segments = Math.ceil(Math.abs(th2 - th1) / (Math.PI / this.precision));
      for (let i = 0; i < segments; i++) {
        const th3 = th1 + (i * (th2 - th1)) / segments;
        const th4 = th1 + ((i + 1) * (th2 - th1)) / segments;
        const t = (4 / 3) * Math.tan((th4 - th3) / 4);
        const c1x =
          cx +
          Math.cos(angle) * radiusX * (Math.cos(th3) - t * Math.sin(th3)) -
          Math.sin(angle) * radiusY * (Math.sin(th3) + t * Math.cos(th3));
        const c1y =
          cy +
          Math.sin(angle) * radiusX * (Math.cos(th3) - t * Math.sin(th3)) +
          Math.cos(angle) * radiusY * (Math.sin(th3) + t * Math.cos(th3));
        const c2x =
          cx +
          Math.cos(angle) * radiusX * (Math.cos(th4) + t * Math.sin(th4)) -
          Math.sin(angle) * radiusY * (Math.sin(th4) - t * Math.cos(th4));
        const c2y =
          cy +
          Math.sin(angle) * radiusX * (Math.cos(th4) + t * Math.sin(th4)) +
          Math.cos(angle) * radiusY * (Math.sin(th4) - t * Math.cos(th4));
        const endX =
          cx +
          Math.cos(angle) * radiusX * Math.cos(th4) -
          Math.sin(angle) * radiusY * Math.sin(th4);
        const endY =
          cy +
          Math.sin(angle) * radiusX * Math.cos(th4) +
          Math.cos(angle) * radiusY * Math.sin(th4);
        this.addCommand({
          kind: 'curve',
          hasStart: i === 0,
          hasEnd: i === segments - 1,
          coords: [c1x, c1y, c2x, c2y, endX, endY],
        });
      }
    }
    this.lastCom = 'A';
    return this;
  }

  a(rx: number, ry: number, fi: number, fa: number, fs: number, x: number, y: number): this {
    return this.A(rx, ry, fi, fa, fs, this.currX + x, this.currY + y);
  }

  path(d: string, warningCallback: WarningCallback): this {
    const parser = new StringParser((d || '').trim());
    let command: string | undefined;
    let temp: string | undefined;
    while ((command = parser.match(/^[astvzqmhlcASTVZQMHLC]/) as string | undefined)) {
      parser.matchSeparator();
      let values: number[] = [];
      let value: string | undefined;
      while (
        (value = (
          PATH_FLAGS[command + values.length] ? parser.match(/^[01]/) : parser.matchNumber()
        ) as string | undefined)
      ) {
        parser.matchSeparator();
        if (values.length === PATH_ARGUMENTS[command]) {
          (this as unknown as Record<string, (...a: number[]) => unknown>)[command].apply(
            this,
            values,
          );
          values = [];
          if (command === 'M') command = 'L';
          else if (command === 'm') command = 'l';
        }
        values.push(Number(value));
      }
      if (values.length === PATH_ARGUMENTS[command]) {
        (this as unknown as Record<string, (...a: number[]) => unknown>)[command].apply(
          this,
          values,
        );
      } else {
        warningCallback(`SvgPath: command ${command} with ${values.length} numbers`);
        return this;
      }
    }
    if ((temp = parser.matchAll() as string | undefined)) {
      warningCallback(`SvgPath: unexpected string ${temp}`);
    }
    return this;
  }

  getBoundingBox(): BBox {
    const bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];
    const addBounds = (b: BBox): void => {
      if (b[0] < bbox[0]) bbox[0] = b[0];
      if (b[2] > bbox[2]) bbox[2] = b[2];
      if (b[1] < bbox[1]) bbox[1] = b[1];
      if (b[3] > bbox[3]) bbox[3] = b[3];
    };
    for (const segment of this.pathSegments) addBounds(segment.getBoundingBox());
    if (bbox[0] === Infinity) bbox[0] = 0;
    if (bbox[1] === Infinity) bbox[1] = 0;
    if (bbox[2] === -Infinity) bbox[2] = 0;
    if (bbox[3] === -Infinity) bbox[3] = 0;
    return bbox;
  }

  getPointAtLength(l: number): [number, number, number] | undefined {
    if (l >= 0 && l <= this.totalLength) {
      for (const segment of this.pathSegments) {
        const point = segment.getPointAtLength(l);
        if (point) return point;
        l -= segment.totalLength;
      }
      return this.endPoint ?? undefined;
    }
    return undefined;
  }

  transform(m: Matrix): this {
    this.pathSegments = [];
    this.startPoint = null;
    this.endPoint = null;
    this.totalLength = 0;
    const commands = this.pathCommands;
    this.pathCommands = [];
    for (const data of commands) {
      for (let j = 0; j < data.coords.length; j += 2) {
        const p = transformPoint([data.coords[j], data.coords[j + 1]], m);
        data.coords[j] = p[0];
        data.coords[j + 1] = p[1];
      }
      this.addCommand(data);
    }
    return this;
  }

  mergeShape(shape: SvgShape): this {
    for (const command of shape.pathCommands) {
      this.addCommand({ ...command, coords: command.coords.slice() });
    }
    return this;
  }

  clone(): SvgShape {
    const copy = new SvgShape(this.precision);
    return copy.mergeShape(this);
  }

  /** Emit the path to a sink. */
  insertInDocument(sink: PathSink): void {
    for (const command of this.pathCommands) {
      const v = command.coords;
      switch (command.kind) {
        case 'move':
          sink.moveTo(v[0], v[1]);
          break;
        case 'line':
          sink.lineTo(v[0], v[1]);
          break;
        case 'curve':
          sink.bezierCurveTo(v[0], v[1], v[2], v[3], v[4], v[5]);
          break;
        case 'close':
          sink.closePath();
          break;
      }
    }
  }

  getSubPaths(): SvgShape[] {
    const subPaths: SvgShape[] = [];
    let shape = new SvgShape(this.precision);
    for (let i = 0; i < this.pathCommands.length; i++) {
      const data = this.pathCommands[i];
      if (data.kind === 'move' && i !== 0) {
        subPaths.push(shape);
        shape = new SvgShape(this.precision);
      }
      shape.addCommand(data);
    }
    subPaths.push(shape);
    return subPaths;
  }

  /** Positions and angles at which markers should be placed. */
  getMarkers(): [number, number, number][] {
    let markers: [number, number, number][] = [];
    for (const subPath of this.getSubPaths()) {
      const subPathMarkers: [number, number, number][] = [];
      for (let j = 0; j < subPath.pathSegments.length; j++) {
        const segment = subPath.pathSegments[j];
        if (
          isNotEqual(segment.totalLength, 0) ||
          j === 0 ||
          j === subPath.pathSegments.length - 1
        ) {
          if (segment.hasStart) {
            const startMarker = segment.getPointAtLength(0)!;
            const prevEndMarker = subPathMarkers.pop();
            if (prevEndMarker) {
              startMarker[2] = 0.5 * (prevEndMarker[2] + startMarker[2]);
            }
            subPathMarkers.push(startMarker);
          }
          if (segment.hasEnd) {
            subPathMarkers.push(segment.getPointAtLength(segment.totalLength)!);
          }
        }
      }
      markers = markers.concat(subPathMarkers);
    }
    return markers;
  }
}

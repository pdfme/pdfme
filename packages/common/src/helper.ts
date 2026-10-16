import { z } from 'zod';
import { Buffer } from 'buffer';
import { PDFName } from '@pdfme/pdf-lib';
import type { PDFDocument, PDFPage } from '@pdfme/pdf-lib';
import {
  Schema,
  Template,
  Font,
  BasePdf,
  Plugins,
  BlankPdf,
  LegacySchemaPageArray,
  SchemaPageArray,
  PdfBytes,
} from './types.js';
import {
  Inputs as InputsSchema,
  UIOptions as UIOptionsSchema,
  Template as TemplateSchema,
  PreviewProps as PreviewPropsSchema,
  DesignerProps as DesignerPropsSchema,
  GenerateProps as GeneratePropsSchema,
  UIProps as UIPropsSchema,
  BlankPdf as BlankPdfSchema,
} from './schema.js';
import {
  MM_TO_PT_RATIO,
  PT_TO_MM_RATIO,
  PT_TO_PX_RATIO,
  DEFAULT_FONT_NAME,
  DEFAULT_FONT_VALUE,
} from './constants.js';

export const cloneDeep = <T>(value: T): T => structuredClone(value);

const uniq = <T>(array: Array<T>) => Array.from(new Set(array));

export const getFallbackFontName = (font: Font) => {
  const initial = '';
  const fallbackFontName = Object.entries(font).reduce((acc, cur) => {
    const [fontName, fontValue] = cur as [
      string,
      { data: string | ArrayBuffer | Uint8Array; fallback?: boolean; subset?: boolean },
    ];

    return !acc && fontValue.fallback ? fontName : acc;
  }, initial);
  if (fallbackFontName === initial) {
    throw Error(
      `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.`,
    );
  }

  return fallbackFontName;
};

// Decoded once: the same bytes on every call let the font be parsed once, not on every render.
let defaultFontData: ReturnType<typeof b64toUint8Array> | undefined;

/**
 * The built-in fallback font. Every call returns a new Font object around the same bytes, decoded
 * once and kept for the life of the process: do not modify or transfer them (e.g. in a
 * postMessage transfer list).
 */
export const getDefaultFont = (): Font => {
  if (!defaultFontData) defaultFontData = b64toUint8Array(DEFAULT_FONT_VALUE);
  return { [DEFAULT_FONT_NAME]: { data: defaultFontData, fallback: true } };
};

export const mm2pt = (mm: number): number => {
  return parseFloat(String(mm)) * MM_TO_PT_RATIO;
};

export const pt2mm = (pt: number): number => {
  return pt * PT_TO_MM_RATIO;
};

export const pt2px = (pt: number): number => {
  return pt * PT_TO_PX_RATIO;
};

export const px2mm = (px: number): number => {
  // http://www.endmemo.com/sconvert/millimeterpixel.php
  const ratio = 0.26458333333333;
  return parseFloat(String(px)) * ratio;
};

const blob2Base64Pdf = (blob: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if ((reader.result as string).startsWith('data:application/pdf;')) {
        resolve(reader.result as string);
      } else {
        reject(Error('[@pdfme/common] template.basePdf must be pdf data.'));
      }
    };
    reader.readAsDataURL(blob);
  });
};

export const isHexValid = (hex: string): boolean => {
  return /^#(?:[A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/i.test(hex);
};

/**
 * Migrate from legacy keyed object format to array format
 * @param template Template
 */
export const migrateTemplate = (template: Template) => {
  if (!template.schemas) {
    return;
  }

  if (
    Array.isArray(template.schemas) &&
    template.schemas.length > 0 &&
    !Array.isArray(template.schemas[0])
  ) {
    template.schemas = (template.schemas as unknown as LegacySchemaPageArray).map(
      (page: Record<string, Schema>) =>
        Object.entries(page).map(([key, value]) => ({
          ...value,
          name: key,
        })),
    );
  }
};

export const getInputFromTemplate = (template: Template): { [key: string]: string }[] => {
  migrateTemplate(template);

  const input: { [key: string]: string } = {};
  template.schemas.forEach((page) => {
    page.forEach((schema) => {
      if (!schema.readOnly) {
        input[schema.name] = schema.content || '';
      }
    });
  });

  return [input];
};

const parseIpv4 = (host: string): number[] | null => {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every((octet) => octet <= 255) ? octets : null;
};

const parseIpv6 = (host: string): number[] | null => {
  let address = host.toLowerCase();

  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  if (tail.includes('.')) {
    const octets = parseIpv4(tail);
    if (!octets) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    address = `${address.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;
  const toGroups = (part: string) => (part === '' ? [] : part.split(':'));
  const head = toGroups(halves[0]);
  let groups = head;
  if (halves.length === 2) {
    const rest = toGroups(halves[1]);
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill('0'), ...rest];
  }

  if (groups.length !== 8 || !groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) {
    return null;
  }
  return groups.map((group) => parseInt(group, 16));
};

const ipv4ToInt = (octets: number[]) =>
  ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;

const toIpv4Range = (cidr: string) => {
  const [address, prefix] = cidr.split('/');
  const prefixLength = Number(prefix);
  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  return { base: (ipv4ToInt(parseIpv4(address)!) & mask) >>> 0, mask };
};

const toIpv6Range = (cidr: string) => {
  const [address, prefix] = cidr.split('/');
  return { base: parseIpv6(address)!, prefixLength: Number(prefix) };
};

const NON_PUBLIC_IPV4_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
].map(toIpv4Range);

const NON_PUBLIC_IPV6_RANGES = [
  // IPv4-compatible (deprecated), also covers :: and ::1
  '::/96',
  '100::/64',
  // Teredo: the embedded IPv4 is obfuscated, so it cannot be re-checked
  '2001::/32',
  '2001:db8::/32',
  // Local-use NAT64: the embedded IPv4 position depends on the operator's prefix length
  '64:ff9b:1::/48',
  'fc00::/7',
  'fe80::/10',
  'fec0::/10',
  'ff00::/8',
].map(toIpv6Range);

const LOOPBACK_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback']);

const IPV4_MAPPED_RANGE = toIpv6Range('::ffff:0:0/96');
const NAT64_WELL_KNOWN_RANGE = toIpv6Range('64:ff9b::/96');
const SIX_TO_FOUR_RANGE = toIpv6Range('2002::/16');

const isPublicIpv4 = (octets: number[]) => {
  const value = ipv4ToInt(octets);
  return NON_PUBLIC_IPV4_RANGES.every(({ base, mask }) => (value & mask) >>> 0 !== base);
};

const isInIpv6Range = (
  groups: number[],
  { base, prefixLength }: { base: number[]; prefixLength: number },
) => {
  for (let i = 0; i < 8; i++) {
    const bits = Math.min(16, Math.max(0, prefixLength - i * 16));
    if (bits === 0) return true;
    const mask = (0xffff << (16 - bits)) & 0xffff;
    if ((groups[i] & mask) !== (base[i] & mask)) return false;
  }
  return true;
};

const ipv4FromGroups = (high: number, low: number) => [
  high >> 8,
  high & 0xff,
  low >> 8,
  low & 0xff,
];

const isPublicIpv6 = (groups: number[]) => {
  if (isInIpv6Range(groups, IPV4_MAPPED_RANGE) || isInIpv6Range(groups, NAT64_WELL_KNOWN_RANGE)) {
    return isPublicIpv4(ipv4FromGroups(groups[6], groups[7]));
  }
  if (isInIpv6Range(groups, SIX_TO_FOUR_RANGE)) {
    return isPublicIpv4(ipv4FromGroups(groups[1], groups[2]));
  }
  return NON_PUBLIC_IPV6_RANGES.every((range) => !isInIpv6Range(groups, range));
};

/**
 * Checks the URL's literal host only. DNS names that resolve to internal addresses and
 * redirects are not covered; validate untrusted templates server-side if that matters.
 */
export const isUrlSafeToFetch = (urlString: string): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    const groups = parseIpv6(hostname.slice(1, -1));
    return groups !== null && isPublicIpv6(groups);
  }

  const host = hostname.replace(/\.+$/, '');
  if (!host) return false;

  const ipv4 = parseIpv4(host);
  if (ipv4) return isPublicIpv4(ipv4);

  return !LOOPBACK_HOSTNAMES.has(host) && !host.endsWith('.localhost');
};

const SAFE_LINK_URI_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const INTERNAL_LINK_CACHE_KEY = 'pdfme-internal-link-cache';

export type PdfLinkAnnotationRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type InternalLinkAnchor = {
  name: string;
  page: PDFPage;
  x: number;
  y: number;
};

type InternalLinkAnnotation = {
  page: PDFPage;
  targetName: string;
  rect: PdfLinkAnnotationRect;
  borderWidth?: number;
};

type InternalLinkCache = {
  anchors: Map<string, InternalLinkAnchor[]>;
  annotations: InternalLinkAnnotation[];
};

export const normalizeSafeLinkUri = (uri: string): string | undefined => {
  const trimmed = uri.trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }

  return SAFE_LINK_URI_PROTOCOLS.has(parsed.protocol.toLowerCase()) ? trimmed : undefined;
};

export const getInternalLinkTarget = (href: string): string | undefined => {
  const trimmed = href.trim();
  if (!trimmed.startsWith('#') || trimmed.length === 1) return undefined;

  let target = trimmed.slice(1);
  try {
    target = decodeURIComponent(target);
  } catch {
    // Keep the raw fragment if it is not URI encoded.
  }

  target = target.trim();
  if (
    !target ||
    Array.from(target).some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    return undefined;
  }
  return target;
};

export const normalizeInternalLinkHref = (href: string): string | undefined => {
  const target = getInternalLinkTarget(href);
  return target ? `#${target}` : undefined;
};

export const normalizeLinkHref = (href: string): string | undefined =>
  normalizeSafeLinkUri(href) ?? normalizeInternalLinkHref(href);

const getInternalLinkCache = (_cache: Map<string | number, unknown>): InternalLinkCache => {
  let cache = _cache.get(INTERNAL_LINK_CACHE_KEY) as InternalLinkCache | undefined;
  if (!cache) {
    cache = { anchors: new Map(), annotations: [] };
    _cache.set(INTERNAL_LINK_CACHE_KEY, cache);
  }
  return cache;
};

export const resetInternalLinkAnnotations = (_cache: Map<string | number, unknown>) => {
  _cache.set(INTERNAL_LINK_CACHE_KEY, { anchors: new Map(), annotations: [] });
};

export const registerInternalLinkAnchor = (arg: {
  _cache: Map<string | number, unknown>;
  name: string;
  page: PDFPage;
  x: number;
  y: number;
}) => {
  const { _cache, name, page, x, y } = arg;
  if (!name) return;

  const cache = getInternalLinkCache(_cache);
  const anchors = cache.anchors.get(name) ?? [];
  anchors.push({ name, page, x, y });
  cache.anchors.set(name, anchors);
};

export const registerInternalLinkAnnotation = (arg: {
  _cache: Map<string | number, unknown>;
  page: PDFPage;
  targetName: string;
  rect: PdfLinkAnnotationRect;
  borderWidth?: number;
}) => {
  const { _cache, page, targetName, rect, borderWidth } = arg;
  if (!targetName || rect.width <= 0 || rect.height <= 0) return;

  getInternalLinkCache(_cache).annotations.push({ page, targetName, rect, borderWidth });
};

const addGoToLinkAnnotation = (arg: {
  pdfDoc: PDFDocument;
  page: PDFPage;
  target: InternalLinkAnchor;
  rect: PdfLinkAnnotationRect;
  borderWidth?: number;
}) => {
  const { pdfDoc, page, target, rect, borderWidth = 0 } = arg;
  if (rect.width <= 0 || rect.height <= 0) return;

  const annotationRef = pdfDoc.context.register(
    pdfDoc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
      Border: [0, 0, borderWidth],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('GoTo'),
        D: [target.page.ref, PDFName.of('XYZ'), target.x, target.y, null],
      },
    }),
  );

  page.node.addAnnot(annotationRef);
};

export const applyInternalLinkAnnotations = (arg: {
  _cache: Map<string | number, unknown>;
  pdfDoc: PDFDocument;
}) => {
  const { _cache, pdfDoc } = arg;
  const cache = getInternalLinkCache(_cache);

  cache.annotations.forEach((annotation) => {
    const anchors = cache.anchors.get(annotation.targetName) ?? [];
    if (anchors.length === 0) {
      throw new Error(
        `[@pdfme/generator] Internal link target "#${annotation.targetName}" was not found.`,
      );
    }
    if (anchors.length > 1) {
      throw new Error(
        `[@pdfme/generator] Internal link target "#${annotation.targetName}" is ambiguous because multiple schemas use that name.`,
      );
    }

    addGoToLinkAnnotation({
      pdfDoc,
      page: annotation.page,
      target: anchors[0],
      rect: annotation.rect,
      borderWidth: annotation.borderWidth,
    });
  });

  resetInternalLinkAnnotations(_cache);
};

export const getB64BasePdf = async (
  customPdf: ArrayBuffer | Uint8Array | string,
): Promise<string> => {
  if (
    typeof customPdf === 'string' &&
    !customPdf.startsWith('data:application/pdf;') &&
    typeof window !== 'undefined'
  ) {
    if (!isUrlSafeToFetch(customPdf)) {
      throw Error(
        '[@pdfme/common] Invalid or unsafe URL for basePdf. Only http: and https: URLs pointing to public hosts are allowed.',
      );
    }
    const response = await fetch(customPdf);
    const blob = await response.blob();
    return blob2Base64Pdf(blob);
  }

  if (typeof customPdf === 'string') {
    return customPdf;
  }

  const uint8Array = customPdf instanceof Uint8Array ? customPdf : new Uint8Array(customPdf);
  return 'data:application/pdf;base64,' + Buffer.from(uint8Array).toString('base64');
};

export const isBlankPdf = (basePdf: BasePdf): basePdf is BlankPdf =>
  BlankPdfSchema.safeParse(basePdf).success;

const getByteString = (base64: string) => Buffer.from(base64, 'base64').toString('binary');

export const b64toUint8Array = (base64: string): PdfBytes => {
  const data = base64.split(';base64,')[1] ? base64.split(';base64,')[1] : base64;

  const byteString = getByteString(data);

  const unit8arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    unit8arr[i] = byteString.charCodeAt(i);
  }
  return unit8arr;
};

const getFontNamesInSchemas = (schemas: SchemaPageArray) =>
  uniq(
    schemas
      .map((p) => p.map((v) => (v as Schema & { fontName?: string }).fontName ?? ''))
      .reduce((acc, cur) => acc.concat(cur), [] as (string | undefined)[])
      .filter(Boolean) as string[],
  );

export const checkFont = (arg: { font: Font; template: Template }) => {
  const {
    font,
    template: { schemas },
  } = arg;
  const fontValues = Object.values(font);
  const fallbackFontNum = fontValues.reduce(
    (acc, cur) => (cur.fallback ? acc + 1 : acc),
    0 as number,
  );
  if (fallbackFontNum === 0) {
    throw Error(
      `[@pdfme/common] fallback flag is not found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`,
    );
  }
  if (fallbackFontNum > 1) {
    throw Error(
      `[@pdfme/common] ${fallbackFontNum} fallback flags found in font. true fallback flag must be only one.
Check this document: https://pdfme.com/docs/custom-fonts#about-font-type`,
    );
  }

  const fontNamesInSchemas = getFontNamesInSchemas(schemas);
  const fontNames = Object.keys(font);
  if (fontNamesInSchemas.some((f) => !fontNames.includes(f))) {
    throw Error(
      `[@pdfme/common] ${fontNamesInSchemas
        .filter((f) => !fontNames.includes(f))
        .join()} of template.schemas is not found in font.
Check this document: https://pdfme.com/docs/custom-fonts`,
    );
  }
};

export const checkPlugins = (arg: { plugins: Plugins; template: Template }) => {
  const {
    plugins,
    template: { schemas },
  } = arg;
  const allSchemaTypes = uniq(schemas.map((p) => p.map((v) => v.type)).flat());

  const pluginsSchemaTypes = Object.values(plugins).map((p) =>
    p ? p.propPanel.defaultSchema.type : undefined,
  );

  if (allSchemaTypes.some((s) => !pluginsSchemaTypes.includes(s))) {
    throw Error(
      `[@pdfme/common] ${allSchemaTypes
        .filter((s) => !pluginsSchemaTypes.includes(s))
        .join()} of template.schemas is not found in plugins.`,
    );
  }
};

const checkProps = <T>(data: unknown, zodSchema: z.ZodType<T>) => {
  try {
    zodSchema.parse(data);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const messages = e.issues.map(
        (issue) => `ERROR POSITION: ${issue.path.join('.')}
ERROR MESSAGE: ${issue.message}
--------------------------`,
      );
      throw Error(`[@pdfme/common] Invalid argument:
--------------------------
${messages.join('\n')}`);
    } else {
      throw Error(
        `[@pdfme/common] Unexpected parsing error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // Check fonts if template and options exist
  if (data && typeof data === 'object' && 'template' in data && 'options' in data) {
    const { template, options } = data as { template: Template; options: { font?: Font } };
    if (options && options.font) {
      checkFont({ font: options.font, template });
    }
  }

  // Check plugins if template and plugins exist
  if (data && typeof data === 'object' && 'template' in data && 'plugins' in data) {
    const { template, plugins } = data as { template: Template; plugins: Plugins };
    if (plugins) {
      checkPlugins({ plugins, template });
    }
  }
};

export const checkInputs = (data: unknown) => checkProps(data, InputsSchema);
export const checkUIOptions = (data: unknown) => checkProps(data, UIOptionsSchema);
export const checkPreviewProps = (data: unknown) => checkProps(data, PreviewPropsSchema);
export const checkDesignerProps = (data: unknown) => checkProps(data, DesignerPropsSchema);
export const checkUIProps = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'template' in data) {
    migrateTemplate(data.template as Template);
  }
  checkProps(data, UIPropsSchema);
};
export const checkTemplate = (template: unknown) => {
  migrateTemplate(template as Template);
  checkProps(template, TemplateSchema);
};
export const checkGenerateProps = (data: unknown) => {
  if (typeof data === 'object' && data !== null && 'template' in data) {
    migrateTemplate(data.template as Template);
  }
  checkProps(data, GeneratePropsSchema);
};

import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

export const defaultTheme: ThemeConfig = {
  token: {
    colorPrimary: '#38a0ff',
  },
  components: {
    Form: {
      fontSize: 12,
      margin: 8,
      marginLG: 12,
      marginXS: 4,
      padding: 8,
      paddingLG: 12,
      paddingXS: 4,
      itemMarginBottom: 4,
      verticalLabelPadding: '0 0 2px',
    },
  },
};

type Rgb = { r: number; g: number; b: number };

const parseColor = (color: unknown): Rgb | null => {
  if (typeof color !== 'string') return null;
  const value = color.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(value);
  return rgb ? { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) } : null;
};

const relativeLuminance = ({ r, g, b }: Rgb) => {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrastRatio = (a: Rgb, b: Rgb) => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** A background is dark when white text contrasts with it more than black text. */
const isDarkBackground = (color: unknown) => {
  const rgb = parseColor(color);
  return rgb ? contrastRatio(WHITE, rgb) > contrastRatio(BLACK, rgb) : false;
};

const toHex = ({ r, g, b }: Rgb) =>
  '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');

/** WCAG 2.x non-text contrast (1.4.11) for component boundaries. */
const MIN_BOUNDARY_CONTRAST = 3;

const minContrast = (color: Rgb, surfaces: Rgb[]) =>
  Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));

/**
 * The lightest mix of `text` over `background` that still reaches
 * MIN_BOUNDARY_CONTRAST against every surface a control sits on.
 */
const boundaryColor = (text: Rgb, background: Rgb, surfaces: Rgb[]) => {
  const mix = (alpha: number): Rgb => ({
    r: Math.round(text.r * alpha + background.r * (1 - alpha)),
    g: Math.round(text.g * alpha + background.g * (1 - alpha)),
    b: Math.round(text.b * alpha + background.b * (1 - alpha)),
  });
  let low = 0;
  let high = 1;
  for (let i = 0; i < 20; i++) {
    const alpha = (low + high) / 2;
    if (minContrast(mix(alpha), surfaces) >= MIN_BOUNDARY_CONTRAST) high = alpha;
    else low = alpha;
  }
  return toHex(mix(high));
};

/**
 * Completes a merged theme so derived colors stay readable:
 * - antd's default algorithm derives borders and fills by darkening
 *   `colorBgBase`, which turns them near-black on a dark background. Use the
 *   dark algorithm when the host sets a dark background without an algorithm.
 * - antd's placeholder color (`colorTextQuaternary`) is below the WCAG AA text
 *   contrast in both algorithms; use the secondary text color instead.
 * - antd's control border (`colorBorder`) is below the WCAG AA non-text
 *   contrast in both algorithms; darken/lighten it just enough to reach 3:1
 *   against the control fill and the sidebar background.
 * Values the host sets explicitly are kept.
 */
export const resolveTheme = (theme: ThemeConfig): ThemeConfig => {
  const resolved: ThemeConfig = { ...theme, token: { ...theme.token } };
  if (!resolved.algorithm && isDarkBackground(resolved.token?.colorBgBase)) {
    resolved.algorithm = antdTheme.darkAlgorithm;
  }

  const derived = antdTheme.getDesignToken(resolved);
  const token = { ...resolved.token };
  if (!token.colorTextPlaceholder) {
    token.colorTextPlaceholder = derived.colorTextSecondary;
  }
  // Controls are filled with colorBgContainer and placed on colorBgLayout (sidebar).
  const background = parseColor(derived.colorBgContainer);
  const layout = parseColor(derived.colorBgLayout);
  const border = parseColor(derived.colorBorder);
  const text = parseColor(derived.colorText);
  if (!token.colorBorder && background && layout && border && text) {
    const surfaces = [background, layout];
    if (minContrast(border, surfaces) < MIN_BOUNDARY_CONTRAST) {
      token.colorBorder = boundaryColor(text, background, surfaces);
    }
  }
  resolved.token = token;
  return resolved;
};

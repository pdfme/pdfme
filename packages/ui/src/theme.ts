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

/**
 * Completes a merged theme so derived colors stay readable:
 * - antd's default algorithm derives borders and fills by darkening
 *   `colorBgBase`, which turns them near-black on a dark background. Use the
 *   dark algorithm when the host sets a dark background without an algorithm.
 * - antd's placeholder color (`colorTextQuaternary`) is below the WCAG AA text
 *   contrast in both algorithms; use the secondary text color instead.
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
  resolved.token = token;
  return resolved;
};

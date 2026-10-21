import { describe, expect, it } from 'vitest';
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { defaultTheme, resolveTheme } from '../src/theme';

type Rgba = [number, number, number, number];

const rgba = (color: string): Rgba => {
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (hex) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
    return [r, g, b, hex[2] ? parseInt(hex[2], 16) / 255 : 1];
  }
  const match = /rgba?\(([^)]+)\)/.exec(color);
  if (!match) throw new Error(`Unsupported color: ${color}`);
  const [r, g, b, a = 1] = match[1].split(',').map(Number);
  return [r, g, b, a];
};

/** Paints `color` over `background` (itself painted over white), as the browser does. */
const paint = (color: string, background = '#ffffff'): Rgba => {
  const [r, g, b, a] = rgba(color);
  const bg = rgba(background);
  const base: Rgba = bg[3] < 1 ? paint(background) : bg;
  return [0, 1, 2].map((i) => [r, g, b][i] * a + base[i] * (1 - a)).concat(1) as Rgba;
};

/** WCAG contrast of `foreground` painted on `background`. */
const contrast = (foreground: string, background: string) => {
  const luminance = ([r, g, b]: Rgba) => {
    const [lr, lg, lb] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const bg = paint(background);
  const fg = paint(foreground, background);
  const [lighter, darker] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

const darkTheme: ThemeConfig = {
  token: { colorPrimary: '#9ED3A3', colorBgBase: '#232422', colorTextBase: '#E3E2DF' },
};

describe('resolveTheme', () => {
  it.each([
    ['default theme', defaultTheme],
    ['dark colorBgBase', darkTheme],
    ['dark algorithm', { algorithm: antdTheme.darkAlgorithm }],
  ])('keeps placeholders and control borders at WCAG AA contrast (%s)', (_, input) => {
    const token = antdTheme.getDesignToken(resolveTheme(input));

    expect(contrast(token.colorTextPlaceholder, token.colorBgContainer)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(token.colorBorder, token.colorBgContainer)).toBeGreaterThanOrEqual(3);
    expect(contrast(token.colorBorder, token.colorBgLayout)).toBeGreaterThanOrEqual(3);
  });

  it('uses the dark algorithm for a dark colorBgBase without an algorithm', () => {
    expect(resolveTheme(darkTheme).algorithm).toBe(antdTheme.darkAlgorithm);
    expect(resolveTheme(defaultTheme).algorithm).toBeUndefined();
  });

  it('keeps values set by the host', () => {
    const resolved = resolveTheme({
      algorithm: antdTheme.defaultAlgorithm,
      token: { ...darkTheme.token, colorBorder: '#111111', colorTextPlaceholder: '#222222' },
    });

    expect(resolved.algorithm).toBe(antdTheme.defaultAlgorithm);
    expect(resolved.token).toMatchObject({
      colorBorder: '#111111',
      colorTextPlaceholder: '#222222',
    });
  });

  it('does not mutate the input theme', () => {
    const input: ThemeConfig = { token: { ...darkTheme.token } };
    resolveTheme(input);
    expect(input).toEqual({ token: { ...darkTheme.token } });
  });
});

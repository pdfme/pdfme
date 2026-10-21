import { describe, expect, it } from 'vitest';
import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';
import { defaultTheme, resolveTheme } from '../src/theme';

const rgb = (color: string) => {
  const hex = /^#([0-9a-f]{6})/i.exec(color)?.[1];
  if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const match = /rgba?\(([^)]+)\)/.exec(color);
  if (!match) throw new Error(`Unsupported color: ${color}`);
  return match[1].split(',').slice(0, 3).map(Number);
};

const contrast = (a: string, b: string) => {
  const luminance = (color: string) => {
    const [r, g, bl] = rgb(color).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
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
  ])('keeps placeholders at WCAG AA contrast (%s)', (_, input) => {
    const token = antdTheme.getDesignToken(resolveTheme(input));

    expect(contrast(token.colorTextPlaceholder, token.colorBgContainer)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('uses the dark algorithm for a dark colorBgBase without an algorithm', () => {
    expect(resolveTheme(darkTheme).algorithm).toBe(antdTheme.darkAlgorithm);
    expect(resolveTheme(defaultTheme).algorithm).toBeUndefined();
  });

  it('keeps values set by the host', () => {
    const resolved = resolveTheme({
      algorithm: antdTheme.defaultAlgorithm,
      token: { ...darkTheme.token, colorTextPlaceholder: '#222222' },
    });

    expect(resolved.algorithm).toBe(antdTheme.defaultAlgorithm);
    expect(resolved.token).toMatchObject({ colorTextPlaceholder: '#222222' });
  });

  it('does not mutate the input theme', () => {
    const input: ThemeConfig = { token: { ...darkTheme.token } };
    resolveTheme(input);
    expect(input).toEqual({ token: { ...darkTheme.token } });
  });
});

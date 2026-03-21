import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getDefaultFont } from '@pdfme/common';
import type { Font } from '@pdfme/common';

const CACHE_DIR = join(homedir(), '.pdfme', 'fonts');
const NOTO_SANS_JP_URL =
  'https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf';
const NOTO_CACHE_FILE = join(CACHE_DIR, 'NotoSansJP-Regular.ttf');

function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export async function downloadNotoSansJP(verbose: boolean): Promise<Uint8Array | null> {
  if (existsSync(NOTO_CACHE_FILE)) {
    if (verbose) console.error('Using cached NotoSansJP from', NOTO_CACHE_FILE);
    return new Uint8Array(readFileSync(NOTO_CACHE_FILE)) as Uint8Array<ArrayBuffer>;
  }

  ensureCacheDir();
  console.error('Downloading NotoSansJP for CJK support...');

  try {
    const response = await fetch(NOTO_SANS_JP_URL);
    if (!response.ok) {
      console.error(`Warning: Failed to download NotoSansJP (HTTP ${response.status})`);
      return null;
    }
    const buffer = new Uint8Array(await response.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    writeFileSync(NOTO_CACHE_FILE, buffer);
    console.error('Cached NotoSansJP to', NOTO_CACHE_FILE);
    return buffer;
  } catch (error) {
    console.error(
      'Warning: Could not download NotoSansJP. CJK text may not render correctly.',
      error instanceof Error ? error.message : '',
    );
    return null;
  }
}

export function parseCustomFonts(fontArgs: string[]): Font {
  const font: Font = {};
  for (let i = 0; i < fontArgs.length; i++) {
    const arg = fontArgs[i];
    const eqIndex = arg.indexOf('=');
    if (eqIndex === -1) {
      console.error(
        `Error: Invalid --font format "${arg}". Expected: name=path (e.g., "NotoSansJP=./fonts/NotoSansJP.ttf")`,
      );
      process.exit(1);
    }
    const name = arg.slice(0, eqIndex);
    const filePath = arg.slice(eqIndex + 1);
    if (!existsSync(filePath)) {
      console.error(`Error: Font file not found: ${filePath}`);
      process.exit(1);
    }
    font[name] = {
      data: new Uint8Array(readFileSync(filePath)) as Uint8Array<ArrayBuffer>,
      fallback: i === 0,
      subset: true,
    };
  }
  return font;
}

export async function resolveFont(
  fontArgs: string[] | undefined,
  hasCJK: boolean,
  noAutoFont: boolean,
  verbose: boolean,
): Promise<Font> {
  if (fontArgs && fontArgs.length > 0) {
    return parseCustomFonts(fontArgs);
  }

  const defaultFont = getDefaultFont();

  if (hasCJK && !noAutoFont) {
    const notoData = await downloadNotoSansJP(verbose);
    if (notoData) {
      return {
        NotoSansJP: { data: notoData, fallback: true, subset: true },
        ...Object.fromEntries(
          Object.entries(defaultFont).map(([k, v]) => [k, { ...v, fallback: false }]),
        ),
      } as Font;
    }
  }

  return defaultFont;
}


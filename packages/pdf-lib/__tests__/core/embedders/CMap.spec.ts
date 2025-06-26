import fontkit, { Font, Glyph } from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';

import { createCmap } from '../../../src/core/embedders/CMap';
import { byAscendingId, sortedUniq } from '../../../src/utils';

const ASSETS_DIR = path.resolve(__dirname, '../../../assets/fonts');
const ubuntuFont = fs.readFileSync(path.join(ASSETS_DIR, 'ubuntu/Ubuntu-R.ttf'));
const sourceHansJpFont = fs.readFileSync(
  path.join(ASSETS_DIR, 'source_hans_jp/SourceHanSerifJP-Regular.otf'),
);

const DATA_DIR = path.join(__dirname, 'data');
const ubuntuFontCmap = fs.readFileSync(path.join(DATA_DIR, 'Ubuntu-R.ttf.cmap'));
const sourceHansJpFontCmap = fs.readFileSync(
  path.join(DATA_DIR, 'SourceHanSerifJP-Regular.otf.cmap'),
);

const allGlyphsInFontSortedById = (font: Font) => {
  const glyphs: Glyph[] = new Array(font.characterSet.length);
  for (let idx = 0, len = glyphs.length; idx < len; idx++) {
    const codePoint = font.characterSet[idx];
    glyphs[idx] = font.glyphForCodePoint(codePoint);
  }
  return sortedUniq(glyphs.sort(byAscendingId), (g) => g.id);
};

describe(`createCmap`, () => {
  it(`creates CMaps for embedded Ubuntu-R font files`, () => {
    const font = fontkit.create(ubuntuFont);

    const glyphs = allGlyphsInFontSortedById(font);
    const cmap = createCmap(glyphs, (g) => (g ? g.id : -1));

    expect(cmap).toEqual(String(ubuntuFontCmap));
  });

  it(`creates CMaps for embedded SourceHanSerifJP-Regular font files`, () => {
    const font = fontkit.create(sourceHansJpFont);

    const glyphs = allGlyphsInFontSortedById(font);
    const cmap = createCmap(glyphs, (g) => (g ? g.id : -1));

    expect(cmap).toEqual(String(sourceHansJpFontCmap));
  });
});

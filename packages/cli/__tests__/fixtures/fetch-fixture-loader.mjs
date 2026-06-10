import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FONT_FIXTURES_DIR = process.env.PDFME_TEST_FONT_FIXTURES_DIR;
const AUTO_NOTO_SANS_JP_URL =
  'https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf';

if (!FONT_FIXTURES_DIR) {
  throw new Error('Fixture fetch shim requires PDFME_TEST_FONT_FIXTURES_DIR.');
}

const fontFixtures = {
  'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.ttf':
    join(FONT_FIXTURES_DIR, 'NotoSansJP-Regular.ttf'),
  'https://fonts.gstatic.com/s/notoserifjp/v30/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bwxOubAILO5wBCU.ttf':
    join(FONT_FIXTURES_DIR, 'NotoSerifJP-Regular.ttf'),
  'https://fonts.gstatic.com/s/pinyonscript/v22/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.ttf':
    join(FONT_FIXTURES_DIR, 'PinyonScript-Regular.ttf'),
  'https://fonts.example.com/pinyonscript':
    join(FONT_FIXTURES_DIR, 'PinyonScript-Regular.ttf'),
  [AUTO_NOTO_SANS_JP_URL]: join(FONT_FIXTURES_DIR, 'NotoSansJP-Regular.ttf'),
};

const originalFetch = globalThis.fetch.bind(globalThis);

function getUrl(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

globalThis.fetch = async (input, init) => {
  const url = getUrl(input);

  const fontFixturePath = fontFixtures[url];
  if (fontFixturePath) {
    if (!existsSync(fontFixturePath)) {
      throw new Error(`Font fixture not found for URL: ${url}`);
    }
    return new Response(readFileSync(fontFixturePath), {
      status: 200,
      headers: { 'content-type': 'font/ttf' },
    });
  }

  return originalFetch(input, init);
};

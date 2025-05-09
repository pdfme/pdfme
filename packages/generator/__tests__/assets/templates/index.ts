import { Template } from '@pdfme/common';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadJson = (filename: string) => {
  const filePath = path.join(__dirname, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const レターパック = loadJson('./レターパック.json') as Template;
const レターパックライト = loadJson('./レターパックライト.json') as Template;
const レターパックプラス = loadJson('./レターパックプラス.json') as Template;
const 宛名8面 = loadJson('./宛名8面.json') as Template;
const 装飾なしラベル24面 = loadJson('./装飾なしラベル24面.json') as Template;
const 装飾なしラベル24面中央揃え = loadJson('./装飾なしラベル24面中央揃え.json') as Template;
const スマートレター = loadJson('./スマートレター.json') as Template;
const ストライプラベル24面 = loadJson('./ストライプラベル24面.json') as Template;
const フレームラベル24面 = loadJson('./フレームラベル24面.json') as Template;
const シンプルラベル24面 = loadJson('./シンプルラベル24面.json') as Template;
const 郵便はがき横書き = loadJson('./郵便はがき横書き.json') as Template;
const 長形3号封筒 = loadJson('./長形3号封筒.json') as Template;
const 洋長3号封筒 = loadJson('./洋長3号封筒.json') as Template;
const 角形2号封筒 = loadJson('./角形2号封筒.json') as Template;
const 名刺サイズの名札 = loadJson('./名刺サイズの名札.json') as Template;
const connpass名札 = loadJson('./connpass名札.json') as Template;
const ゆうパケット = loadJson('./ゆうパケット.json') as Template;
const Aone31555QRコード = loadJson('./Aone31555QRコード.json') as Template;
const Aone31553QRコード = loadJson('./Aone31553QRコード.json') as Template;
const Aone72230JANコード短縮 = loadJson('./Aone72230JANコード短縮.json') as Template;
const Aone72230JANコード標準 = loadJson('./Aone72230JANコード標準.json') as Template;
const Aone72312宛名 = loadJson('./Aone72312宛名.json') as Template;
const 領収書x4 = loadJson('./領収書x4.json') as Template;
const 領収書 = loadJson('./領収書.json') as Template;
const 表彰状 = loadJson('./表彰状.json') as Template;
const 見積書 = loadJson('./見積書.json') as Template;
const 請求書 = loadJson('./請求書.json') as Template;
const 納品書 = loadJson('./納品書.json') as Template;
const 書類送付状 = loadJson('./書類送付状.json') as Template;
const 履歴書 = loadJson('./履歴書.json') as Template;
const 労働条件通知書 = loadJson('./労働条件通知書.json') as Template;
const z97mmx210mm = loadJson('./z97mmx210mm.json') as Template;
const barcodes = loadJson('./barcodes.json') as Template;
const canvasPdf = loadJson('./canvasPdf.json') as Template;
const background = loadJson('./background.json') as Template;
const dynamicFontSizeHorizontal = loadJson('./dynamicFontSizeHorizontal.json') as Template;
const dynamicFontSizeVertical = loadJson('./dynamicFontSizeVertical.json') as Template;
const rotation = loadJson('./rotation.json') as Template;
const verticalAlignmentTop = loadJson('./verticalAlignmentTop.json') as Template;
const verticalAlignmentMiddle = loadJson('./verticalAlignmentMiddle.json') as Template;
const verticalAlignmentBottom = loadJson('./verticalAlignmentBottom.json') as Template;
const test = loadJson('./test.json') as Template;
const shapes = loadJson('./shapes.json') as Template;
const pet = loadJson('./pet.json') as Template;
const pdfImage = loadJson('./pdfImage.json') as Template;
const underlineStrikethrough = loadJson('./underlineStrikethrough.json') as Template;
const multiVariableText = loadJson('./multiVariableText.json') as Template;
const preVersion5Format = loadJson('./preVersion5Format.json') as Template;
const segmenterEnglish = loadJson('./segmenterEnglish.json') as Template;
const segmenterJapanese = loadJson('./segmenterJapanese.json') as Template;

export const label = {
  宛名8面,
  シンプルラベル24面,
  フレームラベル24面,
  ストライプラベル24面,
  装飾なしラベル24面,
  装飾なしラベル24面中央揃え,
  郵便はがき横書き,
  レターパック,
  レターパックライト,
  レターパックプラス,
  スマートレター,
  ゆうパケット,
  Aone72312宛名,
  名刺サイズの名札,
  connpass名札,
};

export const envelope = {
  長形3号封筒,
  洋長3号封筒,
  角形2号封筒,
};

export const barcode = {
  Aone31555QRコード,
  Aone31553QRコード,
  Aone72230JANコード短縮,
  Aone72230JANコード標準,
  barcodes,
};

export const business = {
  領収書,
  領収書x4,
  表彰状,
  見積書,
  請求書,
  納品書,
  書類送付状,
  履歴書,
  労働条件通知書,
};

// These tests are slower, so we allow more time for them to pass
export const textType = {
  dynamicFontSizeHorizontal,
  dynamicFontSizeVertical,
  verticalAlignmentTop,
  verticalAlignmentMiddle,
  verticalAlignmentBottom,
  underlineStrikethrough,
  multiVariableText,
};

export const other = {
  test,
  preVersion5Format,
  z97mmx210mm,
  canvasPdf,
  background,
  rotation,
  pet,
  pdfImage,
};

export const shape = {
  shapes,
};

export const segmenter = {
  segmenterEnglish,
  segmenterJapanese,
};

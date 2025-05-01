import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import all templates using require
const レターパック = require('./レターパック.json');
const レターパックライト = require('./レターパックライト.json');
const レターパックプラス = require('./レターパックプラス.json');
const 宛名8面 = require('./宛名8面.json');
const 装飾なしラベル24面 = require('./装飾なしラベル24面.json');
const 装飾なしラベル24面中央揃え = require('./装飾なしラベル24面中央揃え.json');
const スマートレター = require('./スマートレター.json');
const ストライプラベル24面 = require('./ストライプラベル24面.json');
const フレームラベル24面 = require('./フレームラベル24面.json');
const シンプルラベル24面 = require('./シンプルラベル24面.json');
const 郵便はがき横書き = require('./郵便はがき横書き.json');
const 長形3号封筒 = require('./長形3号封筒.json');
const 洋長3号封筒 = require('./洋長3号封筒.json');
const 角形2号封筒 = require('./角形2号封筒.json');
const 名刺サイズの名札 = require('./名刺サイズの名札.json');
const connpass名札 = require('./connpass名札.json');
const ゆうパケット = require('./ゆうパケット.json');
const Aone31555QRコード = require('./Aone31555QRコード.json');
const Aone31553QRコード = require('./Aone31553QRコード.json');
const Aone72230JANコード短縮 = require('./Aone72230JANコード短縮.json');
const Aone72230JANコード標準 = require('./Aone72230JANコード標準.json');
const Aone72312宛名 = require('./Aone72312宛名.json');
const 領収書x4 = require('./領収書x4.json');
const 領収書 = require('./領収書.json');
const 表彰状 = require('./表彰状.json');
const 見積書 = require('./見積書.json');
const 請求書 = require('./請求書.json');
const 納品書 = require('./納品書.json');
const 書類送付状 = require('./書類送付状.json');
const 履歴書 = require('./履歴書.json');
const 労働条件通知書 = require('./労働条件通知書.json');
const z97mmx210mm = require('./z97mmx210mm.json');
const barcodes = require('./barcodes.json');
const canvasPdf = require('./canvasPdf.json');
const background = require('./background.json');
const dynamicFontSizeHorizontal = require('./dynamicFontSizeHorizontal.json');
const dynamicFontSizeVertical = require('./dynamicFontSizeVertical.json');
const rotation = require('./rotation.json');
const verticalAlignmentTop = require('./verticalAlignmentTop.json');
const verticalAlignmentMiddle = require('./verticalAlignmentMiddle.json');
const verticalAlignmentBottom = require('./verticalAlignmentBottom.json');
const test = require('./test.json');
const shapes = require('./shapes.json');
const pet = require('./pet.json');
const pdfImage = require('./pdfImage.json');
const underlineStrikethrough = require('./underlineStrikethrough.json');
const multiVariableText = require('./multiVariableText.json');
const preVersion5Format = require('./preVersion5Format.json');
const segmenterEnglish = require('./segmenterEnglish.json');
const segmenterJapanese = require('./segmenterJapanese.json');

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

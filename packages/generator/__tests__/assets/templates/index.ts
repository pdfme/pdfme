import { Template } from '@pdfme/common';

const レターパック = require('./レターパック.json') as Template;
const レターパックライト = require('./レターパックライト.json') as Template;
const レターパックプラス = require('./レターパックプラス.json') as Template;
const 宛名8面 = require('./宛名8面.json') as Template;
const 装飾なしラベル24面 = require('./装飾なしラベル24面.json') as Template;
const 装飾なしラベル24面中央揃え = require('./装飾なしラベル24面中央揃え.json') as Template;
const スマートレター = require('./スマートレター.json') as Template;
const ストライプラベル24面 = require('./ストライプラベル24面.json') as Template;
const フレームラベル24面 = require('./フレームラベル24面.json') as Template;
const シンプルラベル24面 = require('./シンプルラベル24面.json') as Template;
const 郵便はがき横書き = require('./郵便はがき横書き.json') as Template;
const 長形3号封筒 = require('./長形3号封筒.json') as Template;
const 洋長3号封筒 = require('./洋長3号封筒.json') as Template;
const 角形2号封筒 = require('./角形2号封筒.json') as Template;
const 名刺サイズの名札 = require('./名刺サイズの名札.json') as Template;
const connpass名札 = require('./connpass名札.json') as Template;
const ゆうパケット = require('./ゆうパケット.json') as Template;
const Aone31555QRコード = require('./Aone31555QRコード.json') as Template;
const Aone31553QRコード = require('./Aone31553QRコード.json') as Template;
const Aone72230JANコード短縮 = require('./Aone72230JANコード短縮.json') as Template;
const Aone72230JANコード標準 = require('./Aone72230JANコード標準.json') as Template;
const Aone72312宛名 = require('./Aone72312宛名.json') as Template;
const 領収書x4 = require('./領収書x4.json') as Template;
const 領収書 = require('./領収書.json') as Template;
const 表彰状 = require('./表彰状.json') as Template;
const 見積書 = require('./見積書.json') as Template;
const 請求書 = require('./請求書.json') as Template;
const 納品書 = require('./納品書.json') as Template;
const 書類送付状 = require('./書類送付状.json') as Template;
const 履歴書 = require('./履歴書.json') as Template;
const 労働条件通知書 = require('./労働条件通知書.json') as Template;
const z97mmx210mm = require('./z97mmx210mm.json') as Template;
const barcodes = require('./barcodes.json') as Template;
const canvasPdf = require('./canvasPdf.json') as Template;
const background = require('./background.json') as Template;
const dynamicFontSizeHorizontal = require('./dynamicFontSizeHorizontal.json') as Template;
const dynamicFontSizeVertical = require('./dynamicFontSizeVertical.json') as Template;
const rotation = require('./rotation.json') as Template;
const verticalAlignmentTop = require('./verticalAlignmentTop.json') as Template;
const verticalAlignmentMiddle = require('./verticalAlignmentMiddle.json') as Template;
const verticalAlignmentBottom = require('./verticalAlignmentBottom.json') as Template;
const test = require('./test.json') as Template;
const shapes = require('./shapes.json') as Template;
const pet = require('./pet.json') as Template;
const pdfImage = require('./pdfImage.json') as Template;
const underlineStrikethrough = require('./underlineStrikethrough.json') as Template;
const multiVariableText = require('./multiVariableText.json') as Template;

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

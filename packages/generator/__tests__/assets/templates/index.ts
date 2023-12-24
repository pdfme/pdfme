import { Template } from '@pdfme/common';

type TemplateWithSampledata = Template & {
  sampledata: [{ [key: string]: string }];
};

const templateConverter = (template: TemplateWithSampledata): Template => {
  template.schemas.forEach((schema) => {
    Object.entries(schema).forEach(([key, value]) => {
      // @ts-ignore
      value.content = template.sampledata[0][key] ?? value.content ?? '';
    });
  });
  return template;
};

const レターパック = templateConverter(require('./レターパック.json'));
const レターパックライト = templateConverter(require('./レターパックライト.json'));
const レターパックプラス = templateConverter(require('./レターパックプラス.json'));
const 宛名8面 = templateConverter(require('./宛名8面.json'));
const 装飾なしラベル24面 = templateConverter(require('./装飾なしラベル24面.json'));
const 装飾なしラベル24面中央揃え = templateConverter(require('./装飾なしラベル24面中央揃え.json'));
const スマートレター = templateConverter(require('./スマートレター.json'));
const ストライプラベル24面 = templateConverter(require('./ストライプラベル24面.json'));
const フレームラベル24面 = templateConverter(require('./フレームラベル24面.json'));
const シンプルラベル24面 = templateConverter(require('./シンプルラベル24面.json'));
const 郵便はがき横書き = templateConverter(require('./郵便はがき横書き.json'));
const 長形3号封筒 = templateConverter(require('./長形3号封筒.json'));
const 洋長3号封筒 = templateConverter(require('./洋長3号封筒.json'));
const 角形2号封筒 = templateConverter(require('./角形2号封筒.json'));
const 名刺サイズの名札 = templateConverter(require('./名刺サイズの名札.json'));
const connpass名札 = templateConverter(require('./connpass名札.json'));
const ゆうパケット = templateConverter(require('./ゆうパケット.json'));
const Aone31555QRコード = templateConverter(require('./Aone31555QRコード.json'));
const Aone31553QRコード = templateConverter(require('./Aone31553QRコード.json'));
const Aone72230JANコード短縮 = templateConverter(require('./Aone72230JANコード短縮.json'));
const Aone72230JANコード標準 = templateConverter(require('./Aone72230JANコード標準.json'));
const Aone72312宛名 = templateConverter(require('./Aone72312宛名.json'));
const 領収書x4 = templateConverter(require('./領収書x4.json'));
const 領収書 = templateConverter(require('./領収書.json'));
const 表彰状 = templateConverter(require('./表彰状.json'));
const 見積書 = templateConverter(require('./見積書.json'));
const 請求書 = templateConverter(require('./請求書.json'));
const 納品書 = templateConverter(require('./納品書.json'));
const 書類送付状 = templateConverter(require('./書類送付状.json'));
const 履歴書 = templateConverter(require('./履歴書.json'));
const 労働条件通知書 = templateConverter(require('./労働条件通知書.json'));
const z97mmx210mm = templateConverter(require('./z97mmx210mm.json'));
const barcodes = templateConverter(require('./barcodes.json'));
const canvasPdf = templateConverter(require('./canvasPdf.json'));
const background = templateConverter(require('./background.json'));
const dynamicFontSizeHorizontal = templateConverter(require('./dynamicFontSizeHorizontal.json'));
const dynamicFontSizeVertical = templateConverter(require('./dynamicFontSizeVertical.json'));
const rotation = templateConverter(require('./rotation.json'));
const verticalAlignmentTop = templateConverter(require('./verticalAlignmentTop.json'));
const verticalAlignmentMiddle = templateConverter(require('./verticalAlignmentMiddle.json'));
const verticalAlignmentBottom = templateConverter(require('./verticalAlignmentBottom.json'));
const test = templateConverter(require('./test.json'));
const shapes = templateConverter(require('./shapes.json'));
const pet = templateConverter(require('./pet.json'));

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
};

export const other = {
  test,
  z97mmx210mm,
  canvasPdf,
  background,
  rotation,
  pet,
};

export const shape = {
  shapes,
};

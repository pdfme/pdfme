import { Template, BLANK_PDF } from '@pdfme/common';

/* eslint global-require: off*/
/* eslint @typescript-eslint/no-var-requires: off*/
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
const シンプルラベル24面BASE = require('./シンプルラベル24面BASE.json') as Template;
const 郵便はがき横書き = require('./郵便はがき横書き.json') as Template;
const 長形3号封筒 = require('./長形3号封筒.json') as Template;
const 洋長3号封筒 = require('./洋長3号封筒.json') as Template;
const 角形2号封筒 = require('./角形2号封筒.json') as Template;
const BASEロゴ入り洋長3号封筒 = require('./BASEロゴ入り洋長3号封筒.json') as Template;
const BASEロゴ入り1面 = require('./BASEロゴ入り1面.json') as Template;
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

export default {
  test: {
    sampledata: [{ a: 'a1', b: 'b1', c: 'c1' }],
    schemas: [
      {
        a: {
          type: 'text',
          position: { x: 0, y: 0 },
          width: 10,
          height: 10,
        },
        b: {
          type: 'text',
          position: { x: 10, y: 10 },
          width: 10,
          height: 10,
        },
        c: {
          type: 'text',
          position: { x: 20, y: 20 },
          width: 10,
          height: 10,
        },
      },
    ],
    basePdf: BLANK_PDF,
    fontName: 'SauceHanSansJP',
  } as Template,
  宛名8面,
  シンプルラベル24面,
  シンプルラベル24面BASE,
  フレームラベル24面,
  ストライプラベル24面,
  装飾なしラベル24面,
  装飾なしラベル24面中央揃え,
  郵便はがき横書き,
  レターパック,
  レターパックライト,
  レターパックプラス,
  スマートレター,
  長形3号封筒,
  洋長3号封筒,
  角形2号封筒,
  BASEロゴ入り洋長3号封筒,
  BASEロゴ入り1面,
  名刺サイズの名札,
  connpass名札,
  ゆうパケット,
  Aone31555QRコード,
  Aone31553QRコード,
  Aone72230JANコード短縮,
  Aone72230JANコード標準,
  Aone72312宛名,
  領収書,
  領収書x4,
  表彰状,
  見積書,
  請求書,
  納品書,
  書類送付状,
  履歴書,
  労働条件通知書,
  z97mmx210mm,
  barcodes,
  canvasPdf,
  background,
};

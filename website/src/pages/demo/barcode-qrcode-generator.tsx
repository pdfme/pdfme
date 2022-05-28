import React from 'react';
import DemoApp from '../../components/DemoApp';

// TODO ここから キーワード調査が必要
export const title = 'Barcode, QRcode Generator';
export const description = `Barcode, QRcode Generator is a web application that easy to use, completely free and unlimited use.
No need sign up! no need to pay!`;
export const thumbnail = '/img/barcode-qrcodes.png';

const templateItems = ['qr_lines', 'qr_title', 'location_arrow', 'location_number'].map((c) => ({
  id: c,
  jsonUrl: `/templates/${c}.json`,
  imgUrl: `/img/templates/${c}.png`,
}));

export default () => (
  <DemoApp
    title={title}
    description={description}
    thumbnail={thumbnail}
    templateItems={templateItems}
  />
);

import React from 'react';
import DemoAppGrid from '../../components/DemoAppGrid';

export const title = 'Barcode,QR Generator';
export const description = `Barcode, QRcode Generator is a web application that is easy to use, completely free, and unlimited.
No need to sign up! no need to pay!`;
export const thumbnail = '/img/barcode-qrcodes.png';

const templateItems = ['qr_lines', 'qr_title', 'location_arrow', 'location_number'].map((c) => ({
  id: c,
  jsonUrl: `/templates/${c}.json`,
  imgUrl: `/img/templates/${c}.png`,
}));

export default () => (
  <DemoAppGrid
    title={title}
    description={description}
    thumbnail={thumbnail}
    templateItems={templateItems}
  />
);

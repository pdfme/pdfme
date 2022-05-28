import React from 'react';
import DemoApp from '../../components/DemoApp';

// TODO ここから キーワード調査が必要
export const title = 'Online Invoice Generator';
export const description = `Online Invoice Generator is a web application that easy to use, completely free and unlimited use.
No need sign up! no need to pay!`;
export const thumbnail = '/img/invoices.png';

const templateItems = ['white', 'green', 'blue'].map((c) => ({
  id: `invoice_${c}`,
  jsonUrl: `/templates/invoice_${c}.json`,
  imgUrl: `/img/templates/invoice_${c}.webp`,
}));

export default () => (
  <DemoApp
    title={title}
    description={description}
    thumbnail={thumbnail}
    templateItems={templateItems}
  />
);

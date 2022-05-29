import React from 'react';
import DemoApp from '../../components/DemoApp';

export const title = 'Address Label Maker';
export const description = `Address Label Maker is a web application that easy to use, completely free and unlimited use.
No need sign up! no need to pay!`;
export const thumbnail = '/img/address-labels.png';

const templateItems = ['address_label_10', 'address_label_30', 'address_label_6'].map((c) => ({
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

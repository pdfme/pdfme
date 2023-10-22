import React from 'react';
import DemoAppLoader from '../../components/DemoAppLoader';

export const title = 'Free Invoice Generator';
export const description = `Free Invoice Generator is a web application that is easy to use, completely free, and unlimited.
No need to sign up! no need to pay!`;
export const thumbnail = '/img/invoices.png';

const templateItems = ['white', 'green', 'blue'].map((c) => ({
  id: `invoice_${c}`,
  jsonUrl: `/templates/invoice_${c}.json`,
  imgUrl: `/img/templates/invoice_${c}.webp`,
}));


export default () => <DemoAppLoader
  importPath='../../components/DemoApp'
  title={title}
  description={description}
  thumbnail={thumbnail}
  templateItems={templateItems} />;
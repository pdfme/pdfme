import React from 'react';
import DemoAppLoader from '../../components/DemoAppLoader';

export const title = 'Certificate Maker';
export const description = `Online Certificate Maker is a web application that is easy to use, completely free, and unlimited.
No need to sign up! no need to pay!`;
export const thumbnail = '/img/certificates.png';

const templateItems = ['white', 'gold', 'black', 'blue'].map((c) => ({
  id: `certificate_${c}`,
  jsonUrl: `/templates/certificate_${c}.json`,
  imgUrl: `/img/templates/certificate_${c}.webp`,
}));

export default () => <DemoAppLoader
  importPath='../../components/DemoApp'
  title={title}
  description={description}
  thumbnail={thumbnail}
  templateItems={templateItems} />;
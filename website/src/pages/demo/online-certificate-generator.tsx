import React from 'react';
import DemoApp from '../../components/DemoApp';

const title = 'Online Certificate Maker';
const description = `Online Certificate Maker is a web application that easy to use, completely free and unlimited use.
No need sign up! no need to pay!`;
const thumbnail = '/img/certificates.png';

const templateItems = ['white', 'gold', 'black', 'blue'].map((c) => ({
  id: `certificate_${c}`,
  jsonUrl: `/templates/certificate_${c}.json`,
  imgUrl: `/img/templates/certificate_${c}.webp`,
}));

export default () => (
  <DemoApp
    title={title}
    description={description}
    thumbnail={thumbnail}
    templateItems={templateItems}
  />
);

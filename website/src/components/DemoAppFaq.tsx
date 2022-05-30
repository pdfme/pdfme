import React from 'react';
import Faq from './Faq';
import { demoAppsSourceCodeUrl } from '../constants';

const faqList = [
  {
    question: 'Can I use this for free?',
    answer: 'Yes. Free and unlimited use.',
  },
  {
    question: 'The text on the pdf is garbled...',
    answer:
      'You can only use the alphabet in this app. If you want to use other characters, you have to load other font.',
  },
  {
    question: 'Can I access the source code?',
    answer: (
      <span>
        Source code is available at{' '}
        <a target="_blank" rel="noopener noreferrer" href={demoAppsSourceCodeUrl}>
          {demoAppsSourceCodeUrl}
        </a>
        .
      </span>
    ),
  },
];

export default () => (
  <div className="container">
    <div className={'col col--12'}>
      <Faq faqList={faqList} />
    </div>
  </div>
);

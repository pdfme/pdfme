import React from 'react';
import Faq from './Faq';
import { demoAppsSourceCodeUrl } from '../constants';

const faqList = [
  {
    question: 'Can I use this for free?',
    answer: 'Yes. Free and unlimited.',
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
  {
    question: 'Bug report',
    answer: (
      <span>
        To report application bugs, please use{' '}
        <a target="_blank" rel="noopener noreferrer" href={'https://github.com/pdfme/pdfme/issues'}>
          GitHub issue
        </a>
        .
      </span>
    ),
  },
  {
    question: 'Need technical support',
    answer: (
      <p>
        If you need technical support, please contact the author via{' '}
        <a target="_blank" rel="noopener noreferrer" href={'https://www.linkedin.com/in/hand-dot/'}>
          LinkedIn
        </a>
        .
      </p>
    ),
  },
];

export default () => <Faq faqList={faqList} />;

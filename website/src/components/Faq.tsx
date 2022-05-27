import React from 'react';

const Faq = ({
  faqList,
}: {
  faqList: { question: string | JSX.Element; answer: string | JSX.Element }[];
}) => (
  <>
    <h2>
      <a aria-hidden="true" className="anchor enhancedAnchor" id="faq"></a>
      FAQ
      <a className="hash-link" href="#faq"></a>
    </h2>
    <ul>
      {faqList.map((faq) => (
        <li key={String(faq.answer) + String(faq.question)}>
          <div>
            <h3>{faq.question}</h3>
            <blockquote>{faq.answer}</blockquote>
          </div>
        </li>
      ))}
    </ul>
  </>
);

export default Faq;

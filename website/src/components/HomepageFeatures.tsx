import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'High-Speed PDF Generation',
    description: (
      <>
        Streamlined PDF generation process with no complex operations required. Use your preferred template 
        to generate all the PDFs you need. Our PDF generation solution works seamlessly on both Node.js and in the browser.
      </>
    ),
  },
  {
    title: 'Intuitive PDF Generation Template Editor',
    description: <>Create and modify PDF generation templates effortlessly with our Designer, a user-friendly UI template editor for efficient PDF creation.</>,
  },
  {
    title: 'Structured JSON Data for PDF Generation Templates',
    description: (
      <>Our PDF generation templates use a JSON document representation, making them easy to understand, manipulate, and integrate into your workflow.</>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className={clsx('col col--12')}>
            <h2>
              <a aria-hidden="true" className="anchor enhancedAnchor" id="features"></a>
              PDF Generation Features
              <a className="hash-link" href="#features" title="Direct link to heading"></a>
            </h2>
          </div>

          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
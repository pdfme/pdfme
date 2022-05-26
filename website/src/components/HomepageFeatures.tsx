import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'A fast PDF Generator',
    description: (
      <>
        No complex operations are required. Just bring your favorite template and generate all the PDFs you need.
        Works on node and the browser. 
      </>
    ),
  },
  {
    title: 'Designer, an easy to use PDF template editor',
    description: <>Anyone can easily create and modify templates using Designer (UI template editor).</>,
  },
  {
    title: 'Templates as structured JSON Data',
    description: (
      <>Templates have a JSON document representation, which makes theme easy to understand and easy to work with.</>
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
              Features
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
